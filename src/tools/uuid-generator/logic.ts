import { DEFAULT_UUID_COUNT, MAX_UUIDS, MIN_UUIDS } from './types'

/** Clamps a user supplied count into the supported 1-20 range. */
export function clampCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_UUID_COUNT
  return Math.min(Math.max(Math.trunc(count), MIN_UUIDS), MAX_UUIDS)
}

/**
 * Generates a list of RFC 4122 version 4 UUIDs using the platform's
 * `crypto.randomUUID()`. No custom CSPRNG implementation on purpose.
 */
export function generateUuids(count: number): string[] {
  const total = clampCount(count)

  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID() is not available in this browser.')
  }

  return Array.from({ length: total }, () => crypto.randomUUID())
}
