import { useMemo } from 'react'

import { ToolCard } from '@/components/tools/ToolCard'
import { tools } from '@/tools/registry'
import { findRelatedTools } from '@/tools/related'
import type { ToolDefinition } from '@/types/tool'

interface RelatedToolsProps {
  tool: ToolDefinition
}

/**
 * "Related tools" for one tool, derived from the catalog rather than a
 * hand-maintained list.
 *
 * Renders nothing when there is nothing to suggest -- an empty tool page never
 * grows a container that says so -- so the slot is safe to leave in place for
 * every tool.
 */
export function RelatedTools({ tool }: RelatedToolsProps) {
  const related = useMemo(() => findRelatedTools(tools, tool.id), [tool.id])

  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-tools-heading" className="flex flex-col gap-4">
      <h2 id="related-tools-heading" className="text-sm font-semibold text-neutral-100">
        Related tools
        <span className="ml-2 text-xs font-normal text-neutral-500">{related.length}</span>
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {related.map((relatedTool) => (
          <li key={relatedTool.id}>
            <ToolCard tool={relatedTool} />
          </li>
        ))}
      </ul>
    </section>
  )
}
