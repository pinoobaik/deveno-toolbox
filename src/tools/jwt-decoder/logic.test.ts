import { describe, expect, it } from 'vitest'

import { decodeJwt } from './logic'
import { MAX_JWT_TOKEN_CHARS, type JwtResult } from './types'

const HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
const PAYLOAD = 'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ'
const SIGNATURE = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const CLASSIC = `${HEADER}.${PAYLOAD}.${SIGNATURE}`

const PRETTY_HEADER = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}'
const PRETTY_PAYLOAD =
  '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}'

const failureKind = (result: JwtResult) => (result.ok ? null : result.kind)

describe('decodeJwt', () => {
  it('reports an empty token', () => {
    expect(failureKind(decodeJwt(''))).toBe('empty')
    expect(failureKind(decodeJwt('   \n\t '))).toBe('empty')
  })

  it('rejects a token past the documented character limit', () => {
    expect(failureKind(decodeJwt('a'.repeat(MAX_JWT_TOKEN_CHARS + 1)))).toBe('too-large')
  })

  it('decodes the header and payload as pretty printed JSON', () => {
    const result = decodeJwt(CLASSIC)

    expect(result.ok).toBe(true)
    expect(result.ok && result.header).toBe(PRETTY_HEADER)
    expect(result.ok && result.payload).toBe(PRETTY_PAYLOAD)
  })

  it('returns the signature segment exactly as received', () => {
    const result = decodeJwt(CLASSIC)

    expect(result.ok && result.signature).toBe(SIGNATURE)
  })

  it('ignores whitespace around a pasted token', () => {
    const result = decodeJwt(`\n  ${CLASSIC}\t\n`)

    expect(result.ok).toBe(true)
    expect(result.ok && result.header).toBe(PRETTY_HEADER)
  })

  it.each(['a', 'a.b', 'a.b.c.d', '....'])(
    'rejects %o as structurally not a three segment token',
    (token) => {
      const result = decodeJwt(token)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.kind).toBe('structure')
      expect(!result.ok && result.message).toBe(
        'A JWT has exactly three dot-separated segments: header, payload, signature.',
      )
    },
  )

  it.each(['a!b.c.d', 'a+b.c.d', 'a/b.c.d', 'a b.c.d'])(
    'rejects %o because the header is not base64url',
    (token) => {
      const result = decodeJwt(token)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.kind).toBe('header-base64')
      expect(!result.ok && result.message).toBe(
        'The first segment (header) could not be decoded from base64url to text.',
      )
    },
  )

  it.each([
    ['bm90IGpzb24gYXQgYWxs', 'plain text'],
    ['WzEsMl0', 'an array'],
    ['ImhpIg', 'a string'],
    ['bnVsbA', 'null'],
    ['NDI', 'a number'],
  ])('rejects a header that is %s', (header, description) => {
    const result = decodeJwt(`${header}.${PAYLOAD}.${SIGNATURE}`)

    expect(result.ok, description).toBe(false)
    expect(!result.ok && result.kind, description).toBe('header-json')
    expect(!result.ok && result.message, description).toBe(
      'The first segment (header) is not a JSON object.',
    )
  })

  it.each([
    ['bm90IGpzb24gYXQgYWxs', 'plain text'],
    ['WzEsMl0', 'an array'],
    ['bnVsbA', 'null'],
    ['NDI', 'a number'],
  ])('rejects a payload that is %s', (payload, description) => {
    const result = decodeJwt(`${HEADER}.${payload}.${SIGNATURE}`)

    expect(result.ok, description).toBe(false)
    expect(!result.ok && result.kind, description).toBe('payload-json')
    expect(!result.ok && result.message, description).toBe(
      'The second segment (payload) is not a JSON object.',
    )
  })

  it('reports an empty payload segment', () => {
    const result = decodeJwt(`${HEADER}..${SIGNATURE}`)

    expect(failureKind(result)).toBe('payload-base64')
    expect(!result.ok && result.message).toBe(
      'The second segment (payload) could not be decoded from base64url to text.',
    )
  })

  it('reports an empty header segment', () => {
    const result = decodeJwt(`.${PAYLOAD}.${SIGNATURE}`)

    expect(failureKind(result)).toBe('header-base64')
  })

  it('refuses bytes that are not UTF-8 text', () => {
    const result = decodeJwt(`${HEADER}.__8.${SIGNATURE}`)

    expect(failureKind(result)).toBe('payload-base64')
  })

  it('accepts both base64url alphabets when they appear in a payload', () => {
    const underscore = decodeJwt(`${HEADER}.eyJxIjoiPz8_PyJ9.${SIGNATURE}`)
    const hyphen = decodeJwt(`${HEADER}.eyJ0Ijoifn5-In0.${SIGNATURE}`)

    expect(underscore.ok && underscore.payload).toBe('{\n  "q": "????"\n}')
    expect(hyphen.ok && hyphen.payload).toBe('{\n  "t": "~~~"\n}')
  })

  it('decodes Unicode claims', () => {
    const result = decodeJwt(`${HEADER}.eyJlbW9qaSI6IvCfmIAifQ.${SIGNATURE}`)

    expect(result.ok && result.payload).toBe('{\n  "emoji": "\u{1F600}"\n}')
  })

  it('keeps nested objects intact', () => {
    const result = decodeJwt(
      `${HEADER}.eyJhcnIiOlsxLDIsM10sIm5lc3RlZCI6eyJkZWVwIjp0cnVlfX0.${SIGNATURE}`,
    )

    expect(result.ok && result.payload).toBe(
      '{\n  "arr": [\n    1,\n    2,\n    3\n  ],\n  "nested": {\n    "deep": true\n  }\n}',
    )
  })

  it('accepts a token with an empty signature segment', () => {
    const result = decodeJwt(`${HEADER}.${PAYLOAD}.`)

    expect(result.ok).toBe(true)
    expect(result.ok && result.signature).toBe('')
  })

  it('decodes a token whose signature is garbage, because it never looks at it', () => {
    const forged = decodeJwt(`${HEADER}.${PAYLOAD}.not-a-real-signature`)

    expect(forged.ok).toBe(true)
    expect(forged.ok && forged.signature).toBe('not-a-real-signature')

    const nonsense = decodeJwt(`${HEADER}.${PAYLOAD}.!!!`)

    expect(nonsense.ok).toBe(true)
    expect(nonsense.ok && nonsense.signature).toBe('!!!')
  })

  it('never echoes any part of the token back in a failure message', () => {
    const secret = 'super-secret-claim'
    const failures: JwtResult[] = [
      decodeJwt('a!b.c.d'),
      decodeJwt(`${HEADER}.WzEsMl0.${secret}`),
      decodeJwt(`${HEADER}.${secret}.${secret}`),
      decodeJwt(secret),
      decodeJwt(''),
    ]

    for (const result of failures) {
      expect(result.ok).toBe(false)
      expect(!result.ok && result.message.includes(secret)).toBe(false)
    }
  })
})
