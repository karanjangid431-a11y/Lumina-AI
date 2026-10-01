import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { inMemoryStore } from '../db/pool.js';

const router = Router();

// Create shareable link
router.post('/workspaces/:wid/share', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const { resourceType = 'workspace', resourceId, expiresInHours = 72 } = req.body;

  const ws = inMemoryStore.workspaces.get(wid);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

  const sharedLink = {
    id: `share-${Date.now()}`,
    token,
    workspace_id: wid,
    resource_type: resourceType,
    resource_id: resourceId,
    expires_at: expiresAt,
    created_at: new Date(),
  };

  inMemoryStore.sharedLinks.set(token, sharedLink);
  return res.status(201).json({ token, shareUrl: `#/shared/${token}`, expiresAt });
});

// Access shared resource (read-only)
router.get('/shared/:token', (req: Request, res: Response) => {
  const token = req.params.token as string;
  const link = inMemoryStore.sharedLinks.get(token);

  if (!link) {
    return res.status(404).json({ error: 'Shared link not found or revoked' });
  }

  if (link.expires_at && new Date() > new Date(link.expires_at)) {
    return res.status(410).json({ error: 'This shared link has expired' });
  }

  const ws = inMemoryStore.workspaces.get(link.workspace_id);
  const sources = Array.from(inMemoryStore.sources.values()).filter((s) => s.workspace_id === link.workspace_id);
  const synthesis = inMemoryStore.insights.get(`${link.workspace_id}:synthesis`);

  return res.json({
    workspace: ws,
    sources,
    synthesis,
    resourceType: link.resource_type,
    resourceId: link.resource_id,
    expiresAt: link.expires_at,
  });
});

export default router;
