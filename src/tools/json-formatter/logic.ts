import {
  MAX_JSON_DEPTH,
  MAX_JSON_INPUT_CHARS,
  type JsonOutputResult,
  type JsonValidationFailure,
  type JsonValidationResult,
  type StringifyOptions,
} from './types'

/** Longest engine reason kept for display. */
const MAX_REASON_LENGTH = 120

const FALLBACK_REASON = 'The input could not be parsed as JSON.'

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

  if (text.length > MAX_JSON_INPUT_CHARS) {
    return {
      valid: false,
      kind: 'too-large',
      message: `Input is larger than the ${MAX_JSON_INPUT_CHARS.toLocaleString('en-US')} character limit. Split the document into smaller pieces.`,
      line: null,
      column: null,
    }
  }

  try {
    return { valid: true, value: JSON.parse(text) as unknown }
  } catch (error) {
    return { valid: false, kind: 'syntax', ...describeSyntaxError(error, text) }
  }
}

/**
 * Renders an already parsed value back to JSON text. Never throws: a document
 * nested deeper than `MAX_JSON_DEPTH`, or any other `JSON.stringify` refusal,
 * comes back as a controlled failure the UI can display.
 */
export function stringifyJson(value: unknown, options: StringifyOptions = {}): JsonOutputResult {
  try {
    if (findDepthBeyond(value, MAX_JSON_DEPTH) !== null) {
      return {
        ok: false,
        kind: 'too-deep',
        message: `This JSON is nested more than ${MAX_JSON_DEPTH} levels deep, which is more than this tool will reformat. Flatten the structure and try again.`,
      }
    }

    const source = options.sortKeys === true ? sortJsonKeys(value) : value
    const text =
      options.indent === undefined
        ? JSON.stringify(source)
        : JSON.stringify(source, null, options.indent)

    // `JSON.stringify` yields `undefined` rather than a string for values that
    // have no JSON representation, which the type signature does not reflect.
    if (typeof text !== 'string') {
      return {
        ok: false,
        kind: 'unsupported',
        message: 'This value could not be converted to JSON text.',
      }
    }

    return { ok: true, text }
  } catch {
    return {
      ok: false,
      kind: 'unsupported',
      message: 'This value could not be converted to JSON text.',
    }
  }
}

type SortTask =
  | { readonly kind: 'array'; readonly source: readonly unknown[]; readonly target: unknown[] }
  | {
      readonly kind: 'object'
      readonly source: Record<string, unknown>
      readonly target: Record<string, unknown>
    }

/**
 * Returns a copy of `value` with every object's keys in ascending code-unit
 * order. The traversal is iterative so deeply nested documents cannot exhaust
 * the call stack, and array order is always preserved.
 */
export function sortJsonKeys(value: unknown): unknown {
  const root = createSortTask(value)
  if (root === null) return value

  const pending: SortTask[] = [root]

  while (pending.length > 0) {
    const task = pending.pop()
    if (task === undefined) break

    if (task.kind === 'array') {
      for (let index = 0; index < task.source.length; index += 1) {
        const child = task.source[index]
        const nested = createSortTask(child)

        if (nested === null) {
          task.target.push(child)
        } else {
          task.target.push(nested.target)
          pending.push(nested)
        }
      }

      continue
    }

    for (const key of Object.keys(task.source).sort(compareKeys)) {
      const child = task.source[key]
      const nested = createSortTask(child)

      if (nested === null) {
        task.target[key] = child
      } else {
        task.target[key] = nested.target
        pending.push(nested)
      }
    }
  }

  return root.target
}

function createSortTask(value: unknown): SortTask | null {
  if (Array.isArray(value)) {
    return { kind: 'array', source: value, target: [] }
  }

  if (value !== null && typeof value === 'object') {
    return { kind: 'object', source: value as Record<string, unknown>, target: {} }
  }

  return null
}

/** Locale independent ordering, so results are identical on every machine. */
function compareKeys(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * Depth-first search for the first container nested deeper than `maxDepth`.
 * Iterative so that a hostile document cannot overflow the stack here either.
 * Returns the offending depth, or `null` when the value is within the limit.
 */
function findDepthBeyond(value: unknown, maxDepth: number): number | null {
  const pending: Array<readonly [unknown, number]> = [[value, 0]]

  while (pending.length > 0) {
    const entry = pending.pop()
    if (entry === undefined) break

    const [current, depth] = entry
    if (current === null || typeof current !== 'object') continue

    const nextDepth = depth + 1
    if (nextDepth > maxDepth) return nextDepth

    if (Array.isArray(current)) {
      for (const item of current) pending.push([item, nextDepth])
      continue
    }

    const record = current as Record<string, unknown>
    for (const key of Object.keys(record)) pending.push([record[key], nextDepth])
  }

  return null
}

function describeSyntaxError(
  error: unknown,
  text: string,
): Omit<JsonValidationFailure, 'valid' | 'kind'> {
  const raw = error instanceof Error ? error.message : ''
  const reason = extractReason(raw)
  const offset = extractPosition(raw) ?? extractEndOfInputOffset(raw, text)

  if (offset !== null) {
    const { line, column } = offsetToLineColumn(text, offset)

    return {
      message: `${reason} Found it at line ${line}, column ${column}.`,
      line,
      column,
    }
  }

  const reported = extractReportedLineColumn(raw)
  if (reported !== null) {
    return {
      message: `${reason} Found it at line ${reported.line}, column ${reported.column}.`,
      ...reported,
    }
  }

  return { message: reason, line: null, column: null }
}

/**
 * Reduces an engine message to a short, engine independent reason.
 *
 * Engines append position information and quote the submitted document back at
 * the caller. Both are removed step by step, anything unrecognised falls back
 * to a fixed sentence, and the result is length capped, so neither raw engine
 * wording nor a fragment of the document can reach the UI.
 */
function extractReason(message: string): string {
  const cleaned = message
    .replace(/^(?:SyntaxError:\s*|JSON\.parse:\s*)/i, '')
    .replace(/".*$/s, '')
    .replace(/\s*is not valid JSON\.?$/i, '')
    .replace(/\s*\((?:line\s+\d+\s+column\s+\d+)\)\s*$/i, '')
    .replace(/\s*(?:(?:in|after)\s+JSON\s+)?at\s+position\s+\d+$/i, '')
    .replace(/\s*at\s+line\s+\d+\s+column\s+\d+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REASON_LENGTH)
    .replace(/[\s.,:;]+$/, '')

  if (cleaned.length === 0) return FALLBACK_REASON

  const reason = capitalize(cleaned)
  return /[.!?]$/.test(reason) ? reason : `${reason}.`
}

function extractPosition(message: string): number | null {
  const match = /\bposition\s+(\d+)/i.exec(message)
  if (match === null) return null

  const position = Number.parseInt(match[1] ?? '', 10)
  return Number.isNaN(position) ? null : position
}

/** Uses a line/column pair when the engine reports one instead of an offset. */
function extractReportedLineColumn(message: string): { line: number; column: number } | null {
  const match = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message)
  if (match === null) return null

  const line = Number.parseInt(match[1] ?? '', 10)
  const column = Number.parseInt(match[2] ?? '', 10)
  if (Number.isNaN(line) || Number.isNaN(column)) return null

  return { line, column }
}

/** Messages about truncated input carry no offset, so the end is the position. */
function extractEndOfInputOffset(message: string, text: string): number | null {
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

function capitalize(text: string): string {
  const first = text.charAt(0)
  return first === '' ? text : first.toUpperCase() + text.slice(1)
}