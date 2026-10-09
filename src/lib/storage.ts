/**
 * Client-side persistence for tool preferences.
 *
 * HARD CONTENT BOUNDARY
 * ---------------------
 * This module persists *references to tools* and nothing else: tool ids and
 * millisecond timestamps. It must never store tool input, tool output, search
 * queries, generated values, clipboard contents, URLs, passwords, secrets,
 * errors, or any other user-entered or tool-produced content. That restriction
 * applies to every current and future tool, and it is why the persisted shape
 * is a fixed schema of primitives rather than an open-ended bag.
 *
 * Versioning
 * ----------
 * `PREFERENCES_VERSION` is 1, the initial schema; nothing was ever persisted
 * before it, so no migration path exists yet. A payload whose `version` is
 * missing or not exactly 1 is rejected outright and replaced by defaults. A
 * future schema bump should add an explicitly tested migration here rather
 * than widening this check.
 *
 * Normalization contract
 * ----------------------
 * Reads are two-tiered:
 *
 * - Blob level: the payload must be a JSON object carrying `version`,
 *   `favorites`, and `recents` as arrays. Any blob-level violation (bad JSON,
 *   wrong root type, missing or unsupported version, non-array field) discards
 *   the whole payload and returns defaults.
 * - Item level: individual entries are validated and dropped on their own --
 *   non-string ids, ids the registry does not know, duplicate ids, out-of-range
 *   or otherwise invalid timestamps. Survivors are capped at the documented
 *   maximums and recents are re-sorted MRU-first.
 *
 * Normalization therefore removes invalid records from the data itself, not
 * merely from render time. Persisted storage is rewritten (and with it
 * cleaned) the next time a preference actually changes.
 *
 * React is intentionally not a dependency of this module. The dependency
 * direction is: registry -> catalog metadata, storage -> persisted primitive
 * data, preferences -> storage + registry validation, components -> preferences.
 */

/** Centralized so no component ever spells a storage key by hand. */
export const STORAGE_KEY = 'dev-toolbox:preferences'

/** Initial and currently only supported persisted schema version. */
export const PREFERENCES_VERSION = 1

/** Defensive cap on stored favorites. Not a product limit; a bound on corrupt data. */
export const MAX_FAVORITES = 20

/** Defensive cap on stored recents, which doubles as the MRU window shown in the UI. */
export const MAX_RECENTS = 10

/**
 * How far ahead of `now` a timestamp may sit before it is treated as corrupt.
 * Small enough that an impossible future date cannot pin a tool to the top of
 * the MRU list, large enough to tolerate ordinary clock skew.
 */
export const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000

/** The only two facts persisted about a tool: which tool, and when it was used. */
export interface RecentEntry {
  readonly id: string
  readonly timestamp: number
}

export interface Preferences {
  readonly favorites: readonly string[]
  readonly recents: readonly RecentEntry[]
}

export const EMPTY_PREFERENCES: Preferences = {
  favorites: [],
  recents: [],
}

/**
 * The slice of Web Storage this module needs. Written as a narrow interface so
 * tests can inject a fake and simulate unavailable, hostile, or failing storage
 * without a DOM.
 */
export interface KeyValueStore {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

/**
 * Resolves `localStorage` defensively. The property access itself can throw
 * under browser privacy or security restrictions, and it does not exist outside
 * a browser, so every failure mode collapses to `null` ("no storage").
 */
function resolveStore(): KeyValueStore | null {
  try {
    const storage = globalThis.localStorage
    if (typeof storage?.getItem !== 'function') return null
    return storage
  } catch {
    return null
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * `Array.isArray` narrows to `any[]`; this widens it back so no `any` leaks
 * into the rest of the module.
 */
function toUnknownArray(value: unknown): readonly unknown[] | null {
  return Array.isArray(value) ? (value as readonly unknown[]) : null
}

function isUsableTimestamp(timestamp: number, now: number): boolean {
  if (!Number.isFinite(timestamp)) return false
  if (timestamp < 0) return false
  if (timestamp > now + MAX_FUTURE_SKEW_MS) return false
  return true
}

/** Returns a recent entry only if every field survives validation. */
function toRecentEntry(
  item: unknown,
  validIds: ReadonlySet<string>,
  now: number,
): RecentEntry | null {
  if (!isPlainObject(item)) return null

  const { id, timestamp } = item
  if (typeof id !== 'string') return null
  if (typeof timestamp !== 'number') return null
  if (!validIds.has(id)) return null
  if (!isUsableTimestamp(timestamp, now)) return null

  return { id, timestamp }
}

function normalizeFavorites(
  items: readonly unknown[],
  validIds: ReadonlySet<string>,
): readonly string[] {
  const seen = new Set<string>()
  const favorites: string[] = []

  for (const item of items) {
    if (favorites.length >= MAX_FAVORITES) break
    if (typeof item !== 'string') continue
    if (!validIds.has(item)) continue
    if (seen.has(item)) continue

    seen.add(item)
    favorites.push(item)
  }

  return favorites
}

interface ScoredRecent extends RecentEntry {
  /** Position in the stored array, used as an explicit, stable tie-break. */
  readonly index: number
}

function normalizeRecents(
  items: readonly unknown[],
  validIds: ReadonlySet<string>,
  now: number,
): readonly RecentEntry[] {
  const candidates: ScoredRecent[] = []

  for (let index = 0; index < items.length; index += 1) {
    const entry = toRecentEntry(items[index], validIds, now)
    if (entry !== null) candidates.push({ ...entry, index })
  }

  // Collapse repeats first, keeping the newest use of each id.
  const byId = new Map<string, ScoredRecent>()
  for (const candidate of candidates) {
    const existing = byId.get(candidate.id)
    if (existing === undefined || candidate.timestamp > existing.timestamp) {
      byId.set(candidate.id, candidate)
    }
  }

  const ordered = [...byId.values()].sort(
    (a, b) => b.timestamp - a.timestamp || a.index - b.index,
  )

  return ordered.slice(0, MAX_RECENTS).map(({ id, timestamp }) => ({ id, timestamp }))
}

/**
 * Turns an untrusted serialized payload into a trusted `Preferences` value, or
 * into defaults. Never throws, and never preserves anything it could not fully
 * validate.
 */
export function normalizePreferences(
  raw: string,
  validIds: ReadonlySet<string>,
  now: number,
): Preferences {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return EMPTY_PREFERENCES
  }

  if (!isPlainObject(parsed)) return EMPTY_PREFERENCES
  if (parsed.version !== PREFERENCES_VERSION) return EMPTY_PREFERENCES

  const favorites = toUnknownArray(parsed.favorites)
  const recents = toUnknownArray(parsed.recents)
  if (favorites === null || recents === null) return EMPTY_PREFERENCES

  return {
    favorites: normalizeFavorites(favorites, validIds),
    recents: normalizeRecents(recents, validIds, now),
  }
}

/**
 * Reads and normalizes stored preferences. Returns defaults when storage is
 * unavailable, empty, unreadable, malformed, from another version, or otherwise
 * untrusted. Never throws.
 */
export function readPreferences(
  validIds: ReadonlySet<string>,
  store: KeyValueStore | null = resolveStore(),
  now: number = Date.now(),
): Preferences {
  if (store === null) return EMPTY_PREFERENCES

  try {
    const raw = store.getItem(STORAGE_KEY)
    if (raw === null) return EMPTY_PREFERENCES
    return normalizePreferences(raw, validIds, now)
  } catch {
    return EMPTY_PREFERENCES
  }
}

/**
 * Serializes and writes preferences, removing the key when there is nothing to
 * keep. Storage failure is never fatal: the caller gets `false` and the
 * in-memory state stays authoritative. Raw browser exceptions are never
 * surfaced. Callers are expected to pass normalized data; the collection caps
 * are re-applied here as a cheap backstop.
 *
 * Returns `false` when there is no storage at all.
 */
export function writePreferences(
  preferences: Preferences,
  store: KeyValueStore | null = resolveStore(),
): boolean {
  if (store === null) return false

  const favorites = preferences.favorites.slice(0, MAX_FAVORITES)
  const recents = preferences.recents.slice(0, MAX_RECENTS)
  const isEmpty = favorites.length === 0 && recents.length === 0

  try {
    if (isEmpty) {
      store.removeItem(STORAGE_KEY)
    } else {
      store.setItem(STORAGE_KEY, JSON.stringify({ version: PREFERENCES_VERSION, favorites, recents }))
    }
    return true
  } catch {
    return false
  }
}

/** Structural equality, so unchanged preferences never trigger a write. */
export function preferencesEqual(a: Preferences, b: Preferences): boolean {
  if (a.favorites.length !== b.favorites.length) return false
  for (let index = 0; index < a.favorites.length; index += 1) {
    if (a.favorites[index] !== b.favorites[index]) return false
  }

  if (a.recents.length !== b.recents.length) return false
  for (let index = 0; index < a.recents.length; index += 1) {
    const left = a.recents[index]
    const right = b.recents[index]
    if (left === undefined || right === undefined) return false
    if (left.id !== right.id || left.timestamp !== right.timestamp) return false
  }

  return true
}

/**
 * Returns a new state with `id` favorited. Unknown ids and ids already
 * favorited are refused unchanged; the collection never grows past its cap.
 */
export function addFavorite(
  preferences: Preferences,
  id: string,
  validIds: ReadonlySet<string>,
): Preferences {
  if (!validIds.has(id)) return preferences
  if (preferences.favorites.includes(id)) return preferences
  if (preferences.favorites.length >= MAX_FAVORITES) return preferences

  return {
    favorites: [...preferences.favorites, id],
    recents: preferences.recents,
  }
}

/** Returns a new state without `id`. Refuses unchanged when it was not set. */
export function removeFavorite(preferences: Preferences, id: string): Preferences {
  if (!preferences.favorites.includes(id)) return preferences

  return {
    favorites: preferences.favorites.filter((favorite) => favorite !== id),
    recents: preferences.recents,
  }
}

/**
 * Returns a new state where `id` is the most recently used tool: the id moves
 * to the front with a fresh timestamp, any previous entry for it is dropped
 * rather than duplicated, and the oldest entry falls off at the cap. Only the
 * id and the timestamp are carried forward.
 */
export function recordRecent(
  preferences: Preferences,
  id: string,
  timestamp: number,
  validIds: ReadonlySet<string>,
): Preferences {
  if (!validIds.has(id)) return preferences
  if (!Number.isFinite(timestamp) || timestamp < 0) return preferences

  const earlier = preferences.recents.filter((entry) => entry.id !== id)

  return {
    favorites: preferences.favorites,
    recents: [{ id, timestamp }, ...earlier].slice(0, MAX_RECENTS),
  }
}
