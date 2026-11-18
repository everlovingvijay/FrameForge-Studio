import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Eye,
  EyeOff,
  Lock,
  Magnet,
  Maximize,
  Redo2,
  Scissors,
  Trash2,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { TimelineClip, TimelineMarker, TimelineTrackId } from '../../types/studio';
import { formatTimecode } from '../../utils/formatters';
import { getClipDuckingIntervals } from '../../utils/audioDucking';
import { collectSnapTargets, findBestSnap, SnapCandidateResult } from '../../utils/timelineSnap';
import { ClipInspectorPanel } from '../editor/ClipInspectorPanel';
import { MediaBrowserPanel } from '../editor/MediaBrowserPanel';
import { PreviewMonitor } from '../editor/PreviewMonitor';
import { TimelineMarkers } from '../editor/TimelineMarkers';

const TRACK_LABEL_WIDTH = 160;
const TRACK_ROW_HEIGHT = 44;
const VIDEO_TRACK_ORDER: TimelineTrackId[] = ['V3', 'V2', 'V1'];
const AUDIO_TRACK_ORDER: TimelineTrackId[] = ['A1', 'A2', 'A3'];

const AUDIO_WAVEFORM_PATTERN = [
  24, 52, 78, 40, 88, 66, 32, 94, 58, 72, 38, 84, 48, 64, 90, 36, 70, 54, 82, 42, 68, 92, 44, 60,
];

type DragOperation =
  | {
      type: 'clip-move';
      clipId: string;
      startMouseX: number;
      startMouseY: number;
      origStartSec: number;
      origDurationSec: number;
      origTrackId: TimelineTrackId;
      snapshotRecorded: boolean;
    }
  | {
      type: 'clip-trim-left';
      clipId: string;
      startMouseX: number;
      origStartSec: number;
      origDurationSec: number;
      origTrimInSec: number;
      snapshotRecorded: boolean;
    }
  | {
      type: 'clip-trim-right';
      clipId: string;
      startMouseX: number;
      origStartSec: number;
      origDurationSec: number;
      snapshotRecorded: boolean;
    }
  | {
      type: 'transition-resize';
      clipId: string;
      startMouseX: number;
      origStartSec: number;
      origClipDurationSec: number;
      origTransitionSec: number;
      snapshotRecorded: boolean;
    }
  | {
      type: 'marker-move';
      markerId: string;
      startMouseX: number;
      origTimeSec: number;
    }
  | {
      type: 'playhead-scrub';
      trackScrollLeft: number;
    };

const MARKER_COLORS: Record<TimelineMarker['color'], { flag: string; line: string }> = {
  amber: { flag: 'bg-[#F59E0B] text-[#111215]', line: 'bg-[#F59E0B]/40' },
  sky: { flag: 'bg-[#38BDF8] text-[#111215]', line: 'bg-[#38BDF8]/40' },
  emerald: { flag: 'bg-[#34D399] text-[#111215]', line: 'bg-[#34D399]/40' },
  rose: { flag: 'bg-[#FB7185] text-[#111215]', line: 'bg-[#FB7185]/40' },
};

export const ProEditorView: React.FC = () => {
  const timelineTracks = useStudioStore((s) => s.timelineTracks);
  const timelineClips = useStudioStore((s) => s.timelineClips);
  const timelineHistoryPast = useStudioStore((s) => s.timelineHistoryPast);
  const timelineHistoryFuture = useStudioStore((s) => s.timelineHistoryFuture);
  const timelineMarkers = useStudioStore((s) => s.timelineMarkers);
  const snapSettings = useStudioStore((s) => s.snapSettings);
  const timelineZoom = useStudioStore((s) => s.timelineZoom);
  const playheadSec = useStudioStore((s) => s.playheadSec);
  const isPlayingPreview = useStudioStore((s) => s.isPlayingPreview);
  const previewSpeed = useStudioStore((s) => s.previewSpeed);
  const selectedClipId = useStudioStore((s) => s.selectedClipId);
  const selectedMarkerId = useStudioStore((s) => s.selectedMarkerId);

  const setTimelineZoom = useStudioStore((s) => s.setTimelineZoom);
  const setPlayheadSec = useStudioStore((s) => s.setPlayheadSec);
  const togglePreviewPlayback = useStudioStore((s) => s.togglePreviewPlayback);
  const selectTimelineClip = useStudioStore((s) => s.selectTimelineClip);
  const recordTimelineSnapshot = useStudioStore((s) => s.recordTimelineSnapshot);
  const undoTimeline = useStudioStore((s) => s.undoTimeline);
  const redoTimeline = useStudioStore((s) => s.redoTimeline);
  const splitSelectedClipAtPlayhead = useStudioStore((s) => s.splitSelectedClipAtPlayhead);
  const trimSelectedClipToPlayhead = useStudioStore((s) => s.trimSelectedClipToPlayhead);
  const deleteSelectedClip = useStudioStore((s) => s.deleteSelectedClip);
  const updateClipProperties = useStudioStore((s) => s.updateClipProperties);
  const moveTimelineClip = useStudioStore((s) => s.moveTimelineClip);
  const trimTimelineClip = useStudioStore((s) => s.trimTimelineClip);
  const toggleTrackLock = useStudioStore((s) => s.toggleTrackLock);
  const toggleTrackVisibility = useStudioStore((s) => s.toggleTrackVisibility);
  const toggleTrackMute = useStudioStore((s) => s.toggleTrackMute);
  const toggleTrackSolo = useStudioStore((s) => s.toggleTrackSolo);
  const toggleSnapping = useStudioStore((s) => s.toggleSnapping);
  const updateSnapSettings = useStudioStore((s) => s.updateSnapSettings);
  const selectMarker = useStudioStore((s) => s.selectMarker);
  const addMarkerAtPlayhead = useStudioStore((s) => s.addMarkerAtPlayhead);
  const updateMarker = useStudioStore((s) => s.updateMarker);
  const jumpToAdjacentMarker = useStudioStore((s) => s.jumpToAdjacentMarker);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [dragOp, setDragOp] = useState<DragOperation | null>(null);
  const [activeSnap, setActiveSnap] = useState<SnapCandidateResult | null>(null);
  const [altBypassActive, setAltBypassActive] = useState(false);
  const [snapMenuOpen, setSnapMenuOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'inspector' | 'markers'>('inspector');

  const totalTimelineSec = Math.max(
    45,
    ...timelineClips.map((c) => c.startSec + c.durationSec + 6),
    ...timelineMarkers.map((m) => m.timeSec + 6)
  );

  // Playback loop respecting previewSpeed
  useEffect(() => {
    if (!isPlayingPreview) return;
    const timer = window.setInterval(() => {
      const state = useStudioStore.getState();
      const next = state.playheadSec + 0.1 * state.previewSpeed;
      setPlayheadSec(next >= totalTimelineSec ? 0 : Number(next.toFixed(2)));
    }, 100);
    return () => window.clearInterval(timer);
  }, [isPlayingPreview, setPlayheadSec, totalTimelineSec]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redoTimeline();
        } else {
          undoTimeline();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        toggleSnapping();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        addMarkerAtPlayhead();
        setRightPanelTab('markers');
      } else if (e.key === '[') {
        e.preventDefault();
        jumpToAdjacentMarker('prev');
        setRightPanelTab('markers');
      } else if (e.key === ']') {
        e.preventDefault();
        jumpToAdjacentMarker('next');
        setRightPanelTab('markers');
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePreviewPlayback();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteSelectedClip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    addMarkerAtPlayhead,
    deleteSelectedClip,
    jumpToAdjacentMarker,
    redoTimeline,
    togglePreviewPlayback,
    toggleSnapping,
    undoTimeline,
  ]);

  // Unified timeline drag & snap handler
  useEffect(() => {
    if (!dragOp) return;

    const ensureSnapshot = () => {
      if ('snapshotRecorded' in dragOp && !dragOp.snapshotRecorded) {
        recordTimelineSnapshot();
        dragOp.snapshotRecorded = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const bypass = e.altKey;
      setAltBypassActive(bypass);

      const state = useStudioStore.getState();
      const zoom = state.timelineZoom;
      const clips = state.timelineClips;
      const tracks = state.timelineTracks;
      const markers = state.timelineMarkers;
      const playhead = state.playheadSec;
      const settings = state.snapSettings;

      if (dragOp.type === 'playhead-scrub') {
        const container = scrollContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const xInTimeline = e.clientX - rect.left + container.scrollLeft - TRACK_LABEL_WIDTH;
        const rawSec = Math.max(0, xInTimeline / zoom);
        const targets = collectSnapTargets({
          clips,
          markers,
          playheadSec: playhead,
          snapSettings: settings,
          excludePlayhead: true,
        });
        const snap = findBestSnap({
          anchorTimesSec: [rawSec],
          targets,
          timelineZoom: zoom,
          snapSettings: settings,
          bypassSnap: bypass,
        });
        const finalSec = snap ? rawSec + snap.snappedDeltaSec : rawSec;
        setActiveSnap(snap);
        setPlayheadSec(Math.max(0, finalSec));
        return;
      }

      const deltaPx = e.clientX - dragOp.startMouseX;
      const deltaSec = deltaPx / zoom;

      if (dragOp.type === 'marker-move') {
        const rawTime = Math.max(0, dragOp.origTimeSec + deltaSec);
        const targets = collectSnapTargets({
          clips,
          markers,
          playheadSec: playhead,
          snapSettings: settings,
          excludeMarkerId: dragOp.markerId,
        });
        const snap = findBestSnap({
          anchorTimesSec: [rawTime],
          targets,
          timelineZoom: zoom,
          snapSettings: settings,
          bypassSnap: bypass,
        });
        const finalTime = snap ? rawTime + snap.snappedDeltaSec : rawTime;
        setActiveSnap(snap);
        updateMarker(dragOp.markerId, { timeSec: Math.max(0, finalTime) });
        return;
      }

      if (dragOp.type === 'clip-move') {
        const rawStart = Math.max(0, dragOp.origStartSec + deltaSec);
        const rawEnd = rawStart + dragOp.origDurationSec;
        const targets = collectSnapTargets({
          clips,
          markers,
          playheadSec: playhead,
          snapSettings: settings,
          excludeClipId: dragOp.clipId,
        });
        const snap = findBestSnap({
          anchorTimesSec: [rawStart, rawEnd],
          targets,
          timelineZoom: zoom,
          snapSettings: settings,
          bypassSnap: bypass,
        });
        const finalStart = Math.max(0, snap ? rawStart + snap.snappedDeltaSec : rawStart);

        // Track-lane transfer across same track group (V3/V2/V1 or A1/A2/A3)
        const deltaY = e.clientY - dragOp.startMouseY;
        const rowShift = Math.round(deltaY / TRACK_ROW_HEIGHT);
        const isVideo = dragOp.origTrackId.startsWith('V');
        const group = isVideo ? VIDEO_TRACK_ORDER : AUDIO_TRACK_ORDER;
        const origIdx = group.indexOf(dragOp.origTrackId);
        const clampedIdx = Math.max(0, Math.min(group.length - 1, origIdx + rowShift));
        const candidateTrack = group[clampedIdx] ?? dragOp.origTrackId;
        const dstLocked = tracks.find((t) => t.id === candidateTrack)?.locked;
        const nextTrack = dstLocked ? dragOp.origTrackId : candidateTrack;

        if (Math.abs(deltaPx) > 2 || nextTrack !== dragOp.origTrackId) {
          ensureSnapshot();
        }
        setActiveSnap(snap);
        moveTimelineClip(dragOp.clipId, finalStart, nextTrack);
        return;
      }

      if (dragOp.type === 'clip-trim-left') {
        const fixedEnd = dragOp.origStartSec + dragOp.origDurationSec;
        const rawStart = Math.min(fixedEnd - 0.5, Math.max(0, dragOp.origStartSec + deltaSec));
        const targets = collectSnapTargets({
          clips,
          markers,
          playheadSec: playhead,
          snapSettings: settings,
          excludeClipId: dragOp.clipId,
        });
        const snap = findBestSnap({
          anchorTimesSec: [rawStart],
          targets,
          timelineZoom: zoom,
          snapSettings: settings,
          bypassSnap: bypass,
        });
        const snappedStart = snap
          ? Math.min(fixedEnd - 0.5, Math.max(0, rawStart + snap.snappedDeltaSec))
          : rawStart;
        const newDuration = fixedEnd - snappedStart;
        const trimShift = snappedStart - dragOp.origStartSec;
        if (Math.abs(deltaPx) > 2) ensureSnapshot();
        setActiveSnap(snap);
        trimTimelineClip(
          dragOp.clipId,
          snappedStart,
          newDuration,
          Math.max(0, dragOp.origTrimInSec + trimShift)
        );
        return;
      }

      if (dragOp.type === 'clip-trim-right') {
        const rawEnd = Math.max(
          dragOp.origStartSec + 0.5,
          dragOp.origStartSec + dragOp.origDurationSec + deltaSec
        );
        const targets = collectSnapTargets({
          clips,
          markers,
          playheadSec: playhead,
          snapSettings: settings,
          excludeClipId: dragOp.clipId,
        });
        const snap = findBestSnap({
          anchorTimesSec: [rawEnd],
          targets,
          timelineZoom: zoom,
          snapSettings: settings,
          bypassSnap: bypass,
        });
        const snappedEnd = snap
          ? Math.max(dragOp.origStartSec + 0.5, rawEnd + snap.snappedDeltaSec)
          : rawEnd;
        const newDuration = snappedEnd - dragOp.origStartSec;
        if (Math.abs(deltaPx) > 2) ensureSnapshot();
        setActiveSnap(snap);
        trimTimelineClip(dragOp.clipId, dragOp.origStartSec, newDuration);
        return;
      }

      if (dragOp.type === 'transition-resize') {
        const maxTrans = Math.max(0.4, Number((dragOp.origClipDurationSec * 0.6).toFixed(2)));
        const rawTransEnd =
          dragOp.origStartSec +
          Math.min(maxTrans, Math.max(0.2, dragOp.origTransitionSec + deltaSec));
        const targets = collectSnapTargets({
          clips,
          markers,
          playheadSec: playhead,
          snapSettings: settings,
          excludeTransitionClipId: dragOp.clipId,
        });
        const snap = findBestSnap({
          anchorTimesSec: [rawTransEnd],
          targets,
          timelineZoom: zoom,
          snapSettings: settings,
          bypassSnap: bypass,
        });
        const finalTransEnd = snap ? rawTransEnd + snap.snappedDeltaSec : rawTransEnd;
        const clampedDuration = Math.min(
          maxTrans,
          Math.max(0.2, Number((finalTransEnd - dragOp.origStartSec).toFixed(2)))
        );
        if (Math.abs(deltaPx) > 2) ensureSnapshot();
        setActiveSnap(snap);
        updateClipProperties(dragOp.clipId, { transitionDurationSec: clampedDuration });
      }
    };

    const handleMouseUp = () => {
      setDragOp(null);
      setActiveSnap(null);
      setAltBypassActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragOp,
    moveTimelineClip,
    recordTimelineSnapshot,
    setPlayheadSec,
    trimTimelineClip,
    updateClipProperties,
    updateMarker,
  ]);

  const selectedClip = timelineClips.find((c) => c.id === selectedClipId) ?? null;
  const selectedClipLocked = selectedClip
    ? Boolean(timelineTracks.find((t) => t.id === selectedClip.trackId)?.locked)
    : false;

  const canSplit =
    Boolean(selectedClip) &&
    !selectedClipLocked &&
    selectedClip !== null &&
    playheadSec > selectedClip.startSec + 0.3 &&
    playheadSec < selectedClip.startSec + selectedClip.durationSec - 0.3;

  const canTrimIn =
    Boolean(selectedClip) &&
    !selectedClipLocked &&
    selectedClip !== null &&
    playheadSec > selectedClip.startSec + 0.1 &&
    playheadSec < selectedClip.startSec + selectedClip.durationSec - 0.5;

  const canTrimOut =
    Boolean(selectedClip) &&
    !selectedClipLocked &&
    selectedClip !== null &&
    playheadSec > selectedClip.startSec + 0.5 &&
    playheadSec < selectedClip.startSec + selectedClip.durationSec - 0.1;

  const fitTimelineToViewport = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const availablePx = Math.max(320, container.clientWidth - TRACK_LABEL_WIDTH - 48);
    const idealZoom = availablePx / totalTimelineSec;
    setTimelineZoom(Number(idealZoom.toFixed(1)));
  };

  const snapGuideColor =
    activeSnap?.matchedTarget.kind === 'marker'
      ? 'bg-[#F59E0B]'
      : activeSnap?.matchedTarget.kind === 'transition-end'
      ? 'bg-[#A78BFA]'
      : 'bg-[#38BDF8]';

  const rulerStepSec = timelineZoom >= 24 ? 2 : timelineZoom >= 12 ? 5 : 10;

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden bg-[#111215]">
      {/* Upper Workspace: Left Media Browser + Center Preview Monitor + Right Inspector/Markers */}
      <div className="flex-1 min-h-[250px] grid grid-cols-1 lg:grid-cols-12 border-b border-[#24272F] overflow-hidden">
        <MediaBrowserPanel />

        <PreviewMonitor totalTimelineSec={totalTimelineSec} />

        {/* Right Panel: Clip Inspector + Timeline Markers */}
        <aside className="relative lg:col-span-3 border-t lg:border-t-0 lg:border-l border-[#24272F] bg-[#15171B] flex flex-col min-h-0">
          <div className="px-2 pt-1.5 border-b border-[#24272F] flex items-center gap-1 bg-[#14161A]">
            <button
              type="button"
              onClick={() => setRightPanelTab('inspector')}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-t border-t border-x transition-colors ${
                rightPanelTab === 'inspector'
                  ? 'bg-[#15171B] text-[#F3F4F6] border-[#24272F] -mb-px pb-[7px]'
                  : 'bg-transparent text-[#8E95A5] border-transparent hover:text-[#E6E8EC]'
              }`}
            >
              Inspector
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('markers')}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-t border-t border-x transition-colors ${
                rightPanelTab === 'markers'
                  ? 'bg-[#15171B] text-[#F3F4F6] border-[#24272F] -mb-px pb-[7px]'
                  : 'bg-transparent text-[#8E95A5] border-transparent hover:text-[#E6E8EC]'
              }`}
            >
              Markers ({timelineMarkers.length})
            </button>
          </div>

          {rightPanelTab === 'inspector' ? (
            <ClipInspectorPanel />
          ) : (
            <div className="flex-1 min-h-0">
              <TimelineMarkers />
            </div>
          )}
        </aside>
      </div>

      {/* Lower Workspace: 6-Track Timeline */}
      <section className="h-[344px] shrink-0 bg-[#14161A] flex flex-col">
        {/* Compact NLE Timeline Toolbar */}
        <div className="h-10 px-3 border-b border-[#24272F] flex items-center justify-between gap-3 bg-[#17191F] relative">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 mr-1">
              <button
                type="button"
                onClick={undoTimeline}
                disabled={timelineHistoryPast.length === 0}
                title="Undo timeline edit (Ctrl/Cmd+Z)"
                className="p-1.5 rounded bg-[#20232B] hover:bg-[#2A2E39] text-[#E6E8EC] border border-[#2E3340] disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={redoTimeline}
                disabled={timelineHistoryFuture.length === 0}
                title="Redo timeline edit (Ctrl/Cmd+Shift+Z)"
                className="p-1.5 rounded bg-[#20232B] hover:bg-[#2A2E39] text-[#E6E8EC] border border-[#2E3340] disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Split / Trim In / Trim Out / Delete */}
            <button
              type="button"
              onClick={splitSelectedClipAtPlayhead}
              disabled={!canSplit}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#20232B] hover:bg-[#2A2E39] text-[#E6E8EC] border border-[#2E3340] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              title="Split selected clip at playhead"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>

            <button
              type="button"
              onClick={() => trimSelectedClipToPlayhead('in')}
              disabled={!canTrimIn}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#20232B] hover:bg-[#2A2E39] text-[#E6E8EC] border border-[#2E3340] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              title="Trim clip In-point to playhead"
            >
              <ArrowLeftToLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trim In</span>
            </button>

            <button
              type="button"
              onClick={() => trimSelectedClipToPlayhead('out')}
              disabled={!canTrimOut}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#20232B] hover:bg-[#2A2E39] text-[#E6E8EC] border border-[#2E3340] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              title="Trim clip Out-point to playhead"
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trim Out</span>
            </button>

            <button
              type="button"
              onClick={deleteSelectedClip}
              disabled={!selectedClip || selectedClipLocked}
              className="p-1.5 rounded bg-[#20232B] hover:bg-[#3A2227] text-[#C8CDD8] hover:text-[#FCA5A5] border border-[#2E3340] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete selected clip (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Marker Actions */}
            <div className="flex items-center ml-1">
              <button
                type="button"
                onClick={() => {
                  jumpToAdjacentMarker('prev');
                  setRightPanelTab('markers');
                }}
                disabled={timelineMarkers.length === 0}
                title="Previous marker ([)"
                className="p-1 rounded-l bg-[#20232B] hover:bg-[#2A2E39] text-[#C8CDD8] border border-[#2E3340] disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  addMarkerAtPlayhead();
                  setRightPanelTab('markers');
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#20232B] hover:bg-[#2A2E39] text-[#E6E8EC] border-y border-[#2E3340] whitespace-nowrap"
                title="Add timeline marker at playhead (M)"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="hidden md:inline">Marker (M)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  jumpToAdjacentMarker('next');
                  setRightPanelTab('markers');
                }}
                disabled={timelineMarkers.length === 0}
                title="Next marker (])"
                className="p-1 rounded-r bg-[#20232B] hover:bg-[#2A2E39] text-[#C8CDD8] border border-[#2E3340] disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Magnetic Snapping Toggle + Target Menu */}
            <div className="relative flex items-center ml-1">
              <button
                type="button"
                onClick={toggleSnapping}
                title="Toggle timeline snapping (N) · Hold Alt while dragging to bypass"
                className={`flex items-center gap-1 px-2 py-1 rounded-l text-[11px] font-medium border transition-colors whitespace-nowrap ${
                  snapSettings.enabled
                    ? 'bg-[#1C2A42] border-[#3B82F6] text-[#93C5FD]'
                    : 'bg-[#20232B] border-[#2E3340] text-[#8E95A5] hover:text-white'
                }`}
              >
                <Magnet className="w-3.5 h-3.5" />
                <span>Snap (N)</span>
              </button>
              <button
                type="button"
                onClick={() => setSnapMenuOpen((v) => !v)}
                aria-label="Configure snap targets"
                className={`px-1 py-1 rounded-r border-y border-r transition-colors ${
                  snapSettings.enabled
                    ? 'bg-[#1C2A42] border-[#3B82F6] text-[#93C5FD]'
                    : 'bg-[#20232B] border-[#2E3340] text-[#8E95A5]'
                }`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {snapMenuOpen && (
                <div className="absolute left-0 top-9 z-50 w-64 rounded-md bg-[#191C22] border border-[#2E3340] shadow-xl p-3 space-y-2.5 text-[12px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#262A34]">
                    <span className="font-semibold text-[#F3F4F6]">Snap Targets</span>
                    <button
                      type="button"
                      onClick={() => setSnapMenuOpen(false)}
                      className="text-[11px] text-[#8E95A5] hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  {[
                    { key: 'snapToClips', label: 'Clip Edges (In / Out)' },
                    { key: 'snapToMarkers', label: 'Timeline Markers' },
                    { key: 'snapToTransitions', label: 'Transition Boundaries' },
                    { key: 'snapToPlayhead', label: 'Playhead Position' },
                    { key: 'snapToGrid', label: '1-Second Time Grid' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between cursor-pointer text-[#D1D5DB]"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={snapSettings[item.key as keyof typeof snapSettings] as boolean}
                        onChange={(e) =>
                          updateSnapSettings({ [item.key]: e.target.checked })
                        }
                        className="accent-[#3B82F6]"
                      />
                    </label>
                  ))}
                  <div className="pt-2 border-t border-[#262A34] space-y-1">
                    <div className="flex justify-between text-[11px] text-[#9BA2B0]">
                      <span>Magnetic Tolerance</span>
                      <span className="font-mono tabular-nums">{snapSettings.tolerancePx}px</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={24}
                      value={snapSettings.tolerancePx}
                      onChange={(e) =>
                        updateSnapSettings({ tolerancePx: Number(e.target.value) })
                      }
                      className="studio-slider w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Snap Readout */}
            <div className="hidden xl:block text-[11px] font-mono truncate ml-2">
              {altBypassActive ? (
                <span className="text-[#F59E0B]">Alt held — Snapping bypassed</span>
              ) : activeSnap ? (
                <span className="text-[#38BDF8]">
                  Snapped · {activeSnap.matchedTarget.label} ({formatTimecode(activeSnap.snapLineSec, 24)})
                </span>
              ) : (
                <span className="text-[#6D7484]">
                  Drag clips, trims, transitions, or markers · Alt bypasses snap
                </span>
              )}
            </div>
          </div>

          {/* Right: Timeline Zoom Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={fitTimelineToViewport}
              title="Fit sequence to timeline view"
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#20232B] hover:bg-[#2A2E39] text-[10px] font-medium text-[#C8CDD8] border border-[#2E3340]"
            >
              <Maximize className="w-3 h-3" />
              <span>Fit</span>
            </button>
            <button
              type="button"
              onClick={() => setTimelineZoom(timelineZoom - 4)}
              className="p-1 rounded text-[#9BA2B0] hover:text-white"
              aria-label="Zoom out timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={6}
              max={48}
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(Number(e.target.value))}
              className="studio-slider w-20"
            />
            <button
              type="button"
              onClick={() => setTimelineZoom(timelineZoom + 4)}
              className="p-1 rounded text-[#9BA2B0] hover:text-white"
              aria-label="Zoom in timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tracks + Ruler */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto relative select-none">
          <div
            className="min-w-full relative"
            style={{
              width: `${Math.max(960, totalTimelineSec * timelineZoom + TRACK_LABEL_WIDTH + 60)}px`,
            }}
          >
            {/* Time Ruler + Markers */}
            <div
              onMouseDown={(e) => {
                const container = scrollContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const xInTimeline = e.clientX - rect.left + container.scrollLeft - TRACK_LABEL_WIDTH;
                if (xInTimeline < 0) return;
                const rawSec = Math.max(0, xInTimeline / timelineZoom);
                const targets = collectSnapTargets({
                  clips: timelineClips,
                  markers: timelineMarkers,
                  playheadSec,
                  snapSettings,
                  excludePlayhead: true,
                });
                const snap = findBestSnap({
                  anchorTimesSec: [rawSec],
                  targets,
                  timelineZoom,
                  snapSettings,
                  bypassSnap: e.altKey,
                });
                setActiveSnap(snap);
                setPlayheadSec(Math.max(0, snap ? rawSec + snap.snappedDeltaSec : rawSec));
                setDragOp({ type: 'playhead-scrub', trackScrollLeft: container.scrollLeft });
              }}
              className="h-7 border-b border-[#24272F] bg-[#121317] flex items-center cursor-pointer sticky top-0 z-20"
            >
              <div
                style={{ width: `${TRACK_LABEL_WIDTH}px` }}
                className="shrink-0 px-3 text-[10px] font-mono text-[#7A8190] border-r border-[#24272F] h-full flex items-center justify-between bg-[#15171B] sticky left-0 z-30"
              >
                <span>TRACKS</span>
                <span className="tabular-nums text-[#E6E8EC]">{formatTimecode(playheadSec, 24)}</span>
              </div>
              <div className="flex-1 relative h-full">
                {Array.from({ length: Math.ceil(totalTimelineSec / rulerStepSec) + 1 }).map(
                  (_, idx) => {
                    const sec = idx * rulerStepSec;
                    return (
                      <span
                        key={sec}
                        style={{ left: `${sec * timelineZoom}px` }}
                        className="absolute top-1 text-[10px] font-mono text-[#6D7484] border-l border-[#2B2F3A] pl-1 pointer-events-none tabular-nums"
                      >
                        {sec}s
                      </span>
                    );
                  }
                )}

                {/* Interactive Timeline Markers on Ruler */}
                {timelineMarkers.map((marker) => {
                  const isSelected = marker.id === selectedMarkerId;
                  const style = MARKER_COLORS[marker.color];
                  return (
                    <button
                      key={marker.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        selectMarker(marker.id);
                        setRightPanelTab('markers');
                        setDragOp({
                          type: 'marker-move',
                          markerId: marker.id,
                          startMouseX: e.clientX,
                          origTimeSec: marker.timeSec,
                        });
                      }}
                      style={{ left: `${marker.timeSec * timelineZoom}px` }}
                      title={`${marker.label} (${marker.timeSec.toFixed(2)}s) — Drag to move & snap`}
                      className={`absolute bottom-0 -translate-x-1/2 px-1.5 py-0.5 rounded-t-xs text-[9px] font-mono font-semibold cursor-ew-resize whitespace-nowrap shadow ${
                        style.flag
                      } ${isSelected ? 'ring-1 ring-white' : ''}`}
                    >
                      {marker.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6 Track Lanes (V3, V2, V1, A1, A2, A3) */}
            {timelineTracks.map((track) => {
              const clips = timelineClips.filter((c) => c.trackId === track.id);
              const isAudio = track.kind === 'audio';
              return (
                <div
                  key={track.id}
                  style={{ height: `${TRACK_ROW_HEIGHT}px` }}
                  className={`border-b border-[#20232B] flex items-stretch ${
                    track.locked ? 'bg-[#121318]' : ''
                  }`}
                >
                  {/* Sticky Track Header Controls */}
                  <div
                    style={{ width: `${TRACK_LABEL_WIDTH}px` }}
                    className="shrink-0 px-2.5 flex items-center justify-between gap-1.5 bg-[#16181D] border-r border-[#24272F] sticky left-0 z-10"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[#D1D5DB] truncate">
                        {track.label}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Lock Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleTrackLock(track.id)}
                        title={track.locked ? `Unlock ${track.id}` : `Lock ${track.id}`}
                        className={`p-1 rounded transition-colors ${
                          track.locked
                            ? 'bg-[#2C2023] text-[#FCA5A5]'
                            : 'text-[#6D7484] hover:text-[#E6E8EC] hover:bg-[#22252E]'
                        }`}
                      >
                        {track.locked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                      </button>

                      {/* Visibility Toggle (Video) or Mute/Solo (Audio) */}
                      {!isAudio ? (
                        <button
                          type="button"
                          onClick={() => toggleTrackVisibility(track.id)}
                          title={
                            track.visible ? `Hide ${track.id} track` : `Show ${track.id} track`
                          }
                          className={`p-1 rounded transition-colors ${
                            !track.visible
                              ? 'bg-[#22252E] text-[#6D7484]'
                              : 'text-[#9BA2B0] hover:text-white hover:bg-[#22252E]'
                          }`}
                        >
                          {track.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleTrackMute(track.id)}
                            title={track.muted ? `Unmute ${track.id}` : `Mute ${track.id}`}
                            className={`w-4.5 h-4.5 rounded text-[9px] font-mono font-semibold transition-colors ${
                              track.muted
                                ? 'bg-[#EF4444]/25 text-[#FCA5A5] border border-[#EF4444]/50'
                                : 'text-[#8E95A5] hover:text-white hover:bg-[#22252E]'
                            }`}
                          >
                            M
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleTrackSolo(track.id)}
                            title={track.solo ? `Unsolo ${track.id}` : `Solo ${track.id}`}
                            className={`w-4.5 h-4.5 rounded text-[9px] font-mono font-semibold transition-colors ${
                              track.solo
                                ? 'bg-[#F59E0B]/25 text-[#FCD34D] border border-[#F59E0B]/50'
                                : 'text-[#8E95A5] hover:text-white hover:bg-[#22252E]'
                            }`}
                          >
                            S
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lane Clips */}
                  <div
                    className={`flex-1 relative ${
                      track.locked ? 'bg-[#0E1014]' : 'bg-[#111216]'
                    } ${!isAudio && !track.visible ? 'opacity-45' : ''}`}
                  >
                    {clips.map((clip) => {
                      const selected = clip.id === selectedClipId;
                      const clipWidthPx = Math.max(28, clip.durationSec * timelineZoom);
                      const hasTransition =
                        clip.transitionIn &&
                        clip.transitionIn !== 'None' &&
                        (clip.transitionDurationSec ?? 0) > 0;
                      const transDur = clip.transitionDurationSec ?? 1.0;
                      const transWidthPx = hasTransition
                        ? Math.min(clipWidthPx * 0.7, Math.max(8, transDur * timelineZoom))
                        : 0;
                      const keyframes = clip.keyframes ?? [];

                      // Audio waveform gain scaling & ducking intervals
                      const baseGainScale =
                        clip.audioMuted || track.muted
                          ? 0.15
                          : Math.max(0.25, Math.min(1.2, 1 + (clip.volumeDb ?? 0) / 36));
                      const waveformBarCount = Math.max(6, Math.floor(clipWidthPx / 7));
                      const duckingIntervals = isAudio
                        ? getClipDuckingIntervals(clip, timelineClips, timelineTracks)
                        : [];
                      const hasDuckingVisual =
                        isAudio && (Boolean(clip.audioDuckingEnabled) || duckingIntervals.length > 0);

                      return (
                        <div
                          key={clip.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            selectTimelineClip(clip.id);
                            setRightPanelTab('inspector');
                            if (track.locked) return;
                            setDragOp({
                              type: 'clip-move',
                              clipId: clip.id,
                              startMouseX: e.clientX,
                              startMouseY: e.clientY,
                              origStartSec: clip.startSec,
                              origDurationSec: clip.durationSec,
                              origTrackId: clip.trackId,
                              snapshotRecorded: false,
                            });
                          }}
                          style={{
                            left: `${clip.startSec * timelineZoom}px`,
                            width: `${clipWidthPx}px`,
                          }}
                          className={`group absolute top-1 bottom-1 rounded-sm overflow-hidden border transition-colors ${
                            track.locked
                              ? 'cursor-not-allowed'
                              : 'cursor-grab active:cursor-grabbing'
                          } ${
                            !isAudio
                              ? selected
                                ? 'bg-[#1E2E4A] border-[#5B9BFF] text-white'
                                : 'bg-[#1A2232] border-[#2E3C56] text-[#DCE3F0] hover:border-[#49628E]'
                              : selected
                              ? 'bg-[#18352D] border-[#34D399] text-white'
                              : 'bg-[#142721] border-[#27463D] text-[#D1E8DF] hover:border-[#39685A]'
                          }`}
                        >
                          {/* Video Filmstrip Repeating Thumbnail Layer */}
                          {!isAudio && clip.thumbnailUrl && (
                            <div
                              style={{
                                backgroundImage: `url(${clip.thumbnailUrl})`,
                                backgroundSize: 'auto 100%',
                                backgroundRepeat: 'repeat-x',
                              }}
                              className="absolute inset-0 opacity-30 pointer-events-none"
                            />
                          )}

                          {/* Audio Ducking Envelope Regions */}
                          {isAudio &&
                            duckingIntervals.map((iv, idx) => {
                              const leftPx = Math.max(0, (iv.startSec - clip.startSec) * timelineZoom);
                              const widthPx = Math.max(4, (iv.endSec - iv.startSec) * timelineZoom);
                              return (
                                <div
                                  key={`duck-${idx}`}
                                  style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                                  title={`Audio ducking active (${iv.reductionDb} dB while ${iv.sourceLabel} plays)`}
                                  className="absolute inset-y-0 bg-[#F59E0B]/10 border-x border-t border-[#F59E0B]/45 pointer-events-none z-0"
                                />
                              );
                            })}

                          {/* Audio Waveform Layer */}
                          {isAudio && (
                            <div className="absolute inset-x-1 bottom-0.5 top-3.5 flex items-end justify-between gap-[2px] pointer-events-none opacity-70">
                              {Array.from({ length: waveformBarCount }).map((_, idx) => {
                                const baseH =
                                  AUDIO_WAVEFORM_PATTERN[idx % AUDIO_WAVEFORM_PATTERN.length];
                                const barTimeSec =
                                  clip.startSec + ((idx + 0.5) / waveformBarCount) * clip.durationSec;
                                const activeIv = duckingIntervals.find(
                                  (iv) => barTimeSec >= iv.startSec && barTimeSec <= iv.endSec
                                );
                                const duckFactor = activeIv
                                  ? Math.max(0.22, 1 + activeIv.reductionDb / 28)
                                  : 1;
                                const h = Math.min(
                                  100,
                                  Math.round(baseH * baseGainScale * duckFactor)
                                );
                                return (
                                  <span
                                    key={idx}
                                    style={{ height: `${h}%` }}
                                    className={`flex-1 max-w-[3px] rounded-t-xs ${
                                      activeIv ? 'bg-[#F59E0B]/80' : 'bg-[#34D399]'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Dark Scrim for Video Text Legibility */}
                          {!isAudio && (
                            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/55 pointer-events-none" />
                          )}

                          {/* Leading Transition Zone + Draggable Handle */}
                          {hasTransition && (
                            <div
                              style={{ width: `${transWidthPx}px` }}
                              className="absolute inset-y-0 left-0 bg-[#7C3AED]/30 border-r border-[#A78BFA]/85 pointer-events-none z-10"
                            >
                              {!track.locked && (
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    selectTimelineClip(clip.id);
                                    setRightPanelTab('inspector');
                                    setDragOp({
                                      type: 'transition-resize',
                                      clipId: clip.id,
                                      startMouseX: e.clientX,
                                      origStartSec: clip.startSec,
                                      origClipDurationSec: clip.durationSec,
                                      origTransitionSec: transDur,
                                      snapshotRecorded: false,
                                    });
                                  }}
                                  title={`Drag to adjust & snap ${clip.transitionIn} duration (${transDur.toFixed(1)}s)`}
                                  className="pointer-events-auto absolute top-0 bottom-0 -right-1 w-2.5 cursor-ew-resize hover:bg-[#A78BFA]/50"
                                />
                              )}
                            </div>
                          )}

                          {/* Left Trim Handle */}
                          {!track.locked && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                selectTimelineClip(clip.id);
                                setRightPanelTab('inspector');
                                setDragOp({
                                  type: 'clip-trim-left',
                                  clipId: clip.id,
                                  startMouseX: e.clientX,
                                  origStartSec: clip.startSec,
                                  origDurationSec: clip.durationSec,
                                  origTrimInSec: clip.trimInSec,
                                  snapshotRecorded: false,
                                });
                              }}
                              title="Trim clip in-point (snaps)"
                              className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize hover:bg-white/40 z-20"
                            />
                          )}

                          {/* Clip Label & Metadata */}
                          <div className="relative z-10 px-2 py-0.5 pointer-events-none">
                            <div className="text-[10px] font-medium truncate leading-tight">
                              {clip.label}
                            </div>
                            <div className="text-[9px] font-mono opacity-80 truncate tabular-nums leading-tight">
                              {clip.durationSec.toFixed(1)}s
                              {clip.speed !== 1 ? ` · ${clip.speed}x` : ''}
                              {hasTransition ? ` · ${clip.transitionIn}` : ''}
                              {hasDuckingVisual
                                ? duckingIntervals.length > 0
                                  ? ` · Duck ${duckingIntervals[0].reductionDb}dB`
                                  : ' · Duck'
                                : ''}
                            </div>
                          </div>

                          {/* Keyframe Diamonds on Clip Bottom */}
                          {keyframes.length > 0 && (
                            <div className="absolute inset-x-0 bottom-0.5 h-2.5 pointer-events-none z-10">
                              {keyframes.map((kf) => (
                                <Diamond
                                  key={kf.id}
                                  style={{ left: `${kf.timeOffsetSec * timelineZoom}px` }}
                                  className="absolute bottom-0 -translate-x-1/2 w-2 h-2 text-[#F59E0B] fill-[#F59E0B]"
                                />
                              ))}
                            </div>
                          )}

                          {/* Right Trim Handle */}
                          {!track.locked && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                selectTimelineClip(clip.id);
                                setRightPanelTab('inspector');
                                setDragOp({
                                  type: 'clip-trim-right',
                                  clipId: clip.id,
                                  startMouseX: e.clientX,
                                  origStartSec: clip.startSec,
                                  origDurationSec: clip.durationSec,
                                  snapshotRecorded: false,
                                });
                              }}
                              title="Trim clip out-point (snaps)"
                              className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-white/40 z-20"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Marker Vertical Guidelines across Tracks */}
            {timelineMarkers.map((marker) => (
              <div
                key={`line-${marker.id}`}
                className={`pointer-events-none absolute top-7 bottom-0 w-px z-10 ${
                  MARKER_COLORS[marker.color].line
                }`}
                style={{ left: `${TRACK_LABEL_WIDTH + marker.timeSec * timelineZoom}px` }}
              />
            ))}

            {/* Active Magnetic Snap Guide Line */}
            {activeSnap && !altBypassActive && (
              <div
                className={`pointer-events-none absolute top-0 bottom-0 w-px z-40 ${snapGuideColor}`}
                style={{ left: `${TRACK_LABEL_WIDTH + activeSnap.snapLineSec * timelineZoom}px` }}
              >
                <div className="px-1.5 py-0.5 rounded-xs bg-[#0E1117]/95 border border-white/25 text-[9px] font-mono text-white whitespace-nowrap -translate-x-1/2 translate-y-7 shadow">
                  {activeSnap.matchedTarget.label}
                </div>
              </div>
            )}

            {/* Playhead Indicator */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#EF4444] z-30"
              style={{ left: `${TRACK_LABEL_WIDTH + playheadSec * timelineZoom}px` }}
            >
              <div className="w-2.5 h-2.5 -ml-[4.5px] bg-[#EF4444] rotate-45 -mt-1" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
