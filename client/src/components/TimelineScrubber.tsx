import React, { useState, useCallback, useEffect } from 'react';
import { Clock, Rewind, FastForward, GitBranch, AlertCircle, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface VersionSnapshot {
  /** Monotonically increasing version index (0 = oldest) */
  index: number;
  /** Human-readable label, e.g. "3 sources" */
  label: string;
  /** ISO timestamp of the last source added at this version */
  timestamp: string;
  /** IDs of nodes visible at this version */
  nodeIds: Set<string>;
  /** IDs of edges visible at this version */
  edgeIds: Set<string>;
  /** New contradiction introduced at this version (if any) */
  contradiction?: string;
}

interface TimelineScrubberProps {
  /** All graph nodes (from InsightsPage's graph data) */
  nodes: any[];
  /** All graph edges */
  edges: any[];
  /** Called each time the scrubber position changes */
  onVersionChange: (nodeIds: Set<string>, edgeIds: Set<string>, snapshot: VersionSnapshot) => void;
  /** Called when user requests a "Delta Brief" between two versions */
  onDeltaBrief?: (fromIdx: number, toIdx: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build versioned snapshots from raw graph data
// Each unique `created_at` timestamp is treated as a new version.
// ─────────────────────────────────────────────────────────────────────────────
function buildSnapshots(nodes: any[], edges: any[]): VersionSnapshot[] {
  if (!nodes.length) return [];

  // Collect all unique timestamps and sort ascending
  const timestamps = Array.from(
    new Set(nodes.map((n) => n.created_at || n.id).filter(Boolean))
  ).sort();

  return timestamps.map((ts, idx) => {
    const visibleNodes = nodes.filter((n) => (n.created_at || n.id) <= ts);
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id as string));
    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(String(e.from)) && visibleNodeIds.has(String(e.to))
    );

    // Detect contradictions: edges labelled 'contradicts' added at this snapshot
    const newContra = edges.find(
      (e) =>
        (e.label || '').toLowerCase().includes('contradict') &&
        visibleNodeIds.has(String(e.from)) &&
        visibleNodeIds.has(String(e.to)) &&
        // first appears at this version
        !new Set(
          nodes
            .filter((n) => (n.created_at || n.id) < ts)
            .map((n) => n.id)
        ).has(String(e.from))
    );

    return {
      index: idx,
      label: `${visibleNodes.length} source${visibleNodes.length !== 1 ? 's' : ''}`,
      timestamp: ts,
      nodeIds: visibleNodeIds,
      edgeIds: new Set(visibleEdges.map((_: any, i: number) => String(i))),
      contradiction: newContra
        ? `Document "${newContra.from}" introduces a conflict on "${newContra.label}"`
        : undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TimelineScrubber({
  nodes,
  edges,
  onVersionChange,
  onDeltaBrief,
}: TimelineScrubberProps) {
  const snapshots = buildSnapshots(nodes, edges);
  const max = Math.max(0, snapshots.length - 1);

  const [pos, setPos] = useState<number>(max);
  const [deltaFrom, setDeltaFrom] = useState<number>(0);
  const [showDelta, setShowDelta] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Emit version change whenever pos changes
  useEffect(() => {
    const snap = snapshots[pos];
    if (snap) onVersionChange(snap.nodeIds, snap.edgeIds, snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, snapshots.length]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return;
    if (pos >= max) { setIsPlaying(false); return; }
    const t = setTimeout(() => setPos((p) => Math.min(p + 1, max)), 800);
    return () => clearTimeout(t);
  }, [isPlaying, pos, max]);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsPlaying(false);
      setPos(Number(e.target.value));
    },
    []
  );

  const currentSnap = snapshots[pos];

  if (!snapshots.length) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900/50 border border-white/[0.08] text-neutral-500 text-xs">
        <Clock className="w-4 h-4" />
        Add at least two sources to enable Time Travel
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-white">Mind Map Time Travel</span>
        <span className="ml-auto text-xs text-neutral-500">
          {snapshots.length} version{snapshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrubber rail */}
      <div className="relative px-1">
        {/* Version tick marks */}
        <div className="flex justify-between mb-1 px-0.5">
          {snapshots.map((s, i) => (
            <div key={i} className="flex flex-col items-center" style={{ width: `${100 / snapshots.length}%` }}>
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${i <= pos ? 'bg-blue-400' : 'bg-neutral-800'}`} />
              {s.contradiction && <AlertCircle className="w-3 h-3 text-red-400 mt-0.5" />}
            </div>
          ))}
        </div>

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={max}
          value={pos}
          onChange={handleScrub}
          className="w-full accent-blue-500 cursor-pointer"
          style={{ height: '6px' }}
          aria-label="Timeline position"
        />

        {/* Labels */}
        <div className="flex justify-between mt-1 text-xs text-neutral-600">
          <span>V1</span>
          <span>V{snapshots.length}</span>
        </div>
      </div>

      {/* Current snapshot info */}
      {currentSnap && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-900/60 border border-white/[0.08]">
          <GitBranch className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white">
              Version {pos + 1} — {currentSnap.label}
            </div>
            {currentSnap.contradiction && (
              <div className="flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                <span className="text-xs text-red-300 truncate">{currentSnap.contradiction}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Rewind */}
            <button
              onClick={() => setPos((p) => Math.max(0, p - 1))}
              disabled={pos === 0}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors disabled:opacity-30"
              aria-label="Previous version"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>
            {/* Play / Pause */}
            <button
              onClick={() => { if (pos >= max) setPos(0); setIsPlaying((p) => !p); }}
              className="p-1 rounded hover:bg-neutral-800 text-blue-400 hover:text-blue-300 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play animation'}
            >
              <Zap className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse' : ''}`} />
            </button>
            {/* Fast-forward */}
            <button
              onClick={() => setPos((p) => Math.min(max, p + 1))}
              disabled={pos === max}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors disabled:opacity-30"
              aria-label="Next version"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Delta Brief */}
      {max > 0 && onDeltaBrief && (
        <div className="border-t border-white/[0.08] pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDelta((s) => !s)}
              className="text-xs text-neutral-400 hover:text-blue-300 transition-colors underline underline-offset-2"
            >
              Generate Delta Brief
            </button>
            <span className="text-neutral-600 text-xs">between two versions</span>
          </div>
          {showDelta && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <select
                value={deltaFrom}
                onChange={(e) => setDeltaFrom(Number(e.target.value))}
                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none"
              >
                {snapshots.map((s, i) => (
                  <option key={i} value={i}>V{i + 1} ({s.label})</option>
                ))}
              </select>
              <span className="text-neutral-500 text-xs">→</span>
              <span className="text-xs text-neutral-400">V{pos + 1} ({currentSnap?.label})</span>
              <button
                onClick={() => onDeltaBrief(deltaFrom, pos)}
                disabled={deltaFrom === pos}
                className="px-3 py-1 bg-white hover:bg-neutral-200 text-black rounded text-xs font-medium transition-colors disabled:opacity-40"
              >
                Generate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
