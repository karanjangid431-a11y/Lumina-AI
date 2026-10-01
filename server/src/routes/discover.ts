import { Router, Request, Response } from 'express';
import { searchOpenAlex } from '../services/openalex.js';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  const { q, yearMin, yearMax, openAccessOnly, minCitations, sortBy } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Search query parameter "q" is required' });
  }

  try {
    const results = await searchOpenAlex(q.trim(), {
      yearMin: yearMin ? Number(yearMin) : undefined,
      yearMax: yearMax ? Number(yearMax) : undefined,
      openAccessOnly: openAccessOnly === 'true' || openAccessOnly === '1',
      minCitations: minCitations ? Number(minCitations) : undefined,
      sortBy: (sortBy as 'relevance' | 'citations' | 'recency') || 'relevance',
    });

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Discovery search failed' });
  }
});

export default router;
