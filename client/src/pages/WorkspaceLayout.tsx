import { Outlet, useNavigate, useParams, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Zap, Library, MessageSquare, Lightbulb, Telescope, Table2, Settings, ArrowLeft, BookOpen, Scale, Briefcase, Globe } from 'lucide-react';

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
  { to: 'library', icon: Library, label: 'Library' },
  { to: 'qa', icon: MessageSquare, label: 'Ask AI' },
  { to: 'insights', icon: Lightbulb, label: 'Insights' },
  { to: 'discover', icon: Telescope, label: 'Discover' },
  { to: 'tables', icon: Table2, label: 'Tables' },
  { to: 'settings', icon: Settings, label: 'Settings' },
];

export default function WorkspaceLayout() {
  const { wid } = useParams<{ wid: string }>();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['workspace', wid],
    queryFn: () => api.getWorkspace(wid!),
    enabled: !!wid,
  });

  const workspace = (data as any)?.workspace;
  const ModeIcon = workspace ? (MODE_ICONS[workspace.mode] || Globe) : Globe;
  const modeColor = workspace ? (MODE_COLORS[workspace.mode] || 'text-violet-400') : 'text-slate-400';

  return (
    <div className="min-h-screen bg-[#0b111e] flex flex-col">
      {/* Top nav */}
      <header className="border-b border-slate-800/60 bg-[#0d1420]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-200">Lumina<span className="text-blue-400">AI</span></span>
          </div>

          {workspace && (
            <>
              <span className="text-slate-700">/</span>
              <div className="flex items-center gap-2">
                <ModeIcon className={`w-4 h-4 ${modeColor}`} />
                <span className="text-sm font-medium text-white">{workspace.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-md bg-slate-800 ${modeColor} font-medium`}>
                  {workspace.mode}
                </span>
              </div>
            </>
          )}

          {/* Navigation tabs */}
          <nav className="ml-auto flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={`/w/${wid}/${to}`}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 font-semibold border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
