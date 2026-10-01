import { Router, Request, Response } from 'express';
import { inMemoryStore } from '../db/pool.js';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { wid } = req.params;
  const list = Array.from(inMemoryStore.feedback.values()).filter(
    (f: any) => f.workspace_id === wid
  );
  return res.json({ feedback: list });
});

router.post('/', (req: Request, res: Response) => {
  const { wid } = req.params;
  const targetType = req.body.targetType || req.body.target_type;
  const targetId = req.body.targetId || req.body.target_id;
  const rating = req.body.rating;
  const comment = req.body.comment;

  if (!targetType || !targetId || !['up', 'down'].includes(rating)) {
    return res.status(400).json({ error: 'Valid targetType (target_type), targetId (target_id), and rating (up/down) are required' });
  }

  const feedbackId = `fb-${Date.now()}`;
  const entry = {
    id: feedbackId,
    workspace_id: wid,
    target_type: targetType,
    target_id: targetId,
    rating,
    comment: comment || '',
    created_at: new Date(),
  };

  inMemoryStore.feedback.set(feedbackId, entry);
  return res.status(201).json({ feedback: entry });
});

export default router;
