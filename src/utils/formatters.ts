export function formatDurationCompact(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimecode(seconds: number, fps = 24): string {
  const safe = Math.max(0, seconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const frames = Math.floor((safe % 1) * fps);
  return [hrs, mins, secs, frames].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1000)} KB`;
}

export function resolutionToDimensions(
  preset: '720p' | '1080p' | '2K' | '4K' | '8K' | 'custom',
  aspect: '16:9' | '9:16' | '1:1' | '4:5' | '3:4' | '21:9' | 'original' | 'custom',
  customW = 1920,
  customH = 1080,
  sourceW = 1920,
  sourceH = 1080
): { width: number; height: number } {
  if (preset === 'custom') {
    return { width: customW, height: customH };
  }
  const baseShortSide: Record<'720p' | '1080p' | '2K' | '4K' | '8K', number> = {
    '720p': 720,
    '1080p': 1080,
    '2K': 1440,
    '4K': 2160,
    '8K': 4320,
  };
  const s = baseShortSide[preset];
  switch (aspect) {
    case '16:9':
      return { width: Math.round((s * 16) / 9), height: s };
    case '9:16':
      return { width: s, height: Math.round((s * 16) / 9) };
    case '1:1':
      return { width: s, height: s };
    case '4:5':
      return { width: s, height: Math.round((s * 5) / 4) };
    case '3:4':
      return { width: s, height: Math.round((s * 4) / 3) };
    case '21:9':
      return { width: Math.round((s * 21) / 9), height: s };
    case 'original': {
      const safeW = Math.max(1, sourceW);
      const safeH = Math.max(1, sourceH);
      if (safeW >= safeH) {
        return { width: Math.round((s * safeW) / safeH), height: s };
      }
      return { width: s, height: Math.round((s * safeH) / safeW) };
    }
    default:
      return { width: customW, height: customH };
  }
}
