import type { ToolDefinition } from '@/types/tool'

/** How many related tools are listed before the trail is cut off. */
const DEFAULT_LIMIT = 3

/**
 * Counts keywords shared by two tools, case insensitively. Each keyword is
 * counted at most once on either side, so a duplicate keyword can never inflate
 * the score.
 */
function keywordOverlap(a: ToolDefinition, b: ToolDefinition): number {
  const bKeywords = new Set(b.keywords.map((keyword) => keyword.toLowerCase()))
  const seen = new Set<string>()
  let overlap = 0

  for (const keyword of a.keywords) {
    const normalized = keyword.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    if (bKeywords.has(normalized)) overlap += 1
  }

  return overlap
}

/**
 * Picks the tools to show as "related" for one tool.
 *
 * Ranking, in order:
 * 1. Tools in the same category come first.
 * 2. Within that, more shared keywords win.
 * 3. Catalog order breaks any remaining tie, so the result is deterministic
 *    regardless of the runtime's sort implementation.
 *
 * The current tool is always excluded. A catalog with no other tool, or an id
 * that is not in the catalog, returns an empty list so the caller can render
 * nothing rather than an empty container.
 *
 * Pure and catalog-driven: relationships are derived, never hardcoded, so a new
 * tool joins the ranking with no extra wiring. The catalog is not mutated.
 */
export function findRelatedTools(
  catalog: readonly ToolDefinition[],
  toolId: string,
  limit: number = DEFAULT_LIMIT,
): readonly ToolDefinition[] {
  if (!Number.isFinite(limit) || limit <= 0) return []

  const currentIndex = catalog.findIndex((tool) => tool.id === toolId)
  const current = catalog[currentIndex]
  if (current === undefined) return []

  const ranked: Array<{
    readonly tool: ToolDefinition
    readonly index: number
    readonly sameCategory: boolean
    readonly overlap: number
  }> = []

  for (let index = 0; index < catalog.length; index += 1) {
    const tool = catalog[index]
    if (tool === undefined || index === currentIndex) continue

    ranked.push({
      tool,
      index,
      sameCategory: tool.category === current.category,
      overlap: keywordOverlap(current, tool),
    })
  }

  ranked.sort(
    (a, b) =>
      Number(b.sameCategory) - Number(a.sameCategory) ||
      b.overlap - a.overlap ||
      a.index - b.index,
  )

  return ranked.slice(0, limit).map((entry) => entry.tool)
}
