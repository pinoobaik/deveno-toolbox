import { Suspense } from 'react'
import { useParams } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { findTool } from '@/tools/registry'

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = findTool(toolId)

  useDocumentTitle(tool === undefined ? 'Tool not found' : tool.name)

  if (!tool) {
    return (
      <EmptyState
        titleAs="h1"
        title="Tool not found"
        description={`There is no tool registered with the id "${toolId ?? ''}".`}
      />
    )
  }

  const ToolComponent = tool.component

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading tool">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-800/60" />
          <div className="h-64 animate-pulse rounded-lg bg-neutral-800/40" />
        </div>
      }
    >
      <ToolComponent tool={tool} />
    </Suspense>
  )
}

export default ToolPage
