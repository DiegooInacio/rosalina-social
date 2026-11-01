import { forwardRef, type SelectHTMLAttributes } from 'react'

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: SelectOption[]
  error?: string
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, id, label, options, placeholder = 'Selecione', className = '', ...props },
  ref,
) {
  const errorId = error && id ? `${id}-error` : undefined

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-body">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`min-h-11 w-full rounded-lg border bg-surface px-3 py-2 text-foreground disabled:bg-subtle disabled:text-muted ${
          error ? 'border-danger' : 'border-control'
        } ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
})
