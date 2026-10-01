import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

let genAIClient: GoogleGenAI | null = null;
let legacyGenAI: GoogleGenerativeAI | null = null;

if (env.GEMINI_API_KEY) {
  try {
    genAIClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  } catch (err: any) {
    console.warn('Failed to init @google/genai client, trying fallback:', err.message);
  }

  try {
    legacyGenAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  } catch (err: any) {
    console.warn('Failed to init @google/generative-ai client:', err.message);
  }
}

// L2-normalize vector to unit length
export function l2Normalize(vector: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vector;
  return vector.map((val) => val / norm);
}

// Deterministic pseudo-embedding generator for demo mode or offline development
function generateDeterministicEmbedding(text: string, dim: number = 768): number[] {
  const embedding: number[] = new Array(dim).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  
  for (let i = 0; i < dim; i++) {
    const seed = (hash + i * 997) % 10000;
    embedding[i] = Math.sin(seed);
  }
  return l2Normalize(embedding);
}

// Check configured Gemini model at startup
export async function verifyGeminiModel(): Promise<boolean> {
  if (!env.GEMINI_API_KEY) {
    console.log('[Gemini] No GEMINI_API_KEY configured. Running in high-fidelity Demo / Offline mode.');
    return false;
  }

  console.log(`[Gemini] Verifying configured model: ${env.GEMINI_MODEL}...`);
  try {
    if (legacyGenAI) {
      const model = legacyGenAI.getGenerativeModel({ model: env.GEMINI_MODEL });
      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Respond with OK.' }] }],
        generationConfig: { maxOutputTokens: 10 },
      });
      const txt = res.response.text();
      console.log(`[Gemini] Model ${env.GEMINI_MODEL} verified successfully. Response: ${txt.trim()}`);
      return true;
    }
  } catch (err: any) {
    console.warn(`[Gemini WARNING] Configured model ${env.GEMINI_MODEL} test failed: ${err.message}. System will use resilient fallbacks.`);
  }
  return false;
}

// Embed text with gemini-embedding-001 (768 dimensions)
export async function embedText(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
  if (!env.GEMINI_API_KEY) {
    return generateDeterministicEmbedding(text);
  }

  try {
    if (legacyGenAI) {
      const embeddingModel = legacyGenAI.getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL });
      const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
      });
      if (result.embedding?.values) {
        // Output dimension 768 with manual L2 normalization as required
        const raw = result.embedding.values.slice(0, 768);
        return l2Normalize(raw);
      }
    }
  } catch (err: any) {
    console.warn(`[Embedding Warning] Gemini embedding failed (${err.message}). Using deterministic fallback.`);
  }

  return generateDeterministicEmbedding(text);
}

// Generate structured JSON with Gemini
export async function generateJSON<T>(systemPrompt: string, userPrompt: string, fallbackData: T): Promise<T> {
  if (!env.GEMINI_API_KEY) {
    return fallbackData;
  }

  try {
    if (legacyGenAI) {
      const model = legacyGenAI.getGenerativeModel({
        model: env.GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const response = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const text = response.response.text();
      return JSON.parse(text) as T;
    }
  } catch (err: any) {
    console.warn(`[Gemini generateJSON Error] ${err.message}. Falling back to default data.`);
  }

  return fallbackData;
}

// Generate grounded text response
export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    return 'Demo mode: response synthesized based on stored evidence passages.';
  }

  try {
    if (legacyGenAI) {
      const model = legacyGenAI.getGenerativeModel({
        model: env.GEMINI_MODEL,
        generationConfig: {
          temperature: 0.2,
        },
      });

      const response = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      return response.response.text();
    }
  } catch (err: any) {
    console.warn(`[Gemini generateText Error] ${err.message}`);
    return `Error generating response: ${err.message}`;
  }

  return 'No response generated.';
}
