import {
  MAX_MATCH_LIMIT,
  MAX_PATTERN_CHARS,
  MAX_TEST_TEXT_CHARS,
  SUPPORTED_FLAGS,
  type MatchErrorKind,
  type MatchFailure,
  type MatchResult,
  type PatternCheck,
  type PatternFailure,
  type RegexErrorKind,
} from './types'

const EMPTY_PATTERN_MESSAGE = 'Enter a pattern first.'

const PATTERN_TOO_LARGE_MESSAGE = `Pattern is longer than the ${MAX_PATTERN_CHARS.toLocaleString('en-US')} character limit.`

const BAD_FLAG_MESSAGE = `Flags may only use: g i m s u y, each at most once.`

const BAD_SYNTAX_MESSAGE = 'The pattern is not a valid regular expression.'

const EMPTY_TEXT_MESSAGE = 'Enter test text to match against.'

const TEXT_TOO_LARGE_MESSAGE = `Test text is longer than the ${MAX_TEST_TEXT_CHARS.toLocaleString('en-US')} character limit.`

function patternFailure(kind: RegexErrorKind, message: string): PatternFailure {
  return { ok: false, kind, message }
}

function matchFailure(kind: MatchErrorKind, message: string): MatchFailure {
  return { ok: false, kind, message }
}

/**
 * Compiles a pattern with the requested flags. Compilation is cheap -- the
 * pattern is bounded -- so this is safe to call on every keystroke for a live
 * status line. Matching is deliberately not part of this step.
 *
 * Flags are validated against `SUPPORTED_FLAGS` before the engine sees them so
 * a duplicate or unknown flag is reported by us, not discovered as a generic
 * engine error. A thrown `SyntaxError` from the native engine is mapped to one
 * fixed message: the engine's own wording varies by platform and could leak
 * pattern details.
 */
export function buildPattern(pattern: string, flags: string): PatternCheck {
  if (pattern.length === 0) return patternFailure('empty', EMPTY_PATTERN_MESSAGE)
  if (pattern.length > MAX_PATTERN_CHARS) return patternFailure('too-large', PATTERN_TOO_LARGE_MESSAGE)

  const cleaned = flags.trim()

  if (cleaned.length > 0) {
    let seen = ''
    for (const flag of cleaned) {
      if (!SUPPORTED_FLAGS.includes(flag) || seen.includes(flag)) {
        return patternFailure('bad-flag', BAD_FLAG_MESSAGE)
      }
      seen += flag
    }
  }

  try {
    return { ok: true, regex: new RegExp(pattern, cleaned) }
  } catch {
    return patternFailure('bad-syntax', BAD_SYNTAX_MESSAGE)
  }
}

function readonlyGroupOf(match: RegExpMatchArray): readonly (string | undefined)[] {
  return match.slice(1)
}

/**
 * Runs the compiled pattern against the test text.
 *
 * A global or sticky pattern is walked with an `exec` loop. The dangerous case
 * is a zero-width match (e.g. `/^/g`, `/(?:)/`): the engine leaves `lastIndex`
 * on the match start, so the position is advanced manually before the next
 * iteration instead of looping forever. A non-global, non-sticky pattern can
 * only produce its first match, because `exec` otherwise refuses to advance.
 *
 * Collection stops at `MAX_MATCH_LIMIT`; that is reported as `truncated` rather
 * than pretending the text had no more matches. Matching is synchronous, purely
 * engine native -- nothing is evaluated as code and nothing leaves the tab.
 */
export function findMatches(regex: RegExp, text: string): MatchResult {
  if (text.length === 0) return matchFailure('empty-text', EMPTY_TEXT_MESSAGE)
  if (text.length > MAX_TEST_TEXT_CHARS) return matchFailure('too-large-text', TEXT_TOO_LARGE_MESSAGE)

  regex.lastIndex = 0

  if (!regex.global && !regex.sticky) {
    const first = regex.exec(text)
    if (first === null) return { ok: true, matches: [], count: 0, truncated: false }
    return {
      ok: true,
      matches: [
        {
          text: first[0],
          start: first.index,
          end: first.index + first[0].length,
          groups: readonlyGroupOf(first),
        },
      ],
      count: 1,
      truncated: false,
    }
  }

  const matches: { text: string; start: number; end: number; groups: readonly (string | undefined)[] }[] = []
  let truncated = false
  let current: RegExpExecArray | null

  while ((current = regex.exec(text)) !== null) {
    matches.push({
      text: current[0],
      start: current.index,
      end: current.index + current[0].length,
      groups: readonlyGroupOf(current),
    })

    if (current[0].length === 0) regex.lastIndex += 1

    if (matches.length >= MAX_MATCH_LIMIT) {
      // Probe one more exec so an exact-limit run is not mislabelled as
      // truncated: truncation means *more* matches exist.
      truncated = regex.exec(text) !== null
      break
    }
  }

  return { ok: true, matches, count: matches.length, truncated }
}

/** Matched text, one per line, for the Copy button. */
export function matchesToLines(matches: readonly { readonly text: string }[]): string {
  return matches.map((match) => match.text).join('\n')
}