import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Telescope, Search, Plus, ExternalLink, Users, Calendar, Star, BookOpen, Tag, Loader } from 'lucide-react';

interface Paper {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  year: number;
  venue?: string;
  citationCount?: number;
  openAccess?: boolean;
  url?: string;
  doi?: string;
}

const DOMAIN_FILTERS = [
  'Machine Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Medicine',
  'Climate Science',
  'Economics',
  'Law',
  'Biology',
  'Physics',
  'Education',
];

export default function DiscoverPage() {
  const { wid } = useParams<{ wid: string }>();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [domain, setDomain] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const searchMut = useMutation({
    mutationFn: (searchQ?: string) =>
      api.discoverPapers(wid!, {
        q: searchQ !== undefined ? searchQ : query,
        ...(domain && { domain }),
        ...(yearFrom && { year_from: yearFrom }),
        ...(yearTo && { year_to: yearTo }),
        ...(openAccessOnly && { open_access: 'true' }),
        per_page: '20',
      }),
    onSuccess: (res: any) => setResults(res.papers || []),
  });

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      searchMut.mutate(q);
    }
  }, [searchParams]);

  const addMut = useMutation({
    mutationFn: (paper: Paper) => api.addPaper(wid!, paper),
    onSuccess: (_res, paper) => {
      setAdded(s => new Set([...s, paper.id]));
      qc.invalidateQueries({ queryKey: ['sources', wid] });
    },
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMut.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Discover</h2>
        <p className="text-slate-400 text-sm mt-0.5">Search millions of papers via OpenAlex and add them to your workspace</p>
      </div>

      {/* Search bar */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search papers, authors, topics..."
              className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || searchMut.isPending}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {searchMut.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Telescope className="w-4 h-4" />}
            {searchMut.isPending ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
            >
              <option value="">All Domains</option>
              {DOMAIN_FILTERS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Year From</label>
            <input
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder="2015"
              className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Year To</label>
            <input
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder="2025"
              className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={openAccessOnly}
                onChange={(e) => setOpenAccessOnly(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <span className="text-xs text-slate-300">Open Access Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Domain quick filters */}
      <div className="flex flex-wrap gap-2">
        {['machine learning', 'large language models', 'RAG', 'RLHF', 'transformers'].map(tag => (
          <button
            key={tag}
            onClick={() => { setQuery(tag); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white hover:border-blue-500/40 text-xs transition-all"
          >
            <Tag className="w-3 h-3 text-blue-400" />
            {tag}
          </button>
        ))}
      </div>

      {/* Results */}
      {searchMut.isPending ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="glass-panel rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : results.length === 0 && !searchMut.isIdle ? (
        <div className="text-center py-16 glass-panel rounded-2xl">
          <Telescope className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">No papers found. Try a different query.</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">{results.length} results</h3>
          </div>
          {results.map((paper) => (
            <div key={paper.id} className="glass-panel rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {paper.openAccess && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Open Access</span>
                      )}
                      {paper.year && (
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Calendar className="w-3 h-3" />{paper.year}
                        </div>
                      )}
                      {paper.citationCount != null && paper.citationCount > 0 && (
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Star className="w-3 h-3" />{paper.citationCount.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <h3
                      className="text-sm font-semibold text-white cursor-pointer hover:text-blue-300 transition-colors line-clamp-2"
                      onClick={() => setExpanded(expanded === paper.id ? null : paper.id)}
                    >
                      {paper.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      {paper.authors?.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Users className="w-3 h-3" />
                          {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ` +${paper.authors.length - 3}` : ''}
                        </div>
                      )}
                      {paper.venue && <span className="text-slate-500 text-xs">· {paper.venue}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {paper.url && (
                      <a href={paper.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-blue-400 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => addMut.mutate(paper)}
                      disabled={added.has(paper.id) || addMut.isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        added.has(paper.id)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      } disabled:opacity-60`}
                    >
                      {added.has(paper.id) ? (
                        <><BookOpen className="w-3 h-3" /> Added</>
                      ) : (
                        <><Plus className="w-3 h-3" /> Add to Library</>
                      )}
                    </button>
                  </div>
                </div>

                {expanded === paper.id && paper.abstract && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40">
                    <p className="text-slate-400 text-xs leading-relaxed">{paper.abstract}</p>
                    {paper.doi && (
                      <p className="text-xs text-slate-600 mt-2">DOI: {paper.doi}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 glass-panel rounded-2xl">
          <Telescope className="w-14 h-14 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">Discover Research Papers</h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Search the OpenAlex database of 240M+ scholarly works and add them directly to your workspace
          </p>
        </div>
      )}
    </div>
  );
}
