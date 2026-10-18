import { useNavigate } from 'react-router'
import { Button } from './Button'

type Props = {
  isDirty: boolean
  isSubmitting: boolean
  onClear: () => void
  submitLabel: string
}

export function FormActions({ isDirty, isSubmitting, onClear, submitLabel }: Props) {
  const navigate = useNavigate()
  function confirmDiscard(action: string) {
    return !isDirty || window.confirm(`${action} As informações preenchidas e ainda não salvas serão descartadas.`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : submitLabel}</Button>
      <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => {
        if (confirmDiscard('Limpar o formulário?')) onClear()
      }}>Limpar formulário</Button>
      <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => {
        if (confirmDiscard('Cancelar o preenchimento?')) navigate('/app')
      }}>Cancelar</Button>
    </div>
  )
}
