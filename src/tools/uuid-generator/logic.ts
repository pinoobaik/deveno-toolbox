import { DEFAULT_UUID_COUNT, MAX_UUIDS, MIN_UUIDS } from './types'

/** Clamps a number into the supported 1-20 range. */
export function clampCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_UUID_COUNT
  return Math.min(Math.max(Math.trunc(count), MIN_UUIDS), MAX_UUIDS)
}

export type UuidCountResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly message: string }

/**
 * Parses the amount field. Only a plain run of digits inside the supported
 * range is accepted, so `12abc`, `3.7`, `-2` and `1e3` are reported as errors
 * instead of being silently coerced to a different amount.
 */
export function parseUuidCount(raw: string): UuidCountResult {
  const trimmed = raw.trim()
  const inRangeMessage = `Enter a whole number between ${MIN_UUIDS} and ${MAX_UUIDS}.`

  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: inRangeMessage }
  }

  const value = Number.parseInt(trimmed, 10)
  if (value < MIN_UUIDS || value > MAX_UUIDS) {
    return { ok: false, message: `Choose between ${MIN_UUIDS} and ${MAX_UUIDS}.` }
  }

  return { ok: true, value }
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