import { Button } from '../../components/ui/Button'

export function EditorActions({ busy, dirty, cancel }: { busy: boolean; dirty: boolean; cancel: () => void }) {
  return <div className="flex flex-wrap gap-3">
    <Button type="submit" loading={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</Button>
    <Button type="button" variant="secondary" disabled={busy} onClick={() => {
      if (!dirty || window.confirm('Cancelar a edição? As alterações desta edição serão descartadas.')) cancel()
    }}>Cancelar edição</Button>
  </div>
}
