import { useNavigate } from 'react-router'
import { Button } from './Button'

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
  function confirmDiscard(action: string) {
    return !isDirty || window.confirm(`${action} O preenchimento e o rascunho correspondente serão descartados.`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={isSubmitting || disabled || saveDisabled}>{isSubmitting ? 'Salvando...' : submitLabel}</Button>
      <Button type="button" variant="secondary" disabled={isSubmitting || disabled || saveDisabled} onClick={async () => {
        if (await onSaveDraft()) navigate('/app')
      }}>Continuar depois</Button>
      <Button type="button" variant="secondary" disabled={isSubmitting || disabled} onClick={async () => {
        if (confirmDiscard('Limpar o formulário?')) await onClear()
      }}>Limpar formulário</Button>
      <Button type="button" variant="secondary" disabled={isSubmitting || disabled} onClick={async () => {
        if (confirmDiscard('Cancelar o preenchimento?') && await onClear()) navigate('/app')
      }}>Cancelar</Button>
    </div>
  )
}
