import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { inMemoryStore, isUsingPostgres, getPool, WorkspaceRecord } from '../db/pool.js';

const router = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  mode: z.enum(['academic', 'legal', 'business', 'general']).default('academic'),
  domain: z.string().default('Interdisciplinary'),
  settings: z.record(z.any()).optional().default({}),
});

// List all workspaces
router.get('/', async (req: Request, res: Response) => {
  try {
    const list: Array<WorkspaceRecord & { sourceCount: number; chunkCount: number }> = [];

    for (const ws of inMemoryStore.workspaces.values()) {
      let sourceCount = 0;
      let chunkCount = 0;
      for (const s of inMemoryStore.sources.values()) {
        if (s.workspace_id === ws.id) sourceCount++;
      }
      for (const c of inMemoryStore.chunks.values()) {
        if (c.workspace_id === ws.id) chunkCount++;
      }
      list.push({ ...ws, sourceCount, chunkCount });
    }

    return res.json({ workspaces: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create workspace
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createWorkspaceSchema.parse(req.body);
    const id = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const newWs: WorkspaceRecord = {
      id,
      name: data.name,
      description: data.description,
      mode: data.mode,
      domain: data.domain,
      settings: data.settings,
      created_at: now,
      updated_at: now,
    };

    inMemoryStore.workspaces.set(id, newWs);

    return res.status(201).json({ workspace: { ...newWs, sourceCount: 0, chunkCount: 0 } });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Invalid workspace data' });
  }
});

// Get workspace by ID
router.get('/:wid', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const ws = inMemoryStore.workspaces.get(wid);
  if (!ws) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  let sourceCount = 0;
  let chunkCount = 0;
  for (const s of inMemoryStore.sources.values()) {
    if (s.workspace_id === wid) sourceCount++;
  }
  for (const c of inMemoryStore.chunks.values()) {
    if (c.workspace_id === wid) chunkCount++;
  }

  return res.json({ workspace: { ...ws, sourceCount, chunkCount } });
});

// Update workspace
router.put('/:wid', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const ws = inMemoryStore.workspaces.get(wid);
  if (!ws) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const { name, description, mode, domain, settings } = req.body;
  if (name) ws.name = name;
  if (description !== undefined) ws.description = description;
  if (mode) ws.mode = mode;
  if (domain) ws.domain = domain;
  if (settings) ws.settings = { ...ws.settings, ...settings };
  ws.updated_at = new Date();

  return res.json({ workspace: ws });
});

// Delete workspace
router.delete('/:wid', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  if (!inMemoryStore.workspaces.has(wid)) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  inMemoryStore.workspaces.delete(wid);

  // Cascade delete sources & chunks
  for (const [sId, s] of inMemoryStore.sources.entries()) {
    if (s.workspace_id === wid) inMemoryStore.sources.delete(sId);
  }
  for (const [cId, c] of inMemoryStore.chunks.entries()) {
    if (c.workspace_id === wid) inMemoryStore.chunks.delete(cId);
  }

  return res.json({ message: 'Workspace and all associated sources deleted successfully' });
});

export default router;
