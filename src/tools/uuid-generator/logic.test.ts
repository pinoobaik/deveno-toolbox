import { describe, expect, it } from 'vitest'

import { generateUuids, parseUuidCount } from './logic'
import { DEFAULT_UUID_COUNT, MAX_UUIDS, MIN_UUIDS } from './types'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('parseUuidCount', () => {
  it('accepts plain whole numbers inside the range', () => {
    expect(parseUuidCount(String(DEFAULT_UUID_COUNT))).toEqual({ ok: true, value: 5 })
    expect(parseUuidCount(String(MIN_UUIDS))).toEqual({ ok: true, value: MIN_UUIDS })
    expect(parseUuidCount(String(MAX_UUIDS))).toEqual({ ok: true, value: MAX_UUIDS })
  })

  it('ignores surrounding whitespace', () => {
    expect(parseUuidCount('  7  ')).toEqual({ ok: true, value: 7 })
  })

  it.each(['', '   ', 'abc', '12abc', '3.7', '-1', '+2', '1e3', '0x10', '5 5'])(
    'rejects %o instead of coercing it',
    (raw) => {
      expect(parseUuidCount(raw).ok).toBe(false)
    },
  )

  it('rejects numbers outside the supported range', () => {
    expect(parseUuidCount('0').ok).toBe(false)
    expect(parseUuidCount(String(MAX_UUIDS + 1)).ok).toBe(false)
    expect(parseUuidCount('99999').ok).toBe(false)
  })

  it('explains what a valid amount looks like', () => {
    const result = parseUuidCount('abc')

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toContain(String(MIN_UUIDS))
    expect(!result.ok && result.message).toContain(String(MAX_UUIDS))
  })
})

describe('generateUuids', () => {
  it('returns the requested number of version 4 UUIDs', () => {
    const uuids = generateUuids(4)

    expect(uuids).toHaveLength(4)
    expect(uuids.every((uuid) => UUID_V4.test(uuid))).toBe(true)
  })

  it('never repeats a value within a batch', () => {
    const uuids = generateUuids(MAX_UUIDS)

    expect(new Set(uuids).size).toBe(MAX_UUIDS)
  })

  it('clamps out of range input instead of producing a huge batch', () => {
    expect(generateUuids(0)).toHaveLength(MIN_UUIDS)
    expect(generateUuids(1_000)).toHaveLength(MAX_UUIDS)
    expect(generateUuids(Number.NaN)).toHaveLength(DEFAULT_UUID_COUNT)
  })
})