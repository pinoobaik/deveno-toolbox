import { describe, expect, it } from 'vitest'

import {
  generatePassword,
  RandomnessUnavailableError,
  type RandomByteSource,
} from './logic'
import {
  CHARACTER_GROUP_ORDER,
  CHARACTER_GROUPS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type CharacterGroupId,
} from './types'

function lcg(seed: number): RandomByteSource {
  let state = seed >>> 0
  return (count: number) => {
    const out = new Uint8Array(count)
    for (let index = 0; index < count; index += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      out[index] = (state >>> 24) & 0xff
    }
    return out
  }
}

function unionAlphabet(groups: readonly CharacterGroupId[]): string {
  return groups.map((group) => CHARACTER_GROUPS[group]).join('')
}

function assertSatisfies(
  options: { length: number; groups: readonly CharacterGroupId[] },
  seed: number,
) {
  const result = generatePassword(options, lcg(seed))
  expect(result.ok, `seed ${seed} should generate a password`).toBe(true)
  if (!result.ok) return
  expect(result.password.length).toBe(options.length)

  const alphabet = unionAlphabet(options.groups)
  for (const char of result.password) {
    expect(alphabet.includes(char), `char ${char} must come from the selected groups`).toBe(true)
  }

  for (const group of options.groups) {
    const groupChars = CHARACTER_GROUPS[group]
    const present = [...result.password].some((char) => groupChars.includes(char))
    expect(present, `group ${group} must be represented`).toBe(true)
  }
}

describe('generatePassword (validation)', () => {
  it('rejects an empty group selection', () => {
    const result = generatePassword({ length: 16, groups: [] }, lcg(1))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('no-groups')
      expect(result.message).toBe('Select at least one character group.')
    }
  })

  it.each([
    MIN_PASSWORD_LENGTH - 1,
    MAX_PASSWORD_LENGTH + 1,
    12.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects out-of-range length %s', (length) => {
    const result = generatePassword({ length, groups: ['lowercase'] }, lcg(1))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('length-out-of-range')
      expect(result.message).toBe(
        `Length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}.`,
      )
    }
  })
})

describe('generatePassword (guarantees)', () => {
  it('produces passwords at the requested length from only the selected groups', () => {
    assertSatisfies({ length: 16, groups: [...CHARACTER_GROUP_ORDER] }, 7)
  })

  it('guarantees one character from every selected group', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      assertSatisfies({ length: 8, groups: [...CHARACTER_GROUP_ORDER] }, seed)
    }
  })

  it('keeps coverage for short lengths in any subset of groups', () => {
    const subsets: CharacterGroupId[][] = [
      ['lowercase'],
      ['digits'],
      ['lowercase', 'uppercase'],
      ['uppercase', 'digits', 'symbols'],
      ['lowercase', 'symbols'],
    ]
    for (const groups of subsets) {
      assertSatisfies({ length: 8, groups }, 21)
    }
  })

  it('draws a single-group password from that group alone', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      assertSatisfies({ length: 16, groups: ['digits'] }, seed)
    }
  })

  it('handles the maximum length', () => {
    const result = generatePassword({ length: MAX_PASSWORD_LENGTH, groups: ['lowercase', 'digits'] }, lcg(9))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.password.length).toBe(MAX_PASSWORD_LENGTH)
  })

  it('distributes characters near-uniformly across the union alphabet', () => {
    const groups = [...CHARACTER_GROUP_ORDER]
    const alphabet = unionAlphabet(groups)
    const counts = new Map<string, number>()

    for (let seed = 0; seed < 1000; seed += 1) {
      const result = generatePassword({ length: MAX_PASSWORD_LENGTH, groups }, lcg(seed))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      for (const char of result.password) {
        counts.set(char, (counts.get(char) ?? 0) + 1)
      }
    }

    const total = 1000 * MAX_PASSWORD_LENGTH
    for (const char of alphabet) {
      const observed = (counts.get(char) ?? 0) / total
      expect(observed).toBeGreaterThan(0.94 / alphabet.length)
      expect(observed).toBeLessThan(1.06 / alphabet.length)
    }
  })
})

describe('generatePassword (failure paths)', () => {
  it('fails clearly when randomness is unavailable', () => {
    const provider: RandomByteSource = () => {
      throw new RandomnessUnavailableError()
    }
    const result = generatePassword({ length: 16, groups: ['lowercase'] }, provider)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('unavailable')
      expect(result.message).toBe(
        'Cryptographic randomness is not available in this browser, so no password was generated.',
      )
    }
  })

  it('fails when the provider yields no bytes', () => {
    const provider: RandomByteSource = () => new Uint8Array(0)
    const result = generatePassword({ length: 16, groups: ['lowercase'] }, provider)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('failed')
      expect(result.message).toBe('Generation failed; try again.')
    }
  })

  it('fails when the provider throws unexpectedly', () => {
    const provider: RandomByteSource = () => {
      throw new Error('boom')
    }
    const result = generatePassword({ length: 16, groups: ['lowercase'] }, provider)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('failed')
      expect(result.message).toBe('Generation failed; try again.')
    }
  })

  it('stops after bounded attempts when coverage can never be reached', () => {
    const provider: RandomByteSource = () => new Uint8Array([0, 0, 0, 0])
    const result = generatePassword(
      { length: 8, groups: ['lowercase', 'uppercase'] },
      provider,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('failed')
  })
})