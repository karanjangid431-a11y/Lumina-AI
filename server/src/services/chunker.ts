import crypto from 'crypto';

export interface RawDocumentInput {
  text: string;
  pages?: { pageNumber: number; text: string }[];
}

export interface ChunkOutput {
  chunkIndex: number;
  pageNumber: number;
  sectionTitle?: string;
  content: string;
  tokenCount: number;
}

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex');
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).length * 1.3);
}

// Structure-aware chunking supporting both single-page text and multi-page documents
export function chunkDocument(doc: RawDocumentInput, targetChunkSize = 750, overlap = 100): ChunkOutput[] {
  const chunks: ChunkOutput[] = [];
  let chunkIndex = 0;

  // If pages are provided (from PDF parser)
  if (doc.pages && doc.pages.length > 0) {
    for (const page of doc.pages) {
      const pageChunks = chunkText(page.text, targetChunkSize, overlap, page.pageNumber, chunkIndex);
      chunks.push(...pageChunks);
      chunkIndex += pageChunks.length;
    }
  } else {
    // Single continuous text (DOCX, TXT, URL)
    chunks.push(...chunkText(doc.text, targetChunkSize, overlap, 1, 0));
  }

  return chunks;
}

function chunkText(
  text: string,
  targetSize: number,
  overlap: number,
  pageNumber: number,
  startIndex: number
): ChunkOutput[] {
  const result: ChunkOutput[] = [];
  if (!text || text.trim().length === 0) return result;

  // Split text by structural boundaries (Markdown headings, double newlines, numbered clauses)
  const paragraphs = text
    .split(/\n\s*\n|(?=^#{1,4}\s)|(?=^(?:ARTICLE|SECTION|CLAUSE)\s+[0-9IVX]+)/im)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let currentChunk = '';
  let currentSection = 'General';
  let currentIndex = startIndex;

  for (const para of paragraphs) {
    // Check if paragraph looks like a section header
    const headerMatch = para.match(/^(?:#{1,4}\s+|ARTICLE\s+[0-9IVX]+|SECTION\s+[0-9IVX]+|CLAUSE\s+[0-9IVX]+)(.*)/i);
    if (headerMatch) {
      currentSection = para.slice(0, 80).trim();
    }

    if (currentChunk.length + para.length > targetSize && currentChunk.length > 0) {
      result.push({
        chunkIndex: currentIndex++,
        pageNumber,
        sectionTitle: currentSection,
        content: currentChunk.trim(),
        tokenCount: estimateTokenCount(currentChunk),
      });

      // Keep overlap from end of previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.max(10, Math.floor(overlap / 5))).join(' ');
      currentChunk = overlapWords + '\n\n' + para;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    }
  }

  if (currentChunk.trim().length > 0) {
    result.push({
      chunkIndex: currentIndex++,
      pageNumber,
      sectionTitle: currentSection,
      content: currentChunk.trim(),
      tokenCount: estimateTokenCount(currentChunk),
    });
  }

  return result;
}
