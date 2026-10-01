import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  Table2, Plus, Zap, Edit3, Save, X, ChevronDown, ChevronUp, Download, Loader
} from 'lucide-react';

export default function TablesPage() {
  const { wid } = useParams<{ wid: string }>();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCols, setNewCols] = useState('Title, Authors, Year, Method, Results, Limitations');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editCell, setEditCell] = useState<{ tid: string; row: number; col: string } | null>(null);
  const [cellVal, setCellVal] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tables', wid],
    queryFn: () => api.getTables(wid!),
    enabled: !!wid,
  });

  const createMut = useMutation({
    mutationFn: () => api.createTable(wid!, {
      title: newTitle,
      description: newDesc,
      columns: newCols.split(',').map(c => c.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables', wid] });
      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
    },
  });

  const extractMut = useMutation({
    mutationFn: (tid: string) => api.extractTable(wid!, tid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables', wid] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ tid, rows }: { tid: string; rows: any[] }) =>
      api.updateTable(wid!, tid, { rows }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', wid] }); setEditCell(null); },
  });

  const tables = (data as any)?.tables || [];

  const exportCSV = (table: any) => {
    const cols: string[] = table.columns;
    const rows: Record<string, string>[] = table.rows;
    const csv = [
      cols.join(','),
      ...rows.map(r => cols.map(c => `"${(r[c] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${table.title.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Extraction Tables</h2>
          <p className="text-neutral-400 text-sm mt-0.5">AI-powered data extraction from your sources into structured tables</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-black active:scale-95 rounded-full text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Table
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="glass-panel rounded-2xl p-6 border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Create Extraction Table</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-400 hover:text-white transition-all"
              title="Discard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block">Table Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Research Methods Comparison"
                className="w-full bg-neutral-900/70 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block">Description (optional)</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of what to extract"
                className="w-full bg-neutral-900/70 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block">Columns (comma-separated)</label>
              <input
                type="text"
                value={newCols}
                onChange={(e) => setNewCols(e.target.value)}
                placeholder="Title, Method, Year, Results..."
                className="w-full bg-neutral-900/70 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
              <p className="text-xs text-neutral-600 mt-1">AI will extract values for each column from your workspace sources</p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-all text-sm active:scale-95"
            >
              Cancel
            </button>
            <button
              disabled={!newTitle.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all text-sm active:scale-95"
            >
              {createMut.isPending && <Loader className="w-3.5 h-3.5 animate-spin" />}
              {createMut.isPending ? 'Creating…' : 'Create Table'}
            </button>
          </div>
        </div>
      )}

      {/* Tables list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-32 glass-panel rounded-xl animate-pulse" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-24 glass-panel rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
            <Table2 className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-300 mb-2">No extraction tables yet</h3>
          <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">Create a table and AI will extract structured data from your sources automatically</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black active:scale-95 rounded-full text-sm font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Table
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tables.map((table: any) => (
            <div key={table.id} className="glass-panel rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="p-5 flex items-start justify-between gap-4">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpanded(expanded === table.id ? null : table.id)}
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-blue-400" />
                    <h3 className="text-base font-semibold text-white">{table.title}</h3>
                    <span className="text-xs text-neutral-500">{table.rows?.length || 0} rows · {table.columns?.length || 0} cols</span>
                  </div>
                  {table.description && <p className="text-neutral-500 text-xs mt-1 ml-6">{table.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => extractMut.mutate(table.id)}
                    disabled={extractMut.isPending}
                    title="Run AI extraction on all workspace sources"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-all active:scale-95"
                  >
                    {extractMut.isPending ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    {extractMut.isPending ? 'Extracting…' : 'AI Extract'}
                  </button>
                  <button
                    onClick={() => exportCSV(table)}
                    title="Download as CSV"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 text-xs transition-all active:scale-95"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === table.id ? null : table.id)}
                    className="p-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-400 hover:text-white transition-all"
                    title={expanded === table.id ? 'Collapse' : 'Expand'}
                  >
                    {expanded === table.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Table content */}
              {expanded === table.id && (
                <div className="border-t border-neutral-800 overflow-x-auto">
                  {(!table.rows || table.rows.length === 0) ? (
                    <div className="p-8 text-center text-neutral-500 text-sm">
                      Click "AI Extract" to populate this table with data from your sources
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-900/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">#</th>
                          {table.columns.map((col: string) => (
                            <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {table.rows.map((row: any, rowIdx: number) => (
                          <tr key={rowIdx} className="hover:bg-neutral-900/30 transition-colors">
                            <td className="px-4 py-3 text-neutral-500 text-xs">{rowIdx + 1}</td>
                            {table.columns.map((col: string) => (
                              <td key={col} className="px-4 py-3 text-neutral-300">
                                {editCell?.tid === table.id && editCell?.row === rowIdx && editCell?.col === col ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      value={cellVal}
                                      onChange={(e) => setCellVal(e.target.value)}
                                      className="bg-neutral-900 border border-blue-500/50 rounded px-2 py-1 text-xs text-white w-full focus:outline-none"
                                      autoFocus
                                    />
                                    <button onClick={() => {
                                      const newRows = [...table.rows];
                                      newRows[rowIdx] = { ...newRows[rowIdx], [col]: cellVal };
                                      updateMut.mutate({ tid: table.id, rows: newRows });
                                    }} className="text-emerald-400 hover:text-emerald-300">
                                      <Save className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditCell(null)} className="text-neutral-500 hover:text-neutral-300">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    className="group flex items-start gap-1.5 cursor-pointer"
                                    onClick={() => { setEditCell({ tid: table.id, row: rowIdx, col }); setCellVal(row[col] || ''); }}
                                  >
                                    <span className="text-xs leading-relaxed">{row[col] || <span className="text-neutral-600 italic">empty</span>}</span>
                                    <Edit3 className="w-3 h-3 text-neutral-600 group-hover:text-white shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
