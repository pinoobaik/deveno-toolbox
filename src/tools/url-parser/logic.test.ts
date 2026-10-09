import { describe, expect, it } from 'vitest'

import { parseUrl } from './logic'
import { MAX_URL_CHARS } from './types'

describe('parseUrl', () => {
  it('parses an absolute https URL into every component', () => {
    const result = parseUrl('https://user:pw@example.com:8080/a/b?q=1&x=2#frag', '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.protocol).toBe('https:')
    expect(result.url.hostname).toBe('example.com')
    expect(result.url.port).toBe('8080')
    expect(result.url.pathname).toBe('/a/b')
    expect(result.url.search).toBe('?q=1&x=2')
    expect(result.url.hash).toBe('#frag')
    expect(result.url.username).toBe('user')
    expect(result.url.password).toBe('pw')
    expect(result.url.origin).toBe('https://example.com:8080')
    expect(result.url.href).toBe('https://user:pw@example.com:8080/a/b?q=1&x=2#frag')
    expect(result.url.isRelative).toBe(false)
    expect(result.url.hasAuthority).toBe(true)
  })

  it('reports an empty port for a URL using the scheme default', () => {
    const result = parseUrl('https://example.com', '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.port).toBe('')
    expect(result.url.origin).toBe('https://example.com')
  })

  it('keeps IPv6 brackets and the explicit port', () => {
    const result = parseUrl('http://[::1]:3000/x', '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.hostname).toBe('[::1]')
    expect(result.url.port).toBe('3000')
  })

  it('preserves percent-encoded path and query text', () => {
    const result = parseUrl('https://example.com/a%20b?q=c%2Bd', '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.pathname).toBe('/a%20b')
    expect(result.url.search).toBe('?q=c%2Bd')
  })

  it('masks nothing in href but keeps credentials separate and labeled', () => {
    const result = parseUrl('https://u:secret@example.com/', '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.username).toBe('u')
    expect(result.url.password).toBe('secret')
  })

  it('trims surrounding whitespace before parsing', () => {
    const result = parseUrl('  https://example.com/a  ', '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.href).toBe('https://example.com/a')
  })

  it('resolves a relative path only when a base is provided', () => {
    const result = parseUrl('foo', 'https://example.com/dir/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.href).toBe('https://example.com/dir/foo')
    expect(result.url.isRelative).toBe(true)
  })

  it('resolves a query-only relative address against a base', () => {
    const result = parseUrl('?a=1', 'https://example.com/path')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.href).toBe('https://example.com/path?a=1')
    expect(result.url.search).toBe('?a=1')
    expect(result.url.isRelative).toBe(true)
  })

  it('resolves a protocol-relative address against the base scheme', () => {
    const result = parseUrl('//cdn.example.net/x', 'https://a.example')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.href).toBe('https://cdn.example.net/x')
    expect(result.url.protocol).toBe('https:')
    expect(result.url.isRelative).toBe(true)
  })

  it('asks for a base rather than inventing one for relative input', () => {
    const result = parseUrl('foo', '')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('missing-base')
      expect(result.message).toBe('This looks like a relative address. Provide a base URL to resolve it.')
    }
  })

  it('labels a broken absolute URL as malformed even without a base', () => {
    const result = parseUrl('http://[::1', '')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('malformed')
      expect(result.message).toBe('The URL cannot be parsed, even against the provided base.')
    }
  })

  it('reports malformed input that also fails against a base', () => {
    const result = parseUrl('http://[::1', 'https://example.com')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('malformed')
  })

  it('reports an invalid base as malformed', () => {
    const result = parseUrl('foo', 'not a url')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('malformed')
  })

  it('rejects an empty input', () => {
    const result = parseUrl('', '')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('empty')
  })

  it('rejects whitespace-only input', () => {
    const result = parseUrl('   ', '')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('empty')
  })

  it('rejects input over the length limit', () => {
    const result = parseUrl(`https://example.com/${'x'.repeat(MAX_URL_CHARS)}`, '')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('too-large')
  })

  it('accepts an opaque scheme URL and reports no authority', () => {
    const result = parseUrl('mailto:someone@example.com', '')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.url.protocol).toBe('mailto:')
    expect(result.url.hasAuthority).toBe(false)
    expect(result.url.origin).toBe('null')
    expect(result.url.pathname).toBe('someone@example.com')
  })
})