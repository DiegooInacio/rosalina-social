import { Button } from '../../components/ui/Button'
import type { FormDraftController } from './useFormDraft'

export function DraftPanel({ draft, onRetryComplete }: { draft: FormDraftController; onRetryComplete: () => void }) {
  if (draft.phase === 'loading') return <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm text-secondary" aria-live="polite">Buscando rascunhos...</p>
  if (draft.phase === 'load-error') return <div className="mt-6 rounded-lg border border-danger-line bg-danger-soft p-4">
    <p role="alert" className="text-sm text-danger-strong">Não foi possível recuperar os rascunhos. {draft.error}</p>
    <Button type="button" variant="secondary" className="mt-3" onClick={() => void draft.retryLoad()}>Tentar buscar rascunhos novamente</Button>
  </div>
  if (draft.uncertain) return <div className="mt-6 rounded-lg border border-warning-line bg-warning-soft p-4">
    <p role="alert" className="text-sm text-warning">Não foi possível confirmar a conclusão. Verifique o resultado antes de editar ou descartar, para evitar cadastrar a mesma pessoa duas vezes.</p>
    <Button type="button" variant="secondary" className="mt-3" disabled={draft.action !== 'none'} onClick={onRetryComplete}>Verificar conclusão</Button>
  </div>

  if (draft.saveState === 'conflict') return <div className="mt-6 rounded-lg border border-warning-line bg-warning-soft p-4">
    <p role="alert" className="text-sm text-warning">{draft.error}</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <Button type="button" variant="secondary" onClick={() => void draft.loadServer()}>Carregar versão do servidor</Button>
      <Button type="button" variant="secondary" onClick={() => void draft.saveAsCopy()}>Salvar meu preenchimento como outro rascunho</Button>
    </div>
  </div>

  const text = draft.action === 'discard' ? 'Descartando rascunho...' : draft.action === 'complete' ? 'Concluindo cadastro...' : {
    idle: 'O rascunho será salvo automaticamente enquanto você preenche.',
    pending: 'Há alterações aguardando salvamento.', saving: 'Salvando rascunho...',
    saved: `Rascunho salvo${draft.savedAt ? ` às ${new Date(draft.savedAt).toLocaleTimeString('pt-BR')}` : ''}.`,
    error: draft.error, conflict: draft.error,
  }[draft.saveState]
  return <div className="@container mt-6 space-y-3">
    <div className={`grid items-center gap-3 rounded-lg border p-4 text-sm @xl:grid-cols-[minmax(0,1fr)_15rem] ${draft.saveState === 'error' ? 'border-danger-line bg-danger-soft text-danger-strong' : 'border-success-line bg-success-soft text-link'}`}>
      <p aria-live="polite" aria-atomic="true" className="flex min-h-11 items-center">{text}</p>
      <Button type="button" variant="secondary" className="w-full" loading={draft.saveState === 'saving'}
        disabled={!draft.canEdit || !['pending', 'error'].includes(draft.saveState) || draft.action !== 'none'}
        onClick={() => void draft.flush()}>Salvar rascunho agora</Button>
    </div>
    <p className="text-sm text-secondary">Este preenchimento fica salvo como rascunho. Para recomeçar, use Limpar formulário.</p>
    {draft.choices.some((item) => item.id !== draft.activeDraftId) && <details className="rounded-lg border border-line bg-surface p-4">
      <summary className="min-h-11 cursor-pointer rounded-md px-2 py-2 text-sm font-medium text-body transition-colors hover:bg-canvas">Outros rascunhos salvos</summary>
      <ul className="mt-3 divide-y divide-line">{draft.choices.filter((item) => item.id !== draft.activeDraftId).map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="text-sm font-semibold text-foreground">{item.title || 'Rascunho sem nome'}</p><p className="mt-1 text-xs text-muted">Atualizado em {new Date(item.updatedAt).toLocaleString('pt-BR')}</p></div>
        <Button type="button" variant="secondary" disabled={draft.action !== 'none'} aria-label={`Continuar ${item.title || 'rascunho sem nome'}`} onClick={() => void draft.resume(item.id)}>Continuar</Button>
      </li>)}</ul>
    </details>}
  </div>
}
