import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconEnd?: ReactNode
}

/** Shared so `IconButton` can reuse the same variants without restyling them. */
export const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-600 text-white hover:bg-sky-500 active:bg-sky-600 disabled:hover:bg-sky-600',
  secondary:
    'border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800 active:bg-neutral-800',
  ghost: 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 active:bg-neutral-800',
  danger:
    'border border-red-900/70 bg-red-950/40 text-red-300 hover:border-red-800 hover:bg-red-950/70 active:bg-red-950',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconEnd,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {iconEnd}
    </button>
  )
}
