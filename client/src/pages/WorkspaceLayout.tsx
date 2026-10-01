import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  Library, MessageSquare, Lightbulb, Telescope, Table2, Settings,
  ArrowLeft, BookOpen, Scale, Briefcase, Globe, Menu, X, ChevronRight,
} from 'lucide-react';

const MODE_ICONS: Record<string, React.ComponentType<any>> = {
  academic: BookOpen,
  legal: Scale,
  business: Briefcase,
  general: Globe,
};

const MODE_COLORS: Record<string, string> = {
  academic: 'text-blue-400',
  legal: 'text-amber-400',
  business: 'text-emerald-400',
  general: 'text-violet-400',
};

const NAV_ITEMS = [
  { to: 'library',   icon: Library,       label: 'Library',   shortcut: '1' },
  { to: 'qa',        icon: MessageSquare, label: 'Ask AI',    shortcut: '2' },
  { to: 'insights',  icon: Lightbulb,     label: 'Insights',  shortcut: '3' },
  { to: 'discover',  icon: Telescope,     label: 'Discover',  shortcut: '4' },
  { to: 'tables',    icon: Table2,        label: 'Tables',    shortcut: '5' },
  { to: 'settings',  icon: Settings,      label: 'Settings',  shortcut: ',' },
];

export default function WorkspaceLayout() {
  const { wid } = useParams<{ wid: string }>();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['workspace', wid],
    queryFn: () => api.getWorkspace(wid!),
    enabled: !!wid,
  });

  const workspace = (data as any)?.workspace;
  const ModeIcon = workspace ? (MODE_ICONS[workspace.mode] || Globe) : Globe;
  const modeColor = workspace ? (MODE_COLORS[workspace.mode] || 'text-violet-400') : 'text-neutral-500';

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const map: Record<string, string> = {
        '1': 'library', '2': 'qa', '3': 'insights',
        '4': 'discover', '5': 'tables', ',': 'settings',
      };
      const target = map[e.key];
      if (target) { e.preventDefault(); navigate(`/w/${wid}/${target}`); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [wid, navigate]);

  useEffect(() => { setMobileOpen(false); }, []);

  return (
    <div className="min-h-screen bg-[#090A0F] flex flex-col">

      {/* ── Top navigation bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-neutral-950/70 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            title="All workspaces"
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all duration-200 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          </button>

          {/* Brand */}
          <span className="text-sm font-semibold tracking-tight text-white hidden sm:block">Lumina</span>

          {/* Workspace breadcrumb */}
          {workspace && (
            <>
              <ChevronRight className="w-3 h-3 text-neutral-700 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <ModeIcon className={`w-3.5 h-3.5 ${modeColor}`} />
                <span className="text-sm font-medium text-neutral-300 truncate max-w-[200px]">{workspace.name}</span>
              </div>
            </>
          )}

          {/* Desktop nav tabs */}
          <nav className="ml-auto hidden md:flex items-center gap-0.5" role="navigation" aria-label="Workspace navigation">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={`/w/${wid}/${to}`}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none ${
                    isActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="ml-auto md:hidden p-2 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all duration-200"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drop-down nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-neutral-950/90 backdrop-blur-xl px-4 py-3 space-y-1">
            {workspace && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <ModeIcon className={`w-4 h-4 ${modeColor}`} />
                <span className="text-sm font-semibold text-white">{workspace.name}</span>
              </div>
            )}
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={`/w/${wid}/${to}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-neutral-500 hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* ── Mobile bottom tab bar ──────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-t border-white/5 px-2 py-1.5 safe-area-bottom"
        aria-label="Mobile bottom navigation"
      >
        <div className="flex items-center justify-around">
          {NAV_ITEMS.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={`/w/${wid}/${to}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[52px] ${
                  isActive ? 'text-white' : 'text-neutral-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-white/[0.08]' : ''}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to={`/w/${wid}/settings`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[52px] ${
                isActive ? 'text-white' : 'text-neutral-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-white/[0.08]' : ''}`}>
                  <Settings className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium">Settings</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
