import { Button } from './Button'

type Props = {
  hasData: boolean
  disabled?: boolean
  accessibleLabel?: string
  onClear: () => Promise<boolean>
}

export function ClearFormButton({ hasData, disabled, accessibleLabel, onClear }: Props) {
  return <Button type="button" variant="secondary" disabled={disabled} aria-label={accessibleLabel} onClick={async () => {
    if (hasData && !window.confirm('Limpar o formulário? O preenchimento e o rascunho correspondente serão descartados.')) return
    await onClear()
  }}>Limpar formulário</Button>
}
