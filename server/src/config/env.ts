import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  OPENALEX_API_KEY: z.string().optional(),
  OPENALEX_EMAIL: z.string().default('researcher@lumina-ai.local'),
  JWT_SECRET: z.string().default('lumina-super-secret-jwt-key-2026-production'),
  DEMO_MODE: z.preprocess((val) => val === 'true' || val === true || val === '1', z.boolean().default(false)),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Invalid environment variables:', error.errors);
  }
  parsedEnv = envSchema.parse({});
}

export const env = parsedEnv;
