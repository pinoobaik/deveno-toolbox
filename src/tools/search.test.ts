import { Braces } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import type { ToolDefinition } from '@/types/tool'

import { scoreTool, searchTools } from './search'

function fixture(
  id: string,
  name: string,
  description: string,
  category: ToolDefinition['category'],
  keywords: readonly string[],
): ToolDefinition {
  return { id, name, description, icon: Braces, category, keywords }
}

const UUID_TOOL = fixture('uuid-generator', 'UUID Generator', 'Generate version 4 UUIDs.', 'generators', [
  'guid',
  'v4',
  'random id',
])

const JSON_TOOL = fixture(
  'json-formatter',
  'JSON Formatter',
  'Format, minify and validate JSON.',
  'data',
  ['pretty print', 'parser'],
)

const TIMESTAMP_TOOL = fixture(
  'timestamp-converter',
  'Timestamp Converter',
  'Convert Unix timestamps to dates.',
  'converters',
  ['epoch', 'unix'],
)

const CATALOG: readonly ToolDefinition[] = [UUID_TOOL, JSON_TOOL, TIMESTAMP_TOOL]

/** One fixture per score tier, declared in an order that does not match rank. */
const TIER_CATALOG: readonly ToolDefinition[] = [
  fixture('a-description', 'Alpha', 'buried in the needle haystack', 'text', []),
  fixture('b-keyword', 'Bravo', 'nothing notable', 'text', ['needle']),
  fixture('c-name-contains', 'Red Needle', 'nothing notable', 'text', []),
  fixture('d-name-prefix', 'Needle', 'nothing notable', 'text', []),
]

describe('scoreTool', () => {
  it('scores a prefix match highest', () => {
    expect(scoreTool(UUID_TOOL, 'uuid')).toBe(500)
  })

  it('scores a name substring below a prefix', () => {
    expect(scoreTool(UUID_TOOL, 'generator')).toBe(250)
  })

  it('scores an exact keyword below the name', () => {
    expect(scoreTool(UUID_TOOL, 'guid')).toBe(200)
  })

  it('scores a keyword substring below an exact keyword', () => {
    expect(scoreTool(UUID_TOOL, 'random')).toBe(120)
  })

  it('scores a description match lowest', () => {
    expect(scoreTool(TIMESTAMP_TOOL, 'dates')).toBe(60)
  })

  it('treats every comparison as case insensitive', () => {
    expect(scoreTool(UUID_TOOL, 'uUiD gEnErAtOr')).toBe(750)
  })

  it('ignores leading and trailing whitespace', () => {
    expect(scoreTool(UUID_TOOL, '   uuid   ')).toBe(scoreTool(UUID_TOOL, 'uuid'))
  })

  it('sums the scores of distinct terms', () => {
    expect(scoreTool(UUID_TOOL, 'uuid generator')).toBe(500 + 250)
  })

  it('never scores a repeated term more than once', () => {
    expect(scoreTool(UUID_TOOL, 'guid guid guid')).toBe(scoreTool(UUID_TOOL, 'guid'))
  })

  it('returns 0 when nothing matches', () => {
    expect(scoreTool(UUID_TOOL, 'zzz')).toBe(0)
  })

  it('returns 0 for an empty query rather than matching everything', () => {
    expect(scoreTool(UUID_TOOL, '')).toBe(0)
    expect(scoreTool(UUID_TOOL, '   ')).toBe(0)
  })

  it('does not let a keyword beat a name match', () => {
    expect(scoreTool(JSON_TOOL, 'json')).toBe(500)
    expect(scoreTool(JSON_TOOL, 'format')).toBe(250)
    expect(scoreTool(JSON_TOOL, 'parser')).toBe(200)
  })
})

describe('searchTools', () => {
  it('returns the whole catalog for an empty query', () => {
    expect(searchTools(CATALOG, '')).toEqual(CATALOG)
  })

  it('returns the whole catalog for a whitespace-only query', () => {
    expect(searchTools(CATALOG, '   \t ')).toEqual(CATALOG)
  })

  it('finds a tool by its exact name', () => {
    const results = searchTools(CATALOG, 'UUID Generator')

    expect(results.map((tool) => tool.id)).toEqual(['uuid-generator'])
  })

  it('finds a tool by a partial name', () => {
    const results = searchTools(CATALOG, 'format')

    expect(results.map((tool) => tool.id)).toEqual(['json-formatter'])
  })

  it('finds a tool by a description term', () => {
    const results = searchTools(CATALOG, 'dates')

    expect(results.map((tool) => tool.id)).toEqual(['timestamp-converter'])
  })

  it('finds a tool by a keyword', () => {
    const results = searchTools(CATALOG, 'epoch')

    expect(results.map((tool) => tool.id)).toEqual(['timestamp-converter'])
  })

  it('returns every matching tool, not only the best one', () => {
    const results = searchTools(CATALOG, 'e')

    expect(results.length).toBe(3)
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchTools(CATALOG, 'zzz')).toEqual([])
  })

  it('ranks prefix over name over keyword over description', () => {
    const results = searchTools(TIER_CATALOG, 'needle')

    expect(results.map((tool) => tool.id)).toEqual([
      'd-name-prefix',
      'c-name-contains',
      'b-keyword',
      'a-description',
    ])
  })

  it('breaks score ties using catalog order', () => {
    // Every name contains "a" and none starts with it, so all three score the
    // same and only the tie-break can decide the order.
    const scores = CATALOG.map((tool) => scoreTool(tool, 'a'))
    expect(new Set(scores).size).toBe(1)

    const results = searchTools(CATALOG, 'a')

    expect(results.map((tool) => tool.id)).toEqual(CATALOG.map((tool) => tool.id))
  })

  it('produces the same order on repeated runs', () => {
    const first = searchTools(CATALOG, 'e').map((tool) => tool.id)
    const second = searchTools(CATALOG, 'e').map((tool) => tool.id)

    expect(first).toEqual(second)
  })

  it('matches regardless of the case of the query', () => {
    expect(searchTools(CATALOG, 'UUID generator').map((tool) => tool.id)).toEqual([
      'uuid-generator',
    ])
    expect(searchTools(CATALOG, 'uUiD gEnErAtOr').map((tool) => tool.id)).toEqual([
      'uuid-generator',
    ])
  })

  it('never mutates the catalog it was given', () => {
    const before = CATALOG.map((tool) => tool.id)

    searchTools(CATALOG, 't')

    expect(CATALOG.map((tool) => tool.id)).toEqual(before)
  })

  it('drops a tool that matches no term', () => {
    const results = searchTools(CATALOG, 'uuid zzz')

    expect(results.map((tool) => tool.id)).toEqual(['uuid-generator'])
  })

  it('handles a query longer than the catalog by staying bounded', () => {
    const results = searchTools(CATALOG, 'a'.repeat(5000))

    expect(results).toEqual([])
  })
})
