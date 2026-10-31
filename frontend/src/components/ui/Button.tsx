import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function Button({
  className = '',
  variant = 'primary',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-brand-600 text-white enabled:hover:bg-brand-700 enabled:active:bg-brand-700',
    secondary: 'border border-control bg-surface text-body enabled:hover:bg-canvas enabled:active:bg-subtle',
  }

  return (
    <button
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || props['aria-busy']}
    >
      {loading && <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />}
      {children}
    </button>
  )
}
