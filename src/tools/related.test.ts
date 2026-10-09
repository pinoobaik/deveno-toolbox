import { Circle } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import type { ToolCategoryId, ToolDefinition } from '@/types/tool'

import { findRelatedTools } from './related'

function makeTool(
  id: string,
  category: ToolCategoryId,
  keywords: readonly string[],
): ToolDefinition {
  return {
    id,
    name: `Tool ${id}`,
    description: `Description for ${id}.`,
    icon: Circle,
    category,
    keywords,
  }
}

/** Catalog order matters: it is the final tie-break in the ranking. */
const CATALOG: readonly ToolDefinition[] = [
  makeTool('alpha', 'data', ['json', 'format', 'shared']),
  makeTool('bravo', 'data', ['json', 'shared']),
  makeTool('charlie', 'data', ['unrelated']),
  makeTool('delta', 'text', ['format', 'shared']),
  makeTool('echo', 'text', ['nothing']),
]

const ids = (catalog: readonly ToolDefinition[], toolId: string, limit?: number) =>
  findRelatedTools(catalog, toolId, limit).map((tool) => tool.id)

describe('findRelatedTools', () => {
  it('never includes the tool it was asked about', () => {
    for (const tool of CATALOG) {
      expect(ids(CATALOG, tool.id), tool.id).not.toContain(tool.id)
    }
  })

  it('returns an empty list for an id that is not in the catalog', () => {
    expect(findRelatedTools(CATALOG, 'missing')).toEqual([])
  })

  it('returns an empty list for an empty catalog', () => {
    expect(findRelatedTools([], 'alpha')).toEqual([])
  })

  it('returns an empty list when the current tool has no companions', () => {
    const solo = [makeTool('solo', 'data', ['json'])]

    expect(findRelatedTools(solo, 'solo')).toEqual([])
  })

  it('puts same-category tools ahead of a stronger keyword match elsewhere', () => {
    // `delta` shares two keywords with alpha but sits in another category, so
    // `charlie` -- same category, zero overlap -- still comes first.
    expect(ids(CATALOG, 'alpha')).toEqual(['bravo', 'charlie', 'delta'])
  })

  it('ranks same-category tools by keyword overlap', () => {
    expect(ids(CATALOG, 'alpha', 2)).toEqual(['bravo', 'charlie'])
  })

  it('breaks a tie on catalog order', () => {
    expect(ids(CATALOG, 'charlie')).toEqual(['alpha', 'bravo', 'delta'])
    expect(ids(CATALOG, 'delta')).toEqual(['echo', 'alpha', 'bravo'])
    expect(ids(CATALOG, 'echo')).toEqual(['delta', 'alpha', 'bravo'])
  })

  it('compares keywords case insensitively', () => {
    const catalog = [
      makeTool('lower', 'data', ['json']),
      makeTool('upper', 'data', ['JSON']),
      makeTool('mixed', 'text', ['Json']),
    ]

    expect(ids(catalog, 'lower', 2)).toEqual(['upper', 'mixed'])
  })

  it('returns the same order every time', () => {
    const first = ids(CATALOG, 'alpha')
    const second = ids(CATALOG, 'alpha')
    const third = ids(CATALOG, 'alpha')

    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })

  it('respects an explicit limit', () => {
    expect(ids(CATALOG, 'alpha', 1)).toEqual(['bravo'])
    expect(ids(CATALOG, 'alpha', 2)).toEqual(['bravo', 'charlie'])
  })

  it('never returns more tools than the catalog holds besides the current one', () => {
    expect(ids(CATALOG, 'alpha', 99)).toHaveLength(CATALOG.length - 1)
  })

  it('returns nothing for a limit that is not a usable count', () => {
    expect(findRelatedTools(CATALOG, 'alpha', 0)).toEqual([])
    expect(findRelatedTools(CATALOG, 'alpha', -3)).toEqual([])
    expect(findRelatedTools(CATALOG, 'alpha', Number.NaN)).toEqual([])
    expect(findRelatedTools(CATALOG, 'alpha', Number.POSITIVE_INFINITY)).toEqual([])
  })

  it('does not mutate the catalog', () => {
    const before = CATALOG.map((tool) => tool.id)

    findRelatedTools(CATALOG, 'alpha')

    expect(CATALOG.map((tool) => tool.id)).toEqual(before)
  })

  it('skips an unset slot in a sparse catalog instead of throwing', () => {
    const sparse = new Array<ToolDefinition>(3)
    sparse[0] = makeTool('alpha', 'data', ['json'])
    sparse[2] = makeTool('charlie', 'data', ['json'])

    expect(() => findRelatedTools(sparse, 'alpha')).not.toThrow()
    expect(ids(sparse, 'alpha')).toEqual(['charlie'])
  })
})
