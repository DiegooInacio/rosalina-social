import { forwardRef, useCallback, useRef, type SelectHTMLAttributes } from 'react'

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
  { error, id, label, options, placeholder = 'Selecione', className = '', required, disabled, value, defaultValue, ...props },
  ref,
) {
  const errorId = error && id ? `${id}-error` : undefined
  const selectRef = useRef<HTMLSelectElement | null>(null)
  const setRef = useCallback((element: HTMLSelectElement | null) => {
    selectRef.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }, [ref])
  const isRequired = required || props['aria-required'] === true || props['aria-required'] === 'true'

  function clearSelection() {
    const select = selectRef.current
    if (!select || select.disabled || select.matches(':disabled')) return
    select.value = ''
    select.dispatchEvent(new Event('change', { bubbles: true }))
    select.focus()
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-body">
        {label}
      </label>
      <div className="group/select relative min-w-0">
        <select
          {...props}
          ref={setRef}
          id={id}
          required={isRequired}
          disabled={disabled}
          value={value}
          defaultValue={value === undefined ? defaultValue ?? '' : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={[props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined}
          className={`min-h-11 min-w-0 w-full appearance-none rounded-lg border bg-surface py-2 pl-3 pr-11 text-foreground disabled:bg-subtle disabled:text-muted ${
            error ? 'border-danger' : 'border-control'
          } ${className}`}
        >
          <option value="" hidden disabled>{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted ${!isRequired ? "group-has-[option:checked:not([value=''])]/select:hidden" : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
        {!isRequired && <button type="button" disabled={disabled} onClick={clearSelection}
          aria-label={`Limpar seleção de ${label}`} title="Limpar seleção"
          className="absolute inset-y-0 right-0 hidden w-11 items-center justify-center rounded-r-lg text-muted hover:text-foreground focus-visible:outline-offset-[-3px] disabled:text-muted group-has-[option:checked:not([value=''])]/select:inline-flex">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
})
