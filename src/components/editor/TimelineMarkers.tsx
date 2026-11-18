import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { MarkerCategory, TimelineMarker } from '../../types/studio';
import { formatTimecode } from '../../utils/formatters';

const CATEGORIES: MarkerCategory[] = ['Story Beat', 'Transition Point', 'Audio Cue', 'Note'];

const COLOR_SWATCHES: { id: TimelineMarker['color']; dot: string; label: string }[] = [
  { id: 'amber', dot: 'bg-[#F59E0B]', label: 'Amber' },
  { id: 'sky', dot: 'bg-[#38BDF8]', label: 'Sky' },
  { id: 'emerald', dot: 'bg-[#34D399]', label: 'Emerald' },
  { id: 'rose', dot: 'bg-[#FB7185]', label: 'Rose' },
];

export const TimelineMarkers: React.FC = () => {
  const timelineMarkers = useStudioStore((s) => s.timelineMarkers);
  const selectedMarkerId = useStudioStore((s) => s.selectedMarkerId);
  const playheadSec = useStudioStore((s) => s.playheadSec);

  const addMarkerAtPlayhead = useStudioStore((s) => s.addMarkerAtPlayhead);
  const updateMarker = useStudioStore((s) => s.updateMarker);
  const deleteMarker = useStudioStore((s) => s.deleteMarker);
  const selectMarker = useStudioStore((s) => s.selectMarker);
  const setPlayheadSec = useStudioStore((s) => s.setPlayheadSec);
  const jumpToAdjacentMarker = useStudioStore((s) => s.jumpToAdjacentMarker);

  // Add-form state
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<MarkerCategory>('Story Beat');
  const [newColor, setNewColor] = useState<TimelineMarker['color']>('amber');
  const [newNotes, setNewNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | MarkerCategory>('All');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    label: string;
    timeSec: string;
    category: MarkerCategory;
    color: TimelineMarker['color'];
    notes: string;
  } | null>(null);

  const sortedMarkers = useMemo(() => {
    return [...timelineMarkers]
      .sort((a, b) => a.timeSec - b.timeSec)
      .filter((m) => {
        const matchesCategory =
          categoryFilter === 'All' || (m.category ?? 'Story Beat') === categoryFilter;
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          m.label.toLowerCase().includes(q) ||
          (m.notes ?? '').toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
      });
  }, [timelineMarkers, categoryFilter, searchQuery]);

  const handleAddMarker = (e: React.FormEvent) => {
    e.preventDefault();
    addMarkerAtPlayhead({
      label: newLabel,
      category: newCategory,
      color: newColor,
      notes: newNotes,
    });
    setNewLabel('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const beginEdit = (marker: TimelineMarker) => {
    setEditingId(marker.id);
    setEditDraft({
      label: marker.label,
      timeSec: marker.timeSec.toFixed(2),
      category: marker.category ?? 'Story Beat',
      color: marker.color,
      notes: marker.notes ?? '',
    });
  };

  const saveEdit = (markerId: string) => {
    if (!editDraft) return;
    const parsedTime = Number(editDraft.timeSec);
    updateMarker(markerId, {
      label: editDraft.label.trim() || 'Untitled Marker',
      timeSec: Number.isFinite(parsedTime) ? Math.max(0, parsedTime) : 0,
      category: editDraft.category,
      color: editDraft.color,
      notes: editDraft.notes.trim(),
    });
    setEditingId(null);
    setEditDraft(null);
  };

  const navigateToMarker = (marker: TimelineMarker) => {
    selectMarker(marker.id);
    setPlayheadSec(marker.timeSec);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#15171B] text-[12px]">
      {/* Top Action Strip: Prev / Next Navigation + New Marker */}
      <div className="p-2.5 border-b border-[#24272F] space-y-2">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => jumpToAdjacentMarker('prev')}
              disabled={timelineMarkers.length === 0}
              title="Jump to previous marker ([)"
              className="p-1.5 rounded bg-[#1D2028] hover:bg-[#272B36] text-[#C8CDD8] border border-[#2C303B] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => jumpToAdjacentMarker('next')}
              disabled={timelineMarkers.length === 0}
              title="Jump to next marker (])"
              className="p-1.5 rounded bg-[#1D2028] hover:bg-[#272B36] text-[#C8CDD8] border border-[#2C303B] disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="ml-1 text-[11px] font-mono text-[#7A8190] tabular-nums">
              @{formatTimecode(playheadSec, 24)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors"
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span>{showAddForm ? 'Cancel' : 'Add at Playhead'}</span>
          </button>
        </div>

        {/* Add Marker Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddMarker}
            className="p-2.5 rounded bg-[#111216] border border-[#2C313D] space-y-2"
          >
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Beat Drop, Whip Cut)..."
              autoFocus
              className="w-full px-2.5 py-1.5 rounded bg-[#181A20] border border-[#2C303A] text-[12px] text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newCategory}
                onChange={(e) => {
                  const cat = e.target.value as MarkerCategory;
                  setNewCategory(cat);
                  setNewColor(
                    cat === 'Transition Point'
                      ? 'sky'
                      : cat === 'Audio Cue'
                      ? 'emerald'
                      : cat === 'Note'
                      ? 'rose'
                      : 'amber'
                  );
                }}
                className="px-2 py-1.5 rounded bg-[#181A20] border border-[#2C303A] text-[11px] text-[#E6E8EC]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-around px-1.5 rounded bg-[#181A20] border border-[#2C303A]">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => setNewColor(swatch.id)}
                    title={swatch.label}
                    className={`w-4 h-4 rounded-full ${swatch.dot} ${
                      newColor === swatch.id ? 'ring-2 ring-white ring-offset-1 ring-offset-[#181A20]' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Optional technical or story notes..."
              className="w-full px-2.5 py-1.5 rounded bg-[#181A20] border border-[#2C303A] text-[11px] text-[#C8CDD8] focus:outline-none focus:border-[#3B82F6]"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[11px] font-medium"
            >
              Save Marker at {formatTimecode(playheadSec, 24)}
            </button>
          </form>
        )}

        {/* Search & Category Filter */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-[#7A8190] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter markers..."
              className="w-full pl-7 pr-2 py-1 rounded bg-[#111216] border border-[#262932] text-[11px] text-[#E6E8EC] placeholder:text-[#6D7484] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'All' | MarkerCategory)}
            aria-label="Filter by marker category"
            className="px-2 py-1 rounded bg-[#111216] border border-[#262932] text-[11px] text-[#C8CDD8]"
          >
            <option value="All">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chronological Marker List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {sortedMarkers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          const isEditing = editingId === marker.id && editDraft !== null;
          const swatch = COLOR_SWATCHES.find((c) => c.id === marker.color) ?? COLOR_SWATCHES[0];

          if (isEditing && editDraft) {
            return (
              <div
                key={marker.id}
                className="p-2.5 rounded bg-[#111216] border border-[#3B82F6]/70 space-y-2"
              >
                <input
                  type="text"
                  value={editDraft.label}
                  onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                  className="w-full px-2 py-1 rounded bg-[#181A20] border border-[#2C303A] text-[12px] text-white"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={editDraft.timeSec}
                      onChange={(e) => setEditDraft({ ...editDraft, timeSec: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#181A20] border border-[#2C303A] font-mono text-[11px] text-[#E6E8EC]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditDraft({ ...editDraft, timeSec: playheadSec.toFixed(2) })
                      }
                      title="Set timestamp to current playhead"
                      className="p-1.5 rounded bg-[#1F232C] hover:bg-[#2A303D] text-[#9BA2B0] hover:text-white"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                  </div>
                  <select
                    value={editDraft.category}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, category: e.target.value as MarkerCategory })
                    }
                    className="px-2 py-1 rounded bg-[#181A20] border border-[#2C303A] text-[11px] text-[#E6E8EC]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {COLOR_SWATCHES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setEditDraft({ ...editDraft, color: s.id })}
                        className={`w-3.5 h-3.5 rounded-full ${s.dot} ${
                          editDraft.color === s.id ? 'ring-2 ring-white' : 'opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                      className="px-2 py-1 rounded text-[11px] text-[#9BA2B0] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(marker.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[11px] font-medium"
                    >
                      <Check className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={editDraft.notes}
                  onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-2 py-1 rounded bg-[#181A20] border border-[#2C303A] text-[11px] text-[#C8CDD8]"
                />
              </div>
            );
          }

          return (
            <div
              key={marker.id}
              className={`rounded border p-2.5 transition-colors ${
                isSelected
                  ? 'bg-[#1C2230] border-[#3B82F6]/70'
                  : 'bg-[#191B21] border-[#252832] hover:border-[#363B48]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigateToMarker(marker)}
                  className="flex items-start gap-2 text-left min-w-0 flex-1"
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${swatch.dot}`} />
                  <div className="min-w-0">
                    <div className="font-medium text-[#F3F4F6] truncate">{marker.label}</div>
                    <div className="text-[10px] font-mono text-[#8E95A5] tabular-nums mt-0.5">
                      {formatTimecode(marker.timeSec, 24)} · {marker.category ?? 'Story Beat'}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => beginEdit(marker)}
                    title="Edit marker"
                    className="p-1 rounded text-[#7A8190] hover:text-white hover:bg-[#242834]"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMarker(marker.id)}
                    title="Delete marker"
                    className="p-1 rounded text-[#7A8190] hover:text-[#EF4444] hover:bg-[#242834]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {marker.notes && (
                <p className="mt-1.5 pl-4 text-[11px] text-[#9BA2B0] leading-snug">
                  {marker.notes}
                </p>
              )}
            </div>
          );
        })}

        {sortedMarkers.length === 0 && (
          <div className="py-8 px-3 text-center text-[#7A8190] space-y-2">
            <Bookmark className="w-5 h-5 mx-auto text-[#565C69]" />
            <div className="text-[12px]">
              {timelineMarkers.length === 0
                ? 'No timeline markers yet. Press M or click "Add at Playhead" to mark a story beat or transition.'
                : 'No markers match your filter.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
