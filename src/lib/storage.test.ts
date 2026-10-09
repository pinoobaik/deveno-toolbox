import { describe, expect, it } from 'vitest'

import {
  addFavorite,
  MAX_FAVORITES,
  MAX_FUTURE_SKEW_MS,
  MAX_RECENTS,
  normalizePreferences,
  PREFERENCES_VERSION,
  preferencesEqual,
  readPreferences,
  recordRecent,
  removeFavorite,
  STORAGE_KEY,
  writePreferences,
  type KeyValueStore,
  type Preferences,
} from './storage'

/** Stand-in registry: 30 valid ids so the collection caps can actually be hit. */
const IDS: ReadonlySet<string> = new Set(Array.from({ length: 30 }, (_, i) => `tool-${i}`))

const NOW = 1_700_000_000_000

const EMPTY: Preferences = { favorites: [], recents: [] }

function payload(fields: Record<string, unknown>): string {
  return JSON.stringify(fields)
}

function prefs(favorites: readonly string[], recents: Preferences['recents'] = []): Preferences {
  return { favorites, recents }
}

function fakeStore(initial: string | null = null) {
  let value = initial

  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
    read: () => value,
  }
}

const unreadableStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError: the storage representative is not available')
  },
  setItem: () => undefined,
  removeItem: () => undefined,
}

const writeFailingStore: KeyValueStore = {
  getItem: () => null,
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => undefined,
}

const removeFailingStore: KeyValueStore = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => {
    throw new Error('SecurityError: denied')
  },
}

describe('readPreferences', () => {
  it('returns defaults when nothing has been stored', () => {
    expect(readPreferences(IDS, fakeStore(null))).toEqual(EMPTY)
  })

  it('returns defaults when storage is unavailable', () => {
    expect(readPreferences(IDS, null)).toEqual(EMPTY)
  })

  it('returns defaults when getItem throws', () => {
    expect(readPreferences(IDS, unreadableStore)).toEqual(EMPTY)
  })

  it('reads valid version 1 data', () => {
    const store = fakeStore(
      payload({
        version: PREFERENCES_VERSION,
        favorites: ['tool-1'],
        recents: [{ id: 'tool-2', timestamp: 1_000 }],
      }),
    )

    expect(readPreferences(IDS, store, NOW)).toEqual({
      favorites: ['tool-1'],
      recents: [{ id: 'tool-2', timestamp: 1_000 }],
    })
  })

  it('returns defaults for an empty payload', () => {
    expect(readPreferences(IDS, fakeStore(''), NOW)).toEqual(EMPTY)
  })

  it('returns defaults for malformed JSON', () => {
    expect(readPreferences(IDS, fakeStore('{"version":'), NOW)).toEqual(EMPTY)
  })

  it('returns defaults when the root is not an object', () => {
    expect(readPreferences(IDS, fakeStore('[1,2,3]'), NOW)).toEqual(EMPTY)
    expect(readPreferences(IDS, fakeStore('"a string"'), NOW)).toEqual(EMPTY)
    expect(readPreferences(IDS, fakeStore('null'), NOW)).toEqual(EMPTY)
    expect(readPreferences(IDS, fakeStore('42'), NOW)).toEqual(EMPTY)
  })

  it('returns defaults when the version is missing', () => {
    expect(readPreferences(IDS, fakeStore(payload({ favorites: [], recents: [] })), NOW)).toEqual(
      EMPTY,
    )
  })

  it('returns defaults for an unsupported version', () => {
    expect(
      readPreferences(IDS, fakeStore(payload({ version: 2, favorites: [], recents: [] })), NOW),
    ).toEqual(EMPTY)
  })

  it('returns defaults when a field has the wrong type', () => {
    expect(
      readPreferences(IDS, fakeStore(payload({ version: 1, favorites: 'nope', recents: [] })), NOW),
    ).toEqual(EMPTY)
    expect(
      readPreferences(IDS, fakeStore(payload({ version: 1, favorites: [], recents: {} })), NOW),
    ).toEqual(EMPTY)
    expect(
      readPreferences(
        IDS,
        fakeStore(payload({ version: 1, favorites: null, recents: null })),
        NOW,
      ),
    ).toEqual(EMPTY)
  })

  it('never throws and never surfaces the browser exception message', () => {
    expect(() => readPreferences(IDS, unreadableStore)).not.toThrow()
    expect(readPreferences(IDS, unreadableStore)).toEqual(EMPTY)
  })
})

describe('normalizePreferences: favorites', () => {
  const normalize = (favorites: unknown) =>
    normalizePreferences(payload({ version: 1, favorites, recents: [] }), IDS, NOW).favorites

  it('keeps valid ids in stored order', () => {
    expect(normalize(['tool-2', 'tool-0', 'tool-7'])).toEqual(['tool-2', 'tool-0', 'tool-7'])
  })

  it('drops ids the registry does not know', () => {
    expect(normalize(['tool-1', 'some-tool-that-no-longer-exists'])).toEqual(['tool-1'])
  })

  it('drops ids that are not strings', () => {
    expect(normalize([1, null, true, {}, 'tool-1'])).toEqual(['tool-1'])
  })

  it('removes duplicate ids', () => {
    expect(normalize(['tool-1', 'tool-2', 'tool-1', 'tool-2'])).toEqual(['tool-1', 'tool-2'])
  })

  it(`caps favorites at ${MAX_FAVORITES}`, () => {
    const many = Array.from({ length: 25 }, (_, i) => `tool-${i}`)
    const result = normalize(many)

    expect(result).toHaveLength(MAX_FAVORITES)
    expect(result).toEqual(many.slice(0, MAX_FAVORITES))
  })
})

describe('normalizePreferences: recents', () => {
  const normalize = (recents: unknown) =>
    normalizePreferences(payload({ version: 1, favorites: [], recents }), IDS, NOW).recents

  it('keeps valid records', () => {
    expect(normalize([{ id: 'tool-1', timestamp: 1_000 }])).toEqual([
      { id: 'tool-1', timestamp: 1_000 },
    ])
  })

  it('drops records whose id the registry does not know', () => {
    expect(
      normalize([
        { id: 'tool-1', timestamp: 1_000 },
        { id: 'deleted-tool', timestamp: 2_000 },
      ]),
    ).toEqual([{ id: 'tool-1', timestamp: 1_000 }])
  })

  it('drops records that are not objects', () => {
    expect(normalize(['tool-1', 42, null, ['tool-2']])).toEqual([])
  })

  it('drops records with a missing or non-string id', () => {
    expect(normalize([{ timestamp: 1_000 }, { id: 7, timestamp: 1_000 }])).toEqual([])
  })

  it('drops records with a missing or non-numeric timestamp', () => {
    expect(normalize([{ id: 'tool-1' }, { id: 'tool-1', timestamp: '1000' }])).toEqual([])
  })

  it('drops negative timestamps', () => {
    expect(normalize([{ id: 'tool-1', timestamp: -1 }])).toEqual([])
  })

  it('accepts a timestamp at the edge of the allowed future skew', () => {
    expect(normalize([{ id: 'tool-1', timestamp: NOW + MAX_FUTURE_SKEW_MS }])).toEqual([
      { id: 'tool-1', timestamp: NOW + MAX_FUTURE_SKEW_MS },
    ])
  })

  it('drops an impossible future timestamp', () => {
    expect(normalize([{ id: 'tool-1', timestamp: NOW + MAX_FUTURE_SKEW_MS + 1 }])).toEqual([])
  })

  it('collapses duplicate ids keeping the newest timestamp', () => {
    expect(
      normalize([
        { id: 'tool-1', timestamp: 100 },
        { id: 'tool-1', timestamp: 300 },
        { id: 'tool-1', timestamp: 200 },
      ]),
    ).toEqual([{ id: 'tool-1', timestamp: 300 }])
  })

  it('re-sorts stored records into MRU order', () => {
    expect(
      normalize([
        { id: 'tool-1', timestamp: 100 },
        { id: 'tool-2', timestamp: 300 },
        { id: 'tool-3', timestamp: 200 },
      ]),
    ).toEqual([
      { id: 'tool-2', timestamp: 300 },
      { id: 'tool-3', timestamp: 200 },
      { id: 'tool-1', timestamp: 100 },
    ])
  })

  it('breaks timestamp ties by stored order', () => {
    expect(
      normalize([
        { id: 'tool-1', timestamp: 100 },
        { id: 'tool-2', timestamp: 100 },
      ]),
    ).toEqual([
      { id: 'tool-1', timestamp: 100 },
      { id: 'tool-2', timestamp: 100 },
    ])
  })

  it(`keeps only the newest ${MAX_RECENTS} records`, () => {
    const many = Array.from({ length: MAX_RECENTS + 2 }, (_, i) => ({
      id: `tool-${i}`,
      timestamp: 1_000 + i,
    }))

    const result = normalize(many)

    expect(result).toHaveLength(MAX_RECENTS)
    expect(result[0]).toEqual({ id: `tool-${MAX_RECENTS + 1}`, timestamp: 1_000 + MAX_RECENTS + 1 })
    expect(result.map((entry) => entry.id)).not.toContain('tool-0')
  })

  it('keeps only the valid records when the list is mixed', () => {
    expect(
      normalize([
        { id: 'tool-1', timestamp: 100 },
        { id: 'deleted-tool', timestamp: 500 },
        { id: 'tool-2', timestamp: 'soon' },
        { id: 'tool-3', timestamp: -5 },
        'junk',
        { id: 'tool-4', timestamp: 200 },
      ]),
    ).toEqual([
      { id: 'tool-4', timestamp: 200 },
      { id: 'tool-1', timestamp: 100 },
    ])
  })
})

describe('writePreferences', () => {
  it('writes a version 1 payload under the centralized key', () => {
    const store = fakeStore()

    expect(writePreferences(prefs(['tool-1']), store)).toBe(true)
    expect(store.read()).toBe(
      JSON.stringify({ version: 1, favorites: ['tool-1'], recents: [] }),
    )
  })

  it('persists only ids and timestamps, never tool content', () => {
    const store = fakeStore()

    writePreferences(
      prefs(['tool-1'], [{ id: 'tool-2', timestamp: NOW }]),
      store,
    )

    const parsed: unknown = JSON.parse(store.read() ?? '')
    expect(Object.keys(parsed as Record<string, unknown>).sort()).toEqual([
      'favorites',
      'recents',
      'version',
    ])

    const recents = (parsed as { recents: unknown[] }).recents
    for (const entry of recents) {
      expect(Object.keys(entry as Record<string, unknown>).sort()).toEqual(['id', 'timestamp'])
    }
  })

  it('removes the key when there is nothing left to store', () => {
    const store = fakeStore(JSON.stringify({ version: 1, favorites: ['tool-1'], recents: [] }))

    expect(writePreferences(EMPTY, store)).toBe(true)
    expect(store.read()).toBeNull()
  })

  it('caps oversized collections when serializing', () => {
    const store = fakeStore()
    const many = Array.from({ length: 25 }, (_, i) => `tool-${i}`)

    writePreferences(prefs(many), store)

    const parsed = JSON.parse(store.read() ?? '') as { favorites: string[] }
    expect(parsed.favorites).toHaveLength(MAX_FAVORITES)
  })

  it('returns false and does not throw when setItem throws', () => {
    expect(writePreferences(prefs(['tool-1']), writeFailingStore)).toBe(false)
  })

  it('returns false and does not throw when removeItem throws', () => {
    expect(writePreferences(EMPTY, removeFailingStore)).toBe(false)
  })

  it('returns false when storage is unavailable', () => {
    expect(writePreferences(prefs(['tool-1']), null)).toBe(false)
  })

  it('never lets a storage exception reach the caller', () => {
    expect(() => writePreferences(prefs(['tool-1']), writeFailingStore)).not.toThrow()
    expect(() => writePreferences(EMPTY, removeFailingStore)).not.toThrow()
  })
})

describe('normalization cleans persisted storage', () => {
  it('rewrites storage without unknown ids after a read/write cycle', () => {
    const store = fakeStore(
      payload({
        version: 1,
        favorites: ['tool-1', 'some-tool-that-no-longer-exists'],
        recents: [
          { id: 'tool-2', timestamp: 1_000 },
          { id: 'another-deleted-tool', timestamp: 2_000 },
        ],
      }),
    )

    const normalized = readPreferences(IDS, store, NOW)
    expect(normalized.favorites).toEqual(['tool-1'])

    writePreferences(normalized, store)

    const written = store.read() ?? ''
    expect(written).not.toContain('some-tool-that-no-longer-exists')
    expect(written).not.toContain('another-deleted-tool')
    expect(JSON.parse(written)).toEqual({
      version: 1,
      favorites: ['tool-1'],
      recents: [{ id: 'tool-2', timestamp: 1_000 }],
    })
  })
})

describe('addFavorite', () => {
  it('adds a new id', () => {
    expect(addFavorite(prefs(['tool-1']), 'tool-2', IDS).favorites).toEqual(['tool-1', 'tool-2'])
  })

  it('ignores an id the registry does not know', () => {
    expect(addFavorite(prefs(['tool-1']), 'ghost-tool', IDS).favorites).toEqual(['tool-1'])
  })

  it('is idempotent', () => {
    const once = addFavorite(EMPTY, 'tool-1', IDS)
    const twice = addFavorite(once, 'tool-1', IDS)

    expect(twice.favorites).toEqual(['tool-1'])
    expect(preferencesEqual(once, twice)).toBe(true)
  })

  it(`refuses to grow past ${MAX_FAVORITES} favorites`, () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, i) => `tool-${i}`)
    const capped = addFavorite(prefs(full), 'tool-25', IDS)

    expect(capped.favorites).toHaveLength(MAX_FAVORITES)
    expect(capped.favorites).not.toContain('tool-25')
  })

  it('leaves recents untouched', () => {
    const start = prefs([], [{ id: 'tool-1', timestamp: 5 }])

    expect(addFavorite(start, 'tool-2', IDS).recents).toEqual(start.recents)
  })
})

describe('removeFavorite', () => {
  it('removes an existing id', () => {
    expect(removeFavorite(prefs(['tool-1', 'tool-2']), 'tool-1').favorites).toEqual(['tool-2'])
  })

  it('leaves state unchanged when the id is not favorited', () => {
    const start = prefs(['tool-1'])

    expect(removeFavorite(start, 'tool-9').favorites).toEqual(['tool-1'])
    expect(preferencesEqual(removeFavorite(start, 'tool-9'), start)).toBe(true)
  })

  it('leaves recents untouched', () => {
    const recents = [{ id: 'tool-3', timestamp: 9 }]
    const start = prefs(['tool-1'], recents)

    expect(removeFavorite(start, 'tool-1').recents).toEqual(recents)
  })
})

describe('recordRecent', () => {
  it('inserts a tool at the front', () => {
    const result = recordRecent(EMPTY, 'tool-1', 1_000, IDS)

    expect(result.recents).toEqual([{ id: 'tool-1', timestamp: 1_000 }])
  })

  it('moves a repeated use to the front with a fresh timestamp', () => {
    const start = prefs([], [
      { id: 'tool-1', timestamp: 1_000 },
      { id: 'tool-2', timestamp: 900 },
    ])

    const result = recordRecent(start, 'tool-2', 5_000, IDS)

    expect(result.recents).toEqual([
      { id: 'tool-2', timestamp: 5_000 },
      { id: 'tool-1', timestamp: 1_000 },
    ])
  })

  it('never creates a duplicate entry for the same id', () => {
    const once = recordRecent(EMPTY, 'tool-1', 1_000, IDS)
    const twice = recordRecent(once, 'tool-1', 2_000, IDS)

    expect(twice.recents).toHaveLength(1)
    expect(twice.recents[0]?.id).toBe('tool-1')
    expect(twice.recents[0]?.timestamp).toBe(2_000)
  })

  it('preserves favorites', () => {
    const start = prefs(['tool-3'])

    expect(recordRecent(start, 'tool-1', 1_000, IDS).favorites).toEqual(['tool-3'])
  })

  it('ignores an id the registry does not know', () => {
    expect(recordRecent(EMPTY, 'ghost-tool', 1_000, IDS).recents).toEqual([])
  })

  it('discards an impossible timestamp', () => {
    expect(recordRecent(EMPTY, 'tool-1', -1, IDS).recents).toEqual([])
    expect(recordRecent(EMPTY, 'tool-1', Number.NaN, IDS).recents).toEqual([])
    expect(recordRecent(EMPTY, 'tool-1', Number.POSITIVE_INFINITY, IDS).recents).toEqual([])
  })

  it(`keeps at most ${MAX_RECENTS} entries, dropping the oldest`, () => {
    const start = prefs(
      [],
      Array.from({ length: MAX_RECENTS }, (_, i) => ({ id: `tool-${i}`, timestamp: 1_000 - i })),
    )

    const result = recordRecent(start, 'tool-20', 9_999, IDS)

    expect(result.recents).toHaveLength(MAX_RECENTS)
    expect(result.recents[0]).toEqual({ id: 'tool-20', timestamp: 9_999 })
    expect(result.recents.map((entry) => entry.id)).not.toContain(`tool-${MAX_RECENTS - 1}`)
  })
})

describe('preferencesEqual', () => {
  it('is true for two empty states', () => {
    expect(preferencesEqual(EMPTY, EMPTY)).toBe(true)
    expect(preferencesEqual(EMPTY, prefs([], []))).toBe(true)
  })

  it('is true when ids and timestamps all match in order', () => {
    const a = prefs(['tool-1'], [{ id: 'tool-2', timestamp: 10 }])
    const b = prefs(['tool-1'], [{ id: 'tool-2', timestamp: 10 }])

    expect(preferencesEqual(a, b)).toBe(true)
  })

  it('is false when favorites differ', () => {
    expect(preferencesEqual(prefs(['tool-1']), prefs(['tool-2']))).toBe(false)
    expect(preferencesEqual(prefs(['tool-1']), prefs([]))).toBe(false)
  })

  it('is false when recents differ', () => {
    const a = [{ id: 'tool-1', timestamp: 10 }]
    const b = [{ id: 'tool-1', timestamp: 11 }]

    expect(preferencesEqual(prefs([], a), prefs([], b))).toBe(false)
    expect(preferencesEqual(prefs([], a), prefs([], [{ id: 'tool-2', timestamp: 10 }]))).toBe(false)
    expect(preferencesEqual(prefs([], a), prefs([], [...a, { id: 'tool-3', timestamp: 9 }]))).toBe(
      false,
    )
  })
})

describe('storage key', () => {
  it('is centralized so components never spell it themselves', () => {
    expect(STORAGE_KEY).toBe('dev-toolbox:preferences')
  })
})
