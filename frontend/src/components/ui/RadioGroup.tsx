import { forwardRef, type InputHTMLAttributes } from 'react'
import type { SelectOption } from './Select'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'checked' | 'defaultChecked'> & {
  name: string
  label: string
  options: SelectOption[]
  error?: string
}

export const RadioGroup = forwardRef<HTMLInputElement, Props>(function RadioGroup(
  { id, label, options, error, className = '', disabled, ...props }, ref,
) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <fieldset disabled={disabled} aria-describedby={errorId} className={`min-w-0 ${className}`}>
      <legend className="mb-1.5 text-sm font-medium text-body">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {[...options, { value: '', label: 'Não informado' }].map((option, index) => (
          <label key={option.value} className="relative cursor-pointer has-disabled:cursor-not-allowed">
            <input
              {...props}
              ref={ref}
              id={`${id}-${index}`}
              type="radio"
              value={option.value}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              aria-describedby={errorId}
              className="peer sr-only"
            />
            <span className={`flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-secondary transition-colors peer-enabled:hover:bg-canvas peer-checked:border-selected peer-checked:bg-success-soft peer-checked:text-link peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${error ? 'border-danger' : 'border-control'}`}>
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className="mt-1 text-sm text-danger">{error}</p>}
    </fieldset>
  )
})
