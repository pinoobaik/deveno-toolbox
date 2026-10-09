import { describe, expect, it } from 'vitest'

import { decodeBase64, encodeBase64 } from './logic'
import { MAX_BASE64_INPUT_CHARS, type Base64ErrorKind, type Base64Result } from './types'

function failureKind(result: Base64Result): Base64ErrorKind | null {
  return result.ok ? null : result.kind
}

describe('encodeBase64', () => {
  it('reports an empty input instead of returning an empty string', () => {
    expect(encodeBase64('')).toEqual({ ok: false, kind: 'empty', message: expect.any(String) })
  })

  it('encodes plain ASCII', () => {
    expect(encodeBase64('Hello, World!')).toEqual({ ok: true, text: 'SGVsbG8sIFdvcmxkIQ==' })
    expect(encodeBase64('Hello')).toEqual({ ok: true, text: 'SGVsbG8=' })
  })

  it('encodes line breaks and tabs without dropping them', () => {
    expect(encodeBase64('line1\nline2\ttab')).toEqual({ ok: true, text: 'bGluZTEKbGluZTIJdGFi' })
  })

  it('encodes Unicode as UTF-8 bytes rather than code units', () => {
    expect(encodeBase64('✓')).toEqual({ ok: true, text: '4pyT' })
    expect(encodeBase64('Føy→')).toEqual({ ok: true, text: 'RsO4eeKGkg==' })
    expect(encodeBase64('😀')).toEqual({ ok: true, text: '8J+YgA==' })
  })

  it('replaces an unpaired surrogate with the replacement character instead of throwing', () => {
    const result = encodeBase64('\ud800')

    expect(result.ok).toBe(true)
    expect(result.ok && decodeBase64(result.text)).toEqual({
      ok: true,
      text: '\ufffd',
    })
  })

  it('rejects input past the documented character limit', () => {
    const result = encodeBase64('a'.repeat(MAX_BASE64_INPUT_CHARS + 1))

    expect(failureKind(result)).toBe('too-large')
  })

  it('stays under the limit at exactly the documented size', () => {
    expect(encodeBase64('a'.repeat(MAX_BASE64_INPUT_CHARS)).ok).toBe(true)
  })
})

describe('decodeBase64', () => {
  it('reports an empty input', () => {
    expect(failureKind(decodeBase64(''))).toBe('empty')
  })

  it('reports whitespace only input as empty rather than invalid', () => {
    expect(failureKind(decodeBase64('   \n\t '))).toBe('empty')
  })

  it('decodes standard Base64 back to text', () => {
    expect(decodeBase64('SGVsbG8sIFdvcmxkIQ==')).toEqual({ ok: true, text: 'Hello, World!' })
    expect(decodeBase64('4pyT')).toEqual({ ok: true, text: '✓' })
  })

  it('ignores whitespace the way every Base64 decoder must', () => {
    expect(decodeBase64('SGVsbG8s\nIFdvcmxkIQ==')).toEqual({ ok: true, text: 'Hello, World!' })
    expect(decodeBase64('SGVs bG8s IFd vcmxkIQ==')).toEqual({ ok: true, text: 'Hello, World!' })
  })

  it('accepts unpadded input', () => {
    expect(decodeBase64('SGVsbG8')).toEqual({ ok: true, text: 'Hello' })
  })

  it('keeps control characters that are valid UTF-8', () => {
    expect(decodeBase64('AA==')).toEqual({ ok: true, text: '\u0000' })
  })

  it.each(['!!!!', '-A==', '_A==', 'SGVsbG8sIFdvcmxkIQ!'])(
    'rejects %o as invalid Base64 with a fixed message',
    (raw) => {
      const result = decodeBase64(raw)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.message).toBe(
        'This is not standard Base64 text. Only letters, digits, +, / and trailing = padding are accepted.',
      )
    },
  )

  it.each(['A', 'ABCDE'])('rejects %o because a lone character cannot form a group', (raw) => {
    const result = decodeBase64(raw)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toBe(
      'This text is one character too short to be complete Base64. Check for a missing character.',
    )
  })

  it.each(['AB=', 'A=', 'A===', 'ABCD='])(
    'rejects %o because the padding does not line up',
    (raw) => {
      const result = decodeBase64(raw)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.message).toBe(
        'The = padding does not line up with the end of the text.',
      )
    },
  )

  it('refuses to show bytes that are not UTF-8 text', () => {
    const result = decodeBase64('//8=')

    expect(result.ok).toBe(false)
    expect(failureKind(result)).toBe('not-text')
    expect(!result.ok && result.message).toContain('not valid UTF-8 text')
  })

  it('rejects input past the documented character limit', () => {
    expect(failureKind(decodeBase64('a'.repeat(MAX_BASE64_INPUT_CHARS + 1)))).toBe('too-large')
  })
})

describe('Base64 round trip', () => {
  it.each(['a', 'Hello, World!', 'Føy→ 😀', 'line1\nline2', '  padded  ', '\u0000\u0001'])(
    'restores %o through encode then decode',
    (text) => {
      const encoded = encodeBase64(text)

      expect(encoded.ok).toBe(true)
      expect(encoded.ok && decodeBase64(encoded.text)).toEqual({ ok: true, text })
    },
  )
})
