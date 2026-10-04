import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}

export function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-neutral-800 bg-neutral-900/40',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-neutral-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn('px-4 py-4', className)}>{children}</div>
}
