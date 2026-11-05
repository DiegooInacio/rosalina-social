import { useEffect, useRef, useState } from 'react'
import { getUserSubject } from '../../lib/auth'
import { useNavigate } from 'react-router'
import { Button } from './Button'
import { ClearFormButton } from './ClearFormButton'

type Props = {
  isDirty: boolean
  isSubmitting: boolean
  onClear: () => Promise<boolean>
  onSaveDraft: () => Promise<boolean>
  disabled?: boolean
  saveDisabled?: boolean
  submitLabel: string
}

export function FormActions({ isDirty, isSubmitting, onClear, onSaveDraft, disabled = false, saveDisabled = false, submitLabel }: Props) {
  const navigate = useNavigate()
  const generation = useRef(0)
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  useEffect(() => {
    const current = ++generation.current
    if (busy.current) { busy.current = false; setPending(false) }
    return () => { generation.current = current + 1 }
  }, [])
  async function leaveAfter(action: () => Promise<boolean>) {
    if (busy.current) return
    const operation = generation.current
    const owner = getUserSubject()
    busy.current = true
    setPending(true)
    try {
      const saved = await action()
      if (saved && generation.current === operation && getUserSubject() === owner) navigate('/app')
    } finally {
      if (generation.current === operation) { busy.current = false; setPending(false) }
    }
  }
  function confirmDiscard(action: string) {
    return !isDirty || window.confirm(`${action} O preenchimento e o rascunho correspondente serão descartados.`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" loading={isSubmitting} disabled={isSubmitting || pending || disabled || saveDisabled}>{isSubmitting ? 'Salvando...' : submitLabel}</Button>
      <Button type="button" variant="secondary" disabled={isSubmitting || pending || disabled || saveDisabled} onClick={() => void leaveAfter(onSaveDraft)}>Continuar depois</Button>
      <ClearFormButton hasData={isDirty} disabled={isSubmitting || pending || disabled} onClear={onClear} />
      <Button type="button" variant="secondary" disabled={isSubmitting || pending || disabled} onClick={async () => {
        if (confirmDiscard('Cancelar o preenchimento?')) await leaveAfter(onClear)
      }}>Cancelar</Button>
    </div>
  )
}
