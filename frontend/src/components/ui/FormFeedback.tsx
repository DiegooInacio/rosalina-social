import { useEffect, useRef } from 'react'
import { Button } from './Button'

export type FormMessage = { type: 'success' | 'error'; text: string }

export function FormFeedback({ message, hasErrors }: { message: FormMessage | null; hasErrors: boolean }) {
  const feedbackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (message) feedbackRef.current?.focus()
  }, [message])

  if (!message) return null

  return (
    <div
      ref={feedbackRef}
      tabIndex={-1}
      role={message.type === 'success' ? 'status' : 'alert'}
      className={`rounded-lg px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'bg-success text-link' : 'bg-danger-soft text-danger-strong'}`}
    >
      <p>{message.text}</p>
      {message.type === 'error' && hasErrors && (
        <Button type="button" variant="secondary" className="mt-3" onClick={(event) => {
          const field = event.currentTarget.form?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled), [data-form-error]')
          field?.focus()
          const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          field?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
        }}>
          Revisar primeiro campo com erro
        </Button>
      )}
    </div>
  )
}
