export interface CitationInput {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  pageNumber: number;
  quote: string;
}

export interface VerifiedCitation extends CitationInput {
  verified: boolean;
  matchScore: number;
  highlightOffset?: { start: number; end: number };
}

export interface VerificationResult {
  citations: VerifiedCitation[];
  totalCitations: number;
  verifiedCount: number;
  integrityRatio: number;
  allVerified: boolean;
}

// Normalize text for resilient quote verification
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[“”"']/g, '"')
    .replace(/[\u2010-\u2015]/g, '-') // normalize hyphens/dashes
    .replace(/\s+/g, ' ')
    .trim();
}

// Compute Levenshtein distance for fuzzy quote match fallback
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

// Verify a single quote against candidate chunk content
export function verifyQuote(quote: string, chunkContent: string): { verified: boolean; matchScore: number; offset?: { start: number; end: number } } {
  if (!quote || !chunkContent) {
    return { verified: false, matchScore: 0 };
  }

  const cleanQuote = quote.trim();
  const cleanChunk = chunkContent.trim();

  // 1. Direct exact substring match
  const exactIndex = cleanChunk.indexOf(cleanQuote);
  if (exactIndex !== -1) {
    return {
      verified: true,
      matchScore: 1.0,
      offset: { start: exactIndex, end: exactIndex + cleanQuote.length },
    };
  }

  // 2. Normalized substring match (ignoring whitespace differences and smart quotes)
  const normQuote = normalizeText(cleanQuote);
  const normChunk = normalizeText(cleanChunk);

  const normIndex = normChunk.indexOf(normQuote);
  if (normIndex !== -1) {
    return {
      verified: true,
      matchScore: 0.98,
    };
  }

  // 3. Sliding window token overlap for longer quotes that may span line wraps
  const quoteWords = normQuote.split(' ').filter(Boolean);
  if (quoteWords.length >= 4) {
    const chunkWords = normChunk.split(' ').filter(Boolean);
    const windowSize = quoteWords.length;

    let bestScore = 0;
    for (let i = 0; i <= chunkWords.length - windowSize; i++) {
      const windowStr = chunkWords.slice(i, i + windowSize).join(' ');
      const dist = levenshteinDistance(normQuote, windowStr);
      const similarity = 1 - dist / Math.max(normQuote.length, windowStr.length);
      if (similarity > bestScore) {
        bestScore = similarity;
      }
    }

    if (bestScore >= 0.85) {
      return { verified: true, matchScore: bestScore };
    }
  }

  return { verified: false, matchScore: 0 };
}

// Server-side verification for an array of claims/citations against the stored chunks
export function verifyCitations(
  citations: CitationInput[],
  getChunkText: (chunkId: string) => string | undefined
): VerificationResult {
  const verifiedList: VerifiedCitation[] = [];
  let verifiedCount = 0;

  for (const cit of citations) {
    const chunkText = getChunkText(cit.chunkId);
    if (!chunkText) {
      verifiedList.push({
        ...cit,
        verified: false,
        matchScore: 0,
      });
      continue;
    }

    const { verified, matchScore, offset } = verifyQuote(cit.quote, chunkText);
    if (verified) {
      verifiedCount++;
    }

    verifiedList.push({
      ...cit,
      verified,
      matchScore,
      highlightOffset: offset,
    });
  }

  const total = citations.length;
  const ratio = total > 0 ? verifiedCount / total : 1;

  return {
    citations: verifiedList,
    totalCitations: total,
    verifiedCount,
    integrityRatio: ratio,
    allVerified: verifiedCount === total,
  };
}
