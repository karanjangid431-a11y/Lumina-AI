import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, Tag, Check, X } from 'lucide-react';

export interface SpatialAnnotation {
  id: string;
  pageNumber: number;
  selectedText: string;
  comment: string;
  author: string;
  createdAt: string;
  tags: string[];
  color: string;
}

interface SpatialAnnotationPanelProps {
  sourceTitle: string;
  annotations: SpatialAnnotation[];
  onAddAnnotation: (annotation: Omit<SpatialAnnotation, 'id' | 'createdAt'>) => void;
  onDeleteAnnotation: (id: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fbbf24', border: '#d97706' },
  { name: 'Emerald', value: '#34d399', border: '#059669' },
  { name: 'Sky', value: '#38bdf8', border: '#0284c7' },
  { name: 'Rose', value: '#fb7185', border: '#e11d48' },
  { name: 'Purple', value: '#c084fc', border: '#9333ea' },
];

export const SpatialAnnotationPanel: React.FC<SpatialAnnotationPanelProps> = ({
  sourceTitle,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [comment, setComment] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Hypothesis', 'Key Evidence']);
  const [activeColor, setActiveColor] = useState(HIGHLIGHT_COLORS[2].value);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText.trim() || !comment.trim()) return;

    onAddAnnotation({
      pageNumber,
      selectedText: selectedText.trim(),
      comment: comment.trim(),
      author: 'Lead Researcher',
      tags,
      color: activeColor,
    });

    setSelectedText('');
    setComment('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-semibold text-white">Spatial Annotations & Margins</h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400">
            {annotations.length}
          </span>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium border border-blue-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Annotate Margin
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">New Annotation</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <label className="text-[11px] text-neutral-400 block mb-1">Page</label>
              <input
                type="number"
                min={1}
                value={pageNumber}
                onChange={(e) => setPageNumber(parseInt(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div className="col-span-3">
              <label className="text-[11px] text-neutral-400 block mb-1">Highlight Color</label>
              <div className="flex items-center gap-2 py-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setActiveColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      activeColor === c.value ? 'scale-110 border-white' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Highlighted Passage</label>
            <input
              type="text"
              placeholder="Paste or cite document passage..."
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500"
              required
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Researcher Margin Note</label>
            <textarea
              rows={2}
              placeholder="Write margin comment, analysis or critique..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Tags (press Enter to add)</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1 text-xs text-white placeholder-neutral-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-medium flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Save Annotation
            </button>
          </div>
        </form>
      )}

      {/* List of Annotations */}
      {annotations.length === 0 && !isCreating ? (
        <p className="text-xs text-neutral-500 italic py-2">
          No margin notes yet. Click "Annotate Margin" to attach spatial insights or findings to specific pages.
        </p>
      ) : (
        <div className="space-y-2.5">
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="p-3.5 rounded-xl bg-neutral-900/50 border border-white/[0.08] text-xs relative group"
              style={{ borderLeftColor: ann.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-2">
                  Page {ann.pageNumber} • <span className="text-neutral-300 font-normal">{ann.author}</span>
                </span>
                <button
                  onClick={() => onDeleteAnnotation(ann.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-opacity"
                  title="Delete annotation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <blockquote className="italic text-neutral-300 mb-2 pl-2 border-l border-neutral-800">
                "{ann.selectedText}"
              </blockquote>

              <p className="text-neutral-200 mb-2">{ann.comment}</p>

              {ann.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ann.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
