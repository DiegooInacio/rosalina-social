import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { ApiError, apiRequest } from '../../lib/api'
import { getUserSubject } from '../../lib/auth'
import { localFormDataRevision } from '../../lib/local-form-data'
import { restoreDraftValues } from '../drafts/draft-storage'
import { StudentRegistrationForm } from '../student-registration/StudentRegistrationForm'
import { toStudentRequest } from '../student-registration/student.schema'
import { PopulationSurveyForm } from '../population-survey/PopulationSurveyForm'
import { memberDefaultValues, toPopulationRequest } from '../population-survey/population.schema'
import { studentEditValues, populationEditValues } from './edit-values'
import { recordPath, type RecordData, type RecordKind } from './records.api'
import { useRecordResource } from './useRecordResource'
import { PreservedCatalogs, catalogIds } from '../catalogs/PreservedCatalogs'
import { EditConflictComparison } from './EditConflictComparison'
import { matchesReceipt, type EditReceipt } from './edit-receipt'

function EditSession({ kind, id, record: loadedRecord }: { kind: RecordKind; id: string; record: RecordData }) {
  const [record] = useState(loadedRecord)
  const generation = useRef(0)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [owner] = useState(getUserSubject)
  const [privacyRevision] = useState(localFormDataRevision)
  const key = `rosalina.recordEdit.${encodeURIComponent(owner ?? '')}.${kind}.${id}`
  const original = useMemo(() => kind === 'students' ? studentEditValues(record) : populationEditValues(record), [kind, record])
  const retained = useMemo(() => catalogIds(original), [original])
  const fingerprint = JSON.stringify(original)
  const [backup] = useState(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) ?? 'null')
      return value && typeof value.original === 'string' && value.data && typeof value.data === 'object' && !Array.isArray(value.data)
        ? value as { original: string; data: RecordData; submission?: EditReceipt } : null
    } catch { return null }
  })
  const [receipt, setReceipt] = useState<EditReceipt | null>(() => backup?.submission && typeof backup.submission.revision === 'string' && backup.submission.body ? backup.submission : null)
  const [needsConfirmation, setNeedsConfirmation] = useState(Boolean(receipt))
  const [checking, setChecking] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [conflictingRecord, setConflictingRecord] = useState<RecordData | null>(null)
  const [useServer, setUseServer] = useState(false)
  const pendingReceipt = useRef(receipt)
  useEffect(() => {
    const current = ++generation.current
    // Ao retomar os efeitos, uma operação anterior já não controla esta tela.
    // O recibo permite conferir uma gravação que possa continuar no servidor.
    if (pendingReceipt.current) { setNeedsConfirmation(true); setChecking(false) }
    return () => { generation.current = current + 1 }
  }, [])
  const target = `/app/${kind === 'students' ? 'alunos' : 'levantamentos'}/${id}?${params}`
  function removeBackup() { try { sessionStorage.removeItem(key) } catch { /* Sem cópia disponível. */ } }
  function cancel() { removeBackup(); navigate(target) }
  function assertOwner() {
    if (privacyRevision !== localFormDataRevision()) throw new ApiError('Esta edição foi encerrada ao sair da conta. Reabra a edição para continuar.', 409)
    if (!owner || owner !== getUserSubject()) throw new ApiError('A conta mudou. Entre novamente com o usuário desta edição.', 409)
  }
  function assertCurrent(operation: number) {
    if (generation.current !== operation) throw new ApiError('Esta edição foi encerrada. O preenchimento atual foi preservado.', 409)
    assertOwner()
  }
  function success(operation: number) { assertCurrent(operation); pendingReceipt.current = null; removeBackup(); navigate(target, { replace: true, state: { recordUpdated: true } }) }
  function remember(value: EditReceipt | null) {
    if (privacyRevision !== localFormDataRevision()) return
    pendingReceipt.current = value
    setReceipt(value)
    try {
      const stored = JSON.parse(sessionStorage.getItem(key) ?? 'null')
      sessionStorage.setItem(key, JSON.stringify({ original: stored?.original ?? fingerprint, data: stored?.data ?? original, submission: value ?? undefined }))
    } catch { /* Mantém o recibo em memória se o armazenamento estiver indisponível. */ }
  }
  async function sendReceipt(pending: EditReceipt, operation: number) {
    assertCurrent(operation)
    try {
      await apiRequest(recordPath(kind, id), { method: 'PUT', headers: { 'If-Match': `"${pending.revision}"` }, body: JSON.stringify(pending.body) })
      success(operation)
    } catch (error) {
      assertCurrent(operation)
      if (error instanceof ApiError && (error.status >= 500 || (error.status === 409 && !Object.keys(error.fields).length))) {
        try {
          assertCurrent(operation)
          const current = await apiRequest<RecordData>(recordPath(kind, id))
          assertCurrent(operation)
          if (matchesReceipt(kind, current, pending)) { success(operation); return }
          if (current.revision !== pending.revision) setConflictingRecord(current)
        } catch { /* A conferência pode falhar também; não perde o pedido enviado. */ }
        assertCurrent(operation)
        setNeedsConfirmation(true)
      } else { remember(null); setNeedsConfirmation(false) }
      throw error
    }
  }
  async function save(body: unknown) {
    const operation = generation.current
    assertCurrent(operation)
    const current = await apiRequest<RecordData>(recordPath(kind, id))
    assertCurrent(operation)
    const currentValues = kind === 'students' ? studentEditValues(current) : populationEditValues(current)
    if (JSON.stringify(currentValues) !== fingerprint || current.revision !== record.revision) throw new ApiError('Este cadastro mudou em outra sessão. Suas alterações foram preservadas nesta aba. Recarregue a edição para conferir a versão atual.', 409)
    if (typeof record.revision !== 'string' || !record.revision) throw new ApiError('O servidor não informou a versão do cadastro. Atualize o servidor e reabra a edição.', 502)
    const pending = { revision: record.revision, body: body as RecordData }
    remember(pending)
    setChecking(true)
    try { await sendReceipt(pending, operation) }
    finally { if (generation.current === operation) setChecking(false) }
  }
  async function recover(retry: boolean) {
    if (!receipt || checking) return
    const operation = generation.current
    setChecking(true); setRecoveryError('')
    try {
      assertCurrent(operation)
      const current = await apiRequest<RecordData>(recordPath(kind, id))
      assertCurrent(operation)
      if (matchesReceipt(kind, current, receipt)) { success(operation); return }
      if (current.revision !== receipt.revision) {
        setConflictingRecord(current)
        throw new ApiError('O cadastro contém outras alterações. Compare sua cópia com os dados atuais abaixo.', 409)
      }
      if (retry) await sendReceipt(receipt, operation)
      else setRecoveryError('O salvamento ainda não foi confirmado. Você pode repetir o mesmo pedido com segurança.')
    } catch (error) { if (generation.current === operation) setRecoveryError(error instanceof Error ? error.message : 'Não foi possível conferir o salvamento.') }
    finally { if (generation.current === operation) setChecking(false) }
  }
  if (backup && backup.original !== fingerprint && !useServer && !receipt) return <div role="alert" className="rounded-xl border border-warning-line bg-warning-soft p-5 text-warning">
    <p>O cadastro mudou desde o início da sua edição anterior. Sua cópia foi preservada nesta aba para evitar sobrescrever a versão atual.</p>
    <EditConflictComparison kind={kind} local={backup.data} current={original as unknown as RecordData} />
    <div className="mt-3 flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={() => {
      if (window.confirm('Descartar as alterações locais desta edição e carregar os dados atuais?')) { removeBackup(); setUseServer(true) }
    }}>Descartar edição anterior e usar dados atuais</Button><Link className="inline-flex min-h-11 items-center underline" to={target}>Voltar à ficha</Link></div>
  </div>
  const common = { storageKey: key, hasBackup: Boolean(backup && !useServer), uncertain: Boolean(receipt), cancel }
  return <PreservedCatalogs.Provider value={retained}>
    {receipt && needsConfirmation && <div role="alert" className="space-y-3 rounded-lg border border-warning-line bg-warning-soft p-4 text-warning">
      <p>Estamos conferindo o salvamento. Seu pedido foi preservado; confirme o resultado antes de continuar a edição.</p>
      {recoveryError && <p>{recoveryError}</p>}
      {conflictingRecord && <EditConflictComparison kind={kind} local={backup?.data ?? (() => {
        try { return JSON.parse(sessionStorage.getItem(key) ?? 'null')?.data ?? original } catch { return original }
      })()} current={(kind === 'students' ? studentEditValues(conflictingRecord) : populationEditValues(conflictingRecord)) as unknown as RecordData} />}
      <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={checking} onClick={() => void recover(false)}>Conferir salvamento</Button><Button type="button" variant="secondary" disabled={checking} onClick={() => void recover(true)}>Tentar salvar novamente</Button><Link to={target} className="inline-flex min-h-11 items-center underline">Voltar à ficha</Link></div>
    </div>}
    <div className="rounded-lg border border-line bg-surface p-4 text-sm text-secondary">As alterações desta edição ficam guardadas nesta aba até você salvar ou cancelar. Cadastros novos e seus rascunhos continuam separados.</div>
    {kind === 'students' ? (() => {
      const originalValues = studentEditValues(record)
      return <StudentRegistrationForm editor={{ ...common, originalValues, initialValues: backup && !useServer ? restoreDraftValues(originalValues, backup.data) : originalValues, save: (data) => save(toStudentRequest(data)) }} />
    })() : (() => {
      const originalValues = populationEditValues(record)
      return <PopulationSurveyForm editor={{ ...common, originalValues, initialValues: backup && !useServer ? restoreDraftValues(originalValues, backup.data, { members: memberDefaultValues }) : originalValues, save: (data) => save(toPopulationRequest(data)) }} />
    })()}
  </PreservedCatalogs.Provider>
}
export function RecordEditPage({ kind }: { kind: RecordKind }) {
  const { id = '' } = useParams()
  const resource = useRecordResource<RecordData>(recordPath(kind, id))
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold text-foreground">{kind === 'students' ? 'Editar aluno' : 'Editar levantamento'}</h1>
    {resource.loading ? <p role="status">Carregando cadastro para edição...</p> : resource.error ? <div role="alert" className="rounded-lg bg-danger-soft p-4 text-danger-strong"><p>Não foi possível abrir a edição. {resource.error.message}</p><Button type="button" variant="secondary" onClick={resource.retry} className="mt-3">Tentar novamente</Button></div> : resource.data && <EditSession key={`${kind}:${id}`} kind={kind} id={id} record={resource.data} />}
  </div>
}
