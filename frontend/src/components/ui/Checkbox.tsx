import { forwardRef, type InputHTMLAttributes } from 'react'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, label, className = '', ...props },
  ref,
) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={`h-5 w-5 rounded border-slate-300 accent-brand-600 ${className}`}
        {...props}
      />
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
    </div>
  )
})