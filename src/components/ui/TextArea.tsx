import { useId, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  /** Hide the visible label but keep it available to screen readers. */
  hideLabel?: boolean
  description?: string | undefined
  errorMessage?: string | undefined
  /** Rendered under the field, right aligned. e.g. `128 chars`. */
  footer?: string | undefined
  containerClassName?: string | undefined
}

export function TextArea({
  label,
  hideLabel = false,
  description,
  errorMessage,
  footer,
  className,
  containerClassName,
  id,
  ...props
}: TextAreaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  const errorId = `${fieldId}-error`

  const describedBy =
    [description ? descriptionId : null, errorMessage ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <label
        htmlFor={fieldId}
        className={cn('text-sm font-medium text-neutral-300', hideLabel && 'sr-only')}
      >
        {label}
      </label>

      {description ? (
        <p id={descriptionId} className="text-xs text-neutral-500">
          {description}
        </p>
      ) : null}

      <textarea
        id={fieldId}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'scrollbar-subtle w-full resize-y rounded-md border bg-neutral-900 px-3 py-2.5 font-mono text-sm text-neutral-100',
          'placeholder:text-neutral-600',
          errorMessage
            ? 'border-red-800 focus:border-red-500'
            : 'border-neutral-800 focus:border-neutral-600',
          className,
        )}
        {...props}
      />

      <div className="flex items-start justify-between gap-3">
        {errorMessage ? (
          <p id={errorId} className="text-xs text-red-300">
            {errorMessage}
          </p>
        ) : (
          <span />
        )}
        {footer ? <p className="text-xs text-neutral-600">{footer}</p> : null}
      </div>
    </div>
  )
}
