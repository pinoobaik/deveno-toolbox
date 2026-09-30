import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string | undefined
  action?: ReactNode
  className?: string | undefined
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-800 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="text-neutral-600">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-300">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-neutral-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
