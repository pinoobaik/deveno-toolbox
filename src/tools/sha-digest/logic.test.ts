import { afterEach, describe, expect, it } from 'vitest'

import { computeDigest } from './logic'
import { MAX_SHA_INPUT_CHARS, type ShaResult } from './types'

const failureKind = (result: ShaResult) => (result.ok ? null : result.kind)

/** Restores whatever `globalThis.crypto` was before a test replaced it. */
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto')

function withCrypto(value: unknown, run: () => Promise<void>): Promise<void> {
  Object.defineProperty(globalThis, 'crypto', { value, configurable: true })

  return run().finally(() => {
    if (originalCrypto === undefined) {
      Reflect.deleteProperty(globalThis, 'crypto')
    } else {
      Object.defineProperty(globalThis, 'crypto', originalCrypto)
    }
  })
}

afterEach(() => {
  if (originalCrypto !== undefined) {
    Object.defineProperty(globalThis, 'crypto', originalCrypto)
  }
})

describe('computeDigest', () => {
  it('reports an empty input', async () => {
    expect(failureKind(await computeDigest('SHA-256', ''))).toBe('empty')
  })

  it('rejects input past the documented character limit', async () => {
    const result = await computeDigest('SHA-256', 'a'.repeat(MAX_SHA_INPUT_CHARS + 1))

    expect(failureKind(result)).toBe('too-large')
  })

  it.each([
    ['SHA-1', 'a9993e364706816aba3e25717850c26c9cd0d89d'],
    [
      'SHA-256',
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ],
    [
      'SHA-384',
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    ],
    [
      'SHA-512',
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    ],
  ] as const)('matches the published %s digest of "abc"', async (algorithm, expected) => {
    expect(await computeDigest(algorithm, 'abc')).toEqual({ ok: true, text: expected })
  })

  it('matches the published SHA-256 vector for a longer message', async () => {
    const result = await computeDigest(
      'SHA-256',
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    )

    expect(result).toEqual({
      ok: true,
      text: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    })
  })

  it('hashes Unicode as UTF-8 bytes', async () => {
    expect(await computeDigest('SHA-256', 'F\u00f8\u00ff\u2192')).toEqual({
      ok: true,
      text: '2851f840bdfa705a5966d0b6a9200ef8c8a8bd2d43b87f37eceb7f91442f539c',
    })
    expect(await computeDigest('SHA-1', 'F\u00f8\u00ff\u2192')).toEqual({
      ok: true,
      text: '0affbe63165318e9c56c2f45c7e231e63b121eb8',
    })
  })

  it('always answers with lowercase hexadecimal', async () => {
    const result = await computeDigest('SHA-256', 'Hello, World!')

    expect(result.ok).toBe(true)
    expect(result.ok && result.text).toMatch(/^[0-9a-f]+$/)
    expect(result.ok && result.text.length).toBe(64)
  })

  it('produces a different digest per algorithm', async () => {
    const digests = await Promise.all(
      (['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const).map((algorithm) =>
        computeDigest(algorithm, 'abc'),
      ),
    )

    const hexes = digests.map((result) => (result.ok ? result.text : ''))
    expect(new Set(hexes).size).toBe(4)
    expect(hexes[0]).toHaveLength(40)
    expect(hexes[1]).toHaveLength(64)
    expect(hexes[2]).toHaveLength(96)
    expect(hexes[3]).toHaveLength(128)
  })

  it.each(['MD5', 'sha256', 'SHA-256 ', 'constructor', 'toString', ''])(
    'rejects the unsupported algorithm %o with a fixed message',
    async (algorithm) => {
      const result = await computeDigest(algorithm, 'abc')

      expect(result.ok).toBe(false)
      expect(failureKind(result)).toBe('unsupported')
      expect(!result.ok && result.message).toBe(
        'Only SHA-1, SHA-256, SHA-384, and SHA-512 can be computed here.',
      )
    },
  )

  it('explains a missing Web Crypto API as a secure context problem', async () => {
    await withCrypto(undefined, async () => {
      const result = await computeDigest('SHA-256', 'abc')

      expect(failureKind(result)).toBe('unavailable')
      expect(!result.ok && result.message).toContain('secure context')
    })
  })

  it('turns an unexpected Web Crypto failure into a controlled error', async () => {
    const rejectingCrypto = {
      subtle: {
        digest: () => Promise.reject(new Error('engine says no')),
      },
    }

    await withCrypto(rejectingCrypto, async () => {
      const result = await computeDigest('SHA-256', 'abc')

      expect(result.ok).toBe(false)
      expect(failureKind(result)).toBe('failed')
      expect(!result.ok && result.message.includes('engine says no')).toBe(false)
    })
  })

  it('never lets an engine message reach the caller', async () => {
    const rejectingCrypto = {
      subtle: { digest: () => Promise.reject(new Error('secret-internals')) },
    }

    await withCrypto(rejectingCrypto, async () => {
      const result = await computeDigest('SHA-256', 'some payload')

      expect(!result.ok && result.message.includes('secret-internals')).toBe(false)
      expect(!result.ok && result.message.includes('some payload')).toBe(false)
    })
  })
})
