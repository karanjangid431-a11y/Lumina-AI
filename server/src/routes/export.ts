import { Router, Request, Response } from 'express';
import { inMemoryStore, SourceRecord } from '../db/pool.js';
import { exportToBibTeX, exportToRIS, exportLiteratureReviewMarkdown, exportTableToCSV } from '../services/export.js';

const router = Router({ mergeParams: true });

// Export BibTeX
router.get('/bibtex', (req: Request, res: Response) => {
  const { wid } = req.params;
  const sources = Array.from(inMemoryStore.sources.values()).filter((s) => s.workspace_id === wid);

  const bibtex = exportToBibTeX(sources);
  res.setHeader('Content-Type', 'application/x-bibtex');
  res.setHeader('Content-Disposition', `attachment; filename="lumina_${wid}_sources.bib"`);
  return res.send(bibtex);
});

// Export RIS
router.get('/ris', (req: Request, res: Response) => {
  const { wid } = req.params;
  const sources = Array.from(inMemoryStore.sources.values()).filter((s) => s.workspace_id === wid);

  const ris = exportToRIS(sources);
  res.setHeader('Content-Type', 'application/x-research-info-systems');
  res.setHeader('Content-Disposition', `attachment; filename="lumina_${wid}_sources.ris"`);
  return res.send(ris);
});

// Export Sources as CSV
router.get('/csv', (req: Request, res: Response) => {
  const { wid } = req.params;
  const sources = Array.from(inMemoryStore.sources.values()).filter((s) => s.workspace_id === wid);

  const headers = ['Title', 'Authors', 'Year', 'Venue', 'Citations', 'Open Access', 'Type', 'DOI', 'URL'];
  const escapeCSV = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;

  const rows = [
    headers.join(','),
    ...sources.map((s) =>
      [
        escapeCSV(s.title),
        escapeCSV(s.authors.join('; ')),
        escapeCSV(s.year),
        escapeCSV(s.venue),
        escapeCSV(s.citation_count),
        escapeCSV(s.open_access ? 'Yes' : 'No'),
        escapeCSV(s.source_type),
        escapeCSV(s.doi),
        escapeCSV(s.url),
      ].join(',')
    ),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="lumina_${wid}_sources.csv"`);
  return res.send(rows.join('\n'));
});

// Export Markdown Literature Review
router.get('/markdown', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const ws = inMemoryStore.workspaces.get(wid);
  const sources = Array.from(inMemoryStore.sources.values()).filter((s) => s.workspace_id === wid);
  const synthesis = inMemoryStore.insights.get(`${wid}:synthesis`);

  const md = exportLiteratureReviewMarkdown(ws?.name || 'Workspace', sources, synthesis);
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="lumina_${wid}_literature_review.md"`);
  return res.send(md);
});

// Export Table to CSV
router.get('/table/:tid/csv', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const tid = req.params.tid as string;
  const table = inMemoryStore.extractionTables.get(tid);
  if (!table || table.workspace_id !== wid) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const csv = exportTableToCSV(table.columns, table.rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="lumina_table_${tid}.csv"`);
  return res.send(csv);
});

export default router;
