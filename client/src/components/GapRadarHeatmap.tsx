import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Search, AlertTriangle, TrendingUp, Loader, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface GapCell {
  row: number;
  col: number;
  density: number;
  label: string;
}

interface Gap {
  label: string;
  row: number;
  col: number;
  score: number;
  suggestion: string;
}

interface GapRadarData {
  grid: number[][];
  cells: GapCell[];
  gaps: Gap[];
  totalChunks: number;
  avgDensity: number;
  gridSize: number;
  coveragePercent: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas renderer helpers
// ─────────────────────────────────────────────────────────────────────────────
function drawRadar(canvas: HTMLCanvasElement, data: GapRadarData) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const GRID = data.gridSize;
  const cellW = W / GRID;
  const cellH = H / GRID;

  ctx.clearRect(0, 0, W, H);

  const maxDensity = Math.max(1, ...data.cells.map((c) => c.density));

  for (const cell of data.cells) {
    const x = cell.col * cellW;
    const y = cell.row * cellH;
    const intensity = cell.density / maxDensity;

    // Colour: dense = electric-blue gradient, gaps = dark-red glow
    if (intensity > 0.05) {
      // Well-covered region – blue gradient
      const alpha = 0.15 + intensity * 0.65;
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
    } else {
      // Research gap – dark red with subtle pulse
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    }
    ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

    // Grid border
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, cellW, cellH);

    // Density dot in centre of cell
    if (cell.density > 0) {
      const r = Math.max(2, Math.min(cellW / 4, intensity * cellW * 0.35));
      const cx = x + cellW / 2;
      const cy = y + cellH / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(99, 179, 250, ${0.6 + intensity * 0.4})`);
      grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // Gap markers – glowing red ring over empty cells
  for (const gap of data.gaps) {
    const cx = gap.col * cellW + cellW / 2;
    const cy = gap.row * cellH + cellH / 2;
    const r = Math.min(cellW, cellH) * 0.38;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + gap.score * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Warning triangle icon (drawn manually)
    ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + gap.score * 0.3})`;
    ctx.font = `${Math.floor(cellH * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, cy);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface GapRadarHeatmapProps {
  wid: string;
  /** Called when user clicks "Auto-search" on a gap */
  onAutoSearch?: (query: string) => void;
}

export default function GapRadarHeatmap({ wid, onAutoSearch }: GapRadarHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<GapCell | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<GapRadarData>({
    queryKey: ['gap-radar', wid],
    queryFn: () => api.getGapRadar(wid) as Promise<GapRadarData>,
    enabled: !!wid,
    staleTime: 60_000,
  });

  // Draw radar whenever data changes
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    drawRadar(canvasRef.current, data);
  }, [data]);

  // Handle hover over canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cellW = rect.width / data.gridSize;
    const cellH = rect.height / data.gridSize;
    const col = Math.floor(mx / cellW);
    const row = Math.floor(my / cellH);
    const cell = data.cells.find((c) => c.row === row && c.col === col);
    setHoveredCell(cell || null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Research Gap Predictor</span>
          {data && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
              {data.coveragePercent}% covered
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/40 text-slate-400 hover:text-white text-xs transition-all"
          aria-label="Refresh gap radar"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Radar canvas */}
      {isLoading ? (
        <div className="h-56 rounded-xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Loader className="w-4 h-4 animate-spin" />
          Analysing vector clusters…
        </div>
      ) : isError ? (
        <div className="h-56 rounded-xl bg-slate-800/40 border border-red-500/20 flex items-center justify-center gap-2 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Failed to load gap radar
        </div>
      ) : data ? (
        <>
          <div className="relative rounded-xl overflow-hidden border border-slate-700/30">
            <canvas
              ref={canvasRef}
              width={320}
              height={280}
              className="w-full h-auto cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredCell(null)}
              aria-label="Research gap heatmap radar"
            />
            {/* Hover tooltip */}
            {hoveredCell && (
              <div className="absolute bottom-2 left-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-xs text-white backdrop-blur-sm pointer-events-none">
                <div className="font-semibold text-blue-300">{hoveredCell.label}</div>
                <div className="text-slate-400">{hoveredCell.density} chunk{hoveredCell.density !== 1 ? 's' : ''}</div>
              </div>
            )}
            {/* Legend */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500/70" />
                <span className="text-slate-400">Well covered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/40" />
                <span className="text-slate-400">Gap</span>
              </div>
            </div>
          </div>

          {/* Gap list */}
          {data.gaps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Top Research Gaps ({data.gaps.length})
              </div>
              {data.gaps.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-950/20 border border-red-500/15 hover:border-red-500/30 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-red-300">{gap.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{gap.suggestion}</div>
                  </div>
                  {onAutoSearch && (
                    <button
                      onClick={() => onAutoSearch(gap.label)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:text-blue-200 text-xs whitespace-nowrap transition-all shrink-0"
                      aria-label={`Search for ${gap.label}`}
                    >
                      <Search className="w-3 h-3" />
                      Auto-search
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.gaps.length === 0 && data.totalChunks > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              Excellent coverage across all semantic regions!
            </div>
          )}

          {data.totalChunks === 0 && (
            <div className="text-center py-4 text-slate-500 text-xs">
              Add sources to your workspace to enable gap analysis.
            </div>
          )}

          <div className="text-xs text-slate-700 text-right">
            {data.totalChunks.toLocaleString()} chunks analysed · avg density {data.avgDensity}
          </div>
        </>
      ) : null}
    </div>
  );
}
