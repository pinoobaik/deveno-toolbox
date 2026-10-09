import {
  ArrowLeftRight,
  Braces,
  Code,
  CaseSensitive,
  Dices,
  Terminal,
  type LucideIcon,
} from 'lucide-react'

import type { ToolCategoryId } from '@/types/tool'

/**
 * Presentation and ordering metadata for a tool category.
 *
 * The array order is the display order. Category identity itself lives in the
 * `ToolCategoryId` union so the compiler can catch a mismatch; the label,
 * description, and icon are defined here, once.
 */
export interface ToolCategoryDescriptor {
  readonly id: ToolCategoryId
  readonly label: string
  readonly description: string
  readonly icon: LucideIcon
}

/**
 * Single source of truth for category metadata. Pages and navigation read
 * labels, ordering, and icons from here rather than restating them, so adding
 * a category is one edit.
 */
export const TOOL_CATEGORIES: readonly ToolCategoryDescriptor[] = [
  {
    id: 'encoding',
    label: 'Encoding',
    description: 'Convert data between text and byte representations.',
    icon: Code,
  },
  {
    id: 'data',
    label: 'Data & JSON',
    description: 'Inspect, validate, and reshape structured data.',
    icon: Braces,
  },
  {
    id: 'text',
    label: 'Text',
    description: 'Transform and clean up written content.',
    icon: CaseSensitive,
  },
  {
    id: 'generators',
    label: 'Generators',
    description: 'Produce random values and identifiers.',
    icon: Dices,
  },
  {
    id: 'converters',
    label: 'Converters',
    description: 'Move values between units and representations.',
    icon: ArrowLeftRight,
  },
  {
    id: 'developer',
    label: 'Developer',
    description: 'Utilities for language and runtime concepts.',
    icon: Terminal,
  },
]

/** Resolves a category descriptor from a raw route or stored value. */
export function findCategory(id: string | undefined): ToolCategoryDescriptor | undefined {
  return TOOL_CATEGORIES.find((category) => category.id === id)
}