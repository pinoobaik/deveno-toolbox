import type { LucideIcon } from 'lucide-react'

/**
 * Every category a tool can belong to. Adding one here forces a descriptor in
 * `src/tools/categories.ts` and a review of the tool list, so a category can
 * never be referenced without a label or an icon.
 */
export type ToolCategoryId =
  | 'encoding'
  | 'data'
  | 'text'
  | 'generators'
  | 'converters'
  | 'developer'

/** A tool that can be registered in the sidebar / tool index. */
export interface ToolDefinition {
  /** URL segment, e.g. `json-formatter`. */
  readonly id: string
  /** Display name shown in navigation and page titles. */
  readonly name: string
  /** One line summary used on cards and in the tool header. */
  readonly description: string
  readonly icon: LucideIcon
  /** Grouping used by the home page and navigation. */
  readonly category: ToolCategoryId
  /**
   * Extra search terms that are not already in the name or description, all
   * lowercase. Surfaced by tool search and used as accessibility hints.
   */
  readonly keywords: readonly string[]
}

/** Every tool component receives its own definition from the tool page. */
export interface ToolComponentProps {
  readonly tool: ToolDefinition
}