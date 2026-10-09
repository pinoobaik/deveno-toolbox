import {
  BASE_PREFIX,
  MAX_NUMBER_INPUT_CHARS,
  type NumberBase,
  type NumberErrorKind,
  type NumberFailure,
  type NumberResult,
} from './types'

const EMPTY_MESSAGE = 'Nothing to convert. Enter a number first.'

const TOO_LARGE_MESSAGE = `Input is larger than the ${MAX_NUMBER_INPUT_CHARS.toLocaleString('en-US')} character limit.`

const NO_DIGITS_MESSAGE = 'Enter digits, not just a sign or a prefix.'

function failure(kind: NumberErrorKind, message: string): NumberFailure {
  return { ok: false, kind, message }
}

/**
 * Maps one character to its numeric value, or `-1` when it is not a hex digit
 * at all. Read from char codes rather than parsed, so nothing coerces an
 * unexpected character into a number.
 */
function digitValue(character: string): number {
  const code = character.charCodeAt(0)

  if (code >= 48 && code <= 57) return code - 48 // 0-9
  if (code >= 97 && code <= 102) return code - 87 // a-f
  if (code >= 65 && code <= 70) return code - 55 // A-F

  return -1
}

/** Drops `0b`, `0o`, or `0x` when it matches the selected input base. */
function stripPrefix(text: string, base: NumberBase): string {
  const prefix = BASE_PREFIX[base]
  if (prefix.length === 0 || text.length < 2) return text

  return text.slice(0, 2).toLowerCase() === prefix ? text.slice(2) : text
}

/** Renders a big integer with an explicit sign and base prefix. */
function format(value: bigint, to: NumberBase): string {
  const sign = value < 0n ? '-' : ''
  const magnitude = value < 0n ? -value : value
  const prefix = BASE_PREFIX[to]
  const digits = magnitude.toString(to)

  return prefix.length === 0 ? `${sign}${digits}` : `${sign}${prefix}${digits}`
}

/**
 * Converts an integer between binary, octal, decimal, and hexadecimal.
 *
 * Arithmetic runs entirely on `BigInt`: `parseInt` and `Number` both lose
 * precision past 2^53, which would silently corrupt exactly the kind of hashes
 * and identifiers this tool is for. An optional sign is honoured, an optional
 * prefix matching the input base is accepted, and digits are validated before
 * they are accumulated so a bad character is reported by position instead of
 * quietly ending the number early.
 *
 * Never throws: every rejection is a fixed message, and only the 1-based
 * position of the offending character is taken from the input.
 */
export function convertBase(input: string, from: NumberBase, to: NumberBase): NumberResult {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_NUMBER_INPUT_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  const trimmed = input.trim()
  if (trimmed.length === 0) return failure('empty', EMPTY_MESSAGE)

  let body = trimmed
  let negative = false

  if (body.startsWith('-')) {
    negative = true
    body = body.slice(1)
  } else if (body.startsWith('+')) {
    body = body.slice(1)
  }

  body = stripPrefix(body, from)
  const offset = trimmed.length - body.length

  if (body.length === 0) return failure('invalid', NO_DIGITS_MESSAGE)

  let value = 0n
  const radix = BigInt(from)

  for (let index = 0; index < body.length; index += 1) {
    const digit = digitValue(body.charAt(index))

    if (digit < 0 || digit >= from) {
      const position = offset + index + 1
      return failure('invalid-digit', `Position ${position} is not a digit valid in base ${from}.`)
    }

    value = value * radix + BigInt(digit)
  }

  return { ok: true, text: format(negative ? -value : value, to) }
}
