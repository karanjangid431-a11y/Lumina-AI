import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ChunkRecord {
  id: string;
  source_id: string;
  workspace_id: string;
  chunk_index: number;
  page_number: number;
  section_title?: string;
  content: string;
  embedding?: number[];
  token_count: number;
  created_at: Date;
}

export interface SourceRecord {
  id: string;
  workspace_id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  citation_count: number;
  open_access: boolean;
  url?: string;
  doi?: string;
  source_type: 'paper' | 'pdf' | 'docx' | 'txt' | 'url';
  content_hash: string;
  raw_text?: string;
  metadata: Record<string, any>;
  ingestion_status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: Date;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string;
  mode: 'academic' | 'legal' | 'business' | 'general';
  domain: string;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// In-Memory Database store for local development, demo mode, and offline fallback
class InMemoryDB {
  workspaces = new Map<string, WorkspaceRecord>();
  sources = new Map<string, SourceRecord>();
  chunks = new Map<string, ChunkRecord>();
  qaSessions = new Map<string, any>();
  qaMessages = new Map<string, any>();
  insights = new Map<string, any>(); // key: workspaceId:insightType
  extractionTables = new Map<string, any>();
  annotations = new Map<string, any>();
  collections = new Map<string, any>();
  teamMembers = new Map<string, any>();
  sharedLinks = new Map<string, any>();
  feedback = new Map<string, any>();
  retrievalLogs = new Map<string, any>();
  cache = new Map<string, { value: any; expiresAt: number }>();
}

export const inMemoryStore = new InMemoryDB();

let pgPool: pg.Pool | null = null;
let isPostgresAvailable = false;

export async function initDatabase(): Promise<{ isPostgres: boolean }> {
  if (env.DATABASE_URL) {
    try {
      console.log('Attempting connection to PostgreSQL...');
      pgPool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      });

      const client = await pgPool.connect();
      try {
        await client.query('SELECT 1');
        console.log('Connected to PostgreSQL successfully.');
        isPostgresAvailable = true;

        // Run migrations
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
          console.log('Database schema and pgvector initialized.');
        }
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn(`PostgreSQL connection failed (${err.message}). Falling back to high-performance in-memory vector database.`);
      isPostgresAvailable = false;
      pgPool = null;
    }
  } else {
    console.log('No DATABASE_URL provided. Operating with in-memory vector store.');
    isPostgresAvailable = false;
  }

  return { isPostgres: isPostgresAvailable };
}

export function getPool(): pg.Pool | null {
  return pgPool;
}

export function isUsingPostgres(): boolean {
  return isPostgresAvailable;
}

// Vector math helper for cosine similarity
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
