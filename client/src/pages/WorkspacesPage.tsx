import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Plus, BookOpen, Scale, Briefcase, Globe, Trash2, ChevronRight,
  LogOut, User, Search, ArrowRight
} from 'lucide-react';

const MODE_META: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  academic: { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  legal: { icon: Scale, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  business: { icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  general: { icon: Globe, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
};

export default function WorkspacesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [form, setForm] = useState({ name: '', description: '', mode: 'academic', domain: 'Interdisciplinary' });

  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.getWorkspaces(),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.createWorkspace(body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreate(false);
      navigate(`/w/${(res as any).workspace.id}/library`);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (wid: string) => api.deleteWorkspace(wid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });

  const allWorkspaces = (data as any)?.workspaces || [];
  const workspaces = searchQ.trim()
    ? allWorkspaces.filter((ws: any) =>
        ws.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        ws.mode.toLowerCase().includes(searchQ.toLowerCase())
      )
    : allWorkspaces;

  return (
    <div className="min-h-screen bg-[#090A0F] text-white">

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-neutral-950/70 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-base font-semibold tracking-tight text-white">Lumina</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
              <User className="w-3 h-3 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-300">{user?.name || 'Guest'}</span>
            </div>
            <button
              onClick={() => { logout(); navigate('/auth'); }}
              title="Sign Out"
              className="p-2 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Your Workspaces</h1>
            <p className="text-base text-neutral-400 max-w-xl leading-relaxed mt-2">
              Organize papers, PDFs, and contracts into cited intelligence libraries.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search workspaces…"
                className="bg-neutral-900/80 border border-neutral-800 focus:border-neutral-600 text-neutral-200 placeholder-neutral-500 rounded-full pl-9 pr-4 py-2 text-sm transition-all duration-200 focus:outline-none w-52"
              />
            </div>
            {/* New workspace */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black font-medium text-sm px-5 py-2.5 rounded-full shadow-sm transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>
        </div>

        {/* ── Workspace Grid ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-neutral-900/40 border border-white/[0.06] rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-neutral-800 rounded w-2/3 mb-3" />
                <div className="h-3 bg-neutral-800/60 rounded w-full mb-2" />
                <div className="h-3 bg-neutral-800/60 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-neutral-900/60 border border-white/[0.06] flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-300 mb-2">
              {searchQ ? 'No matching workspaces' : 'No workspaces yet'}
            </h3>
            <p className="text-neutral-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
              {searchQ ? 'Try a different search term.' : 'Create your first workspace to begin organizing your research.'}
            </p>
            {!searchQ && (
              <button
                onClick={() => setShowCreate(true)}
                className="bg-white hover:bg-neutral-200 text-black font-medium text-sm px-6 py-2.5 rounded-full shadow-sm transition-all duration-200 active:scale-95"
              >
                Create Workspace
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws: any) => {
              const meta = MODE_META[ws.mode] || MODE_META.general;
              const Icon = meta.icon;
              return (
                <div
                  key={ws.id}
                  className="bg-neutral-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.18] hover:bg-neutral-900/60 transition-all duration-300 ease-out group cursor-pointer relative overflow-hidden"
                  onClick={() => navigate(`/w/${ws.id}/library`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this workspace?')) deleteMut.mutate(ws.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1 tracking-tight">{ws.name}</h3>
                  {ws.description && <p className="text-neutral-500 text-sm mb-3 line-clamp-2 leading-relaxed">{ws.description}</p>}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border} font-medium capitalize`}>{ws.mode}</span>
                      <span className="text-xs text-neutral-600">{ws.domain}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-600">
                      <span className="text-xs font-mono">{new Date(ws.created_at).toLocaleDateString()}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300 ease-out" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Modal ────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-7 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-xl font-semibold tracking-tight text-white mb-6">New Workspace</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., LLM Safety Research"
                  className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-all duration-200"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description (optional)"
                  className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-all duration-200"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-2 block font-medium">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(MODE_META).map(([m, meta]) => {
                    const MIcon = meta.icon;
                    return (
                      <button
                        key={m}
                        onClick={() => setForm(f => ({ ...f, mode: m }))}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 text-sm ${
                          form.mode === m
                            ? `${meta.bg} ${meta.border} ${meta.color}`
                            : 'border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                        }`}
                      >
                        <MIcon className="w-4 h-4" />
                        <span className="capitalize font-medium">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block font-medium">Domain</label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm(f => ({ ...f, domain: e.target.value }))}
                  placeholder="e.g., Machine Learning, Law"
                  className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-full bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-sm font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                disabled={!form.name.trim() || createMut.isPending}
                onClick={() => createMut.mutate(form)}
                className="flex-1 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-medium text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {createMut.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
