import { useEffect, useRef, useState } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { ApiError } from '../../lib/api'
import { getUserSubject } from '../../lib/auth'
import { localFormDataRevision } from '../../lib/local-form-data'
import { completeDraft, createDraft, discardDraft, getDraft, listDrafts, updateDraft, type DraftCompletion, type DraftSummary, type FormDraft, type FormType } from './drafts.api'
import { draftStorageKey, readPending, writePending, type PendingDraft } from './draft-storage'

type Phase = 'loading' | 'ready' | 'load-error'
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict'
type State = {
  phase: Phase; saveState: SaveState; choices: DraftSummary[]; activeDraftId?: string
  hasDraft: boolean; action: 'none' | 'discard' | 'complete'; uncertain: boolean; error: string; savedAt?: string
}

export type FormDraftController = State & {
  canEdit: boolean; canSubmit: boolean
  retryLoad: () => Promise<void>; resume: (id?: string) => Promise<void>
  flush: () => Promise<boolean>; discard: () => Promise<boolean>
  complete: (submission: object) => Promise<DraftCompletion>
  retryCompletion: () => Promise<DraftCompletion>
  loadServer: () => Promise<void>; saveAsCopy: () => Promise<void>
}

export function useFormDraft<T extends FieldValues>(formType: FormType, methods: UseFormReturn<T>,
  getDefaults: () => T, restore: (data: Record<string, unknown>) => T, enabled = true): FormDraftController {
  const [state, setState] = useState<State>({ phase: enabled ? 'loading' : 'ready', saveState: 'idle', choices: [], hasDraft: false, action: 'none', uncertain: false, error: '' })
  const session = useRef({
    draft: null as FormDraft | null, creationId: undefined as string | undefined, latest: structuredClone(methods.getValues()),
    ack: JSON.stringify(methods.getValues()), blocked: false, paused: false, suppress: false,
    submission: undefined as object | undefined, key: draftStorageKey(formType), owner: getUserSubject(),
    local: readPending(draftStorageKey(formType)), active: false, ready: false, privacyRevision: localFormDataRevision(),
  }).current
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const completing = useRef<Promise<DraftCompletion> | null>(null)
  const options = useRef({ getDefaults, restore }).current

  function change(update: Partial<State>) {
    if (session.active) setState((previous) => ({ ...previous, ...update }))
  }
  function enqueue<R>(work: () => Promise<R>): Promise<R> {
    const result = queue.current.catch(() => {}).then(work)
    queue.current = result
    return result
  }
  function cancelTimer() { clearTimeout(timer.current); timer.current = undefined }
  function assertOwner() {
    if (session.privacyRevision !== localFormDataRevision()) throw new Error('Este preenchimento foi encerrado ao sair da conta. Reabra o formulário para continuar.')
    if (!session.owner || session.owner !== getUserSubject()) throw new Error('Entre novamente com o usuário deste preenchimento para continuar.')
  }
  function storePending() {
    if (session.privacyRevision !== localFormDataRevision()) return
    const existing = readPending(session.key)
    if (!session.active && existing && JSON.stringify(existing.data) !== JSON.stringify(session.latest)) return
    const pending = session.blocked || JSON.stringify(session.latest) !== session.ack || session.submission || session.creationId
    const value: PendingDraft | null = pending ? {
      creationId: session.creationId,
      id: session.draft?.id, version: session.draft?.version,
      data: session.latest, updatedAt: new Date().toISOString(),
      submission: session.submission as Record<string, unknown> | undefined,
    } : null
    writePending(session.key, value)
    session.local = value
  }
  function title(data: T) {
    return String(formType === 'STUDENT' ? data.name ?? '' : data.responsible?.name ?? '').trim().slice(0, 150)
  }
  function failure(error: unknown, fallback = 'Não foi possível salvar o rascunho. Seu preenchimento continua nesta aba.') {
    if (error instanceof ApiError && [404, 409].includes(error.status)) session.blocked = true
    if (session.blocked) storePending()
    change({ saveState: session.blocked ? 'conflict' : 'error', error: session.blocked
      ? 'Este rascunho foi alterado ou concluído em outro lugar. Seu preenchimento foi preservado nesta aba.'
      : error instanceof ApiError ? `${fallback} ${error.message}` : fallback })
  }
  async function saveSnapshot(force = false) {
    assertOwner()
    if (session.blocked) throw new Error('Resolva o conflito do rascunho antes de continuar.')
    if (session.submission) throw new Error('Confirme a conclusão anterior antes de continuar.')
    const snapshot = structuredClone(session.latest)
    const raw = JSON.stringify(snapshot)
    if (raw === session.ack && (!force || session.draft) && !session.creationId) return
    change({ saveState: 'saving', error: '' })
    try {
      if (session.draft) {
        session.draft = await updateDraft(session.draft, snapshot, title(snapshot))
        assertOwner()
        session.ack = raw
      } else {
        session.creationId ??= crypto.randomUUID()
        storePending()
        session.draft = await createDraft(formType, snapshot, title(snapshot), session.creationId)
        assertOwner()
        session.creationId = undefined
        if (session.draft.status !== 'DRAFT') throw new ApiError('Este rascunho já foi concluído. Confira o cadastro antes de continuar.', 409)
        // A resposta pode confirmar uma criação anterior cujo conteúdo já mudou.
        session.ack = JSON.stringify(options.restore(session.draft.data))
      }
      storePending()
      change({ hasDraft: true, activeDraftId: session.draft.id, saveState: JSON.stringify(session.latest) === session.ack ? 'saved' : 'pending', savedAt: session.draft.updatedAt })
      if (JSON.stringify(session.latest) !== session.ack) schedule()
    } catch (error) { storePending(); failure(error); throw error }
  }
  function schedule() {
    cancelTimer()
    if (!session.ready || session.paused || session.blocked || session.submission) return
    timer.current = setTimeout(() => { void enqueue(() => saveSnapshot()).catch(() => {}) }, 1000)
  }
  function applyValues(value: T) {
    session.suppress = true
    session.latest = structuredClone(value)
    methods.reset(value)
    session.suppress = false
  }
  function fresh() {
    const previousId = session.draft?.id
    session.draft = null
    session.creationId = undefined
    session.blocked = false
    session.submission = undefined
    session.ready = true
    const defaults = options.getDefaults()
    session.ack = JSON.stringify(defaults)
    applyValues(defaults)
    storePending()
    change({ phase: 'ready', saveState: 'idle', activeDraftId: undefined, hasDraft: false, uncertain: false, error: '', savedAt: undefined })
    if (session.active && previousId) setState((previous) => ({ ...previous, choices: previous.choices.filter((draft) => draft.id !== previousId) }))
  }

  async function load(isCancelled = () => false) {
    change({ phase: 'loading', error: '' })
    try {
      assertOwner()
      const result = await listDrafts(formType)
      if (isCancelled()) return
      session.local = readPending(session.key) ?? session.local
      const choices = [...result.content].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      change({ choices })
      if (session.local) await resume(undefined, false, isCancelled)
      else if (choices.length) await resume(choices[0].id, false, isCancelled)
      else fresh()
    } catch (error) {
      if (!isCancelled()) change({ phase: 'load-error', error: error instanceof Error ? error.message : 'Não foi possível buscar os rascunhos.' })
    }
  }

  async function resume(id?: string, replaceLocal = false, isCancelled = () => false) {
    if (!replaceLocal && id && session.local && !window.confirm('Recuperar este rascunho do servidor? As alterações pendentes desta aba serão substituídas.')) return
    cancelTimer()
    session.ready = false
    change({ phase: 'loading', error: '' })
    try {
      assertOwner()
      // Uma atualização já enviada deve terminar antes de trocar de rascunho.
      await queue.current.catch(() => {})
      if (isCancelled()) return
      const local = id === undefined ? session.local : null
      const draftId = id ?? local?.id
      let missing = false
      const remote = draftId ? await getDraft(draftId).catch((error: unknown) => {
        if (local && error instanceof ApiError && error.status === 404) { missing = true; return null }
        throw error
      }) : null
      if (isCancelled()) return
      if (remote && remote.formType !== formType) throw new Error('Este rascunho pertence a outro formulário.')
      // Uma resposta perdida de conclusão precisa ser confirmada antes de criar outro cadastro.
      session.draft = remote
      session.creationId = local?.creationId
      session.submission = local?.submission
      session.blocked = missing || Boolean(remote?.status === 'COMPLETED' && !session.submission)
      const remoteValues = remote?.status === 'DRAFT' ? options.restore(remote.data) : options.getDefaults()
      session.ack = JSON.stringify(remoteValues)
      const restored = local ? options.restore(local.data) : remote?.status === 'COMPLETED' ? session.latest : remoteValues
      applyValues(restored)
      if (local && remote && local.version !== remote.version && JSON.stringify(restored) !== session.ack) {
        if (!session.submission) session.blocked = true
        // Nunca promove silenciosamente a versão de um estado local desatualizado.
        session.draft = { ...remote, version: local.version ?? remote.version }
      }
      session.ready = true
      storePending()
      change({ phase: 'ready', activeDraftId: remote?.id, hasDraft: Boolean(remote), uncertain: Boolean(session.submission),
        saveState: session.blocked ? 'conflict' : JSON.stringify(restored) === session.ack ? (remote ? 'saved' : 'idle') : 'pending',
        savedAt: remote?.updatedAt,
        error: session.blocked ? remote?.status === 'COMPLETED'
          ? 'Este rascunho já foi concluído em outra sessão. O preenchimento desta aba foi mantido. Salvar uma cópia iniciará outro cadastro.'
          : 'Há uma versão diferente no servidor. Escolha qual preenchimento continuar sem sobrescrever dados.' : '' })
      schedule()
    } catch (error) { if (!isCancelled()) change({ phase: 'load-error', error: error instanceof Error ? error.message : 'Não foi possível recuperar o rascunho.' }) }
  }

  async function flush() {
    cancelTimer()
    try {
      await enqueue(async () => {
        do { await saveSnapshot() } while (JSON.stringify(session.latest) !== session.ack && !session.blocked && !session.submission)
      })
      return true
    } catch (error) {
      if (!session.blocked && !session.submission) failure(error)
      return false
    }
  }

  async function discard() {
    if (session.paused || session.submission) return false
    session.paused = true
    cancelTimer()
    change({ action: 'discard' })
    try {
      await enqueue(async () => {
        assertOwner()
        if (!session.draft && session.creationId) {
          session.draft = await createDraft(formType, session.latest, title(session.latest), session.creationId)
          assertOwner()
          session.creationId = undefined
        }
        if (session.draft) {
          try { await discardDraft(session.draft) }
          catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error }
        }
        fresh()
      })
      return true
    } catch (error) {
      session.ack = ''
      storePending()
      failure(error, 'Não foi possível descartar o rascunho. O preenchimento foi mantido.')
      return false
    }
    finally { session.paused = false; change({ action: 'none' }) }
  }

  async function complete(submission: object) {
    if (completing.current) return completing.current
    session.paused = true
    cancelTimer()
    change({ action: 'complete' })
    try {
      const operation = enqueue(async () => {
        assertOwner()
        if (!session.submission) {
          await saveSnapshot(true)
          session.submission = structuredClone(submission)
          storePending()
        }
        try {
          const result = await completeDraft(session.draft!, session.submission)
          fresh()
          return result
        } catch (error) {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            session.submission = undefined
            if ([404, 409].includes(error.status)) failure(error)
            change({ uncertain: false })
          } else change({ uncertain: true })
          storePending()
          throw error
        }
      })
      completing.current = operation
      return await operation
    } finally { completing.current = null; session.paused = false; change({ action: 'none' }) }
  }

  async function loadServer() {
    if (!session.draft || session.submission || !window.confirm('Carregar a versão do servidor? As alterações desta aba serão substituídas.')) return
    // Remove a cópia local somente depois de uma recuperação bem-sucedida.
    await resume(session.draft.id, true)
  }
  async function saveAsCopy() {
    if (session.submission) return
    session.draft = null
    session.creationId = undefined
    session.blocked = false
    session.ack = ''
    storePending()
    await flush()
  }

  useEffect(() => {
    if (!enabled) return
    session.active = true
    let cancelled = false
    // Fast Refresh reexecuta os efeitos preservando refs e estado. Uma sessão
    // já aberta deve apenas retomar a assinatura e o autosave, sem resetar o formulário.
    if (!session.ready) void load(() => cancelled)
    else schedule()
    const subscription = methods.watch(() => {
      if (session.suppress || !session.ready) return
      session.latest = structuredClone(methods.getValues())
      storePending()
      if (!session.blocked && !session.submission) change({ saveState: JSON.stringify(session.latest) === session.ack ? (session.draft ? 'saved' : 'idle') : 'pending' })
      schedule()
    })
    function beforeUnload(event: BeforeUnloadEvent) {
      if (session.blocked || JSON.stringify(session.latest) !== session.ack || session.submission) { event.preventDefault(); event.returnValue = '' }
    }
    function online() { if (session.ready && !session.blocked && !session.submission) void flush() }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('online', online)
    return () => {
      cancelled = true
      session.active = false
      subscription.unsubscribe()
      cancelTimer()
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('online', online)
    }
    // A sessão pertence à instância do formulário; os callbacks usam seus refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ...state,
    canEdit: state.phase === 'ready' && state.action === 'none' && !state.uncertain,
    canSubmit: state.phase === 'ready' && state.action === 'none' && !state.uncertain && state.saveState !== 'conflict',
    retryLoad: () => load(), resume, flush, discard, complete,
    retryCompletion: () => session.submission ? complete(session.submission) : Promise.reject(new Error('Não há conclusão pendente para conferir.')),
    loadServer, saveAsCopy,
  }
}
