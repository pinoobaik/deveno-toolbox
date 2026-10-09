import { MAX_JWT_TOKEN_CHARS, type JwtErrorKind, type JwtFailure, type JwtResult } from './types'

/** Base64url alphabet: standard Base64 with `-` and `_` and no required padding. */
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/

const EMPTY_MESSAGE = 'Nothing to decode. Paste a JSON Web Token first.'

const TOO_LARGE_MESSAGE = `Token is larger than the ${MAX_JWT_TOKEN_CHARS.toLocaleString('en-US')} character limit.`

const STRUCTURE_MESSAGE = 'A JWT has exactly three dot-separated segments: header, payload, signature.'

const HEADER_DECODE_MESSAGE = 'The first segment (header) could not be decoded from base64url to text.'

const PAYLOAD_DECODE_MESSAGE =
  'The second segment (payload) could not be decoded from base64url to text.'

const HEADER_OBJECT_MESSAGE = 'The first segment (header) is not a JSON object.'

const PAYLOAD_OBJECT_MESSAGE = 'The second segment (payload) is not a JSON object.'

const HEADER_RENDER_MESSAGE = 'The header is valid JSON but too deeply nested to format.'

const PAYLOAD_RENDER_MESSAGE = 'The payload is valid JSON but too deeply nested to format.'

function failure(kind: JwtErrorKind, message: string): JwtFailure {
  return { ok: false, kind, message }
}

type SegmentResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false }

/**
 * Turns one base64url segment back into text.
 *
 * Padding is optional, so it is restored before handing the segment to `atob`.
 * Both a segment that is not base64url and a segment whose bytes are not valid
 * UTF-8 come back as the same failure, because the caller reports one message
 * that covers either problem for that segment.
 */
function decodeSegment(segment: string): SegmentResult {
  if (segment.length === 0 || segment.length % 4 === 1) return { ok: false }
  if (!BASE64URL_PATTERN.test(segment)) return { ok: false }

  const standard = segment.replaceAll('-', '+').replaceAll('_', '/')
  const missing = (4 - (standard.length % 4)) % 4
  const padded = missing === 0 ? standard : `${standard}${'='.repeat(missing)}`

  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return { ok: false }
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { ok: false }
  }
}

type ObjectResult =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false }

/** Parses a segment and insists on a JSON object, not an array or a scalar. */
function parseObject(text: string): ObjectResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { ok: false }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false }

  return { ok: true, value: parsed as Record<string, unknown> }
}

type RenderResult = { readonly ok: true; readonly text: string } | { readonly ok: false }

/** Pretty prints with two space indentation, without leaking an engine error. */
function render(value: Record<string, unknown>): RenderResult {
  try {
    const text = JSON.stringify(value, null, 2)

    if (typeof text !== 'string') return { ok: false }
    return { ok: true, text }
  } catch {
    return { ok: false }
  }
}

/**
 * Decodes a JWT without verifying anything.
 *
 * The three segments are split, the header and payload are decoded from
 * base64url and parsed as JSON objects, and the signature segment is passed
 * through untouched. No signature is checked, no algorithm is trusted, and no
 * claim is interpreted: a token with a forged or garbage signature decodes
 * exactly like a valid one, which is precisely why the UI warns about it.
 *
 * Never throws. Failures carry a fixed message naming only which segment
 * failed, so no part of the token can reach the UI through an error path.
 */
export function decodeJwt(token: string): JwtResult {
  const raw = token.trim()

  if (raw.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (raw.length > MAX_JWT_TOKEN_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  const parts = raw.split('.')
  if (parts.length !== 3) return failure('structure', STRUCTURE_MESSAGE)

  const headerPart = parts[0]
  const payloadPart = parts[1]
  const signaturePart = parts[2]

  if (headerPart === undefined || payloadPart === undefined || signaturePart === undefined) {
    return failure('structure', STRUCTURE_MESSAGE)
  }

  const header = decodeSegment(headerPart)
  if (!header.ok) return failure('header-base64', HEADER_DECODE_MESSAGE)

  const headerObject = parseObject(header.text)
  if (!headerObject.ok) return failure('header-json', HEADER_OBJECT_MESSAGE)

  const payload = decodeSegment(payloadPart)
  if (!payload.ok) return failure('payload-base64', PAYLOAD_DECODE_MESSAGE)

  const payloadObject = parseObject(payload.text)
  if (!payloadObject.ok) return failure('payload-json', PAYLOAD_OBJECT_MESSAGE)

  const renderedHeader = render(headerObject.value)
  if (!renderedHeader.ok) return failure('header-json', HEADER_RENDER_MESSAGE)

  const renderedPayload = render(payloadObject.value)
  if (!renderedPayload.ok) return failure('payload-json', PAYLOAD_RENDER_MESSAGE)

  return {
    ok: true,
    header: renderedHeader.text,
    payload: renderedPayload.text,
    signature: signaturePart,
  }
}
