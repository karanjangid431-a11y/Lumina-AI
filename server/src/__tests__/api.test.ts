import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { seedDemoWorkspaces } from '../demo/sampleData.js';
import { initDatabase } from '../db/pool.js';

describe('Lumina-AI Backend API Test Suite', () => {
  beforeAll(async () => {
    await initDatabase();
    await seedDemoWorkspaces();
  });

  describe('Health Check', () => {
    it('GET /health returns healthy status and model configuration', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('geminiModel');
      expect(res.body).toHaveProperty('embeddingModel');
    });
  });

  describe('Authentication Routes', () => {
    let guestToken = '';

    it('POST /api/auth/guest creates guest credentials and returns JWT', async () => {
      const res = await request(app).post('/api/auth/guest');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('isGuest', true);
      guestToken = res.body.token;
    });

    it('GET /api/auth/me returns user profile when valid token provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${guestToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('isGuest', true);
    });

    it('GET /api/auth/me rejects invalid or missing token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Workspaces Routes', () => {
    it('GET /api/workspaces returns seeded demo workspaces', async () => {
      const res = await request(app).get('/api/workspaces');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('workspaces');
      expect(Array.isArray(res.body.workspaces)).toBe(true);
      expect(res.body.workspaces.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/workspaces/:wid returns single workspace details', async () => {
      const listRes = await request(app).get('/api/workspaces');
      const wid = listRes.body.workspaces[0].id;

      const res = await request(app).get(`/api/workspaces/${wid}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('workspace');
      expect(res.body.workspace.id).toBe(wid);
    });

    it('GET /api/workspaces/:wid/sources returns source documents', async () => {
      const listRes = await request(app).get('/api/workspaces');
      const wid = listRes.body.workspaces[0].id;

      const res = await request(app).get(`/api/workspaces/${wid}/sources`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sources');
      expect(Array.isArray(res.body.sources)).toBe(true);
    });

    it('GET /api/workspaces/:wid/tables returns structured extraction tables', async () => {
      const listRes = await request(app).get('/api/workspaces');
      const wid = listRes.body.workspaces[0].id;

      const res = await request(app).get(`/api/workspaces/${wid}/tables`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tables');
      expect(Array.isArray(res.body.tables)).toBe(true);
    });
  });
});
