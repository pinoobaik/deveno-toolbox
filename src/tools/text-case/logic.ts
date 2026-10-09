import {
  MAX_TEXT_CASE_INPUT_CHARS,
  type CaseErrorKind,
  type CaseFailure,
  type CaseMode,
  type CaseResult,
} from './types'

const EMPTY_MESSAGE = 'Nothing to transform. Paste some text first.'

const TOO_LARGE_MESSAGE = `Input is larger than the ${MAX_TEXT_CASE_INPUT_CHARS.toLocaleString('en-US')} character limit. Transform it in smaller pieces.`

function failure(kind: CaseErrorKind, message: string): CaseFailure {
  return { ok: false, kind, message }
}

/**
 * True when the character has different upper and lower forms, so it is the
 * kind of character a case rule should act on. Derived rather than listed so
 * every script is covered without maintaining a table.
 */
function isCased(character: string): boolean {
  return character.toLowerCase() !== character.toUpperCase()
}

function isWhitespace(character: string): boolean {
  return /\s/.test(character)
}

/**
 * Title case: lowercase everything, then capitalize the first cased character
 * of every whitespace separated run.
 *
 * Words are runs of non whitespace, so `don't stay` becomes `Don't Stay`,
 * `foo-bar` becomes `Foo-bar`, and `123 abc` becomes `123 Abc`.
 */
function toTitleCase(text: string): string {
  const lowered = text.toLowerCase()
  let result = ''
  let atBoundary = true

  for (const character of lowered) {
    if (isWhitespace(character)) {
      result += character
      atBoundary = true
      continue
    }

    result += atBoundary && isCased(character) ? character.toUpperCase() : character
    atBoundary = false
  }

  return result
}

/**
 * Sentence case: lowercase everything, then capitalize the first cased
 * character and the first cased character after `.`, `!`, or `?` that is
 * followed by whitespace.
 *
 * Requiring trailing whitespace is what keeps abbreviations down: `e.g. this`
 * becomes `E.g. This` rather than `E.G. This`, and `hello. world` becomes
 * `Hello. World`. A terminator at the end of the text has nothing to follow it,
 * so nothing extra is changed.
 */
function toSentenceCase(text: string): string {
  const lowered = text.toLowerCase()
  let result = ''
  let capitalizeNext = true

  for (let index = 0; index < lowered.length; index += 1) {
    const character = lowered.charAt(index)

    if (capitalizeNext && isCased(character)) {
      result += character.toUpperCase()
      capitalizeNext = false
      continue
    }

    result += character

    if (character === '.' || character === '!' || character === '?') {
      capitalizeNext = isWhitespace(lowered.charAt(index + 1))
    } else if (!isWhitespace(character)) {
      capitalizeNext = false
    }
  }

  return result
}

/**
 * Applies one case rule to text. Never throws.
 *
 * Casing is locale independent on purpose: the default `toLowerCase` and
 * `toUpperCase` behave the same on every machine, so a result never depends on
 * the runtime's locale. Some characters expand when uppercased (`ß` becomes
 * `SS`), which is why the result is not guaranteed to be the same length as the
 * input.
 */
export function transformCase(input: string, mode: CaseMode): CaseResult {
  if (input.length === 0) return failure('empty', EMPTY_MESSAGE)
  if (input.length > MAX_TEXT_CASE_INPUT_CHARS) return failure('too-large', TOO_LARGE_MESSAGE)

  switch (mode) {
    case 'lower':
      return { ok: true, text: input.toLowerCase() }
    case 'upper':
      return { ok: true, text: input.toUpperCase() }
    case 'title':
      return { ok: true, text: toTitleCase(input) }
    case 'sentence':
      return { ok: true, text: toSentenceCase(input) }
  }
}
