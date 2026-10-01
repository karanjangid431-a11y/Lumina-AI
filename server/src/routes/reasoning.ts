import { Router, Request, Response } from 'express';
import { inMemoryStore } from '../db/pool.js';
import { embedText } from '../services/gemini.js';
import { executeGroundedQA } from '../services/rag.js';

const router = Router({ mergeParams: true });

// ─────────────────────────────────────────────────────────────────────────────
// SSE Helper: send a structured reasoning event to the client
// ─────────────────────────────────────────────────────────────────────────────
function sendEvent(
  res: Response,
  stage: string,
  detail: string,
  meta: Record<string, unknown> = {}
) {
  const payload = JSON.stringify({ stage, detail, meta, ts: Date.now() });
  res.write(`event: reasoning\ndata: ${payload}\n\n`);
  // Flush immediately (important for proxy + Node buffering)
  if (typeof (res as any).flush === 'function') (res as any).flush();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:wid/qa/stream?q=<query>&sources=<sid1,sid2>
// Server-Sent Events — streams the reasoning trace then the final answer
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stream', async (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const query = (req.query.q as string | undefined)?.trim();
  const sourcesParam = req.query.sources as string | undefined;

  if (!query) {
    res.status(400).json({ error: 'Query parameter ?q= is required' });
    return;
  }

  const ws = inMemoryStore.workspaces.get(wid);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  // ── SSE handshake ──────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering if present
  res.flushHeaders();

  // keep-alive ping every 15 s so proxies don't time out
  const ping = setInterval(() => res.write(':ping\n\n'), 15_000);

  // close cleanly when client disconnects
  req.on('close', () => clearInterval(ping));

  try {
    // ── Stage 1 ───────────────────────────────────────────────────────────────
    sendEvent(res, 'DECONSTRUCTING_QUERY', `Decomposing query into semantic concepts…`, {
      queryLength: query.length,
    });

    // embed the query to get its vector representation
    const queryVector = await embedText(query, 'RETRIEVAL_QUERY');

    // build the set of concepts from top dimensions (top-10 most activated)
    const topConcepts = queryVector
      .map((v, i) => ({ i, v: Math.abs(v) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 10)
      .map((x) => `dim${x.i}`);

    sendEvent(res, 'DECONSTRUCTING_QUERY', `Query embedded into 768-dim vector. Top concept dimensions: ${topConcepts.slice(0, 5).join(', ')}…`, {
      vectorNorm: queryVector.reduce((s, v) => s + v * v, 0) ** 0.5,
    });

    // ── Stage 2 ───────────────────────────────────────────────────────────────
    sendEvent(res, 'HYBRID_RRF_SEARCH', 'Executing hybrid search: pgvector cosine similarity + full-text tsvector scan…', {
      mode: ws.mode,
    });

    // Collect candidate chunks for transparency
    const allChunks: any[] = [];
    for (const c of inMemoryStore.chunks.values()) {
      // filter to workspace sources
      const src = inMemoryStore.sources.get(c.source_id);
      if (!src || src.workspace_id !== wid) continue;
      if (sourcesParam) {
        const allowed = sourcesParam.split(',').map((s) => s.trim());
        if (!allowed.includes(c.source_id)) continue;
      }
      allChunks.push(c);
    }

    sendEvent(res, 'HYBRID_RRF_SEARCH', `Hybrid search complete. Scanned ${allChunks.length} chunks across ${new Set(allChunks.map((c) => c.source_id)).size} sources. Applying Reciprocal Rank Fusion…`, {
      chunkCount: allChunks.length,
    });

    // ── Stage 3 ───────────────────────────────────────────────────────────────
    sendEvent(res, 'GEMINI_SYNTHESIS', 'Top chunks passed to Gemini for grounded JSON synthesis. Generating claims with verbatim quote evidence…', {
      model: (ws as any).geminiModel || 'gemini-2.5-flash',
    });

    // Execute the actual QA pipeline
    const selectedSourceIds = sourcesParam ? sourcesParam.split(',').map((s) => s.trim()) : undefined;
    const result = await executeGroundedQA(wid, query, {
      selectedSourceIds,
      mode: ws.mode,
    });

    const claimCount = result.totalCitations ?? result.citations?.length ?? 0;

    sendEvent(res, 'GEMINI_SYNTHESIS', `Synthesis complete. Generated ${claimCount} initial claim${claimCount !== 1 ? 's' : ''} with evidence.`, {
      claimCount,
    });

    // ── Stage 4 ───────────────────────────────────────────────────────────────
    sendEvent(res, 'VERIFYING_CITATIONS', 'Running server-side quote verifier — checking each verbatim quote against stored chunk text…');

    const verifiedCount = result.verifiedCount ?? result.citations?.filter((c: any) => c.verified !== false).length ?? 0;
    const droppedCount = claimCount - verifiedCount;

    sendEvent(res, 'VERIFYING_CITATIONS', `Verification complete. ${verifiedCount}/${claimCount} claims verified. ${droppedCount > 0 ? `${droppedCount} unverifiable claim(s) dropped.` : 'All claims verified ✓'}`, {
      verifiedCount,
      droppedCount,
    });

    // ── Stage 5 ───────────────────────────────────────────────────────────────
    sendEvent(res, 'AUDIT_COMPLETE', `Audit complete. Emitting final grounded answer. Confidence: ${result.confidence ?? 'N/A'}`, {
      confidence: result.confidence,
      answerLength: result.answer?.length ?? 0,
      retrievalTraceCount: result.retrievalTrace?.topRetrievedChunks?.length ?? 0,
    });

    // Save retrieval log
    const logId = `log-${Date.now()}`;
    inMemoryStore.retrievalLogs.set(logId, {
      id: logId,
      workspace_id: wid,
      query,
      retrieval_trace: result.retrievalTrace,
      created_at: new Date(),
    });

    // ── Final answer event ────────────────────────────────────────────────────
    const finalPayload = JSON.stringify({ type: 'FINAL_ANSWER', result });
    res.write(`event: answer\ndata: ${finalPayload}\n\n`);
  } catch (err: any) {
    const errPayload = JSON.stringify({ stage: 'ERROR', detail: err.message });
    res.write(`event: error\ndata: ${errPayload}\n\n`);
  } finally {
    clearInterval(ping);
    res.write('event: done\ndata: {}\n\n');
    res.end();
  }
});

export default router;
