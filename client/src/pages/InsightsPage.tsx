import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Lightbulb, RefreshCw, GitBranch, AlertTriangle, BookOpen, Telescope,
  ArrowRight, Users, Layers, Network, Download, FileText, Zap, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, Radio
} from 'lucide-react';
// vis-network imported dynamically to avoid bundler conflicts
import type { Network as VisNetworkType } from 'vis-network';
import TimelineScrubber from '../components/TimelineScrubber.js';
import GapRadarHeatmap from '../components/GapRadarHeatmap.js';

export default function InsightsPage() {
  const { wid } = useParams<{ wid: string }>();
  const location = useLocation();
  const qc = useQueryClient();
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  const initialTab = location.pathname.includes('/graph') ? 'graph' : 'synthesis';
  const [activeTab, setActiveTab] = useState<'synthesis' | 'graph' | 'compare' | 'brief' | 'gap-radar'>(initialTab);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [briefAudience, setBriefAudience] = useState('Executive Leadership');
  const [briefText, setBriefText] = useState('');
  const [compResult, setCompResult] = useState<any>(null);
  // Timeline state
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string> | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<any>(null);

  useEffect(() => {
    if (location.pathname.includes('/graph')) {
      setActiveTab('graph');
    }
  }, [location.pathname]);

  const { data: sourcesData } = useQuery({
    queryKey: ['sources', wid],
    queryFn: () => api.getSources(wid!),
    enabled: !!wid,
  });
  const sources = (sourcesData as any)?.sources || [];

  const { data: insightsData, isLoading: insLoading } = useQuery({
    queryKey: ['insights', wid],
    queryFn: () => api.getInsights(wid!),
    enabled: !!wid,
  });

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['graph', wid],
    queryFn: () => api.getGraph(wid!),
    enabled: !!wid && activeTab === 'graph',
  });

  const generateMut = useMutation({
    mutationFn: () => api.generateInsights(wid!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights', wid] }),
  });

  const compareMut = useMutation({
    mutationFn: () => api.compareSources(wid!, compareA, compareB),
    onSuccess: (res: any) => setCompResult(res),
  });

  const briefMut = useMutation({
    mutationFn: () => api.generateBrief(wid!, briefAudience),
    onSuccess: (res: any) => setBriefText(res.brief),
  });

  const insights = (insightsData as any)?.insights;

  // Build Vis-Network graph
  useEffect(() => {
    if (activeTab !== 'graph' || !graphData || !graphRef.current) return;
    const gd = graphData as any;
    if (!gd.nodes?.length) return;

    import('vis-network/standalone').then(({ Network: VisNetwork }) => {
      const nodesData = gd.nodes.map((n: any) => ({
        id: n.id,
        label: n.label,
        group: n.group,
        value: n.value || 10,
        title: n.title,
        color: {
          background: n.group === 'concept' ? '#3b82f6' : n.group === 'paper' ? '#8b5cf6' : '#10b981',
          border: 'transparent',
          highlight: { background: '#0e8ce8', border: '#60a5fa' },
        },
        font: { color: '#f1f5f9', size: 12 },
      }));

      const edgesData = gd.edges.map((e: any, i: number) => ({
        id: i,
        from: e.from,
        to: e.to,
        label: e.label,
        color: { color: '#334155', highlight: '#3b82f6' },
        font: { color: '#64748b', size: 9 },
        width: e.value || 1,
      }));

      const options = {
        nodes: { shape: 'dot', borderWidth: 0, shadow: true },
        edges: { smooth: { type: 'curvedCW', roundness: 0.2 } as any, arrows: { to: { enabled: true, scaleFactor: 0.5 } } },
        physics: { stabilization: { iterations: 100 }, barnesHut: { gravitationalConstant: -3000 } },
      };

      if (networkRef.current) networkRef.current.destroy();
      networkRef.current = new VisNetwork(graphRef.current!, { nodes: nodesData, edges: edgesData }, options);
    });
  }, [activeTab, graphData]);

  const tabs = [
    { id: 'synthesis', label: 'Synthesis', icon: Lightbulb },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'compare', label: 'Compare', icon: GitBranch },
    { id: 'brief', label: 'Executive Brief', icon: FileText },
    { id: 'gap-radar', label: 'Gap Radar', icon: Radio },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Insights</h2>
          <p className="text-slate-400 text-sm mt-0.5">AI-generated synthesis, gaps, and knowledge graph</p>
        </div>
        <button
          onClick={() => generateMut.mutate()}
          disabled={generateMut.isPending || sources.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${generateMut.isPending ? 'animate-spin' : ''}`} />
          {generateMut.isPending ? 'Generating...' : 'Generate Insights'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Synthesis Tab */}
      {activeTab === 'synthesis' && (
        <div className="space-y-6">
          {insLoading ? (
            <div className="animate-pulse space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 glass-panel rounded-xl" />)}
            </div>
          ) : !insights ? (
            <div className="text-center py-24 glass-panel rounded-2xl">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">No insights yet</h3>
              <p className="text-slate-600 text-sm mb-6">Add sources and click "Generate Insights" to start</p>
            </div>
          ) : (
            <>
              {/* Overall summary */}
              {insights.overallSummary && (
                <div className="glass-panel rounded-2xl p-6 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Field Synthesis</h3>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{insights.overallSummary}</p>
                </div>
              )}

              {/* Themes */}
              {insights.themes?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" /> Key Themes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.themes.map((t: any, i: number) => (
                      <div key={i} className="glass-card rounded-xl p-4 border border-slate-700/30">
                        <h4 className="text-sm font-semibold text-white mb-1.5">{t.name}</h4>
                        <p className="text-slate-400 text-xs leading-relaxed">{t.description}</p>
                        {t.citations?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.citations.map((c: string, j: number) => (
                              <span key={j} className="text-xs px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-md">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consensus */}
              {insights.consensus?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Points of Consensus
                  </h3>
                  <div className="space-y-2">
                    {insights.consensus.map((c: any, i: number) => (
                      <div key={i} className="glass-panel rounded-xl p-4 border border-emerald-500/10">
                        <p className="text-slate-200 text-sm">{c.statement}</p>
                        {c.supportingSources?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {c.supportingSources.map((s: string, j: number) => (
                              <span key={j} className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded-md">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {insights.conflicts?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" /> Conflicts & Debates
                  </h3>
                  <div className="space-y-3">
                    {insights.conflicts.map((c: any, i: number) => (
                      <div key={i} className="glass-panel rounded-xl p-4 border border-red-500/10">
                        <h4 className="text-sm font-semibold text-amber-300 mb-3">{c.topic}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                            <div className="text-xs text-blue-400 font-medium mb-1">View A</div>
                            <p className="text-slate-300 text-xs">{c.perspectiveA}</p>
                          </div>
                          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                            <div className="text-xs text-red-400 font-medium mb-1">View B</div>
                            <p className="text-slate-300 text-xs">{c.perspectiveB}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Gaps */}
              {insights.gaps?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Telescope className="w-4 h-4 text-yellow-400" /> Research Gaps
                  </h3>
                  <div className="space-y-2">
                    {insights.gaps.map((g: any, i: number) => (
                      <div key={i} className="glass-panel rounded-xl p-4 border border-yellow-500/10">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-slate-200 text-sm font-medium">{g.gap}</p>
                            <p className="text-slate-500 text-xs mt-1">{g.impact}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-md shrink-0 ${
                            g.confidence === 'High' ? 'bg-emerald-500/10 text-emerald-400' :
                            g.confidence === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-slate-500/10 text-slate-400'
                          }`}>{g.confidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reading Path */}
              {insights.readingPath?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" /> Recommended Reading Path
                  </h3>
                  <div className="space-y-2">
                    {insights.readingPath.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 glass-panel rounded-xl p-4">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-sm font-bold text-blue-300">
                          {r.order}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{r.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{r.reason}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-md shrink-0 ${
                          r.stage === 'Foundational' ? 'bg-green-500/10 text-green-400' :
                          r.stage?.includes('Core') ? 'bg-blue-500/10 text-blue-400' :
                          'bg-violet-500/10 text-violet-400'
                        }`}>{r.stage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Graph Tab */}
      {activeTab === 'graph' && (
        <div className="space-y-4">
          {/* Timeline Scrubber */}
          {graphData && (graphData as any).nodes?.length > 1 && (
            <div className="glass-panel rounded-xl p-4">
              <TimelineScrubber
                nodes={(graphData as any).nodes || []}
                edges={(graphData as any).edges || []}
                onVersionChange={(nodeIds, edgeIds, snap) => {
                  setVisibleNodeIds(nodeIds);
                  setCurrentSnapshot(snap);
                }}
                onDeltaBrief={(from, to) => {
                  const snap = (graphData as any);
                  alert(`Delta Brief: from V${from + 1} (${from + 1} sources) → V${to + 1} (${to + 1} sources)\n\nIn a full deployment this calls /api/workspaces/${wid}/insights/generate with a delta prompt.`);
                }}
              />
            </div>
          )}
          {/* Graph canvas */}
          <div className="glass-panel rounded-2xl overflow-hidden" style={{ height: '480px' }}>
            {graphLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Network className="w-10 h-10 mx-auto mb-3 text-slate-600 animate-pulse" />
                  <p className="text-slate-500 text-sm">Building knowledge graph...</p>
                </div>
              </div>
            ) : (
              <div ref={graphRef} className="w-full h-full" />
            )}
          </div>
          {/* Snapshot info bar */}
          {currentSnapshot && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              Showing {currentSnapshot.nodeIds?.size ?? 0} nodes at version {currentSnapshot.index + 1}
              {currentSnapshot.contradiction && (
                <span className="ml-2 text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {currentSnapshot.contradiction}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gap Radar Tab */}
      {activeTab === 'gap-radar' && (
        <div className="glass-panel rounded-2xl p-6">
          <GapRadarHeatmap
            wid={wid!}
            onAutoSearch={(query) => {
              // Navigate to Discover page with this query pre-filled
              window.location.hash = `/w/${wid}/discover?q=${encodeURIComponent(query)}`;
            }}
          />
        </div>
      )}

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Compare Two Documents</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Document A</label>
                <select
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/70"
                >
                  <option value="">Select source...</option>
                  {sources.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Document B</label>
                <select
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/70"
                >
                  <option value="">Select source...</option>
                  {sources.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => compareMut.mutate()}
              disabled={!compareA || !compareB || compareA === compareB || compareMut.isPending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {compareMut.isPending ? 'Comparing...' : 'Compare Documents'}
            </button>
          </div>

          {compResult && (
            <div className="space-y-4">
              {compResult.comparison?.similarities && (
                <div className="glass-panel rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Similarities
                  </h4>
                  <ul className="space-y-1">
                    {compResult.comparison.similarities.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {compResult.comparison?.differences && (
                <div className="glass-panel rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" /> Key Differences
                  </h4>
                  {compResult.comparison.differences.map((d: any, i: number) => (
                    <div key={i} className="mb-3">
                      <div className="text-xs font-medium text-amber-300 mb-1.5">{d.topic}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 text-xs text-slate-300">{d.inA}</div>
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 text-xs text-slate-300">{d.inB}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Brief Tab */}
      {activeTab === 'brief' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Generate Executive Brief</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={briefAudience}
                onChange={(e) => setBriefAudience(e.target.value)}
                placeholder="Target audience..."
                className="flex-1 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
              />
              <button
                onClick={() => briefMut.mutate()}
                disabled={briefMut.isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {briefMut.isPending ? 'Generating...' : 'Generate Brief'}
              </button>
            </div>
          </div>
          {briefText && (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Executive Brief</h3>
                <button
                  onClick={() => { const b = new Blob([briefText], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'executive-brief.md'; a.click(); }}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefText}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
