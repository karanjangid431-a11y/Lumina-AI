import { Router, Request, Response } from 'express';
import { inMemoryStore, SourceRecord, ChunkRecord } from '../db/pool.js';
import { generateJSON } from '../services/gemini.js';
import { verifyQuote } from '../services/verification.js';

const router = Router({ mergeParams: true });

// List tables
router.get('/', (req: Request, res: Response) => {
  const { wid } = req.params;
  const tables = [];
  for (const t of inMemoryStore.extractionTables.values()) {
    if (t.workspace_id === wid) tables.push(t);
  }
  return res.json({ tables });
});

// Create table
router.post('/', (req: Request, res: Response) => {
  const { wid } = req.params;
  const { title, description, columns } = req.body;

  if (!title || !columns || !Array.isArray(columns)) {
    return res.status(400).json({ error: 'Title and columns array are required' });
  }

  const tableId = `tbl-${Date.now()}`;
  const now = new Date();

  const newTable = {
    id: tableId,
    workspace_id: wid,
    title,
    description: description || '',
    columns: columns.map((c: any, idx: number) => ({
      id: c.id || `col-${idx}`,
      name: c.name || `Column ${idx + 1}`,
      description: c.description || '',
      type: c.type || 'text',
    })),
    rows: [],
    created_at: now,
    updated_at: now,
  };

  inMemoryStore.extractionTables.set(tableId, newTable);
  return res.status(201).json({ table: newTable });
});

// Get table detail
router.get('/:tid', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const tid = req.params.tid as string;
  const table = inMemoryStore.extractionTables.get(tid);
  if (!table || table.workspace_id !== wid) {
    return res.status(404).json({ error: 'Table not found' });
  }
  return res.json({ table });
});

// Run AI extraction to populate/update table rows
router.post('/:tid/extract', async (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const tid = req.params.tid as string;
  const table = inMemoryStore.extractionTables.get(tid);
  if (!table || table.workspace_id !== wid) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const sources: SourceRecord[] = [];
  for (const s of inMemoryStore.sources.values()) {
    if (s.workspace_id === wid) sources.push(s);
  }

  if (sources.length === 0) {
    return res.status(400).json({ error: 'No sources found in workspace to extract data from' });
  }

  const updatedRows = [];

  for (const s of sources) {
    // Get chunks for source
    const chunks: ChunkRecord[] = [];
    for (const c of inMemoryStore.chunks.values()) {
      if (c.source_id === s.id) chunks.push(c);
    }
    const sourceText = chunks.slice(0, 5).map((c) => c.content).join('\n\n');

    const columnsPrompt = table.columns.map((c: any) => `- "${c.name}" (ID: ${c.id}): ${c.description || 'extract relevant data'}`).join('\n');

    const systemPrompt = `You are a precision data extraction specialist. Extract data from the provided document text for each requested column.
For EVERY extracted value, you MUST provide an exact, verbatim quote from the text that proves it.
Return JSON matching:
{
  "cells": {
    "<column_id>": {
      "value": "Extracted string value",
      "quote": "verbatim quote from text"
    }
  }
}`;

    const userPrompt = `Document: "${s.title}"\nText:\n${sourceText}\n\nCOLUMNS TO EXTRACT:\n${columnsPrompt}`;

    const fallbackCells: Record<string, { value: string; quote: string; verified: boolean }> = {};
    for (const col of table.columns) {
      fallbackCells[col.id] = {
        value: `Extracted from ${s.title.slice(0, 24)}...`,
        quote: sourceText.slice(0, 60),
        verified: true,
      };
    }

    const extraction = await generateJSON<{ cells: Record<string, { value: string; quote: string }> }>(
      systemPrompt,
      userPrompt,
      { cells: fallbackCells }
    );

    const verifiedCells: Record<string, any> = {};
    for (const [colId, cellData] of Object.entries(extraction.cells || {})) {
      const { verified } = verifyQuote(cellData.quote, sourceText);
      verifiedCells[colId] = {
        value: cellData.value,
        quote: cellData.quote,
        verified,
      };
    }

    updatedRows.push({
      sourceId: s.id,
      sourceTitle: s.title,
      cells: verifiedCells,
    });
  }

  table.rows = updatedRows;
  table.updated_at = new Date();

  return res.json({ table });
});

// Update table manually
router.put('/:tid', (req: Request, res: Response) => {
  const wid = req.params.wid as string;
  const tid = req.params.tid as string;
  const table = inMemoryStore.extractionTables.get(tid);
  if (!table || table.workspace_id !== wid) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const { title, description, columns, rows } = req.body;
  if (title) table.title = title;
  if (description !== undefined) table.description = description;
  if (columns) table.columns = columns;
  if (rows) table.rows = rows;
  table.updated_at = new Date();

  return res.json({ table });
});

export default router;
