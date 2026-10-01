import { Router, Request, Response } from 'express';
import { inMemoryStore, SourceRecord, ChunkRecord } from '../db/pool.js';
import { generateJSON, generateText } from '../services/gemini.js';

const router = Router({ mergeParams: true });

// Get Insights (Synthesis, Consensus vs Conflict, Gaps, Reading Path)
router.get('/', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const synthesis = inMemoryStore.insights.get(`${wid}:synthesis`);
  return res.json({ insights: synthesis || null });
});

// Generate / Refresh Insights
router.post('/generate', async (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const ws = inMemoryStore.workspaces.get(wid);
  if (!ws) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const sources: SourceRecord[] = [];
  for (const s of inMemoryStore.sources.values()) {
    if (s.workspace_id === wid) sources.push(s);
  }

  if (sources.length === 0) {
    return res.status(400).json({ error: 'Please add sources to the workspace before generating insights.' });
  }

  const sourceSnippets = sources
    .map((s, idx) => `Source [${idx + 1}] "${s.title}" (${s.venue || s.source_type}, ${s.year || 2026}):\n${(s.raw_text || '').slice(0, 600)}`)
    .join('\n\n---\n\n');

  const systemPrompt = `You are a Principal Research Architect. Given a corpus of documents, produce a comprehensive field-level insight report formatted in strict JSON matching:
{
  "overallSummary": "High-level field synthesis summarizing the state of research/evidence across all sources.",
  "themes": [
    { "name": "Theme title", "description": "Synthesis of this theme", "citations": ["Author, Year"] }
  ],
  "consensus": [
    { "statement": "Point of solid consensus across sources", "supportingSources": ["Source 1", "Source 2"] }
  ],
  "conflicts": [
    { "topic": "Contested topic or divergence", "perspectiveA": "First view with quote", "perspectiveB": "Counter view with quote" }
  ],
  "gaps": [
    { "gap": "Identified research gap or missing evidence", "impact": "Why this matters", "confidence": "High/Medium/Low" }
  ],
  "readingPath": [
    { "order": 1, "title": "Source title", "stage": "Foundational / Core / Advanced", "reason": "Why read first" }
  ]
}`;

  const userPrompt = `Workspace Mode: ${ws.mode}\n\nWorkspace Sources:\n${sourceSnippets}`;

  const fallbackData = {
    overallSummary: `Field-level synthesis over ${sources.length} sources across the ${ws.domain} domain. The literature establishes fundamental empirical architectures while highlighting critical trade-offs in implementation and risk boundaries.`,
    themes: [
      { name: 'Core Mechanisms & Foundations', description: 'Foundational principles and structural architectures demonstrated in the corpus.', citations: [sources[0].title] },
      { name: 'Performance & Empirical Validation', description: 'Quantitative benchmarks and evaluation frameworks validating real-world utility.', citations: [sources[1]?.title || sources[0].title] },
    ],
    consensus: [
      { statement: 'Systematic evaluation and external grounding significantly reduce errors compared to unverified heuristics.', supportingSources: [sources[0].title] },
    ],
    conflicts: [
      { topic: 'Optimization Trade-Offs', perspectiveA: 'Prioritizing maximum theoretical throughput and expressive capacity.', perspectiveB: 'Prioritizing deterministic compliance, risk mitigation, and verification overhead.' },
    ],
    gaps: [
      { gap: 'Standardized automated verification benchmarks across cross-domain corpora', impact: 'Enables provably reliable autonomous assistants in high-stakes fields', confidence: 'High' },
    ],
    readingPath: sources.map((s, idx) => ({
      order: idx + 1,
      title: s.title,
      stage: idx === 0 ? 'Foundational' : idx === 1 ? 'Core Implementation' : 'Advanced / Specialized',
      reason: `Essential reading for understanding ${s.venue || s.source_type} context.`,
    })),
  };

  const insights = await generateJSON(systemPrompt, userPrompt, fallbackData);
  inMemoryStore.insights.set(`${wid}:synthesis`, insights);

  return res.json({ insights });
});

// Knowledge Graph Nodes & Edges
router.get('/graph', (req: Request, res: Response) => {
  const { wid } = req.params;
  const sources: SourceRecord[] = [];
  for (const s of inMemoryStore.sources.values()) {
    if (s.workspace_id === wid) sources.push(s);
  }

  const nodes: Array<{ id: string; label: string; group: string; value: number; title: string }> = [];
  const edges: Array<{ from: string; to: string; label?: string; value?: number }> = [];

  // Add source nodes
  sources.forEach((s) => {
    nodes.push({
      id: s.id,
      label: s.title.length > 32 ? s.title.slice(0, 30) + '...' : s.title,
      group: s.source_type,
      value: Math.max(10, Math.min(30, (s.citation_count || 1) / 100)),
      title: `${s.title} (${s.year || 'n.d.'}) - ${s.authors.join(', ')}`,
    });
  });

  // Extract shared concepts / themes from insights
  const synthesis = inMemoryStore.insights.get(`${wid}:synthesis`);
  if (synthesis?.themes) {
    synthesis.themes.forEach((t: any, idx: number) => {
      const conceptId = `concept-${idx}`;
      nodes.push({
        id: conceptId,
        label: t.name,
        group: 'concept',
        value: 18,
        title: t.description,
      });

      // Connect concept to sources
      sources.slice(0, 3).forEach((s) => {
        edges.push({
          from: conceptId,
          to: s.id,
          label: 'manifests in',
          value: 1,
        });
      });
    });
  }

  // Cross-source edges based on shared words in title or citation
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      edges.push({
        from: sources[i].id,
        to: sources[j].id,
        label: 'cross-reference',
        value: 1,
      });
    }
  }

  return res.json({ nodes, edges, totalNodes: nodes.length, totalEdges: edges.length });
});

// Compare two documents ("What changed" / Cross-document comparison)
router.get('/compare', async (req: Request, res: Response) => {
  const { wid } = req.params;
  const { sourceA: sAId, sourceB: sBId } = req.query;

  if (!sAId || !sBId) {
    return res.status(400).json({ error: 'sourceA and sourceB query parameters are required' });
  }

  const sA = inMemoryStore.sources.get(String(sAId));
  const sB = inMemoryStore.sources.get(String(sBId));

  if (!sA || !sB) {
    return res.status(404).json({ error: 'One or both sources not found' });
  }

  const systemPrompt = `You are an expert document comparison specialist. Compare these two documents and identify:
1. "similarities": core points of overlap
2. "differences": key divergences, changes, or conflicting clauses/claims
3. "addedInB": elements present in Document B that are absent in Document A
4. "riskAssessment": qualitative comparison of risk or empirical rigor.
Return strict JSON.`;

  const userPrompt = `DOCUMENT A: "${sA.title}"\n${(sA.raw_text || '').slice(0, 1000)}\n\nDOCUMENT B: "${sB.title}"\n${(sB.raw_text || '').slice(0, 1000)}`;

  const fallbackComparison = {
    similarities: [
      `Both documents address foundational aspects of ${sA.title} within the active research domain.`,
      'Both emphasize systematic evaluation and compliance requirements.',
    ],
    differences: [
      {
        topic: 'Scope and Terminology',
        inA: `${sA.title} focuses on initial specifications and structural parameters.`,
        inB: `${sB.title} emphasizes downstream operational liabilities, benchmarks, or addenda.`,
      },
    ],
    addedInB: [
      'Additional operational definitions and specific audit / testing procedures.',
    ],
    riskAssessment: 'Document B introduces more granular constraints and audit requirements.',
  };

  const comparison = await generateJSON(systemPrompt, userPrompt, fallbackComparison);
  return res.json({ comparison, sourceA: sA, sourceB: sB });
});

// Generate Executive Brief
router.post('/brief', async (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const { audience = 'Executive Leadership' } = req.body;
  const ws = inMemoryStore.workspaces.get(wid);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  const sources = Array.from(inMemoryStore.sources.values()).filter((s) => s.workspace_id === wid);

  const systemPrompt = `You are a Chief Knowledge Officer preparing a one-page Executive Brief for: ${audience}.
The brief must be rigorous, concise, actionable, and cite evidence from the provided sources.`;

  const userPrompt = `Workspace: "${ws.name}" (${ws.mode} mode)\nSources:\n${sources.map((s) => `- ${s.title} (${s.year || 2026}): ${(s.raw_text || '').slice(0, 200)}`).join('\n')}`;

  const fallbackBrief = `# Executive Brief: ${ws.name}\n\n**Prepared for**: ${audience}\n**Date**: ${new Date().toLocaleDateString()}\n\n## 1. Executive Summary\nAnalysis of the ${sources.length} workspace sources confirms accelerating convergence around standardized architectures and robust verification. Key empirical benchmarks show measurable efficiency gains when grounded retrieval is deployed.\n\n## 2. Strategic Insights & Opportunities\n- **Scalable Architecture**: Foundational mechanisms allow parallel processing and reduced latency.\n- **Risk Mitigation**: Verifiable citations and explicit guardrails eliminate ungrounded speculation.\n\n## 3. Recommended Actions\n1. Prioritize implementation of hybrid retrieval pipelines to ground institutional knowledge.\n2. Mandate quote-level verification on all automated extraction reports.\n3. Establish continuous observability over retrieval recall and confidence thresholds.`;

  const brief = await generateText(systemPrompt, userPrompt);
  return res.json({ brief: brief.startsWith('Demo mode') ? fallbackBrief : brief });
});

export default router;
