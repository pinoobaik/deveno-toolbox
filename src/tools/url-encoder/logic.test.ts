import { describe, expect, it } from 'vitest'

import { transformUrl } from './logic'
import { MAX_URL_INPUT_CHARS, type UrlResult } from './types'

const failureKind = (result: UrlResult) => (result.ok ? null : result.kind)

const run = (input: string, mode: 'encode' | 'decode', scope: 'component' | 'full') =>
  transformUrl(input, mode, scope)

describe('transformUrl', () => {
  it('reports an empty input', () => {
    expect(failureKind(run('', 'encode', 'component'))).toBe('empty')
    expect(failureKind(run('', 'decode', 'full'))).toBe('empty')
  })

  it('rejects input past the documented character limit', () => {
    expect(failureKind(run('a'.repeat(MAX_URL_INPUT_CHARS + 1), 'encode', 'component'))).toBe(
      'too-large',
    )
  })

  it('encodes one component so separators become literal text', () => {
    expect(run('Hello World!', 'encode', 'component')).toEqual({
      ok: true,
      text: 'Hello%20World!',
    })
    expect(run('a&b=c', 'encode', 'component')).toEqual({ ok: true, text: 'a%26b%3Dc' })
    expect(run('a?b', 'encode', 'component')).toEqual({ ok: true, text: 'a%3Fb' })
  })

  it('encodes a whole URI while keeping its separators', () => {
    expect(run('https://example.com/a b', 'encode', 'full')).toEqual({
      ok: true,
      text: 'https://example.com/a%20b',
    })
    expect(run('a&b=c?x=1#frag', 'encode', 'full')).toEqual({
      ok: true,
      text: 'a&b=c?x=1#frag',
    })
  })

  it('encodes Unicode as UTF-8 percent escapes', () => {
    expect(run('Føy→ 😀', 'encode', 'component')).toEqual({
      ok: true,
      text: 'F%C3%B8y%E2%86%92%20%F0%9F%98%80',
    })
  })

  it('decodes a component back to text', () => {
    expect(run('Hello%20World!', 'decode', 'component')).toEqual({
      ok: true,
      text: 'Hello World!',
    })
    expect(run('a%2Bb', 'decode', 'component')).toEqual({ ok: true, text: 'a+b' })
    expect(run('%41%42', 'decode', 'component')).toEqual({ ok: true, text: 'AB' })
  })

  it('decodes a whole URI back to text', () => {
    expect(run('https://example.com/a%20b', 'decode', 'full')).toEqual({
      ok: true,
      text: 'https://example.com/a b',
    })
  })

  it('leaves reserved escapes alone when decoding a whole URI', () => {
    expect(run('https%3A%2F%2Fexample.com%2Fa%20b', 'decode', 'full')).toEqual({
      ok: true,
      text: 'https%3A%2F%2Fexample.com%2Fa b',
    })
    expect(run('https%3A%2F%2Fexample.com%2Fa%20b', 'decode', 'component')).toEqual({
      ok: true,
      text: 'https://example.com/a b',
    })
  })

  it('leaves reserved characters escaped when decoding a whole URI', () => {
    expect(run('a%3Fb', 'decode', 'component')).toEqual({ ok: true, text: 'a?b' })
    expect(run('a%3Fb', 'decode', 'full')).toEqual({ ok: true, text: 'a%3Fb' })
  })

  it('returns text without escapes unchanged', () => {
    expect(run('already plain', 'decode', 'component')).toEqual({
      ok: true,
      text: 'already plain',
    })
  })

  it('points at the 1-based position of a malformed escape without echoing it', () => {
    const cases: ReadonlyArray<readonly [string, number]> = [
      ['%', 1],
      ['%zz', 1],
      ['abc%GG', 4],
      ['100%', 4],
    ]

    for (const [input, position] of cases) {
      const result = run(input, 'decode', 'component')

      expect(result.ok, input).toBe(false)
      expect(!result.ok && result.message, input).toBe(
        `The % at position ${position} is not followed by two hexadecimal digits.`,
      )
    }
  })

  it('falls back to a fixed message when there is no bad escape to point at', () => {
    const result = run('%ED%A0%80', 'decode', 'component')

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toBe(
      'The text could not be decoded: the percent escapes are malformed, or the bytes they stand for are not valid UTF-8.',
    )
  })

  it('reports a lone surrogate when encoding instead of throwing', () => {
    const result = run('\ud800', 'encode', 'component')

    expect(result.ok).toBe(false)
    expect(failureKind(result)).toBe('malformed')
    expect(!result.ok && result.message).toBe(
      'This text contains a lone surrogate character, which cannot be written as a URI.',
    )
  })

  it('never includes the input in a failure message', () => {
    const secret = 'top-secret-query-value'
    const failures: UrlResult[] = [
      run(`${secret}%zz`, 'decode', 'component'),
      run('\ud800', 'encode', 'full'),
      run('', 'encode', 'full'),
      run('a'.repeat(MAX_URL_INPUT_CHARS + 1), 'encode', 'full'),
    ]

    for (const result of failures) {
      expect(result.ok).toBe(false)
      expect(!result.ok && result.message.includes(secret)).toBe(false)
    }
  })

  it('round trips text through encode then decode', () => {
    const samples = ['Hello, World!', 'a/b?c=d&e', 'Føy→ 😀', 'already%20encoded']

    for (const sample of samples) {
      const encoded = run(sample, 'encode', 'component')

      expect(encoded.ok, sample).toBe(true)
      expect(encoded.ok && run(encoded.text, 'decode', 'component')).toEqual({
        ok: true,
        text: sample,
      })
    }
  })
})
