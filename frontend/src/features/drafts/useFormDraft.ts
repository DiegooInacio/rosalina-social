import { useEffect, useRef, useState } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { ApiError } from '../../lib/api'
import { getUserSubject } from '../../lib/auth'
import { completeDraft, createDraft, discardDraft, getDraft, listDrafts, updateDraft, type DraftCompletion, type DraftSummary, type FormDraft, type FormType } from './drafts.api'
import { draftStorageKey, readPending, writePending, type PendingDraft } from './draft-storage'

type Phase = 'loading' | 'choose' | 'ready' | 'load-error'
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict'
type State = {
  phase: Phase; saveState: SaveState; choices: DraftSummary[]; hasLocal: boolean
  hasDraft: boolean; action: 'none' | 'discard' | 'complete'; uncertain: boolean; error: string; savedAt?: string
}

export type FormDraftController = State & {
  canEdit: boolean; canSubmit: boolean
  retryLoad: () => Promise<void>; resume: (id?: string) => Promise<void>; startNew: () => void
  flush: () => Promise<boolean>; discard: () => Promise<boolean>
  complete: (submission: object) => Promise<DraftCompletion>
  loadServer: () => Promise<void>; saveAsCopy: () => Promise<void>
}

export function useFormDraft<T extends FieldValues>(formType: FormType, methods: UseFormReturn<T>,
  getDefaults: () => T, restore: (data: Record<string, unknown>) => T): FormDraftController {
  const [state, setState] = useState<State>({ phase: 'loading', saveState: 'idle', choices: [], hasLocal: false, hasDraft: false, action: 'none', uncertain: false, error: '' })
  const session = useRef({
    draft: null as FormDraft | null, latest: structuredClone(methods.getValues()),
    ack: JSON.stringify(methods.getValues()), blocked: false, paused: false, suppress: false,
    submission: undefined as object | undefined, key: draftStorageKey(formType), owner: getUserSubject(),
    local: readPending(draftStorageKey(formType)), active: false, ready: false,
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
    if (!session.owner || session.owner !== getUserSubject()) throw new Error('Entre novamente com o usuário deste preenchimento para continuar.')
  }
  function storePending() {
    const existing = readPending(session.key)
    if (!session.active && existing && JSON.stringify(existing.data) !== JSON.stringify(session.latest)) return
    const pending = session.blocked || JSON.stringify(session.latest) !== session.ack || session.submission
    const value: PendingDraft | null = pending ? {
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
      : error instanceof ApiError ? error.message : fallback })
  }
  async function saveSnapshot(force = false) {
    assertOwner()
    if (session.blocked) throw new Error('Resolva o conflito do rascunho antes de continuar.')
    if (session.submission) throw new Error('Confirme a conclusão anterior antes de continuar.')
    const snapshot = structuredClone(session.latest)
    const raw = JSON.stringify(snapshot)
    if (raw === session.ack && (!force || session.draft)) return
    change({ saveState: 'saving', error: '' })
    try {
      session.draft = session.draft ? await updateDraft(session.draft, snapshot, title(snapshot)) : await createDraft(formType, snapshot, title(snapshot))
      session.ack = raw
      storePending()
      change({ hasDraft: true, saveState: JSON.stringify(session.latest) === raw ? 'saved' : 'pending', savedAt: session.draft.updatedAt })
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
    session.draft = null
    session.blocked = false
    session.submission = undefined
    session.ready = true
    const defaults = options.getDefaults()
    session.ack = JSON.stringify(defaults)
    applyValues(defaults)
    storePending()
    change({ phase: 'ready', saveState: 'idle', hasLocal: false, hasDraft: false, uncertain: false, error: '', savedAt: undefined })
  }

  async function load(isCancelled = () => false) {
    change({ phase: 'loading', error: '' })
    try {
      assertOwner()
      const result = await listDrafts(formType)
      if (isCancelled()) return
      session.local = readPending(session.key) ?? session.local
      if (session.local || result.content.length) {
        change({ phase: 'choose', choices: result.content, hasLocal: Boolean(session.local) })
      } else fresh()
    } catch (error) {
      if (!isCancelled()) change({ phase: 'load-error', error: error instanceof Error ? error.message : 'Não foi possível buscar os rascunhos.' })
    }
  }

  async function resume(id?: string, replaceLocal = false) {
    if (!replaceLocal && id && session.local && !window.confirm('Recuperar este rascunho do servidor? As alterações pendentes desta aba serão substituídas.')) return
    change({ phase: 'loading', error: '' })
    try {
      assertOwner()
      const local = id === undefined ? session.local : null
      const draftId = id ?? local?.id
      let missing = false
      const remote = draftId ? await getDraft(draftId).catch((error: unknown) => {
        if (local && error instanceof ApiError && error.status === 404) { missing = true; return null }
        throw error
      }) : null
      if (remote && remote.formType !== formType) throw new Error('Este rascunho pertence a outro formulário.')
      // Uma resposta perdida de conclusão precisa ser confirmada antes de criar outro cadastro.
      session.draft = remote
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
      change({ phase: 'ready', hasLocal: false, hasDraft: Boolean(remote), uncertain: Boolean(session.submission),
        saveState: session.blocked ? 'conflict' : JSON.stringify(restored) === session.ack ? (remote ? 'saved' : 'idle') : 'pending',
        savedAt: remote?.updatedAt,
        error: session.blocked ? remote?.status === 'COMPLETED'
          ? 'Este rascunho já foi concluído em outra sessão. O preenchimento desta aba foi mantido. Salvar uma cópia iniciará outro cadastro.'
          : 'Há uma versão diferente no servidor. Escolha qual preenchimento continuar sem sobrescrever dados.' : '' })
      schedule()
    } catch (error) { change({ phase: 'load-error', error: error instanceof Error ? error.message : 'Não foi possível recuperar o rascunho.' }) }
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
    session.blocked = false
    session.ack = ''
    storePending()
    await flush()
  }

  useEffect(() => {
    session.active = true
    let cancelled = false
    void load(() => cancelled)
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
    retryLoad: () => load(), resume, startNew: () => { if (!session.local) fresh() }, flush, discard, complete, loadServer, saveAsCopy,
  }
}
