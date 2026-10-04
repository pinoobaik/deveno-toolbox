import { useId, type InputHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hideLabel?: boolean
  description?: string | undefined
  errorMessage?: string | undefined
  containerClassName?: string | undefined
}

export function TextField({
  label,
  hideLabel = false,
  description,
  errorMessage,
  className,
  containerClassName,
  id,
  ...props
}: TextFieldProps) {
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

      <input
        id={fieldId}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-9 w-full rounded-md border bg-neutral-900 px-3 text-sm text-neutral-100',
          'placeholder:text-neutral-600',
          errorMessage
            ? 'border-red-800 focus:border-red-500'
            : 'border-neutral-800 focus:border-neutral-600',
          className,
        )}
        {...props}
      />

      {errorMessage ? (
        <p id={errorId} className="text-xs text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
