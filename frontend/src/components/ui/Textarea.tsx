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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        ref={ref}
        id={id}
        rows={3}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
})
