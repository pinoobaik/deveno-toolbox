import { Check, Copy, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import type { ButtonSize } from '@/components/ui/Button'
import { useCopyToClipboard } from '@/lib/useCopyToClipboard'

interface CopyButtonProps {
  value: string
  label?: string
  /** Accessible label, used when the button has no visible text. */
  ariaLabel?: string
  size?: ButtonSize
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  disabled?: boolean
}

/**
 * Copies `value` to the clipboard and shows inline state feedback.
 * When no visible label is provided the button becomes icon-only.
 */
export function CopyButton({
  value,
  label,
  ariaLabel,
  size = 'md',
  variant = 'secondary',
  className,
  disabled = false,
}: CopyButtonProps) {
  const { copy, state } = useCopyToClipboard()

  const isDisabled = disabled || value.length === 0
  const isCopied = state === 'copied'
  const isFailed = state === 'error'

  const accessibleLabel = isCopied
    ? `${label ?? 'Value'} copied to clipboard`
    : isFailed
      ? 'Copy failed, please copy manually'
      : (ariaLabel ?? `Copy ${label ?? 'value'}`)

  return (
    <Button
      variant={isFailed ? 'danger' : variant}
      size={size}
      disabled={isDisabled}
      aria-label={label ? undefined : accessibleLabel}
      aria-live={label ? 'polite' : undefined}
      title={label ? accessibleLabel : undefined}
      className={className}
      onClick={() => void copy(value)}
      icon={
        isCopied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : isFailed ? (
          <TriangleAlert className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )
      }
    >
      {label ? (isCopied ? 'Copied' : isFailed ? 'Failed' : label) : null}
    </Button>
  )
}
