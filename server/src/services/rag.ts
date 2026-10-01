import { inMemoryStore, isUsingPostgres, getPool, cosineSimilarity, ChunkRecord, SourceRecord } from '../db/pool.js';
import { embedText, generateJSON } from './gemini.js';
import { verifyCitations, VerifiedCitation } from './verification.js';

export interface RetrievedChunk {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  pageNumber: number;
  sectionTitle?: string;
  content: string;
  vectorScore: number;
  keywordScore: number;
  rrfScore: number;
  rerankScore: number;
}

export interface GroundedAnswerResult {
  answer: string;
  citations: VerifiedCitation[];
  verifiedCount: number;
  totalCitations: number;
  confidence: number;
  refused: boolean;
  refusalReason?: string;
  retrievalTrace: {
    query: string;
    totalChunksScanned: number;
    topRetrievedChunks: Array<{
      chunkId: string;
      sourceTitle: string;
      pageNumber: number;
      vectorScore: number;
      keywordScore: number;
      rrfScore: number;
      rerankScore: number;
      wasCited: boolean;
    }>;
    retrievalLatencyMs: number;
    generationLatencyMs: number;
  };
  suggestedFollowUps: string[];
}

// Compute Reciprocal Rank Fusion
export function computeRRF(
  vectorRanks: Map<string, number>,
  keywordRanks: Map<string, number>,
  k = 60
): Map<string, number> {
  const rrfScores = new Map<string, number>();

  const allIds = new Set([...vectorRanks.keys(), ...keywordRanks.keys()]);
  for (const id of allIds) {
    const vRank = vectorRanks.get(id) ?? 1000;
    const kRank = keywordRanks.get(id) ?? 1000;

    const vScore = 1 / (k + vRank);
    const kScore = 1 / (k + kRank);
    rrfScores.set(id, vScore + kScore);
  }

  return rrfScores;
}

// In-Memory Hybrid Search
async function hybridSearchInMemory(
  workspaceId: string,
  query: string,
  queryEmbedding: number[],
  limit = 12
): Promise<RetrievedChunk[]> {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'what', 'how', 'when', 'where', 'which', 'who', 'why', 'that', 'this', 'from', 'have', 'has', 'had', 'does', 'did', 'are', 'was', 'were', 'been', 'will', 'would', 'could', 'should']);
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));
  const candidateChunks: ChunkRecord[] = [];

  // Filter chunks for workspace
  for (const chunk of inMemoryStore.chunks.values()) {
    if (chunk.workspace_id === workspaceId) {
      candidateChunks.push(chunk);
    }
  }

  if (candidateChunks.length === 0) return [];

  // 1. Vector Search
  const vectorScores = candidateChunks.map((chunk) => {
    const similarity = chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
    return { chunk, score: similarity };
  });
  vectorScores.sort((a, b) => b.score - a.score);

  const vectorRanks = new Map<string, number>();
  vectorScores.forEach((item, index) => {
    vectorRanks.set(item.chunk.id, index + 1);
  });

  // 2. Keyword Search (Lexical matching score)
  const keywordScores = candidateChunks.map((chunk) => {
    const textLower = chunk.content.toLowerCase();
    const chunkWords = new Set(textLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/));
    let matches = 0;
    const matchesList = [];
    for (const term of queryTerms) {
      if (chunkWords.has(term)) {
        matches++;
        matchesList.push(term);
      } else if (term.length > 5) {
        const stem = term.slice(0, 5);
        for (const w of chunkWords) {
          if (w.startsWith(stem)) {
            matches++;
            matchesList.push(`${term}~${w}`);
            break;
          }
        }
      }
    }
    const score = queryTerms.length > 0 ? matches / queryTerms.length : 0;
    // if (score > 0) console.log(`[Word Match] In ${chunk.id}: matches=${matchesList.join(', ')}`);
    return { chunk, score };
  });
  keywordScores.sort((a, b) => b.score - a.score);

  const keywordRanks = new Map<string, number>();
  keywordScores.forEach((item, index) => {
    keywordRanks.set(item.chunk.id, index + 1);
  });

  // 3. Merge with RRF
  const rrfScores = computeRRF(vectorRanks, keywordRanks);

  // Map to RetrievedChunk list
  const vectorScoreMap = new Map(vectorScores.map((v) => [v.chunk.id, v.score]));
  const keywordScoreMap = new Map(keywordScores.map((k) => [k.chunk.id, k.score]));

  const merged = candidateChunks.map((chunk) => {
    const source = inMemoryStore.sources.get(chunk.source_id);
    const vScore = vectorScoreMap.get(chunk.id) || 0;
    const kScore = keywordScoreMap.get(chunk.id) || 0;
    const rrfScore = rrfScores.get(chunk.id) || 0;

    // Fast rerank score heuristic combining semantic + exact matches
    const rerankScore = kScore >= 0.5 ? vScore * 0.4 + kScore * 0.6 : vScore * 0.6 + kScore * 0.4;

    return {
      chunkId: chunk.id,
      sourceId: chunk.source_id,
      sourceTitle: source?.title || 'Unknown Source',
      pageNumber: chunk.page_number,
      sectionTitle: chunk.section_title,
      content: chunk.content,
      vectorScore: Number(vScore.toFixed(4)),
      keywordScore: Number(kScore.toFixed(4)),
      rrfScore: Number(rrfScore.toFixed(6)),
      rerankScore: Number(rerankScore.toFixed(4)),
    };
  });

  merged.sort((a, b) => b.rerankScore - a.rerankScore);
  return merged.slice(0, limit);
}

// PostgreSQL Hybrid Search
async function hybridSearchPostgres(
  workspaceId: string,
  query: string,
  queryEmbedding: number[],
  limit = 12
): Promise<RetrievedChunk[]> {
  const pool = getPool();
  if (!pool) return hybridSearchInMemory(workspaceId, query, queryEmbedding, limit);

  try {
    const vectorStr = `[${queryEmbedding.join(',')}]`;
    const sql = `
      WITH vector_search AS (
        SELECT id, 1 - (embedding <=> $2::vector) AS vector_similarity,
               ROW_NUMBER() OVER (ORDER BY embedding <=> $2::vector) AS vector_rank
        FROM chunks
        WHERE workspace_id = $1 AND embedding IS NOT NULL
        LIMIT 50
      ),
      text_search AS (
        SELECT id, ts_rank(tsv, plainto_tsquery('english', $3)) AS keyword_score,
               ROW_NUMBER() OVER (ORDER BY ts_rank(tsv, plainto_tsquery('english', $3)) DESC) AS keyword_rank
        FROM chunks
        WHERE workspace_id = $1 AND tsv @@ plainto_tsquery('english', $3)
        LIMIT 50
      )
      SELECT c.id AS chunk_id, c.source_id, s.title AS source_title, c.page_number,
             c.section_title, c.content,
             COALESCE(v.vector_similarity, 0) AS vector_score,
             COALESCE(t.keyword_score, 0) AS keyword_score,
             (COALESCE(1.0 / (60 + v.vector_rank), 0) + COALESCE(1.0 / (60 + t.keyword_rank), 0)) AS rrf_score
      FROM chunks c
      JOIN sources s ON c.source_id = s.id
      LEFT JOIN vector_search v ON c.id = v.id
      LEFT JOIN text_search t ON c.id = t.id
      WHERE c.workspace_id = $1 AND (v.id IS NOT NULL OR t.id IS NOT NULL)
      ORDER BY rrf_score DESC
      LIMIT $4;
    `;

    const res = await pool.query(sql, [workspaceId, vectorStr, query, limit]);
    return res.rows.map((r: any) => ({
      chunkId: r.chunk_id,
      sourceId: r.source_id,
      sourceTitle: r.source_title,
      pageNumber: r.page_number,
      sectionTitle: r.section_title,
      content: r.content,
      vectorScore: Number(r.vector_score),
      keywordScore: Number(r.keyword_score),
      rrfScore: Number(r.rrf_score),
      rerankScore: Number(r.vector_score * 0.7 + r.keyword_score * 0.3),
    }));
  } catch (err: any) {
    console.warn(`Postgres hybrid search failed: ${err.message}. Using in-memory fallback.`);
    return hybridSearchInMemory(workspaceId, query, queryEmbedding, limit);
  }
}

// Complete Grounded Q&A Execution with Answerability Gate and Quote Verification
export async function executeGroundedQA(
  workspaceId: string,
  query: string,
  options: {
    selectedSourceIds?: string[];
    mode?: 'academic' | 'legal' | 'business' | 'general';
    plainLanguage?: boolean;
    targetLanguage?: string;
  } = {}
): Promise<GroundedAnswerResult> {
  const startTime = Date.now();

  // 1. Embed query with RETRIEVAL_QUERY task type
  const queryEmbedding = await embedText(query, 'RETRIEVAL_QUERY');

  // 2. Hybrid search (vector + keyword + RRF)
  let retrievedChunks: RetrievedChunk[] = [];
  if (isUsingPostgres()) {
    retrievedChunks = await hybridSearchPostgres(workspaceId, query, queryEmbedding, 10);
  } else {
    retrievedChunks = await hybridSearchInMemory(workspaceId, query, queryEmbedding, 10);
  }

  // Filter by selectedSourceIds if provided
  if (options.selectedSourceIds && options.selectedSourceIds.length > 0) {
    const allowed = new Set(options.selectedSourceIds);
    retrievedChunks = retrievedChunks.filter((c) => allowed.has(c.sourceId));
  }

  const retrievalDuration = Date.now() - startTime;

  // 3. Answerability Gate: Check if adequate evidence exists
  const maxVectorScore = retrievedChunks.length > 0 ? Math.max(...retrievedChunks.map((c) => c.vectorScore)) : 0;
  const maxKeywordScore = retrievedChunks.length > 0 ? Math.max(...retrievedChunks.map((c) => c.keywordScore)) : 0;
  console.log(`[Gate Check] "${query}" -> key: ${maxKeywordScore}, vec: ${maxVectorScore}`);

  if (retrievedChunks.length === 0 || maxKeywordScore < 0.25 || (maxVectorScore < 0.40 && maxKeywordScore < 0.35)) {
    return {
      answer:
        'Insufficient evidence in the current workspace sources to answer this question accurately. Please add relevant papers or documents to your library.',
      citations: [],
      verifiedCount: 0,
      totalCitations: 0,
      confidence: 0,
      refused: true,
      refusalReason: 'Insufficient semantic and keyword overlap with workspace documents.',
      retrievalTrace: {
        query,
        totalChunksScanned: retrievedChunks.length,
        topRetrievedChunks: [],
        retrievalLatencyMs: retrievalDuration,
        generationLatencyMs: 0,
      },
      suggestedFollowUps: [
        'Try searching for broader keywords in Discover',
        'Upload domain-specific documents or literature reviews',
      ],
    };
  }

  // 4. Construct Grounded Prompt with Evidence Passages
  const evidenceContext = retrievedChunks
    .map(
      (c, idx) =>
        `[E${idx + 1}] Source: "${c.sourceTitle}" (Page ${c.pageNumber}, Chunk ID: ${c.chunkId}):\n"${c.content}"`
    )
    .join('\n\n');

  const modeInstruction =
    options.mode === 'legal'
      ? 'Adopt a legal analyst tone: identify exact clauses, conditions, obligations, risk levels, and disclaimers. Always note: Informational only. Not legal advice.'
      : options.mode === 'business'
      ? 'Adopt an executive analyst tone: focus on KPIs, figures, operational risks, timeline milestones, and strategic decisions.'
      : 'Adopt a rigorous academic tone: summarize empirical findings, methodologies, statistical significance, and limitations.';

  const languageInstruction = options.targetLanguage && options.targetLanguage.toLowerCase() !== 'english'
    ? `Translate the final response into ${options.targetLanguage}, while keeping citations intact.`
    : '';

  const plainLanguageInstruction = options.plainLanguage
    ? 'Explain in simple, intuitive language accessible to a non-specialist without losing accuracy.'
    : '';

  const systemPrompt = `You are Lumina-AI, a trusted research assistant.
CRITICAL RULES:
1. ONLY make claims directly supported by the provided evidence passages [E1], [E2], etc.
2. For EVERY claim or finding, attach citation references like [E1], [E2].
3. For EVERY citation, provide the exact quote copied verbatim from the evidence passage.
4. If the evidence does not mention something, explicitly state that it is not covered. DO NOT guess or hallucinate.
${modeInstruction}
${languageInstruction}
${plainLanguageInstruction}

Return a valid JSON object matching this schema:
{
  "answer": "Grounded answer text with inline citation tokens [E1], [E2]...",
  "citations": [
    {
      "evidenceIndex": 1,
      "chunkId": "string",
      "sourceId": "string",
      "sourceTitle": "string",
      "pageNumber": 1,
      "quote": "verbatim quoted text directly from chunk"
    }
  ],
  "suggestedFollowUps": ["Question 1?", "Question 2?", "Question 3?"]
}`;

  const userPrompt = `User Question: "${query}"\n\nAVAILABLE EVIDENCE PASSAGES:\n${evidenceContext}`;

  const genStart = Date.now();

  const fallbackAnswer: {
    answer: string;
    citations: Array<{ evidenceIndex: number; chunkId: string; sourceId: string; sourceTitle: string; pageNumber: number; quote: string }>;
    suggestedFollowUps: string[];
  } = {
    answer: `Based on **${retrievedChunks[0].sourceTitle}** (p. ${retrievedChunks[0].pageNumber}), ${retrievedChunks[0].content.slice(0, 220)}... [E1]`,
    citations: [
      {
        evidenceIndex: 1,
        chunkId: retrievedChunks[0].chunkId,
        sourceId: retrievedChunks[0].sourceId,
        sourceTitle: retrievedChunks[0].sourceTitle,
        pageNumber: retrievedChunks[0].pageNumber,
        quote: retrievedChunks[0].content.slice(0, 100),
      },
    ],
    suggestedFollowUps: [
      'What are the key limitations described in this methodology?',
      'How does this approach compare with other workspace sources?',
    ],
  };

  const generated = await generateJSON<typeof fallbackAnswer>(systemPrompt, userPrompt, fallbackAnswer);
  const genDuration = Date.now() - genStart;

  // 5. Server-side Quote Verification
  const chunkTextLookup = new Map<string, string>();
  for (const c of retrievedChunks) {
    chunkTextLookup.set(c.chunkId, c.content);
  }

  // Also fill in chunkId & sourceId from evidence index if LLM omitted them
  const formattedCitations = (generated.citations || []).map((cit) => {
    const evidenceChunk = retrievedChunks[cit.evidenceIndex - 1] || retrievedChunks[0];
    return {
      chunkId: cit.chunkId || evidenceChunk.chunkId,
      sourceId: cit.sourceId || evidenceChunk.sourceId,
      sourceTitle: cit.sourceTitle || evidenceChunk.sourceTitle,
      pageNumber: cit.pageNumber || evidenceChunk.pageNumber,
      quote: cit.quote || evidenceChunk.content.slice(0, 60),
    };
  });

  const verification = verifyCitations(formattedCitations, (id) => chunkTextLookup.get(id));

  // Compute confidence score based on retrieval similarity and verification ratio
  const avgVectorScore =
    retrievedChunks.slice(0, 3).reduce((acc, c) => acc + c.vectorScore, 0) /
    Math.min(3, retrievedChunks.length);
  const confidence = Number((avgVectorScore * 0.5 + verification.integrityRatio * 0.5).toFixed(2));

  const citedChunkIds = new Set(verification.citations.map((c) => c.chunkId));

  return {
    answer: generated.answer,
    citations: verification.citations,
    verifiedCount: verification.verifiedCount,
    totalCitations: verification.totalCitations,
    confidence: Math.max(0.1, Math.min(1.0, confidence)),
    refused: false,
    retrievalTrace: {
      query,
      totalChunksScanned: retrievedChunks.length,
      topRetrievedChunks: retrievedChunks.map((c) => ({
        chunkId: c.chunkId,
        sourceTitle: c.sourceTitle,
        pageNumber: c.pageNumber,
        vectorScore: c.vectorScore,
        keywordScore: c.keywordScore,
        rrfScore: c.rrfScore,
        rerankScore: c.rerankScore,
        wasCited: citedChunkIds.has(c.chunkId),
      })),
      retrievalLatencyMs: retrievalDuration,
      generationLatencyMs: genDuration,
    },
    suggestedFollowUps: generated.suggestedFollowUps || fallbackAnswer.suggestedFollowUps,
  };
}
