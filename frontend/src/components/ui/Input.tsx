import { forwardRef, type InputHTMLAttributes } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, hint, id, label, className = '', 'aria-describedby': describedBy, ...props },
  ref,
) {
  const errorId = error && id ? `${id}-error` : undefined
  const hintId = hint && id ? `${id}-hint` : undefined

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-body">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={[describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={`min-h-11 w-full rounded-lg border bg-surface px-3 py-2 text-foreground placeholder:text-placeholder read-only:bg-subtle disabled:bg-subtle disabled:text-muted ${
          error ? 'border-danger' : 'border-control'
        } ${className}`}
        {...props}
      />
      {hint && <p id={hintId} aria-live="polite" className="mt-1 text-sm text-secondary">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
})
