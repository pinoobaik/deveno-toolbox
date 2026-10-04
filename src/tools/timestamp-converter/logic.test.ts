import { describe, expect, it } from 'vitest'

import { dateToTimestamp, interpretDateInput, timestampToDate } from './logic'

describe('interpretDateInput', () => {
  it('reads a date only ISO value as UTC midnight', () => {
    expect(interpretDateInput('2024-01-15')).toEqual({
      normalized: '2024-01-15T00:00:00Z',
      assumesLocalTime: false,
    })
  })

  it('reports a date and time without a zone as local time', () => {
    expect(interpretDateInput('2024-01-15T14:30:00')).toEqual({
      normalized: '2024-01-15T14:30:00',
      assumesLocalTime: true,
    })
  })

  it('normalises a space separator to T for the local time form', () => {
    expect(interpretDateInput('2024-01-15 14:30:00')).toEqual({
      normalized: '2024-01-15T14:30:00',
      assumesLocalTime: true,
    })
  })

  it('accepts an explicit Z suffix as UTC', () => {
    expect(interpretDateInput('2024-01-15T14:30:00Z').assumesLocalTime).toBe(false)
  })

  it.each(['2024-01-15T14:30:00+02:00', '2024-01-15T14:30:00-0500'])(
    'accepts %s as an explicit offset',
    (raw) => {
      expect(interpretDateInput(raw).assumesLocalTime).toBe(false)
    },
  )

  it('treats an RFC 2822 date with GMT as UTC', () => {
    expect(interpretDateInput('Mon, 15 Jan 2024 14:30:00 GMT').assumesLocalTime).toBe(false)
  })

  it('trims surrounding whitespace', () => {
    expect(interpretDateInput('  2024-01-15  ').normalized).toBe('2024-01-15T00:00:00Z')
  })
})

describe('dateToTimestamp', () => {
  it('converts a date only value to UTC midnight', () => {
    const result = dateToTimestamp('2024-01-15')

    expect(result.ok).toBe(true)
    expect(result.ok && result.milliseconds).toBe(Date.UTC(2024, 0, 15))
    expect(result.ok && result.seconds).toBe(Math.floor(Date.UTC(2024, 0, 15) / 1000))
  })

  it('converts an explicit instant exactly', () => {
    const result = dateToTimestamp('2024-01-15T14:30:00Z')

    expect(result.ok && result.milliseconds).toBe(Date.UTC(2024, 0, 15, 14, 30, 0))
  })

  it('reports empty input separately from an unparseable date', () => {
    const empty = dateToTimestamp('  ')
    const invalid = dateToTimestamp('not a date')

    expect(!empty.ok && empty.kind).toBe('empty')
    expect(!invalid.ok && invalid.kind).toBe('invalid-date')
  })

  it('does not paste a whole document into the error message', () => {
    const result = dateToTimestamp('x'.repeat(5_000))

    expect(!result.ok && result.message.length).toBeLessThan(200)
  })
})

describe('timestampToDate', () => {
  it('reads a small value as seconds', () => {
    const result = timestampToDate('1705314600')

    expect(result.ok && result.seconds).toBe(1705314600)
    expect(result.ok && result.milliseconds).toBe(1705314600000)
  })

  it('reads a large value as milliseconds', () => {
    const result = timestampToDate('1705314600000')

    expect(result.ok && result.milliseconds).toBe(1705314600000)
  })

  it('round trips a timestamp produced from a date', () => {
    const forward = dateToTimestamp('2024-01-15T14:30:00Z')
    expect(forward.ok).toBe(true)
    if (!forward.ok) return

    const backward = timestampToDate(String(forward.milliseconds))
    expect(backward.ok && backward.milliseconds).toBe(forward.milliseconds)
  })

  it('rejects text that is not a number', () => {
    const result = timestampToDate('yesterday')

    expect(!result.ok && result.kind).toBe('invalid-number')
  })

  it('rejects a value outside the supported date range', () => {
    const result = timestampToDate('9999999999999999')

    expect(!result.ok && result.kind).toBe('out-of-range')
  })

  it('does not paste a whole document into the error message', () => {
    const result = timestampToDate('9'.repeat(5_000))

    expect(!result.ok && result.message.length).toBeLessThan(200)
  })
})