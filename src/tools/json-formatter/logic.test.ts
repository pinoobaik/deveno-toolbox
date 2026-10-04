import { describe, expect, it } from 'vitest'

import { parseJson, sortJsonKeys, stringifyJson } from './logic'
import { MAX_JSON_DEPTH } from './types'

/** Builds `levels` nested arrays, the deepest value being `0`. */
function nest(levels: number): unknown {
  let value: unknown = 0

  for (let index = 0; index < levels; index += 1) {
    value = [value]
  }

  return value
}

describe('parseJson', () => {
  it('rejects empty input as empty rather than as a syntax error', () => {
    const result = parseJson('   \n  ')

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.kind).toBe('empty')
  })

  it('returns the parsed value for valid JSON', () => {
    const result = parseJson('{"a":[1,2,{"b":true}]}')

    expect(result).toEqual({ valid: true, value: { a: [1, 2, { b: true }] } })
  })

  it('reports the line and column of a failure', () => {
    const result = parseJson('{\n  "a": 1,\n  "b"\n}')

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.kind).toBe('syntax')
    expect(result.valid === false && result.line).toBe(4)
    expect(result.valid === false && result.column).toBe(1)
    expect(result.valid === false && result.message).toBe(
      "Expected ':' after property name. Found it at line 4, column 1.",
    )
  })

  it('locates trailing content after a complete value', () => {
    const result = parseJson('{"a":1} extra')

    expect(result.valid === false && result.line).toBe(1)
    expect(result.valid === false && result.column).toBe(9)
    expect(result.valid === false && result.message).toContain('line 1, column 9')
  })

  it('still gives a bounded reason when the engine reports no position', () => {
    const result = parseJson('{\n  "a": 1,\n  "b": oops\n}')

    expect(result.valid).toBe(false)
    if (result.valid) return

    expect(result.line).toBeNull()
    expect(result.column).toBeNull()
    expect(result.message).toBe("Unexpected token 'o'.")
  })

  it('points at the end of the input for truncated documents', () => {
    const result = parseJson('[1,2,')

    expect(result.valid === false && result.message).toContain('line 1, column 6')
  })

  it('never echoes the submitted document back into the message', () => {
    const secret = 'super-secret-payload'
    const result = parseJson(`{"token":"${secret}",}`)

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.message).not.toContain(secret)
  })

  it('never leaks raw engine wording into the message', () => {
    const result = parseJson('{')

    expect(result.valid).toBe(false)
    if (result.valid) return

    expect(result.message).not.toContain('JSON.parse')
    expect(result.message).not.toContain('SyntaxError')
    expect(result.message.endsWith('.')).toBe(true)
  })

  it('keeps the reason short no matter how hostile the message is', () => {
    const hostile = `"${'x'.repeat(20_000)}"`
    const result = parseJson(`{${hostile}}`)

    expect(result.valid).toBe(false)
    if (result.valid) return

    expect(result.message.length).toBeLessThan(200)
  })

  it('rejects input beyond the size limit instead of parsing it', () => {
    const oversized = `"${'a'.repeat(1_000_001)}"`
    const result = parseJson(oversized)

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.kind).toBe('too-large')
  })
})

describe('stringifyJson', () => {
  it('pretty prints with the requested indent', () => {
    const result = stringifyJson({ b: 1, a: 2 }, { indent: 2 })

    expect(result).toEqual({ ok: true, text: '{\n  "b": 1,\n  "a": 2\n}' })
  })

  it('minifies when no indent is given', () => {
    const result = stringifyJson({ a: [1, 2] })

    expect(result).toEqual({ ok: true, text: '{"a":[1,2]}' })
  })

  it('supports a tab indent', () => {
    const result = stringifyJson({ a: 1 }, { indent: '\t' })

    expect(result.ok && result.text).toBe('{\n\t"a": 1\n}')
  })

  it('sorts keys on request without touching array order', () => {
    const result = stringifyJson({ b: 1, a: [{ d: 1, c: 2 }] }, { indent: 2, sortKeys: true })

    expect(result.ok && result.text).toBe(
      ['{', '  "a": [', '    {', '      "c": 2,', '      "d": 1', '    }', '  ],', '  "b": 1', '}'].join(
        '\n',
      ),
    )
  })

  it('refuses documents deeper than the limit instead of throwing', () => {
    const result = stringifyJson(nest(MAX_JSON_DEPTH + 1))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.kind).toBe('too-deep')
  })

  it('still formats documents just inside the limit', () => {
    const result = stringifyJson(nest(MAX_JSON_DEPTH))

    expect(result.ok).toBe(true)
  })

  it('returns a controlled failure for a value that cannot be serialized', () => {
    const hostile = {
      get boom(): never {
        throw new Error('property access failed')
      },
    }

    const result = stringifyJson(hostile)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.kind).toBe('unsupported')
  })

  it('reports a failure for values with no JSON representation', () => {
    const result = stringifyJson(undefined)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.kind).toBe('unsupported')
  })

  it('survives a self referencing value without hanging', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    const result = stringifyJson(circular)

    expect(result.ok).toBe(false)
  })
})

describe('sortJsonKeys', () => {
  it('returns primitives unchanged', () => {
    expect(sortJsonKeys(7)).toBe(7)
    expect(sortJsonKeys(null)).toBeNull()
    expect(sortJsonKeys('text')).toBe('text')
  })

  it('orders keys by code unit rather than by locale', () => {
    const sorted = sortJsonKeys({ a: 1, B: 2, A: 3 }) as Record<string, number>

    expect(Object.keys(sorted)).toEqual(['A', 'B', 'a'])
  })

  it('sorts nested objects at every depth', () => {
    const sorted = sortJsonKeys({ outer: { z: { y: 1, x: 2 }, a: 3 } })

    expect(Object.keys(sorted as object)).toEqual(['outer'])
    expect(Object.keys((sorted as { outer: object }).outer)).toEqual(['a', 'z'])
  })

  it('preserves array element order', () => {
    const sorted = sortJsonKeys([3, 1, 2])

    expect(sorted).toEqual([3, 1, 2])
  })

  it('does not mutate the input', () => {
    const input = { b: 1, a: 2 }

    sortJsonKeys(input)

    expect(Object.keys(input)).toEqual(['b', 'a'])
  })

  it('is deterministic across repeated runs', () => {
    const input = JSON.parse('{"z":1,"a":2,"M":3,"b":4,"_":5,"0":6}') as unknown
    const first = JSON.stringify(sortJsonKeys(input))

    for (let run = 0; run < 5; run += 1) {
      expect(JSON.stringify(sortJsonKeys(input))).toBe(first)
    }
  })

  it('handles documents too deep for a recursive implementation', () => {
    const sorted = sortJsonKeys(nest(20_000))

    // Walk the result iteratively: JSON.stringify itself cannot go this deep.
    let depth = 0
    let current: unknown = sorted

    while (Array.isArray(current)) {
      depth += 1
      current = current[0]
    }

    expect(depth).toBe(20_000)
    expect(current).toBe(0)
  })
})