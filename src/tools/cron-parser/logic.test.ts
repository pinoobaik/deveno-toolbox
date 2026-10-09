import { describe, expect, it } from 'vitest'

import { parseCron } from './logic'
import { MAX_CRON_EXPRESSION_CHARS } from './types'

describe('parseCron', () => {
  it('expands a wildcard expression across all five fields', () => {
    const result = parseCron('* * * * *')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.map((field) => field.summary)).toEqual([
      'every minute',
      'every hour',
      'every day of month',
      'every month',
      'every day',
    ])
    expect(result.fields.map((field) => field.values.length)).toEqual([60, 24, 31, 12, 8])
  })

  it('explains a step expression', () => {
    const result = parseCron('*/15 * * * *')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields[0]?.values).toEqual([0, 15, 30, 45])
    expect(result.fields[0]?.summary).toBe('at minutes 0, 15, 30, 45')
  })

  it('expands a single concrete moment', () => {
    const result = parseCron('30 14 1 1 1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.map((field) => field.values)).toEqual([[30], [14], [1], [1], [1]])
    expect(result.fields.map((field) => field.summary)).toEqual([
      'at minute 30',
      'at hour 14',
      'at day of month 1',
      'at month 1',
      'at weekday 1',
    ])
  })

  it('expands a range with a step', () => {
    const result = parseCron('0-30/5 * * * *')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields[0]?.values).toEqual([0, 5, 10, 15, 20, 25, 30])
    expect(result.fields[0]?.summary).toBe('at 7 values (0–30)')
  })

  it('treats a lone value with a step as running to the field maximum', () => {
    const result = parseCron('5/15 * * * *')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields[0]?.values).toEqual([5, 20, 35, 50])
  })

  it('combines list items and de-duplicates and sorts the expansion', () => {
    const result = parseCron('2,1,10-12,2 * * * *')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields[0]?.values).toEqual([1, 2, 10, 11, 12])
  })

  it('accepts the documented field maxima including weekday 7', () => {
    const result = parseCron('59 23 31 12 7')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields[4]?.values).toEqual([7])
    expect(result.fields[4]?.note).toBe('In cron, 0 and 7 are both Sunday.')
  })

  it('accepts leading zeros', () => {
    const result = parseCron('05 09 * * *')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields[0]?.values).toEqual([5])
    expect(result.fields[1]?.values).toEqual([9])
  })

  it('accepts a step larger than the span, which yields one value', () => {
    const result = parseCron('*/60 * * * *')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields[0]?.values).toEqual([0])
  })

  it('rejects a minute above the field maximum', () => {
    const result = parseCron('60 * * * *')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('out-of-range')
      expect(result.message).toBe('Minutes: Values 60–60 fall outside the allowed 0–59.')
    }
  })

  it.each([
    ['* * 32 * *', 'Day of month'],
    ['* * * 13 *', 'Month'],
    ['* * * * 8', 'Day of week'],
  ])('rejects out-of-range values in %s', (expression, label) => {
    const result = parseCron(expression)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('out-of-range')
      expect(result.message).toContain(`${label}:`)
    }
  })

  it('rejects a reversed range', () => {
    const result = parseCron('30-20 * * * *')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('reversed-range')
      expect(result.message).toBe('Minutes: A range must start on a value no larger than where it ends.')
    }
  })

  it.each(['*/0 * * * *', '5/0 * * * *', '1-10/-2 * * * *'])(
    'rejects a zero or negative step in %s',
    (expression) => {
      const result = parseCron(expression)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.kind).toBe('invalid-step')
        expect(result.message).toBe('Minutes: A step must be a positive whole number.')
      }
    },
  )

  it.each(['1..5 * * * *', ', * * * *', '*,,0 * * * *', '1- * * * *'])(
    'rejects malformed tokens in %s',
    (expression) => {
      const result = parseCron(expression)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.kind).toBe('malformed')
        expect(result.message).toBe('Minutes: This looks like a malformed number, list, range, or step.')
      }
    },
  )

  it.each(['JAN * * * *', 'MON * * * *', 'abc * * * *', '1,a * * * *'])(
    'rejects month and weekday names in %s',
    (expression) => {
      const result = parseCron(expression)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.kind).toBe('names')
        expect(result.message).toContain('Month and weekday names are not supported; use numbers.')
      }
    },
  )

  it('rejects the wrong field count', () => {
    const result = parseCron('* * * * * *')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('field-count')
      expect(result.message).toBe('Expecting 5 fields (minutes, hours, day of month, month, day of week); got 6.')
    }
  })

  it('rejects too few fields', () => {
    const result = parseCron('* * *')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('field-count')
  })

  it('rejects an empty expression', () => {
    const result = parseCron('')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('empty')
  })

  it('rejects whitespace-only input', () => {
    const result = parseCron('   ')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('empty')
  })

  it('rejects an expression over the length limit', () => {
    const result = parseCron(`${'*/1 '.repeat(5)}${'0'.repeat(MAX_CRON_EXPRESSION_CHARS)}`)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('too-large')
  })

  it('keeps raw inputs next to each expanded field', () => {
    const result = parseCron('0 9 * * 1-5')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.map((field) => field.raw)).toEqual(['0', '9', '*', '*', '1-5'])
    expect(result.fields[4]?.values).toEqual([1, 2, 3, 4, 5])
  })
})