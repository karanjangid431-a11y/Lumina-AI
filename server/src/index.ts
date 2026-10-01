import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { initDatabase } from './db/pool.js';
import { verifyGeminiModel } from './services/gemini.js';
import { seedDemoWorkspaces } from './demo/sampleData.js';

// Route imports
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import sourceRoutes from './routes/sources.js';
import discoverRoutes from './routes/discover.js';
import qaRoutes from './routes/qa.js';
import insightsRoutes from './routes/insights.js';
import tableRoutes from './routes/tables.js';
import exportRoutes from './routes/export.js';
import feedbackRoutes from './routes/feedback.js';
import sharedRoutes from './routes/shared.js';
import voiceRoutes from './routes/voice.js';
import scanRoutes from './routes/scan.js';
import visionRoutes from './routes/vision.js';
import eventRoutes from './routes/events.js';
import reasoningRoutes from './routes/reasoning.js';
import gapRadarRoutes from './routes/gapRadar.js';

const app = express();

// Security and CORS middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible inline fonts & preview embeds
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or any localhost/gh-pages
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/demo
      }
    },
    credentials: true,
  })
);

// Rate limiter for general and AI endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    geminiModel: env.GEMINI_MODEL,
    embeddingModel: env.GEMINI_EMBEDDING_MODEL,
    demoMode: env.DEMO_MODE,
  });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:wid/sources', sourceRoutes);
app.use('/api/workspaces/:wid/discover', discoverRoutes);
app.use('/api/workspaces/:wid/qa', qaRoutes);
app.use('/api/workspaces/:wid/insights', insightsRoutes);
app.use('/api/workspaces/:wid/tables', tableRoutes);
app.use('/api/workspaces/:wid/export', exportRoutes);
app.use('/api/workspaces/:wid/feedback', feedbackRoutes);
app.use('/api/workspaces/:wid/voice', voiceRoutes);
app.use('/api/workspaces/:wid/scan', scanRoutes);
app.use('/api/workspaces/:wid/vision', visionRoutes);
app.use('/api/workspaces/:wid/events', eventRoutes);
app.use('/api/workspaces/:wid/qa', reasoningRoutes);
app.use('/api/workspaces/:wid/insights', gapRadarRoutes);
app.use('/api', sharedRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Start Server
async function startServer() {
  console.log('==================================================');
  console.log('🚀 Starting Lumina-AI Backend Server...');
  console.log('==================================================');

  // Initialize DB (Postgres or In-Memory)
  await initDatabase();

  // Verify configured Gemini model
  await verifyGeminiModel();

  // Seed rich demo workspaces (Academic, Legal, Business)
  await seedDemoWorkspaces();

  const server = app.listen(env.PORT, () => {
    console.log(`✨ Lumina-AI server running on http://localhost:${env.PORT}`);
    console.log(`📡 API Base: http://localhost:${env.PORT}/api`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down Lumina-AI server gracefully...');
    server.close(() => {
      console.log('Server terminated.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer().catch((err) => {
    console.error('Fatal error during server startup:', err);
    process.exit(1);
  });
}

export default app;
