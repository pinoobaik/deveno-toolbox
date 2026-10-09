import { Suspense, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useToolPreferences } from '@/lib/useToolPreferences'
import { findTool } from '@/tools/registry'

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = findTool(toolId)
  const { recordRecent } = useToolPreferences()

  useDocumentTitle(tool === undefined ? 'Tool not found' : tool.name)

  // Opening a tool is the event that makes it recent. The id is only ever
  // persisted alongside a timestamp -- never anything typed into the tool.
  useEffect(() => {
    if (tool !== undefined) recordRecent(tool.id)
  }, [tool, recordRecent])

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
