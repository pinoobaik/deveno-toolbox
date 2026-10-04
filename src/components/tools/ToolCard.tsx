import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import type { ToolDefinition } from '@/types/tool'

interface ToolCardProps {
  tool: ToolDefinition
  className?: string
}

export function ToolCard({ tool, className }: ToolCardProps) {
  const Icon = tool.icon

  return (
    <Link
      to={`/tools/${tool.id}`}
      className={cn(
        'group flex h-full flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4',
        'transition-colors hover:border-neutral-700 hover:bg-neutral-900',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 text-neutral-300 group-hover:text-sky-400"
      >
        <Icon className="size-4.5" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-neutral-100">{tool.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">{tool.description}</p>
      </div>
    </Link>
  )
}
