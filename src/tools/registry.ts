import { Braces, Clock, FingerprintPattern } from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

import { TOOL_CATEGORIES, type ToolCategoryDescriptor } from '@/tools/categories'
import type { ToolCategoryId, ToolComponentProps, ToolDefinition } from '@/types/tool'

/**
 * Single source of truth for routing, navigation, and the tool index.
 * Adding a tool means adding one folder under `src/tools` and one entry here.
 */
export interface ToolEntry extends ToolDefinition {
  readonly component: LazyExoticComponent<ComponentType<ToolComponentProps>>
}

/**
 * Declaration order is the default catalog order used by the home page. Group
 * by category rather than by prefix so related tools stay adjacent.
 */
export const tools: readonly ToolEntry[] = [
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, minify and validate JSON with clear error messages.',
    icon: Braces,
    category: 'data',
    keywords: [
      'json',
      'format',
      'pretty print',
      'beautify',
      'minify',
      'validate',
      'sort keys',
      'parser',
    ],
    component: lazy(() => import('./json-formatter/JsonFormatter')),
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate version 4 UUIDs one at a time or in batches.',
    icon: FingerprintPattern,
    category: 'generators',
    keywords: ['uuid', 'guid', 'v4', 'random', 'identifier', 'unique id'],
    component: lazy(() => import('./uuid-generator/UuidGenerator')),
  },
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and human readable dates.',
    icon: Clock,
    category: 'converters',
    keywords: [
      'timestamp',
      'unix',
      'epoch',
      'date',
      'time',
      'iso 8601',
      'utc',
      'timezone',
    ],
    component: lazy(() => import('./timestamp-converter/TimestampConverter')),
  },
]

const toolsById = new Map(tools.map((tool) => [tool.id, tool]))

export function findTool(id: string | undefined): ToolEntry | undefined {
  if (id === undefined) return undefined
  return toolsById.get(id)
}

/** Every available tool in one category, in catalog order. */
export function toolsInCategory(categoryId: ToolCategoryId): readonly ToolEntry[] {
  return tools.filter((tool) => tool.category === categoryId)
}

/**
 * Tool count per category. The key set is derived from `TOOL_CATEGORIES`, so a
 * new category is counted without restating its id here.
 */
export function countToolsByCategory(): ReadonlyMap<ToolCategoryId, number> {
  const counts = new Map<ToolCategoryId, number>(
    TOOL_CATEGORIES.map((category) => [category.id, 0]),
  )

  for (const tool of tools) {
    counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1)
  }

  return counts
}

/**
 * Categories that currently have at least one tool, in declared order. Callers
 * should render this rather than `TOOL_CATEGORIES` so a category is never shown
 * as an empty, dead heading.
 */
export function categoriesWithTools(): readonly ToolCategoryDescriptor[] {
  const counts = countToolsByCategory()

  return TOOL_CATEGORIES.filter((category) => (counts.get(category.id) ?? 0) > 0)
}