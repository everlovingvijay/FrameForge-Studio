import React, { useRef, useState } from 'react';
import { FileVideo, Trash2, Upload, X } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { formatBytes, formatDurationCompact } from '../../utils/formatters';

export const ImportMediaModal: React.FC = () => {
  const isOpen = useStudioStore((s) => s.isImportMediaModalOpen);
  const openImportMediaModal = useStudioStore((s) => s.openImportMediaModal);
  const mediaPool = useStudioStore((s) => s.mediaPool);
  const importFilesFromBrowser = useStudioStore((s) => s.importFilesFromBrowser);
  const removeMediaAsset = useStudioStore((s) => s.removeMediaAsset);
  const setActiveSection = useStudioStore((s) => s.setActiveSection);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [probing, setProbing] = useState(false);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProbing(true);
    try {
      await importFilesFromBrowser(files);
    } finally {
      setProbing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-media-title"
    >
      <div className="w-full max-w-2xl bg-[#181A1F] border border-[#2C303A] rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262932]">
          <div>
            <h2 id="import-media-title" className="text-[15px] font-semibold text-[#F3F4F6]">
              Import Media to Project Bin
            </h2>
            <p className="text-[12px] text-[#8E95A5]">
              Browser preview probes local video/audio metadata directly; native FFprobe runs in desktop builds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openImportMediaModal(false)}
            className="p-1 rounded text-[#8E95A5] hover:text-white hover:bg-[#242832] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            className={`border border-dashed rounded-md p-6 text-center transition-colors ${
              isDragging
                ? 'border-[#3B82F6] bg-[#1D2536]'
                : 'border-[#343844] bg-[#131519] hover:border-[#494F60]'
            }`}
          >
            <Upload className="w-6 h-6 text-[#7A8190] mx-auto mb-2" />
            <div className="text-[13px] font-medium text-[#E6E8EC]">
              {probing ? 'Reading local media metadata...' : 'Drop local video, audio, or image files here'}
            </div>
            <div className="text-[12px] text-[#7A8190] mt-1 mb-3">
              Supports MP4, MOV, WebM, WAV, AAC, PNG, JPG inside browser preview
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded text-[12px] font-medium bg-[#222630] hover:bg-[#2B303D] text-[#F3F4F6] border border-[#343946] transition-colors"
            >
              Browse Local Files
            </button>
          </div>

          {/* Current Project Media Pool */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[#B0B6C3]">
                Project Media Pool ({mediaPool.length} assets)
              </span>
              <span className="text-[11px] text-[#7A8190]">
                Sample cinema clips included for workflow testing
              </span>
            </div>
            <div className="border border-[#262932] rounded divide-y divide-[#22252E] max-h-60 overflow-y-auto bg-[#131519]">
              {mediaPool.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-[12px] hover:bg-[#1A1D24]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-7 rounded overflow-hidden bg-[#1F222A] shrink-0 flex items-center justify-center">
                      {asset.kind === 'audio' ? (
                        <FileVideo className="w-4 h-4 text-[#7A8190]" />
                      ) : (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[#E6E8EC] truncate">{asset.name}</div>
                      <div className="text-[11px] text-[#7A8190] font-mono truncate">
                        {asset.width > 0 ? `${asset.width}x${asset.height} · ` : ''}
                        {formatDurationCompact(asset.durationSeconds)} · {formatBytes(asset.fileSizeBytes)} ·{' '}
                        {asset.source === 'local-file' ? 'Local File' : 'Sample Clip'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMediaAsset(asset.id)}
                    className="p-1.5 rounded text-[#7A8190] hover:text-[#EF4444] hover:bg-[#242730] transition-colors shrink-0"
                    title="Remove from media pool"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#262932] flex items-center justify-between bg-[#15171B]">
          <button
            type="button"
            onClick={() => {
              openImportMediaModal(false);
              setActiveSection('auto-studio');
            }}
            className="text-[12px] font-medium text-[#5B9BFF] hover:text-[#93C5FD] transition-colors"
          >
            Continue to Auto Studio
          </button>
          <button
            type="button"
            onClick={() => openImportMediaModal(false)}
            className="px-4 py-1.5 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
