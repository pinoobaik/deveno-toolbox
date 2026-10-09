import { describe, expect, it } from 'vitest'

import { convertEntities } from './logic'
import { MAX_HTML_CHARS } from './types'

describe('convertEntities (encode)', () => {
  it('encodes all five essential characters', () => {
    const result = convertEntities(`&<>"'`, 'encode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('&amp;&lt;&gt;&quot;&apos;')
    expect(result.replacements).toBe(5)
  })

  it('leaves plain text alone', () => {
    const result = convertEntities('Hello, world!', 'encode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('Hello, world!')
    expect(result.replacements).toBe(0)
  })

  it('encodes only the special characters in mixed text', () => {
    const result = convertEntities('a < b > c & "quoted" \'single\'', 'encode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('a &lt; b &gt; c &amp; &quot;quoted&quot; &apos;single&apos;')
    expect(result.replacements).toBe(7)
  })

  it('never splits an astral character', () => {
    const result = convertEntities('😀 & 🎉', 'encode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('😀 &amp; 🎉')
    expect(result.replacements).toBe(1)
  })

  it('re-encodes already-encoded text rather than unescaping it', () => {
    const result = convertEntities('&amp;', 'encode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('&amp;amp;')
    expect(result.replacements).toBe(1)
  })
})

describe('convertEntities (decode)', () => {
  it('decodes named, decimal, and hex references', () => {
    const result = convertEntities('&lt;tag&gt; &amp; &#65; &#x41;', 'decode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('<tag> & A A')
    expect(result.replacements).toBe(5)
  })

  it('leaves unknown names verbatim', () => {
    const result = convertEntities('&copy; &nbsp; &foo;', 'decode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('&copy; &nbsp; &foo;')
    expect(result.replacements).toBe(0)
  })

  it('leaves unterminated and bare ampersands verbatim', () => {
    const result = convertEntities('AT&T &#65 &amp &#x41', 'decode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('AT&T &#65 &amp &#x41')
    expect(result.replacements).toBe(0)
  })

  it('decodes what it can and leaves the rest', () => {
    const result = convertEntities('AT&T &amp; &#65x', 'decode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('AT&T & &#65x')
  })

  it('maps surrogate code points to U+FFFD', () => {
    const result = convertEntities('&#xD800;', 'decode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('\uFFFD')
    expect(result.replacements).toBe(1)
  })

  it('maps code points beyond U+10FFFF to U+FFFD', () => {
    for (const reference of ['&#x110000;', '&#1114112;']) {
      const result = convertEntities(reference, 'decode')

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.text).toBe('\uFFFD')
      expect(result.replacements).toBe(1)
    }
  })

  it('decodes an astral reference into the real character', () => {
    const result = convertEntities('&#x1F600;', 'decode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('😀')
  })

  it('does not recursively decode its own output', () => {
    const result = convertEntities('&amp;amp;', 'decode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('&amp;')
    expect(result.replacements).toBe(1)
  })

  it('round-trips encoded text back to the original', () => {
    const original = `Mark & slash <tag> "quote" 'apostrophe' > done`

    const encoded = convertEntities(original, 'encode')
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return

    const decoded = convertEntities(encoded.text, 'decode')

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.text).toBe(original)
  })
})

describe('convertEntities (bounds)', () => {
  it('rejects empty input', () => {
    const result = convertEntities('', 'encode')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('empty')
  })

  it.each(['encode', 'decode'] as const)('rejects input over the length limit in %s mode', (mode) => {
    const result = convertEntities('a'.repeat(MAX_HTML_CHARS + 1), mode)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('too-large')
  })

  it('accepts input exactly at the length limit', () => {
    const result = convertEntities('a'.repeat(MAX_HTML_CHARS), 'encode')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('a'.repeat(MAX_HTML_CHARS))
  })
})