import React, { useMemo, useRef, useState } from 'react';
import {
  Film,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Music,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { MediaAsset } from '../../types/studio';
import { formatDurationCompact } from '../../utils/formatters';

type KindFilter = 'all' | 'video' | 'audio' | 'image';

const WAVEFORM_HEIGHTS = [28, 62, 44, 84, 52, 92, 40, 74, 58, 88, 36, 68, 48, 78, 34, 60];

export const MediaBrowserPanel: React.FC = () => {
  const mediaPool = useStudioStore((s) => s.mediaPool);
  const addMediaToTimeline = useStudioStore((s) => s.addMediaToTimeline);
  const openImportMediaModal = useStudioStore((s) => s.openImportMediaModal);
  const importFilesFromBrowser = useStudioStore((s) => s.importFilesFromBrowser);

  const [selectedFolder, setSelectedFolder] = useState<string>('All Media');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const asset of mediaPool) {
      const folderName = asset.folder || (asset.kind === 'audio' ? 'Audio Stems' : asset.kind === 'image' ? 'Stills & Titles' : 'A-Cam Cinema');
      counts.set(folderName, (counts.get(folderName) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [mediaPool]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mediaPool.filter((asset) => {
      const folderName = asset.folder || (asset.kind === 'audio' ? 'Audio Stems' : asset.kind === 'image' ? 'Stills & Titles' : 'A-Cam Cinema');
      const matchesFolder = selectedFolder === 'All Media' || folderName === selectedFolder;
      const matchesKind = kindFilter === 'all' || asset.kind === kindFilter;
      const matchesQuery =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.codec.toLowerCase().includes(q) ||
        folderName.toLowerCase().includes(q);
      return matchesFolder && matchesKind && matchesQuery;
    });
  }, [mediaPool, selectedFolder, kindFilter, searchQuery]);

  const handleQuickImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await importFilesFromBrowser(e.target.files);
      e.target.value = '';
    }
  };

  const renderAssetMeta = (asset: MediaAsset) => {
    if (asset.kind === 'audio') {
      const khz = asset.sampleRateHz ? `${(asset.sampleRateHz / 1000).toFixed(1)} kHz` : '48.0 kHz';
      return `${formatDurationCompact(asset.durationSeconds)} · ${khz} · ${asset.codec}`;
    }
    if (asset.kind === 'image') {
      return `${asset.width}×${asset.height} · ${asset.codec}`;
    }
    return `${formatDurationCompact(asset.durationSeconds)} · ${asset.width}×${asset.height} · ${asset.fps}fps`;
  };

  return (
    <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#24272F] bg-[#15171B] flex flex-col min-h-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#24272F] flex items-center justify-between gap-2 bg-[#14161A]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-semibold text-[#E6E8EC] truncate">Media Browser</span>
          <span className="text-[11px] font-mono text-[#7A8190] tabular-nums">
            {filteredAssets.length}/{mediaPool.length}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input
            ref={quickFileInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,image/*"
            onChange={handleQuickImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => quickFileInputRef.current?.click()}
            title="Quick import local files"
            className="p-1 rounded bg-[#1D2028] hover:bg-[#262B36] text-[#C8CDD8] hover:text-white border border-[#2B303C] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openImportMediaModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#2563EB] hover:bg-[#3B82F6] text-white text-[11px] font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Search & Type Filters */}
      <div className="p-2 border-b border-[#20232B] space-y-1.5 bg-[#14161A]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#6D7484] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clips, audio, codecs..."
            className="w-full pl-8 pr-2.5 py-1 rounded bg-[#101115] border border-[#262932] text-[11px] text-[#E6E8EC] placeholder:text-[#6D7484] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'video', label: 'Video' },
              { id: 'audio', label: 'Audio' },
              { id: 'image', label: 'Image' },
            ] as { id: KindFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKindFilter(tab.id)}
              className={`py-1 rounded text-[10px] font-medium transition-colors ${
                kindFilter === tab.id
                  ? 'bg-[#222733] text-white border border-[#3B82F6]/60'
                  : 'bg-[#181A20] text-[#8E95A5] border border-transparent hover:text-[#E6E8EC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Folder Tree + Asset List */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Compact Horizontal / Wrap Folder Bar */}
        <div className="px-2 py-1.5 border-b border-[#20232B] bg-[#131519] flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedFolder('All Media')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
              selectedFolder === 'All Media'
                ? 'bg-[#1E293B] text-[#93C5FD] border border-[#3B82F6]/40'
                : 'text-[#8E95A5] hover:text-[#E6E8EC] hover:bg-[#1B1E25]'
            }`}
          >
            {selectedFolder === 'All Media' ? (
              <FolderOpen className="w-3 h-3" />
            ) : (
              <Folder className="w-3 h-3" />
            )}
            <span>All</span>
            <span className="font-mono text-[9px] opacity-75 tabular-nums">{mediaPool.length}</span>
          </button>
          {folders.map((folder) => {
            const active = selectedFolder === folder.name;
            return (
              <button
                key={folder.name}
                type="button"
                onClick={() => setSelectedFolder(folder.name)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                  active
                    ? 'bg-[#1E293B] text-[#93C5FD] border border-[#3B82F6]/40'
                    : 'text-[#8E95A5] hover:text-[#E6E8EC] hover:bg-[#1B1E25]'
                }`}
              >
                {active ? <FolderOpen className="w-3 h-3" /> : <Folder className="w-3 h-3" />}
                <span className="truncate max-w-[96px]">{folder.name}</span>
                <span className="font-mono text-[9px] opacity-75 tabular-nums">{folder.count}</span>
              </button>
            );
          })}
        </div>

        {/* Media Assets List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onDoubleClick={() => addMediaToTimeline(asset)}
              title="Double-click or press + to append to timeline"
              className="group flex items-center justify-between gap-2 p-1.5 rounded bg-[#191B21] border border-[#252832] hover:border-[#394256] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Visual Thumb or Audio Waveform */}
                <div className="relative w-14 h-9 rounded-sm overflow-hidden shrink-0 bg-[#0E1014] border border-[#262A34] flex items-center justify-center">
                  {asset.kind === 'audio' ? (
                    <div className="w-full h-full px-1 flex items-center justify-between gap-[1.5px] bg-[#101C18]">
                      {WAVEFORM_HEIGHTS.map((h, idx) => (
                        <span
                          key={idx}
                          style={{ height: `${h}%` }}
                          className="w-[2px] rounded-xs bg-[#34D399]/80"
                        />
                      ))}
                    </div>
                  ) : asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : asset.kind === 'image' ? (
                    <ImageIcon className="w-4 h-4 text-[#7A8190]" />
                  ) : (
                    <Film className="w-4 h-4 text-[#7A8190]" />
                  )}

                  {asset.kind !== 'image' && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-[1px] rounded-xs bg-black/80 text-[8px] font-mono text-[#E6E8EC] tabular-nums leading-none">
                      {formatDurationCompact(asset.durationSeconds)}
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {asset.kind === 'audio' ? (
                      <Music className="w-3 h-3 text-[#34D399] shrink-0" />
                    ) : asset.kind === 'image' ? (
                      <ImageIcon className="w-3 h-3 text-[#A78BFA] shrink-0" />
                    ) : (
                      <Film className="w-3 h-3 text-[#60A5FA] shrink-0" />
                    )}
                    <span className="text-[11px] font-medium text-[#E6E8EC] truncate">
                      {asset.name}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#7A8190] truncate tabular-nums mt-0.5">
                    {renderAssetMeta(asset)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addMediaToTimeline(asset);
                }}
                title="Append to timeline"
                className="p-1.5 rounded bg-[#222630] hover:bg-[#2563EB] text-[#AEB5C2] hover:text-white shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {filteredAssets.length === 0 && (
            <div className="py-8 px-3 text-center text-[11px] text-[#7A8190]">
              No media assets match your current folder or search filter.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
