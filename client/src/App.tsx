import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect, createContext, useContext, useState } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import AuthPage from './pages/AuthPage.js';
import WorkspacesPage from './pages/WorkspacesPage.js';
import WorkspaceLayout from './pages/WorkspaceLayout.js';
import LibraryPage from './pages/LibraryPage.js';
import QAPage from './pages/QAPage.js';
import InsightsPage from './pages/InsightsPage.js';
import DiscoverPage from './pages/DiscoverPage.js';
import TablesPage from './pages/TablesPage.js';
import SettingsPage from './pages/SettingsPage.js';

// ─────────────────────────────────────────────────────────────────────────────
// Layout Mode Context (Reader / Split / Analytics)
// ─────────────────────────────────────────────────────────────────────────────
type LayoutMode = 'reader' | 'split' | 'analytics';
const LayoutCtx = createContext<{ mode: LayoutMode; setMode: (m: LayoutMode) => void }>({
  mode: 'split',
  setMode: () => {},
});
export const useLayoutMode = () => useContext(LayoutCtx);

// Global keyboard shortcut handler
// Ctrl+1 → Reader (Library), Ctrl+2 → Split (Ask AI), Ctrl+3 → Analytics (Insights)
function KeyboardController() {
  const navigate = useNavigate();
  const { setMode } = useLayoutMode();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      // Extract :wid from the hash-based URL (#/w/<wid>/...)
      const match = window.location.hash.match(/#\/w\/([^/]+)/);
      const wid = match?.[1];
      if (!wid) return;

      if (e.key === '1') {
        e.preventDefault();
        setMode('reader');
        navigate(`/w/${wid}/library`);
      } else if (e.key === '2') {
        e.preventDefault();
        setMode('split');
        navigate(`/w/${wid}/qa`);
      } else if (e.key === '3') {
        e.preventDefault();
        setMode('analytics');
        navigate(`/w/${wid}/insights`);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, setMode]);

  return null;
}

export default function App() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');

  return (
    <LayoutCtx.Provider value={{ mode: layoutMode, setMode: setLayoutMode }}>
      <AuthProvider>
        <KeyboardController />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<WorkspacesPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/w/:wid" element={<WorkspaceLayout />}>
            <Route index element={<Navigate to="library" replace />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="qa" element={<QAPage />} />
            <Route path="ask" element={<QAPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="graph" element={<InsightsPage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </LayoutCtx.Provider>
  );
}
