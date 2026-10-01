import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  Settings, Download, Trash2, ArrowLeft, BookOpen, Scale, Briefcase, Globe,
  FileText, Database, Shield, CheckCircle, AlertTriangle
} from 'lucide-react';

const MODE_OPTIONS = [
  { id: 'academic', label: 'Academic Research', desc: 'Optimized for arXiv, OpenAlex, peer-reviewed synthesis', icon: BookOpen },
  { id: 'legal', label: 'Legal & Compliance', desc: 'Focus on precedent, contract clauses, statutory risk', icon: Scale },
  { id: 'business', label: 'Market & Business', desc: 'Focus on financial reporting, competitive intelligence', icon: Briefcase },
  { id: 'general', label: 'General Knowledge', desc: 'Multi-disciplinary general synthesis and discovery', icon: Globe },
];

export default function SettingsPage() {
  const { wid } = useParams<{ wid: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['workspace', wid],
    queryFn: () => api.getWorkspace(wid!),
    enabled: !!wid,
  });

  const workspace = (data as any)?.workspace;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('academic');
  const [domain, setDomain] = useState('Interdisciplinary');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setDescription(workspace.description || '');
      setMode(workspace.mode || 'academic');
      setDomain(workspace.domain || 'Interdisciplinary');
    }
  }, [workspace]);

  const updateMut = useMutation({
    mutationFn: () => api.updateWorkspace(wid!, { name, description, mode, domain }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', wid] });
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteWorkspace(wid!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      navigate('/workspaces');
    },
  });

  const downloadExport = (format: 'bibtex' | 'ris' | 'csv' | 'markdown') => {
    const url = `/api/workspaces/${wid}/export/${format}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-neutral-500">
        <Settings className="w-8 h-8 animate-spin mx-auto mb-3 text-neutral-600" />
        <p>Loading workspace configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          Workspace Settings & Export
        </h2>
        <p className="text-neutral-400 text-sm mt-1">
          Configure domain heuristics, data export pipelines, and workspace metadata.
        </p>
      </div>

      {/* General Settings Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
        <h3 className="text-base font-semibold text-white">General Information</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-400 block mb-1.5">Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-neutral-800/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 block mb-1.5">Workspace Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-neutral-800/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 block mb-1.5">Domain / Subject Matter</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-slate-900 border border-neutral-800/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 block mb-2">Research Operating Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODE_OPTIONS.map((m) => {
                const Icon = m.icon;
                const isSel = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      isSel
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-neutral-900/50 border-slate-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSel ? 'text-blue-400' : 'text-neutral-500'}`} />
                    <div>
                      <div className="text-xs font-semibold">{m.label}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Settings updated successfully
            </span>
          )}
          {!savedSuccess && <div />}

          <button
            onClick={() => updateMut.mutate()}
            disabled={updateMut.isPending}
            className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {updateMut.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Export Pipelines Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            Scholarly & Data Export Pipelines
          </h3>
          <p className="text-neutral-400 text-xs mt-1">
            Export all verified documents, citations, synthesis matrices, and bibliography files directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <button
            onClick={() => downloadExport('bibtex')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900/80 border border-neutral-800 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-white flex items-center justify-between">
              BibTeX (.bib)
              <Download className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">LaTeX, Zotero, Mendeley references</p>
          </button>

          <button
            onClick={() => downloadExport('ris')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900/80 border border-neutral-800 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-white flex items-center justify-between">
              RIS Format (.ris)
              <Download className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">EndNote and Reference Manager</p>
          </button>

          <button
            onClick={() => downloadExport('csv')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900/80 border border-neutral-800 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-white flex items-center justify-between">
              Sources Spreadsheet (.csv)
              <Download className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Excel & Google Sheets matrix</p>
          </button>

          <button
            onClick={() => downloadExport('markdown')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900/80 border border-neutral-800 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-white flex items-center justify-between">
              Literature Review (.md)
              <Download className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Formatted Markdown synthesis document</p>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel rounded-2xl p-6 border border-red-500/20 bg-red-950/10 space-y-4">
        <h3 className="text-base font-semibold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Danger Zone
        </h3>
        <p className="text-neutral-400 text-xs">
          Deleting this workspace removes all uploaded sources, chunk embeddings, custom extraction tables, and reasoning history permanently.
        </p>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Workspace
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
            >
              {deleteMut.isPending ? 'Deleting...' : 'Yes, Permanently Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-semibold hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
