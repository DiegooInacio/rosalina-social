import type { ReactNode } from 'react'

type FormSectionProps = {
  children?: ReactNode
  description?: string
  title: string
}

export function FormSection({ children, description, title }: FormSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className={children ? 'mb-5' : ''}>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </section>
  )
}
