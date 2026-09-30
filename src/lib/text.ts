const encoder = new TextEncoder()

/** UTF-8 aware byte length of a string. */
export function byteLength(text: string): number {
  return encoder.encode(text).length
}

/** Human readable byte size, e.g. `1.2 KB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB'] as const
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`
}

/** Counts characters and UTF-8 bytes for editor footers. */
export function measureText(text: string): { characters: number; bytes: number } {
  return { characters: text.length, bytes: byteLength(text) }
}
