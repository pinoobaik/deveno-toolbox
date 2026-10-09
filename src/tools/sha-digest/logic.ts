import {
  MAX_SHA_INPUT_CHARS,
  SHA_ALGORITHMS,
  type ShaErrorKind,
  type ShaFailure,
  type ShaResult,
} from './types'

const EMPTY_MESSAGE = 'Nothing to hash. Type or paste some text first.'

const TOO_LARGE_MESSAGE = `Input is larger than the ${MAX_SHA_INPUT_CHARS.toLocaleString('en-US')} character limit. Hash the text in smaller pieces.`

const UNSUPPORTED_MESSAGE = 'Only SHA-1, SHA-256, SHA-384, and SHA-512 can be computed here.'

const UNAVAILABLE_MESSAGE =
  'Digests need the Web Crypto API, which is only available in a secure context (HTTPS or localhost).'

/**
 * Exported so the component can build the same controlled failure if the
 * "never rejects" contract below is ever broken. One wording, one source.
 */
export const DIGEST_FAILED_MESSAGE = 'The digest could not be computed for this input.'

function failure(kind: ShaErrorKind, message: string): ShaFailure {
  return { ok: false, kind, message }
}

/**
 * Resolves `crypto.subtle` without ever throwing.
 *
 * Some browsers expose `crypto` but throw when `.subtle` is read outside a
 * secure context, and other environments have no `crypto` at all. Both shapes
 * collapse to `null` so the caller can report one clear message.
 */
function resolveSubtle(): SubtleCrypto | null {
  try {
    const candidate = globalThis.crypto?.subtle
    return typeof candidate === 'object' ? candidate : null
  } catch {
    return null
  }
}

function isSupported(algorithm: string): boolean {
  return SHA_ALGORITHMS.some((candidate) => candidate === algorithm)
}

function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return hex
}

/**
 * Hashes UTF-8 text with the Web Crypto API and returns lowercase hex.
 *
 * The algorithm arrives as a plain `string` rather than `ShaAlgorithm` so an
 * unsupported value is a runtime condition with its own typed error, not a
 * compile time fiction. This is a one-way digest, never encryption: SHA-1 is
 * offered for compatibility with existing checksums and should not be used for
 * anything that needs collision resistance.
 *
 * Never throws: a missing or unusable Web Crypto API becomes a typed failure
 * the UI can explain.
 */
export async function computeDigest(algorithm: string, input: string): Promise<ShaResult> {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_SHA_INPUT_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)
  if (!isSupported(algorithm)) return failure('unsupported', UNSUPPORTED_MESSAGE)

  const subtle = resolveSubtle()
  if (subtle === null) return failure('unavailable', UNAVAILABLE_MESSAGE)

  try {
    const bytes = new TextEncoder().encode(input)
    const digest = await subtle.digest(algorithm, bytes)
    return { ok: true, text: toHex(new Uint8Array(digest)) }
  } catch {
    return failure('failed', DIGEST_FAILED_MESSAGE)
  }
}
