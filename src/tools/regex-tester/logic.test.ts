import { describe, expect, it } from 'vitest'

import { buildPattern, findMatches, matchesToLines } from './logic'
import { MAX_MATCH_LIMIT, MAX_PATTERN_CHARS, MAX_TEST_TEXT_CHARS } from './types'

describe('buildPattern', () => {
  it('compiles a plain pattern', () => {
    const result = buildPattern('abc', 'g')

    expect(result.ok).toBe(true)
  })

  it('compiles a pattern with no flags', () => {
    const result = buildPattern('abc', '')

    expect(result.ok).toBe(true)
  })

  it('keeps whitespace in the pattern, which is meaningful to the engine', () => {
    const result = buildPattern('   ', 'g')

    expect(result.ok).toBe(true)
  })

  it('rejects an empty pattern', () => {
    const result = buildPattern('', 'g')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('empty')
  })

  it('rejects a pattern over the length limit', () => {
    const result = buildPattern('a'.repeat(MAX_PATTERN_CHARS + 1), 'g')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('too-large')
  })

  it('accepts a pattern exactly at the length limit', () => {
    const result = buildPattern('a'.repeat(MAX_PATTERN_CHARS), '')

    expect(result.ok).toBe(true)
  })

  it('rejects an unknown flag', () => {
    const result = buildPattern('abc', 'x')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('bad-flag')
  })

  it('rejects a repeated flag', () => {
    const result = buildPattern('abc', 'gg')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('bad-flag')
  })

  it.each(['(', '*', '[z-a]', '\\', 'a{2,1}'])('maps invalid syntax "%s" to a fixed message', (pattern) => {
    const result = buildPattern(pattern, 'g')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('bad-syntax')
      expect(result.message).toBe('The pattern is not a valid regular expression.')
    }
  })

  it('rejects a codepoint escape invalid under the u flag', () => {
    const result = buildPattern('\\u{110000}', 'u')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('bad-syntax')
  })

  it('allows the same escape without the u flag', () => {
    const result = buildPattern('\\u{110000}', '')

    expect(result.ok).toBe(true)
  })
})

describe('findMatches', () => {
  it('returns every match in order for a global pattern', () => {
    const pattern = buildPattern('o', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'hello world')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(2)
    expect(result.matches.map((match) => match.start)).toEqual([4, 7])
    expect(result.matches.map((match) => match.end)).toEqual([5, 8])
    expect(result.matches.map((match) => match.text)).toEqual(['o', 'o'])
    expect(result.truncated).toBe(false)
  })

  it('reports an empty result for no match', () => {
    const pattern = buildPattern('z', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'abc')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(0)
    expect(result.matches).toEqual([])
  })

  it('handles zero-width global matches without looping forever', () => {
    const pattern = buildPattern('^', 'gm')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'a\nb')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matches.map((match) => match.start)).toEqual([0, 2])
    expect(result.matches.map((match) => match.text)).toEqual(['', ''])
    expect(result.count).toBe(2)
  })

  it('advances past a trailing newline after a zero-width match', () => {
    const pattern = buildPattern('^', 'gm')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, '\n')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matches.map((match) => match.start)).toEqual([0, 1])
    expect(result.count).toBe(2)
  })

  it('handles a matching-everywhere empty pattern', () => {
    const pattern = buildPattern('(?:)', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'ab')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matches.map((match) => match.start)).toEqual([0, 1, 2])
    expect(result.count).toBe(3)
  })

  it('advances a zero-width sticky pattern instead of matching the same spot', () => {
    const pattern = buildPattern('(?:)', 'y')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'ab')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matches.map((match) => match.start)).toEqual([0, 1, 2])
    expect(result.count).toBe(3)
  })

  it('returns only the first match for a non-global, non-sticky pattern', () => {
    const pattern = buildPattern('o', '')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'oooo')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(1)
    expect(result.matches[0]?.start).toBe(0)
  })

  it('respects the i flag', () => {
    const pattern = buildPattern('ab', 'i')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'AB')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(1)
    expect(result.matches[0]?.text).toBe('AB')
  })

  it('respects the s flag for crossing newlines', () => {
    const without = buildPattern('a.b', '')
    const withDotAll = buildPattern('a.b', 's')
    expect(without.ok).toBe(true)
    expect(withDotAll.ok).toBe(true)
    if (!without.ok || !withDotAll.ok) return

    const plain = findMatches(without.regex, 'a\nb')
    const dotAll = findMatches(withDotAll.regex, 'a\nb')

    expect(plain.ok).toBe(true)
    if (!plain.ok) return
    expect(plain.count).toBe(0)
    expect(dotAll.ok).toBe(true)
    if (!dotAll.ok) return
    expect(dotAll.count).toBe(1)
  })

  it('respects the m flag for line anchors', () => {
    const pattern = buildPattern('^b', 'm')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'a\nb')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matches[0]?.start).toBe(2)
  })

  it('handles astral characters under the u flag by code point', () => {
    const pattern = buildPattern('😀', 'gu')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'x😀y')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(1)
    expect(result.matches[0]?.start).toBe(1)
    expect(result.matches[0]?.end).toBe(3)
    expect(result.matches[0]?.text).toBe('😀')
  })

  it('reports capture groups', () => {
    const pattern = buildPattern('(\\w)(\\s)', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'a b')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(1)
    expect(result.matches[0]?.groups).toEqual(['a', ' '])
  })

  it('keeps an optional group that did not participate as undefined', () => {
    const pattern = buildPattern('(a)?b', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'b')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matches[0]?.groups).toEqual([undefined])
  })

  it('stops collecting at the match limit and reports truncation', () => {
    const pattern = buildPattern('a', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'a'.repeat(1500))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(MAX_MATCH_LIMIT)
    expect(result.truncated).toBe(true)
  })

  it('does not report truncation when the count lands exactly on the limit', () => {
    const pattern = buildPattern('a', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'a'.repeat(MAX_MATCH_LIMIT))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(MAX_MATCH_LIMIT)
    expect(result.truncated).toBe(false)
  })

  it('rejects empty test text', () => {
    const pattern = buildPattern('a', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, '')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('empty-text')
  })

  it('rejects test text over the length limit', () => {
    const pattern = buildPattern('a', 'g')
    expect(pattern.ok).toBe(true)
    if (!pattern.ok) return

    const result = findMatches(pattern.regex, 'x'.repeat(MAX_TEST_TEXT_CHARS + 1))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('too-large-text')
  })
})

describe('matchesToLines', () => {
  it('joins matched text with newlines for easy copying', () => {
    expect(
      matchesToLines([
        { text: 'foo' },
        { text: 'bar baz' },
        { text: '' },
      ]),
    ).toBe('foo\nbar baz\n')
  })
})