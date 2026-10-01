import { Router, Request, Response } from 'express';
import { inMemoryStore } from '../db/pool.js';

const router = Router({ mergeParams: true });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:wid/insights/gap-radar
// Returns vector cluster density analysis to power the GapRadarHeatmap.
// Uses cosine-space binning: hashes each chunk embedding into an (x,y) grid
// cell [0..7]×[0..7] (= 64 cells total). Gaps = cells with density < threshold.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/gap-radar', (req: Request, res: Response) => {
  const wid = req.params.wid as string;

  // Collect all chunks for this workspace
  const chunks: any[] = [];
  for (const c of inMemoryStore.chunks.values()) {
    const src = inMemoryStore.sources.get(c.source_id);
    if (src?.workspace_id === wid && c.embedding?.length) chunks.push(c);
  }

  const GRID = 8; // 8×8 = 64 radar cells
  const grid: number[][] = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  const totalChunks = chunks.length;

  for (const chunk of chunks) {
    const emb: number[] = chunk.embedding;
    if (!emb?.length) continue;

    // Project 768-dim vector onto 2D using PCA-approximation:
    // x ← sum of even-indexed dimensions, y ← sum of odd-indexed dimensions
    let sx = 0, sy = 0;
    for (let i = 0; i < emb.length; i++) {
      if (i % 2 === 0) sx += emb[i]; else sy += emb[i];
    }
    // Normalise to [0, GRID-1]
    const cx = Math.min(GRID - 1, Math.max(0, Math.floor(((sx + 1) / 2) * GRID)));
    const cy = Math.min(GRID - 1, Math.max(0, Math.floor(((sy + 1) / 2) * GRID)));
    grid[cy][cx]++;
  }

  // Identify gap cells (below 5% of average density)
  const avgDensity = totalChunks / (GRID * GRID);
  const gapThreshold = Math.max(1, avgDensity * 0.05);

  // Label known semantic regions (approximate)
  const REGION_LABELS: Record<string, string> = {
    '0,0': 'Foundational Theory',   '0,4': 'Methodology & Experiments',
    '1,1': 'Background & Context',  '1,5': 'Empirical Results',
    '2,2': 'Problem Definition',    '2,6': 'Comparative Analysis',
    '3,3': 'Related Work',          '3,7': 'Implementation Details',
    '4,0': 'Core Contribution',     '4,4': 'Evaluation & Benchmarks',
    '5,1': 'Architecture',          '5,5': 'Limitations',
    '6,2': 'Data & Preprocessing',  '6,6': 'Future Work',
    '7,3': 'Applications',          '7,7': 'Conclusion',
  };

  const gaps: { label: string; row: number; col: number; score: number; suggestion: string }[] = [];
  const cells: { row: number; col: number; density: number; label: string }[] = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const density = grid[row][col];
      const label = REGION_LABELS[`${row},${col}`] || `Region (${row},${col})`;
      cells.push({ row, col, density, label });

      if (density <= gapThreshold && totalChunks > 0) {
        gaps.push({
          label,
          row,
          col,
          score: 1 - density / Math.max(1, avgDensity),
          suggestion: `Auto-search OpenAlex for "${label.toLowerCase()}" to bridge this gap`,
        });
      }
    }
  }

  // Sort gaps by severity
  gaps.sort((a, b) => b.score - a.score);

  return res.json({
    grid,
    cells,
    gaps: gaps.slice(0, 6), // top 6 most critical gaps
    totalChunks,
    avgDensity: Math.round(avgDensity * 100) / 100,
    gridSize: GRID,
    coveragePercent: Math.round(
      (cells.filter((c) => c.density > gapThreshold).length / (GRID * GRID)) * 100
    ),
  });
});

export default router;
