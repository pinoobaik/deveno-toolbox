import {
  MAX_HTML_CHARS,
  NAMED_ENTITIES,
  type HtmlErrorKind,
  type HtmlFailure,
  type HtmlMode,
  type HtmlResult,
} from './types'

const EMPTY_MESSAGE = 'Nothing to convert. Enter text first.'

const TOO_LARGE_MESSAGE = `Input is larger than the ${MAX_HTML_CHARS.toLocaleString('en-US')} character limit.`

const ENCODINGS: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/** Grabs `&name;`, `&#nnn;`, or `&#xhh;`. Name form and digit form sizes bound the scan. */
const REFERENCE_PATTERN = /&(?:#(\d{1,7})|#x([0-9A-Fa-f]{1,6})|([A-Za-z][A-Za-z0-9]{0,31}));/g

const MAX_CODE_POINT = 0x10ffff

function failure(kind: HtmlErrorKind, message: string): HtmlFailure {
  return { ok: false, kind, message }
}

/** A numeric reference maps only true Unicode scalar values; everything else is U+FFFD. */
function numericReference(digits: string, radix: 10 | 16): string {
  const codePoint = Number.parseInt(digits, radix)

  // Surrogates and values beyond 0x10FFFF cannot be represented.
  if (Number.isNaN(codePoint) || codePoint > MAX_CODE_POINT || numberIsSurrogate(codePoint)) {
    return '\uFFFD'
  }

  return String.fromCodePoint(codePoint)
}

function numberIsSurrogate(value: number): boolean {
  return value >= 0xd800 && value <= 0xdfff
}

function encodeText(text: string): { text: string; replacements: number } {
  let out = ''
  let replacements = 0

  for (const character of text) {
    const entity = ENCODINGS[character]
    if (entity === undefined) {
      out += character
    } else {
      out += entity
      replacements += 1
    }
  }

  return { text: out, replacements }
}

function decodeText(text: string): { text: string; replacements: number } {
  let replacements = 0

  const decoded = text.replace(REFERENCE_PATTERN, (full, decimal, hex, name) => {
    if (name !== undefined) {
      const mapped = NAMED_ENTITIES[name]
      if (mapped === undefined) return full
      replacements += 1
      return mapped
    }

    replacements += 1
    if (decimal !== undefined) return numericReference(decimal, 10)
    if (hex !== undefined) return numericReference(hex, 16)
    return full
  })

  return { text: decoded, replacements }
}

/**
 * Encodes or decodes HTML character references in a single pass.
 *
 * Encoding replaces the five characters `& < > " '` with their named
 * references, iterating by code point so astral characters are never split.
 * Decoding resolves named references -- exactly the five known names -- plus
 * decimal and hexadecimal numeric references. Unknown names, unterminated
 * references, and malformed digits stay verbatim; a numeric reference that is
 * not a Unicode scalar value becomes U+FFFD.
 *
 * There is no recursive re-encoding: `&amp;` recovers `&`, and re-encoding
 * already-encoded text doubles the references rather than unescaping them.
 */
export function convertEntities(input: string, mode: HtmlMode): HtmlResult {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_HTML_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  const { text, replacements } = mode === 'encode' ? encodeText(input) : decodeText(input)

  return { ok: true, text, replacements }
}