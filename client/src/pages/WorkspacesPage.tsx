import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Zap, Plus, BookOpen, Scale, Briefcase, Globe, Trash2, ChevronRight,
  FileText, Brain, LogOut, User, Sparkles, Database, Clock
} from 'lucide-react';

const MODE_META: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  academic: { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  legal: { icon: Scale, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  business: { icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  general: { icon: Globe, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
};

export default function WorkspacesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
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

  const workspaces = (data as any)?.workspaces || [];

  return (
    <div className="min-h-screen bg-[#0b111e] text-white">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-[#0d1420]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">Lumina<span className="text-blue-400">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm text-slate-300">{user?.name || 'Scholar'}</span>
              {user?.isGuest && <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Guest</span>}
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/auth');
              }}
              title="Sign Out"
              className="p-2 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Research Assistant
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-slate-300 bg-clip-text text-transparent">
            Your Research Workspaces
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Organize papers, PDFs, and documents into intelligent workspaces. Ask questions, generate insights, and discover new research.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: Database, label: 'Workspaces', value: workspaces.length },
            { icon: Brain, label: 'AI Model', value: 'Gemini 2.5' },
            { icon: FileText, label: 'RAG Pipeline', value: 'Hybrid' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-panel rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">{label}</div>
                <div className="text-lg font-semibold text-white">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Workspace grid + Create button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">All Workspaces</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="glass-panel rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-slate-700 rounded w-2/3 mb-3" />
                <div className="h-3 bg-slate-800 rounded w-full mb-2" />
                <div className="h-3 bg-slate-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-24 glass-panel rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/60 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">No workspaces yet</h3>
            <p className="text-slate-500 text-sm mb-6">Create your first workspace to start researching</p>
            <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws: any) => {
              const meta = MODE_META[ws.mode] || MODE_META.general;
              const Icon = meta.icon;
              return (
                <div
                  key={ws.id}
                  className="glass-card rounded-2xl p-6 cursor-pointer group border border-slate-700/30 hover:border-blue-500/30 transition-all"
                  onClick={() => navigate(`/w/${ws.id}/library`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete workspace?')) deleteMut.mutate(ws.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">{ws.name}</h3>
                  {ws.description && <p className="text-slate-500 text-sm mb-3 line-clamp-2">{ws.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-md ${meta.bg} ${meta.color} font-medium`}>{ws.mode}</span>
                      <span className="text-xs text-slate-500">{ws.domain}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 group-hover:text-blue-400 transition-colors">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{new Date(ws.created_at).toLocaleDateString()}</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-8 w-full max-w-md mx-4 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-6">New Workspace</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Workspace Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., LLM Safety Research"
                  className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description"
                  className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block font-medium">Workspace Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(MODE_META).map(([m, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={m}
                        onClick={() => setForm(f => ({ ...f, mode: m }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                          form.mode === m
                            ? `${meta.bg} ${meta.border} ${meta.color}`
                            : 'border-slate-700/40 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="capitalize font-medium">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Domain</label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm(f => ({ ...f, domain: e.target.value }))}
                  placeholder="e.g., Machine Learning, Law, Finance"
                  className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                disabled={!form.name.trim() || createMut.isPending}
                onClick={() => createMut.mutate(form)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all text-sm disabled:opacity-50"
              >
                {createMut.isPending ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
