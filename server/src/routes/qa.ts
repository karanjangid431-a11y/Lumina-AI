import { Router, Request, Response } from 'express';
import { inMemoryStore } from '../db/pool.js';
import { executeGroundedQA } from '../services/rag.js';
import { runResearchAgent } from '../services/agent.js';

const router = Router({ mergeParams: true });

// Standard Grounded Q&A
router.post('/', async (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const { query, selectedSourceIds, plainLanguage, targetLanguage } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const ws = inMemoryStore.workspaces.get(wid);
  if (!ws) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  try {
    const result = await executeGroundedQA(wid, query.trim(), {
      selectedSourceIds,
      mode: ws.mode,
      plainLanguage: plainLanguage ?? ws.settings?.plainLanguage,
      targetLanguage: targetLanguage ?? ws.settings?.targetLanguage,
    });

    // Save retrieval log for observability
    const logId = `log-${Date.now()}`;
    inMemoryStore.retrievalLogs.set(logId, {
      id: logId,
      workspace_id: wid,
      query,
      retrieval_trace: result.retrievalTrace,
      created_at: new Date(),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error processing grounded Q&A' });
  }
});

// Bounded Research Agent Mode
router.post('/agent', async (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Research query is required' });
  }

  try {
    const agentResult = await runResearchAgent(wid, query.trim());
    return res.json(agentResult);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Agent execution failed' });
  }
});

// List QA Sessions
router.get('/sessions', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const sessions = [];
  for (const s of inMemoryStore.qaSessions.values()) {
    if (s.workspace_id === wid) sessions.push(s);
  }
  return res.json({ sessions });
});

export default router;
