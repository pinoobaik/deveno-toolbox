import { findCategory } from '@/tools/categories'
import { findTool } from '@/tools/registry'

/**
 * One step in a breadcrumb trail.
 *
 * `to` is absent on the step that represents the page you are already on, so a
 * renderer can mark it `aria-current="page"` instead of offering a link back to
 * where the user already is.
 */
export interface BreadcrumbItem {
  readonly label: string
  readonly to?: string
}

/**
 * Builds the Home → Category → Tool trail for a tool page.
 *
 * Every label comes from catalog metadata: the tool name from the registry and
 * the category label from `TOOL_CATEGORIES`, so no category name is ever
 * restated here and adding a category needs no edit in this file.
 *
 * Broken metadata degrades the trail instead of throwing. An unregistered id
 * returns an empty trail rather than a half-built one, and a category that is
 * missing its descriptor drops just that step, leaving Home → Tool.
 *
 * Pure: no React, no storage, no DOM. It reads from the registry, which is the
 * same single source of truth the router and sidebar already use.
 */
export function buildToolBreadcrumbs(toolId: string): readonly BreadcrumbItem[] {
  const tool = findTool(toolId)
  if (tool === undefined) return []

  const items: BreadcrumbItem[] = [{ label: 'Home', to: '/' }]

  const category = findCategory(tool.category)
  if (category !== undefined) {
    items.push({ label: category.label, to: `/category/${category.id}` })
  }

  items.push({ label: tool.name })

  return items
}
