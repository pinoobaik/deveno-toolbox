import {
  CHARACTER_GROUPS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type CharacterGroupId,
  type PasswordErrorKind,
  type PasswordOptions,
  type PasswordResult,
} from './types'

/**
 * Injectable randomness. The component supplies this from the platform's
 * cryptographic source; tests supply a deterministic one. The provider is
 * allowed to throw {@link RandomnessUnavailableError} to surface an
 * environment without secure random numbers.
 */
export interface RandomByteSource {
  (count: number): Uint8Array
}

export class RandomnessUnavailableError extends Error {}

class MalformedRandomBytesError extends Error {}

const DRAW_CHUNK_SIZE = 64
const MAX_GENERATION_ATTEMPTS = 100

const FAILURES: Readonly<Record<PasswordErrorKind, string>> = {
  'no-groups': 'Select at least one character group.',
  'length-out-of-range': `Length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}.`,
  'length-too-small': 'Length must be at least the number of selected groups.',
  unavailable:
    'Cryptographic randomness is not available in this browser, so no password was generated.',
  failed: 'Generation failed; try again.',
}

function draw(
  randomBytes: RandomByteSource,
  alphabet: string,
  alphabetLength: number,
  rejectionCeiling: number,
  length: number,
): string {
  let buffer: Uint8Array | null = null
  let position = 0

  const byte = (): number => {
    if (buffer === null || position >= buffer.length) {
      buffer = randomBytes(DRAW_CHUNK_SIZE)
      if (buffer === null || buffer.length === 0) {
        throw new MalformedRandomBytesError()
      }
      position = 0
    }
    const value = buffer[position]
    position += 1
    if (value === undefined) {
      throw new MalformedRandomBytesError()
    }
    return value
  }

  const pick = (): string => {
    let value = byte()
    while (value >= rejectionCeiling) {
      value = byte()
    }
    const char = alphabet[value % alphabetLength]
    if (char === undefined) {
      throw new MalformedRandomBytesError()
    }
    return char
  }

  let out = ''
  for (let index = 0; index < length; index += 1) {
    out += pick()
  }
  return out
}

function hasCoverage(groups: readonly CharacterGroupId[], password: string): boolean {
  return groups.every((group) => {
    const groupChars = CHARACTER_GROUPS[group]
    for (let index = 0; index < groupChars.length; index += 1) {
      const char = groupChars[index]
      if (char !== undefined && password.includes(char)) {
        return true
      }
    }
    return false
  })
}

/**
 * Generates a password of the requested length using every selected character
 * group. Each byte from {@link randomBytes} is reduced to an alphabet index
 * through rejection sampling (no modulo bias), and a whole candidate is
 * rejected whenever any selected group is missing until one passes, so the
 * one-of-each guarantee holds without skewing position selection.
 */
export function generatePassword(
  options: PasswordOptions,
  randomBytes: RandomByteSource,
): PasswordResult {
  if (options.groups.length === 0) {
    return { ok: false, kind: 'no-groups', message: FAILURES['no-groups'] }
  }
  const { length } = options
  if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    return { ok: false, kind: 'length-out-of-range', message: FAILURES['length-out-of-range'] }
  }
  if (length < options.groups.length) {
    return { ok: false, kind: 'length-too-small', message: FAILURES['length-too-small'] }
  }

  const alphabet = options.groups.map((group) => CHARACTER_GROUPS[group]).join('')
  const alphabetLength = alphabet.length
  const rejectionCeiling = Math.floor(256 / alphabetLength) * alphabetLength

  try {
    let attempts = 0
    while (attempts < MAX_GENERATION_ATTEMPTS) {
      const candidate = draw(randomBytes, alphabet, alphabetLength, rejectionCeiling, length)
      if (hasCoverage(options.groups, candidate)) {
        return { ok: true, password: candidate }
      }
      attempts += 1
    }
  } catch (error) {
    if (error instanceof RandomnessUnavailableError) {
      return { ok: false, kind: 'unavailable', message: FAILURES.unavailable }
    }
    return { ok: false, kind: 'failed', message: FAILURES.failed }
  }
  return { ok: false, kind: 'failed', message: FAILURES.failed }
}