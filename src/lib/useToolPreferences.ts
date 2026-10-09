import { useCallback, useMemo, useSyncExternalStore } from 'react'

import {
  addFavorite,
  EMPTY_PREFERENCES,
  preferencesEqual,
  readPreferences,
  recordRecent as applyRecordRecent,
  removeFavorite,
  writePreferences,
  type Preferences,
} from '@/lib/storage'
import { findTool, tools, type ToolEntry } from '@/tools/registry'

/**
 * Ids the registry can actually resolve. Derived from the registry so storage
 * never carries its own copy of the catalog, and so a removed tool stops
 * validating the moment the registry changes.
 */
const VALID_TOOL_IDS: ReadonlySet<string> = new Set(tools.map((tool) => tool.id))

/**
 * Single in-memory copy of the preferences, shared by every subscriber.
 *
 * A module-level store rather than per-component state keeps favorites and
 * recents consistent wherever they are read, and means storage is hit once per
 * page load instead of once per component. It is plain React
 * (`useSyncExternalStore`) -- no state library, no provider.
 */
let snapshot: Preferences = EMPTY_PREFERENCES
let loaded = false
const listeners = new Set<() => void>()

function getSnapshot(): Preferences {
  if (!loaded) {
    snapshot = readPreferences(VALID_TOOL_IDS)
    loaded = true
  }
  return snapshot
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Applies a change: updates memory first, then persists. A failed write leaves
 * the app running on the in-memory value, so storage trouble is never visible
 * as anything other than a preference that did not survive a reload.
 */
function commit(next: Preferences): void {
  const current = getSnapshot()
  if (preferencesEqual(current, next)) return

  snapshot = next
  writePreferences(next)

  for (const listener of [...listeners]) listener()
}

/** Drops ids the registry no longer knows, so they can never reach the UI. */
function resolveTools(ids: readonly string[]): readonly ToolEntry[] {
  const resolved: ToolEntry[] = []

  for (const id of ids) {
    const tool = findTool(id)
    if (tool !== undefined) resolved.push(tool)
  }

  return resolved
}

function toggleFavorite(id: string): void {
  if (!VALID_TOOL_IDS.has(id)) return

  const current = getSnapshot()
  commit(
    current.favorites.includes(id)
      ? removeFavorite(current, id)
      : addFavorite(current, id, VALID_TOOL_IDS),
  )
}

function recordRecent(id: string): void {
  if (!VALID_TOOL_IDS.has(id)) return

  commit(applyRecordRecent(getSnapshot(), id, Date.now(), VALID_TOOL_IDS))
}

export interface ToolPreferences {
  /** Favorited ids in the order they were favorited. */
  readonly favoriteIds: readonly string[]
  /** Same ids resolved through the registry; unknown ids never appear. */
  readonly favoriteTools: readonly ToolEntry[]
  /** Most recently used first. */
  readonly recentTools: readonly ToolEntry[]
  readonly isFavorite: (id: string) => boolean
  /** Accepts only ids the registry knows; anything else is ignored. */
  readonly toggleFavorite: (id: string) => void
  /** Records an open. Accepts only ids the registry knows. */
  readonly recordRecent: (id: string) => void
}

/**
 * Reactive view of the persisted tool preferences.
 *
 * Safe to call from more than one component: they all read the same store, so
 * favoriting a tool updates every subscriber without a reload. Reads and
 * writes happen once per actual preference change, never per render.
 */
export function useToolPreferences(): ToolPreferences {
  const preferences = useSyncExternalStore(subscribe, getSnapshot)

  const favoriteTools = useMemo(
    () => resolveTools(preferences.favorites),
    [preferences.favorites],
  )
  const recentTools = useMemo(
    () => resolveTools(preferences.recents.map((entry) => entry.id)),
    [preferences.recents],
  )
  const isFavorite = useCallback(
    (id: string) => preferences.favorites.includes(id),
    [preferences.favorites],
  )

  return {
    favoriteIds: preferences.favorites,
    favoriteTools,
    recentTools,
    isFavorite,
    toggleFavorite,
    recordRecent,
  }
}
