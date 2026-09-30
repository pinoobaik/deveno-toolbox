import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { ToolDefinition } from '@/types/tool'

interface ToolLayoutProps {
  tool: ToolDefinition
  /** Optional toolbar rendered under the tool header. */
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Shared shell for every tool: icon, title, description, then content.
 * Keeps tool pages consistent without duplicating markup.
 */
export function ToolLayout({ tool, toolbar, children, className }: ToolLayoutProps) {
  const Icon = tool.icon

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-sky-400"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-50">{tool.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">{tool.description}</p>
        </div>
      </header>

      {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}

      {children}
    </div>
  )
}
