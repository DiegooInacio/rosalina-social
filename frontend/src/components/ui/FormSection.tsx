import type { ReactNode } from 'react'

type FormSectionProps = {
  children?: ReactNode
  description?: string
  title: string
}

export function FormSection({ children, description, title }: FormSectionProps) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className={children ? 'mb-5' : ''}>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  )
}
