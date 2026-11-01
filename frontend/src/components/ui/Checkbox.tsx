import { forwardRef, type InputHTMLAttributes } from 'react'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, label, className = '', ...props },
  ref,
) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md text-sm font-medium text-body has-disabled:cursor-not-allowed has-disabled:text-muted">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={`h-5 w-5 shrink-0 rounded border-control accent-control-accent disabled:opacity-60 ${className}`}
        {...props}
      />
      <span>{label}</span>
    </label>
  )
})
