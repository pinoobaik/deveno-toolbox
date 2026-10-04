import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  /**
   * Use `1` for page level empty or error states so the page still exposes a
   * heading. The default is used inside cards, below the card heading.
   */
  titleAs?: 'h1' | 'h2'
  description?: string | undefined
  action?: ReactNode
  className?: string | undefined
}

export function EmptyState({
  icon,
  title,
  titleAs = 'h2',
  description,
  action,
  className,
}: EmptyStateProps) {
  const headingClassName =
    titleAs === 'h1' ? 'text-xl font-medium text-neutral-300' : 'text-sm font-medium text-neutral-300'

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
        {titleAs === 'h1' ? (
          <h1 className={headingClassName}>{title}</h1>
        ) : (
          <h2 className={headingClassName}>{title}</h2>
        )}
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-neutral-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}