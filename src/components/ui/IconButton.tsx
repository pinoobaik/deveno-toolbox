import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { type ButtonSize, type ButtonVariant, VARIANT_CLASSES } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * Required: an icon-only control has no visible text, so the accessible
   * name cannot be left for the caller to forget.
   */
  label: string
  icon: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

const SQUARE_CLASSES: Record<ButtonSize, string> = {
  sm: 'size-8',
  md: 'size-9',
}

/**
 * Square, icon-only button. Renders its own `<button>` so the square sizing
 * never collides with `Button`'s horizontal padding classes.
 */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SQUARE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
