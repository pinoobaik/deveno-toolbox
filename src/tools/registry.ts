import { Braces, Clock, FingerprintPattern } from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

import type { ToolCategory, ToolComponentProps, ToolDefinition } from '@/types/tool'

/**
 * Single source of truth for navigation, routing and the tool index.
 * Adding a tool means adding one folder under `src/tools` and one entry here.
 */
export interface ToolEntry extends ToolDefinition {
  readonly component: LazyExoticComponent<ComponentType<ToolComponentProps>>
  readonly category: ToolCategory
}

export const tools: readonly ToolEntry[] = [
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, minify and validate JSON with clear error messages.',
    icon: Braces,
    category: 'data',
    component: lazy(() => import('./json-formatter/JsonFormatter')),
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate version 4 UUIDs one at a time or in batches.',
    icon: FingerprintPattern,
    category: 'developer',
    component: lazy(() => import('./uuid-generator/UuidGenerator')),
  },
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and human readable dates.',
    icon: Clock,
    category: 'developer',
    component: lazy(() => import('./timestamp-converter/TimestampConverter')),
  },
]

export function findTool(id: string | undefined): ToolEntry | undefined {
  return tools.find((tool) => tool.id === id)
}
