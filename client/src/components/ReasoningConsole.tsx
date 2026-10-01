import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal, ChevronDown, ChevronUp, X, CheckCircle, Loader, AlertTriangle, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ReasoningEvent {
  stage: string;
  detail: string;
  meta: Record<string, unknown>;
  ts: number;
}

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error';

const STAGE_ICONS: Record<string, React.ComponentType<any>> = {
  DECONSTRUCTING_QUERY: Zap,
  HYBRID_RRF_SEARCH: Loader,
  GEMINI_SYNTHESIS: Loader,
  VERIFYING_CITATIONS: CheckCircle,
  AUDIT_COMPLETE: CheckCircle,
  ERROR: AlertTriangle,
};

const STAGE_COLORS: Record<string, string> = {
  DECONSTRUCTING_QUERY: 'text-blue-400',
  HYBRID_RRF_SEARCH: 'text-violet-400',
  GEMINI_SYNTHESIS: 'text-amber-400',
  VERIFYING_CITATIONS: 'text-emerald-400',
  AUDIT_COMPLETE: 'text-emerald-300',
  ERROR: 'text-red-400',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface ReasoningConsoleProps {
  /** Pre-built SSE URL from api.getReasoningStreamUrl() — pass empty string when idle */
  streamUrl: string;
  /** Called when the final answer arrives via SSE */
  onAnswer: (result: any) => void;
  /** Called when the stream ends (done or error) */
  onDone?: () => void;
}

export default function ReasoningConsole({ streamUrl, onAnswer, onDone }: ReasoningConsoleProps) {
  const [events, setEvents] = useState<ReasoningEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const startedUrl = useRef<string>('');

  // auto-scroll to bottom
  useEffect(() => {
    if (!collapsed && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events, collapsed]);

  const connect = useCallback((url: string) => {
    if (!url || url === startedUrl.current) return;
    startedUrl.current = url;

    // clean up any previous connection
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    setEvents([]);
    setStatus('connecting');
    setVisible(true);
    setCollapsed(false);

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('reasoning', (e: MessageEvent) => {
      try {
        const payload: ReasoningEvent = JSON.parse(e.data);
        setStatus('streaming');
        setEvents((prev) => [...prev, payload]);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('answer', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.result) onAnswer(payload.result);
      } catch { /* ignore */ }
    });

    es.addEventListener('done', () => {
      setStatus('done');
      es.close();
      esRef.current = null;
      onDone?.();
    });

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const payload = JSON.parse((e as any).data || '{}');
        setEvents((prev) => [...prev, { stage: 'ERROR', detail: payload.detail || 'Stream error', meta: {}, ts: Date.now() }]);
      } catch { /* ignore */ }
      setStatus('error');
      es.close();
      esRef.current = null;
      onDone?.();
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus((s) => s === 'streaming' ? 'done' : s);
      }
    };
  }, [onAnswer, onDone]);

  // trigger connection when URL changes (caller controls when to start)
  useEffect(() => {
    if (streamUrl) connect(streamUrl);
  }, [streamUrl, connect]);

  // cleanup on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  if (!visible) return null;

  const statusDot =
    status === 'connecting' ? 'bg-amber-400 animate-pulse' :
    status === 'streaming'  ? 'bg-blue-400 animate-pulse' :
    status === 'done'       ? 'bg-emerald-400' :
    status === 'error'      ? 'bg-red-400' : 'bg-slate-500';

  return (
    <div className="rounded-xl border border-neutral-800 overflow-hidden bg-[#0a0f1e]/90 backdrop-blur-sm shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 border-b border-neutral-800/50 cursor-pointer select-none"
           onClick={() => setCollapsed((c) => !c)}>
        <Terminal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-xs font-mono font-semibold text-neutral-300">Co-Pilot Reasoning Console</span>
        <div className={`w-2 h-2 rounded-full ml-1 shrink-0 ${statusDot}`} title={status} />
        <span className="text-xs text-neutral-600 ml-0.5 capitalize">{status}</span>
        <div className="ml-auto flex items-center gap-2">
          {status === 'done' && (
            <span className="text-xs text-emerald-400 font-mono">✓ Audit complete</span>
          )}
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
          )}
          <button
            className="text-neutral-600 hover:text-neutral-300 transition-colors"
            onClick={(e) => { e.stopPropagation(); setVisible(false); esRef.current?.close(); }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log body */}
      {!collapsed && (
        <div
          ref={logRef}
          className="max-h-64 overflow-y-auto px-4 py-3 font-mono text-xs space-y-1.5"
          style={{ scrollBehavior: 'smooth' }}
        >
          {events.length === 0 && status === 'connecting' && (
            <div className="text-neutral-600 animate-pulse">Connecting to reasoning stream…</div>
          )}
          {events.map((evt, idx) => {
            const Icon = STAGE_ICONS[evt.stage] || Terminal;
            const color = STAGE_COLORS[evt.stage] || 'text-neutral-400';
            const isSpinner = evt.stage === 'HYBRID_RRF_SEARCH' || evt.stage === 'GEMINI_SYNTHESIS';
            return (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-neutral-600 shrink-0" style={{ minWidth: '6ch' }}>
                  {new Date(evt.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${color} ${isSpinner && idx === events.length - 1 ? 'animate-spin' : ''}`} />
                <span className={`${color} shrink-0 font-semibold`}>[{evt.stage}]</span>
                <span className="text-neutral-300 leading-relaxed break-words">{evt.detail}</span>
                {Object.keys(evt.meta).length > 0 && (
                  <span className="text-neutral-600 ml-auto shrink-0">
                    {Object.entries(evt.meta).map(([k, v]) => `${k}=${v}`).join(' ')}
                  </span>
                )}
              </div>
            );
          })}
          {status === 'streaming' && events.length > 0 && (
            <div className="flex items-center gap-2 text-blue-400 animate-pulse">
              <Loader className="w-3 h-3 animate-spin" />
              <span>Processing…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
