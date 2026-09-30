import type { LucideIcon } from 'lucide-react'

/** A tool that can be registered in the sidebar / tool index. */
export interface ToolDefinition {
  /** URL segment, e.g. `json-formatter`. */
  readonly id: string
  /** Display name shown in navigation and page titles. */
  readonly name: string
  /** One line summary used on cards and in the tool header. */
  readonly description: string
  readonly icon: LucideIcon
}

/** Every tool component receives its own definition from the tool page. */
export interface ToolComponentProps {
  readonly tool: ToolDefinition
}
