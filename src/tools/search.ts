import type { ToolDefinition } from '@/types/tool'

/**
 * Term scoring tiers. A term matches at most one tier, and the highest
 * applicable tier wins, so a name match always outranks a keyword match, which
 * always outranks a description match.
 */
const SCORE_NAME_PREFIX = 500
const SCORE_NAME_CONTAINS = 250
const SCORE_KEYWORD_EXACT = 200
const SCORE_KEYWORD_CONTAINS = 120
const SCORE_DESCRIPTION_CONTAINS = 60

/** Caps a pathological query so splitting and scoring stay bounded. */
const MAX_QUERY_LENGTH = 200
/** Caps how many distinct terms are scored, keeping work linear in practice. */
const MAX_TERMS = 8

/**
 * Lowercases and trims a query so comparisons are case insensitive and leading
 * or trailing whitespace never changes a result.
 */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().slice(0, MAX_QUERY_LENGTH)
}

/**
 * Splits a normalized query into distinct terms in first-seen order.
 * Repeated words are dropped so typing the same word twice never inflates a
 * score, and the term count is capped so a long query stays cheap.
 */
function splitTerms(normalized: string): readonly string[] {
  const seen = new Set<string>()
  const terms: string[] = []

  for (const part of normalized.split(/\s+/)) {
    if (part.length === 0 || seen.has(part)) continue
    seen.add(part)
    terms.push(part)
    if (terms.length >= MAX_TERMS) break
  }

  return terms
}

/** Scores one term against one tool. Returns 0 when the term does not match. */
function scoreTerm(tool: ToolDefinition, term: string): number {
  const name = tool.name.toLowerCase()

  if (name.startsWith(term)) return SCORE_NAME_PREFIX
  if (name.includes(term)) return SCORE_NAME_CONTAINS

  let keywordScore = 0

  for (const keyword of tool.keywords) {
    if (keyword === term) return SCORE_KEYWORD_EXACT
    if (keyword.includes(term)) keywordScore = SCORE_KEYWORD_CONTAINS
  }

  if (keywordScore > 0) return keywordScore

  if (tool.description.toLowerCase().includes(term)) return SCORE_DESCRIPTION_CONTAINS

  return 0
}

/**
 * Scores a query against a single tool. `0` means the tool does not match.
 *
 * An empty or whitespace-only query scores `0`: it is not a match for
 * anything, which is why `searchTools` handles it separately by returning the
 * catalog unchanged.
 */
export function scoreTool(tool: ToolDefinition, query: string): number {
  const terms = splitTerms(normalizeQuery(query))
  let score = 0

  for (const term of terms) {
    score += scoreTerm(tool, term)
  }

  return score
}

/**
 * Filters and ranks a catalog by name, description, and keywords.
 *
 * Rules, in order:
 * 1. An empty or whitespace-only query returns the catalog unchanged.
 * 2. The query is split into at most 8 distinct, case-insensitive terms.
 * 3. A term matches if it appears in the name, a keyword, or the description.
 * 4. Results are scored per term and summed, so a more specific query ranks
 *    higher than a vague one.
 * 5. Tools scoring `0` are dropped.
 * 6. Ties keep the catalog's own order.
 *
 * The input catalog is never mutated.
 */
export function searchTools(
  catalog: readonly ToolDefinition[],
  query: string,
): readonly ToolDefinition[] {
  const terms = splitTerms(normalizeQuery(query))
  if (terms.length === 0) return catalog

  const scored: Array<{ tool: ToolDefinition; index: number; score: number }> = []

  for (let index = 0; index < catalog.length; index += 1) {
    const tool = catalog[index]
    if (tool === undefined) continue

    let score = 0
    for (const term of terms) score += scoreTerm(tool, term)

    if (score > 0) scored.push({ tool, index, score })
  }

  // Explicit tie-break on catalog index keeps ordering deterministic even if
  // the runtime's sort is ever changed.
  scored.sort((a, b) => b.score - a.score || a.index - b.index)

  return scored.map((entry) => entry.tool)
}