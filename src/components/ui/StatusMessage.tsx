import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { StatusTone } from '@/types/common'

const TONE_CLASSES: Record<StatusTone, string> = {
  info: 'border-neutral-800 bg-neutral-900/60 text-neutral-300',
  success: 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300',
  warning: 'border-amber-900/70 bg-amber-950/40 text-amber-300',
  danger: 'border-red-900/70 bg-red-950/40 text-red-300',
}

const TONE_ICONS: Record<StatusTone, ReactNode> = {
  info: <Info className="size-4" />,
  success: <CircleCheck className="size-4" />,
  danger: <CircleAlert className="size-4" />,
  warning: <TriangleAlert className="size-4" />,
}

const TONE_LABELS: Record<StatusTone, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
}

interface StatusMessageProps {
  tone: StatusTone
  title?: string
  children: ReactNode
  className?: string
}

/**
 * Communicates status using an icon plus a text label, so meaning is never
 * carried by color alone.
 */
export function StatusMessage({ tone, title, children, className }: StatusMessageProps) {
  const icon = TONE_ICONS[tone]

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {title ?? TONE_LABELS[tone]}
          {title ? null : <span className="sr-only">:</span>}
        </p>
        <div className="mt-0.5 break-words text-neutral-400">{children}</div>
      </div>
    </div>
  )
}
