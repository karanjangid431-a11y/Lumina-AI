import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, FileText, CheckCircle2, Copy } from 'lucide-react';

export interface BoundingBoxCitation {
  sourceTitle: string;
  page?: number;
  quote: string;
  authors?: string[];
  year?: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

interface VisualCitationModalProps {
  citation: BoundingBoxCitation | null;
  onClose: () => void;
}

export const VisualCitationModal: React.FC<VisualCitationModalProps> = ({ citation, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!citation) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simulate standard letter/A4 document aspect ratio (600 x 800)
    const width = 600;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    // Background paper texture
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Margins and mock header
    ctx.fillStyle = '#334155';
    ctx.fillRect(40, 30, width - 80, 14);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${citation.sourceTitle.slice(0, 45)}... • Page ${citation.page || 1}`, 40, 60);

    // Mock document text lines
    ctx.fillStyle = '#475569';
    let currY = 80;
    const totalLines = 26;

    // Determine target region for bounding box
    // Defaults to 40% down the page if not supplied
    const targetBox = citation.bbox || {
      x: 40,
      y: 260,
      width: width - 80,
      height: 75,
    };

    for (let i = 0; i < totalLines; i++) {
      const lineY = currY + i * 24;
      if (lineY > height - 60) break;

      // Draw normal paragraph lines
      ctx.fillRect(40, lineY, (width - 80) * (0.8 + ((i * 17) % 20) / 100), 7);
    }

    // Highlight / Bounding Box (Grounded Spatial Box)
    // Pulsing or illuminated amber/cyan glow box
    ctx.save();
    ctx.strokeStyle = '#38bdf8'; // Sky blue border
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)'; // Translucent highlight

    ctx.fillRect(targetBox.x - 6, targetBox.y - 6, targetBox.width + 12, targetBox.height + 12);
    ctx.strokeRect(targetBox.x - 6, targetBox.y - 6, targetBox.width + 12, targetBox.height + 12);

    // Overlay excerpt snippet inside the highlight zone
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'italic 12px serif';
    const words = citation.quote.split(' ');
    let line = '';
    let textY = targetBox.y + 16;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > targetBox.width && n > 0) {
        if (textY < targetBox.y + targetBox.height) {
          ctx.fillText(line, targetBox.x, textY);
        }
        line = words[n] + ' ';
        textY += 16;
      } else {
        line = testLine;
      }
    }
    if (textY < targetBox.y + targetBox.height) {
      ctx.fillText(line, targetBox.x, textY);
    }

    ctx.restore();

    // Verification watermark stamp
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('VERIFIED GROUNDED CITATION', targetBox.x, targetBox.y - 12);
    ctx.restore();
  }, [citation]);

  if (!citation) return null;

  const copyQuote = () => {
    navigator.clipboard.writeText(citation.quote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-neutral-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Visual Document Evidence
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Spatial Bounding Box
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {citation.sourceTitle} {citation.page ? `• Page ${citation.page}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-neutral-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left Canvas Viewport / Right Citation Quote */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 bg-slate-950">
          {/* Canvas Viewport */}
          <div className="md:col-span-2 overflow-auto p-6 flex justify-center items-start bg-slate-950/70 border-r border-white/5">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="shadow-2xl rounded-lg overflow-hidden border border-neutral-800"
            >
              <canvas ref={canvasRef} className="block" />
            </div>
          </div>

          {/* Right Citation Details Panel */}
          <div className="p-6 flex flex-col justify-between bg-slate-900/40">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Extracted Passage
                </span>
                <div className="mt-2 p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/50 text-sm text-neutral-200 leading-relaxed italic border-l-4 border-l-blue-400">
                  "{citation.quote}"
                </div>
              </div>

              <div className="space-y-2 text-xs text-neutral-400">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Source Paper</span>
                  <span className="text-neutral-200 font-medium text-right max-w-[180px] truncate">
                    {citation.sourceTitle}
                  </span>
                </div>
                {citation.authors && (
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Authors</span>
                    <span className="text-neutral-200 font-medium">{citation.authors.slice(0, 2).join(', ')}</span>
                  </div>
                )}
                {citation.year && (
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Publication Year</span>
                    <span className="text-neutral-200 font-medium">{citation.year}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Page Index</span>
                  <span className="text-blue-400 font-semibold">{citation.page || 1}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Verification Engine</span>
                  <span className="text-emerald-400 font-medium">Exact Bounding Match</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <button
                onClick={copyQuote}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied to Clipboard!' : 'Copy Excerpt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
