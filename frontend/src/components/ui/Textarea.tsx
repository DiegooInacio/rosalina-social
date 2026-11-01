import { forwardRef, type TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, id, label, className = '', ...props }, ref,
) {
  const errorId = error && id ? `${id}-error` : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-body">{label}</label>
      <textarea
        ref={ref}
        id={id}
        rows={3}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`w-full rounded-lg border bg-surface px-3 py-2 text-foreground placeholder:text-placeholder disabled:bg-subtle disabled:text-muted ${error ? 'border-danger' : 'border-control'} ${className}`}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
})
