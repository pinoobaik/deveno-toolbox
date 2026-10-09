import { describe, expect, it } from 'vitest'

import { transformCase } from './logic'
import { MAX_TEXT_CASE_INPUT_CHARS, type CaseMode, type CaseResult } from './types'

const failureKind = (result: CaseResult) => (result.ok ? null : result.kind)

interface CaseExample {
  readonly mode: CaseMode
  readonly input: string
  readonly expected: string
}

describe('transformCase', () => {
  it('reports an empty input', () => {
    expect(failureKind(transformCase('', 'lower'))).toBe('empty')
    expect(failureKind(transformCase('', 'title'))).toBe('empty')
  })

  it('rejects input past the documented character limit', () => {
    const result = transformCase('a'.repeat(MAX_TEXT_CASE_INPUT_CHARS + 1), 'upper')

    expect(failureKind(result)).toBe('too-large')
  })

  it('lowercases without touching anything else', () => {
    expect(transformCase('MiXeD', 'lower')).toEqual({ ok: true, text: 'mixed' })
    expect(transformCase('  Already Lower  ', 'lower')).toEqual({
      ok: true,
      text: '  already lower  ',
    })
  })

  it('uppercases without touching anything else', () => {
    expect(transformCase('mixed', 'upper')).toEqual({ ok: true, text: 'MIXED' })
    expect(transformCase('  already upper  ', 'upper')).toEqual({
      ok: true,
      text: '  ALREADY UPPER  ',
    })
  })

  it('expands characters that grow when uppercased', () => {
    expect(transformCase('straße', 'upper')).toEqual({ ok: true, text: 'STRASSE' })
  })

  const titleExamples: readonly CaseExample[] = [
    { mode: 'title', input: "don't stay", expected: "Don't Stay" },
    { mode: 'title', input: 'foo-bar', expected: 'Foo-bar' },
    { mode: 'title', input: '123 abc', expected: '123 Abc' },
    { mode: 'title', input: 'HELLO WORLD', expected: 'Hello World' },
    { mode: 'title', input: 'the QUICK brown Fox', expected: 'The Quick Brown Fox' },
    { mode: 'title', input: 'a  b', expected: 'A  B' },
    { mode: 'title', input: '  leading and trailing  ', expected: '  Leading And Trailing  ' },
    { mode: 'title', input: 'snake_case_thing', expected: 'Snake_case_thing' },
    { mode: 'title', input: 'e-mail addresses: a@b.c', expected: 'E-mail Addresses: A@b.c' },
    { mode: 'title', input: 'tab\there', expected: 'Tab\tHere' },
    { mode: 'title', input: 'line one\nline two', expected: 'Line One\nLine Two' },
  ]

  const sentenceExamples: readonly CaseExample[] = [
    { mode: 'sentence', input: 'hello. world', expected: 'Hello. World' },
    { mode: 'sentence', input: 'e.g. this', expected: 'E.g. This' },
    { mode: 'sentence', input: '1. first', expected: '1. First' },
    { mode: 'sentence', input: 'a.b.c', expected: 'A.b.c' },
    { mode: 'sentence', input: "what's up? i think. really!", expected: "What's up? I think. Really!" },
    { mode: 'sentence', input: 'hi! there', expected: 'Hi! There' },
    { mode: 'sentence', input: 'line one.\nline two', expected: 'Line one.\nLine two' },
    { mode: 'sentence', input: 'ALL CAPS SENTENCE. more text', expected: 'All caps sentence. More text' },
    { mode: 'sentence', input: 'no terminator here', expected: 'No terminator here' },
    { mode: 'sentence', input: 'ends with?', expected: 'Ends with?' },
    { mode: 'sentence', input: '  leading space', expected: '  Leading space' },
  ]

  it.each([...titleExamples, ...sentenceExamples])(
    '$mode turns $input into $expected',
    ({ mode, input, expected }) => {
      expect(transformCase(input, mode)).toEqual({ ok: true, text: expected })
    },
  )

  it('keeps whitespace and punctuation exactly where they were', () => {
    const input = '  one, two; three!  '
    const result = transformCase(input, 'title')

    expect(result.ok).toBe(true)
    expect(result.ok && result.text.replace(/\p{L}+/gu, '')).toBe(
      input.replace(/\p{L}+/gu, ''),
    )
  })

  it('is idempotent for Title Case', () => {
    for (const example of titleExamples) {
      const once = transformCase(example.input, 'title')
      const twice = once.ok ? transformCase(once.text, 'title') : once

      expect(twice, example.input).toEqual(once)
    }
  })

  it('is idempotent for Sentence Case', () => {
    for (const example of sentenceExamples) {
      const once = transformCase(example.input, 'sentence')
      const twice = once.ok ? transformCase(once.text, 'sentence') : once

      expect(twice, example.input).toEqual(once)
    }
  })

  it('treats every mode as pure, leaving the input untouched', () => {
    const input = 'Some Text 123'

    for (const mode of ['lower', 'upper', 'title', 'sentence'] as const) {
      expect(transformCase(input, mode).ok).toBe(true)
    }

    expect(input).toBe('Some Text 123')
  })
})
