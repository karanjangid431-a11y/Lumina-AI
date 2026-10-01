import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  Upload, Link, FileText, Trash2, BookOpen, ExternalLink, Users,
  Calendar, Star, CheckCircle, Clock, AlertCircle, Plus, X, ChevronDown, ChevronUp, MessageSquare
} from 'lucide-react';
import { SpatialAnnotationPanel, SpatialAnnotation } from '../components/SpatialAnnotationPanel.js';

const TYPE_COLORS: Record<string, string> = {
  paper: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pdf: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  url: 'text-green-400 bg-green-500/10 border-green-500/20',
  txt: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  docx: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ready: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  processing: <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  pending: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  failed: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
};

export default function LibraryPage() {
  const { wid } = useParams<{ wid: string }>();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [addMode, setAddMode] = useState<'file' | 'url' | 'paste' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [annotations, setAnnotations] = useState<Record<string, SpatialAnnotation[]>>({
    'src-1': [
      {
        id: 'ann-1',
        pageNumber: 2,
        selectedText: 'Retriever uses dense vector dot product over MRL projections',
        comment: 'Confirms sub-vector quantization efficiency gain across benchmark',
        author: 'Lead Researcher',
        createdAt: new Date().toISOString(),
        tags: ['Architecture', 'MRL'],
        color: '#38bdf8',
      },
    ],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sources', wid],
    queryFn: () => api.getSources(wid!),
    enabled: !!wid,
    refetchInterval: 5000,
  });

  const uploadMut = useMutation({
    mutationFn: (fd: FormData) => api.uploadFile(wid!, fd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sources', wid] }); setAddMode(null); },
  });

  const urlMut = useMutation({
    mutationFn: (url: string) => api.addUrl(wid!, url),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sources', wid] }); setUrlInput(''); setAddMode(null); },
  });

  const pasteMut = useMutation({
    mutationFn: () => api.pasteText(wid!, pasteTitle, pasteText),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sources', wid] }); setPasteTitle(''); setPasteText(''); setAddMode(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (sid: string) => api.deleteSource(wid!, sid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources', wid] }),
  });

  const summaryMut = useMutation({
    mutationFn: (sid: string) => api.getSourceSummary(wid!, sid),
    onSuccess: (res: any, sid) => setSummaries(s => ({ ...s, [sid]: res.summary })),
  });

  const sources = (data as any)?.sources || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    uploadMut.mutate(fd);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Library</h2>
          <p className="text-slate-400 text-sm mt-1">{sources.length} source{sources.length !== 1 ? 's' : ''} in this workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAddMode('file');
              fileRef.current?.click();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button onClick={() => setAddMode('url')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-colors">
            <Link className="w-4 h-4" />
            Add URL
          </button>
          <button onClick={() => setAddMode('paste')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-colors">
            <FileText className="w-4 h-4" />
            Paste Text
          </button>
        </div>
      </div>

      {/* Add panels */}
      {addMode === 'url' && (
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">Add from URL</span>
            <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://arxiv.org/abs/..."
              className="flex-1 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
            />
            <button
              onClick={() => urlMut.mutate(urlInput)}
              disabled={!urlInput || urlMut.isPending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {urlMut.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {addMode === 'paste' && (
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">Paste Text</span>
            <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Document Title"
              className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
            />
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your text here..."
              rows={5}
              className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 resize-none"
            />
            <button
              onClick={() => pasteMut.mutate()}
              disabled={!pasteTitle || !pasteText || pasteMut.isPending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {pasteMut.isPending ? 'Adding...' : 'Add Text'}
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileChange} />
      {addMode === 'file' && (
        <div
          className="glass-panel rounded-xl border-2 border-dashed border-blue-500/30 p-10 text-center cursor-pointer hover:border-blue-500/60 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-blue-400" />
          <p className="text-white font-medium mb-1">Click to upload a file</p>
          <p className="text-slate-500 text-sm">PDF, DOCX, TXT · up to 20MB</p>
          {uploadMut.isPending && <p className="mt-3 text-blue-400 text-sm animate-pulse">Uploading & chunking...</p>}
          <button onClick={(e) => { e.stopPropagation(); setAddMode(null); }} className="mt-4 text-slate-500 text-xs hover:text-slate-300">Cancel</button>
        </div>
      )}

      {/* Sources list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="glass-panel rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-2xl">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No sources yet</h3>
          <p className="text-slate-600 text-sm">Add papers, PDFs, or URLs to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((s: any) => (
            <div key={s.id} className="glass-panel rounded-xl overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-slate-800/20 transition-colors"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${TYPE_COLORS[s.source_type] || TYPE_COLORS.txt}`}>
                        {s.source_type}
                      </span>
                      <span className="flex items-center gap-1">{STATUS_ICONS[s.ingestion_status]}</span>
                      {s.open_access && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Open Access</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white line-clamp-1">{s.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {s.authors?.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Users className="w-3 h-3" />
                          {s.authors.slice(0, 2).join(', ')}{s.authors.length > 2 ? ` +${s.authors.length - 2}` : ''}
                        </div>
                      )}
                      {s.year && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {s.year}
                        </div>
                      )}
                      {s.citation_count > 0 && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Star className="w-3 h-3" />
                          {s.citation_count.toLocaleString()} citations
                        </div>
                      )}
                      {s.venue && <span className="text-slate-500 text-xs">{s.venue}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-blue-400 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(s.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expanded === s.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </div>

              {expanded === s.id && (
                <div className="border-t border-slate-700/40 p-5 bg-slate-900/30">
                  {!summaries[s.id] ? (
                    <button
                      onClick={() => summaryMut.mutate(s.id)}
                      disabled={summaryMut.isPending}
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-60"
                    >
                      <Plus className="w-4 h-4" />
                      {summaryMut.isPending ? 'Generating summary...' : 'Generate AI Summary'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {summaries[s.id]?.abstract && (
                        <div>
                          <div className="text-xs font-medium text-slate-400 mb-1">Abstract</div>
                          <p className="text-sm text-slate-300 leading-relaxed">{summaries[s.id].abstract}</p>
                        </div>
                      )}
                      {summaries[s.id]?.keyFindings?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-slate-400 mb-1">Key Findings</div>
                          <ul className="space-y-1">
                            {summaries[s.id].keyFindings.map((f: string, i: number) => (
                              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="text-blue-400 mt-0.5">•</span>{f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spatial Document Annotations */}
                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <SpatialAnnotationPanel
                      sourceTitle={s.title}
                      annotations={annotations[s.id] || []}
                      onAddAnnotation={(newAnn) => {
                        const item: SpatialAnnotation = {
                          ...newAnn,
                          id: `ann-${Date.now()}`,
                          createdAt: new Date().toISOString(),
                        };
                        setAnnotations((prev) => ({
                          ...prev,
                          [s.id]: [...(prev[s.id] || []), item],
                        }));
                      }}
                      onDeleteAnnotation={(annId) => {
                        setAnnotations((prev) => ({
                          ...prev,
                          [s.id]: (prev[s.id] || []).filter((a) => a.id !== annId),
                        }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
