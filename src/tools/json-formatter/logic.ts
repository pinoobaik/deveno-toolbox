import type { JsonIndent, JsonValidationFailure, JsonValidationResult } from './types'

/**
 * Parses JSON text using the native `JSON.parse`.
 * Never throws: failures are returned as a structured result so the UI can
 * surface a readable message instead of crashing.
 */
export function parseJson(input: string): JsonValidationResult {
  const text = input.trim()

  if (text.length === 0) {
    return {
      valid: false,
      kind: 'empty',
      message: 'Nothing to validate. Paste some JSON first.',
      line: null,
      column: null,
    }
  }

  try {
    return { valid: true, value: JSON.parse(text) as unknown }
  } catch (error) {
    const detail = describeSyntaxError(error, text)
    return { valid: false, kind: 'syntax', ...detail }
  }
}

/** Pretty prints a raw JSON string. Returns the input untouched when invalid. */
export function formatJson(input: string, indent: JsonIndent = 2): string {
  const result = parseJson(input)
  if (!result.valid) return input
  return JSON.stringify(result.value, null, indent)
}

/** Minifies a raw JSON string. Returns the input untouched when invalid. */
export function minifyJson(input: string): string {
  const result = parseJson(input)
  if (!result.valid) return input
  return JSON.stringify(result.value)
}

/** Sorts object keys recursively. Useful for diffing stable payloads. */
export function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys)
  }

  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    return Object.keys(source)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJsonKeys(source[key])
        return acc
      }, {})
  }

  return value
}

function describeSyntaxError(
  error: unknown,
  text: string,
): Omit<JsonValidationFailure, 'valid' | 'kind'> {
  if (!(error instanceof SyntaxError)) {
    return {
      message: error instanceof Error ? error.message : 'Unknown error while parsing JSON.',
      line: null,
      column: null,
    }
  }

  const raw = error.message
  const reason = extractReason(raw)
  const offset = extractOffset(raw, text)

  if (offset === null) {
    return { message: reason, line: null, column: null }
  }

  const { line, column } = offsetToLineColumn(text, offset)

  return {
    message: `${reason} Found it at line ${line}, column ${column}.`,
    line,
    column,
  }
}

/**
 * Strips the engine specific suffix (`in JSON at position 7 (line 1 column 8)`)
 * and the echoed input snippet, keeping only the human readable reason.
 */
function extractReason(message: string): string {
  const reason = message
    .replace(/\s*in JSON at position \d+.*$/i, '')
    .replace(/\s*is not valid JSON\.?$/i, '')
    // V8 echoes the offending input after a comma: `Unexpected token 'x', "<snippet>"`.
    // The snippet may span lines and contain quotes, so it is matched from the end.
    .replace(/,\s*"(?:.|\n)*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return reason.length > 0 ? `${reason}.` : 'The input could not be parsed as JSON.'
}

/**
 * Recovers the character offset of the failure. V8 reports it as
 * `position N`; messages without an offset describe a truncated input, in
 * which case the end of the text is the offending position.
 */
function extractOffset(message: string, text: string): number | null {
  const match = /position (\d+)/i.exec(message)
  if (match) {
    const position = Number.parseInt(match[1] ?? '', 10)
    return Number.isNaN(position) ? null : position
  }

  return /at end of input|unexpected end of/i.test(message) ? text.length : null
}

function offsetToLineColumn(
  text: string,
  offset: number,
): { line: number; column: number } {
  const safeOffset = Math.min(Math.max(offset, 0), text.length)
  const before = text.slice(0, safeOffset)
  const lines = before.split('\n')

  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  }
}
