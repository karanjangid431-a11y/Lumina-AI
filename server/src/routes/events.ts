import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// SSE connections map: workspaceId -> Set<Response>
const sseClients = new Map<string, Set<Response>>();

export function broadcastWorkspaceEvent(workspaceId: string, eventType: string, payload: Record<string, any>) {
  const clients = sseClients.get(workspaceId);
  if (!clients) return;

  const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  for (const client of clients) {
    client.write(`event: ${eventType}\ndata: ${data}\n\n`);
  }
}

// GET /workspaces/:wid/events (SSE)
router.get('/', (req: Request, res: Response) => {
  const wid = req.params.wid as string;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClients.has(wid)) {
    sseClients.set(wid, new Set());
  }
  sseClients.get(wid)!.add(res);

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', wid })}\n\n`);

  // Heartbeat every 20 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.get(wid)?.delete(res);
  });
});

// GET /workspaces/:wid/events/poll (Polling fallback for environments without SSE)
router.get('/poll', (req: Request, res: Response) => {
  return res.json({
    events: [],
    timestamp: new Date().toISOString(),
  });
});

export default router;
