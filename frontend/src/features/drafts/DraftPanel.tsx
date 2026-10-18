import { Button } from '../../components/ui/Button'
import type { FormDraftController } from './useFormDraft'

export function DraftPanel({ draft, onRetryComplete }: { draft: FormDraftController; onRetryComplete: () => void }) {
  if (draft.phase === 'loading') return <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600" aria-live="polite">Buscando rascunhos...</p>
  if (draft.phase === 'load-error') return <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
    <p role="alert" className="text-sm text-red-700">Não foi possível recuperar os rascunhos. {draft.error}</p>
    <Button type="button" variant="secondary" className="mt-3" onClick={() => void draft.retryLoad()}>Tentar buscar rascunhos novamente</Button>
  </div>
  if (draft.phase === 'choose') return <section className="mt-6 space-y-4 rounded-xl border border-brand-100 bg-white p-5" aria-label="Recuperação de rascunho">
    <div><h2 className="font-semibold text-slate-950">Continuar um preenchimento?</h2><p className="mt-1 text-sm text-slate-600">Seus rascunhos ainda não são cadastros concluídos.</p></div>
    {draft.hasLocal && <div className="rounded-lg bg-brand-50 p-4">
      <p className="text-sm text-brand-700">Há alterações desta aba que ainda precisam ser confirmadas no servidor.</p>
      <Button type="button" className="mt-3" onClick={() => void draft.resume()}>Recuperar preenchimento desta aba</Button>
    </div>}
    {!draft.hasLocal && <ul className="divide-y divide-slate-200">{draft.choices.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><p className="text-sm font-semibold text-slate-900">{item.title || 'Rascunho sem nome'}</p><p className="mt-1 text-xs text-slate-500">Atualizado em {new Date(item.updatedAt).toLocaleString('pt-BR')}</p></div>
      <Button type="button" variant="secondary" aria-label={`Continuar ${item.title || 'rascunho sem nome'}`} onClick={() => void draft.resume(item.id)}>Continuar</Button>
    </li>)}</ul>}
    {!draft.hasLocal && <Button type="button" variant="secondary" onClick={draft.startNew}>Começar outro formulário</Button>}
  </section>

  if (draft.uncertain) return <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
    <p role="alert" className="text-sm text-amber-900">Não foi possível confirmar a conclusão. Verifique o resultado antes de editar ou descartar, para evitar cadastrar a mesma pessoa duas vezes.</p>
    <Button type="button" variant="secondary" className="mt-3" disabled={draft.action !== 'none'} onClick={onRetryComplete}>Verificar conclusão</Button>
  </div>

  if (draft.saveState === 'conflict') return <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
    <p role="alert" className="text-sm text-amber-900">{draft.error}</p>
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
  return <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm ${draft.saveState === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-brand-100 bg-brand-50 text-brand-700'}`}>
    <p aria-live="polite">{text}</p>
    {['pending', 'error'].includes(draft.saveState) && draft.action === 'none' && <Button type="button" variant="secondary" onClick={() => void draft.flush()}>Salvar rascunho agora</Button>}
  </div>
}
