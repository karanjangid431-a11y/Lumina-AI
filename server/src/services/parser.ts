import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { RawDocumentInput } from './chunker.js';

export interface ParseResult {
  title: string;
  doc: RawDocumentInput;
  isScanned?: boolean;
}

// SSRF Protection: Check if URL targets internal / private IPs or localhost
export function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') || // Cloud metadata IP
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Parse PDF file buffer
export async function parsePdfBuffer(buffer: Buffer): Promise<ParseResult> {
  const pages: { pageNumber: number; text: string }[] = [];
  
  // Custom pager render to capture text per page
  const options = {
    pagerender: (pageData: any) => {
      return pageData.getTextContent().then((textContent: any) => {
        let lastY, text = '';
        for (const item of textContent.items) {
          if (lastY == item.transform[5] || !lastY) {
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        pages.push({
          pageNumber: pageData.pageIndex + 1,
          text: text.trim(),
        });
        return text;
      });
    }
  };

  const parsed = await pdfParse(buffer, options);
  const fullText = parsed.text || pages.map((p) => p.text).join('\n\n');
  const isScanned = fullText.trim().length < 50;

  return {
    title: parsed.info?.Title || 'Uploaded PDF Document',
    doc: {
      text: fullText,
      pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText }],
    },
    isScanned,
  };
}

// Parse DOCX buffer
export async function parseDocxBuffer(buffer: Buffer): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value || '';
  return {
    title: 'Uploaded Word Document',
    doc: {
      text,
      pages: [{ pageNumber: 1, text }],
    },
  };
}

// Parse Plain Text or Markdown
export function parsePlainText(content: string, filename = 'Uploaded Document'): ParseResult {
  return {
    title: filename.replace(/\.[^/.]+$/, ''),
    doc: {
      text: content,
      pages: [{ pageNumber: 1, text: content }],
    },
  };
}

// Ingest from URL with SSRF protection and Readability content extraction
export async function parseUrl(urlString: string): Promise<ParseResult> {
  if (!isSafeUrl(urlString)) {
    throw new Error('Access to private or localhost addresses is prohibited.');
  }

  const response = await fetch(urlString, {
    headers: {
      'User-Agent': 'LuminaAI-Researcher/1.0 (+https://github.com/lumina-ai)',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url: urlString });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error('Could not extract readable article text from the provided URL.');
  }

  return {
    title: article.title || dom.window.document.title || 'Web Document',
    doc: {
      text: article.textContent.trim(),
      pages: [{ pageNumber: 1, text: article.textContent.trim() }],
    },
  };
}
