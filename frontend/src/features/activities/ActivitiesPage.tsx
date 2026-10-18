import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { FormSection } from '../../components/ui/FormSection'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { ApiError } from '../../lib/api'
import { getUserRole } from '../../lib/auth'
import { createActivity, listCatalog, renameActivity, setActivityStatus, type CatalogItem } from '../catalogs/catalog.api'

export function ActivitiesPage() {
  return getUserRole() === 'ADMIN' ? <ActivityManagement /> : <Navigate to="/app" replace />
}

function ActivityManagement() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string; error: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<FormMessage | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    listCatalog('ATIVIDADE').then((data) => {
      if (!cancelled) setItems(data)
    }).catch(() => {
      if (!cancelled) setLoadError(true)
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [revision])

  function validateName(value: string, excludeId?: string) {
    if (!value.trim()) return 'Informe o nome da atividade.'
    if (value.trim().length > 150) return 'Informe no máximo 150 caracteres.'
    if (items.some((item) => item.id !== excludeId && item.name.trim().toLocaleLowerCase('pt-BR') === value.trim().toLocaleLowerCase('pt-BR'))) {
      return 'Já existe uma atividade com esse nome. Se estiver inativa, você pode reativá-la.'
    }
    return ''
  }

  function errorText(error: unknown) {
    if (error instanceof ApiError && error.status === 403) return 'Você não tem permissão para gerenciar atividades.'
    return error instanceof ApiError ? error.fields.name ?? error.message : 'Não foi possível salvar a alteração. Tente novamente.'
  }

  async function saveNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const error = validateName(name)
    setNameError(error)
    if (error) { nameRef.current?.focus(); return }
    setBusy('new')
    setMessage(null)
    try {
      const saved = await createActivity(name.trim())
      setItems((current) => [...current, saved])
      setName('')
      setSearch('')
      setStatus('')
      setMessage({ type: 'success', text: `Atividade “${saved.name}” cadastrada. Ela já pode ser selecionada no cadastro de alunos.` })
    } catch (error) {
      setNameError(errorText(error))
      setMessage({ type: 'error', text: errorText(error) })
    } finally { setBusy(null) }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || busy) return
    const error = validateName(editing.name, editing.id)
    setEditing({ ...editing, error })
    if (error) { editRef.current?.focus(); return }
    setBusy(editing.id)
    setMessage(null)
    try {
      const saved = await renameActivity(editing.id, editing.name.trim())
      setItems((current) => current.map((item) => item.id === saved.id ? saved : item))
      setEditing(null)
      setMessage({ type: 'success', text: 'Nome da atividade atualizado.' })
    } catch (error) {
      setEditing({ ...editing, error: errorText(error) })
      setMessage({ type: 'error', text: errorText(error) })
    } finally { setBusy(null) }
  }

  async function toggleStatus(item: CatalogItem) {
    if (busy) return
    if (item.active && !window.confirm(`Desativar “${item.name}”? Ela deixará de aparecer em novos cadastros. Os alunos já vinculados continuarão associados à atividade.`)) return
    setBusy(item.id)
    setMessage(null)
    try {
      const saved = await setActivityStatus(item.id, !item.active)
      setItems((current) => current.map((entry) => entry.id === saved.id ? saved : entry))
      setMessage({ type: 'success', text: `Atividade “${saved.name}” ${saved.active ? 'ativada' : 'desativada'}.` })
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error) })
    } finally { setBusy(null) }
  }

  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const visible = items.filter((item) => normalize(item.name).includes(normalize(search.trim())) && (!status || item.active === (status === 'active')))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const activeCount = items.filter((item) => item.active).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Atividades</h1>
        <p className="mt-2 text-slate-600">Organize as atividades oferecidas pela comunidade. As atividades ativas aparecem no cadastro de alunos.</p>
        <Link to="/app/alunos/novo" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">Ir para cadastro de aluno</Link>
      </div>
      <FormFeedback message={message} hasErrors={false} />
      {isLoading ? <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Carregando atividades...</p> : loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">Não foi possível carregar as atividades.</p>
          <Button type="button" variant="secondary" className="mt-3" onClick={() => {
            setIsLoading(true)
            setLoadError(false)
            setRevision((current) => current + 1)
          }}>Tentar novamente</Button>
        </div>
      ) : <>
        <FormSection title="Nova atividade" description="Use um nome fácil de reconhecer, como Capoeira, Reforço escolar ou Informática.">
          <form onSubmit={saveNew} noValidate aria-busy={busy === 'new'}>
            <fieldset disabled={busy !== null} className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-end">
              <legend className="sr-only">Cadastrar atividade</legend>
              <div className="w-full flex-1"><Input ref={nameRef} id="activity-name" name="name" label="Nome da atividade (obrigatório)" aria-required="true" maxLength={150} placeholder="Ex.: Capoeira" value={name} error={nameError} onChange={(event) => { setName(event.target.value); setNameError('') }} /></div>
              <Button type="submit" className="shrink-0">{busy === 'new' ? 'Cadastrando...' : 'Cadastrar atividade'}</Button>
            </fieldset>
          </form>
        </FormSection>
        <FormSection title="Atividades cadastradas" description={`${activeCount} ${activeCount === 1 ? 'ativa' : 'ativas'} · ${items.length - activeCount} ${items.length - activeCount === 1 ? 'inativa' : 'inativas'}. Desativar mantém os vínculos existentes com alunos.`}>
          {items.length === 0 ? <p className="text-sm text-slate-600">Nenhuma atividade cadastrada. Cadastre a primeira atividade no formulário acima.</p> : <>
            <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_12rem]">
              <Input id="activity-search" label="Buscar atividade" type="search" disabled={editing !== null} placeholder="Digite o nome da atividade" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Select id="activity-status" label="Situação" disabled={editing !== null} placeholder="Todas" options={[{ value: 'active', label: 'Ativas' }, { value: 'inactive', label: 'Inativas' }]} value={status} onChange={(event) => setStatus(event.target.value)} />
            </div>
            {visible.length === 0 ? <p role="status" className="py-4 text-sm text-slate-600">Nenhuma atividade encontrada para essa busca.</p> : <ul className="divide-y divide-slate-200" aria-label="Atividades cadastradas" aria-busy={busy !== null}>
              {visible.map((item) => <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                {editing?.id === item.id ? <form onSubmit={saveEdit} noValidate aria-label={`Editar ${item.name}`}>
                  <fieldset disabled={busy !== null} className="min-w-0 space-y-3">
                    <legend className="sr-only">Editar atividade</legend>
                    <Input ref={editRef} autoFocus id={`activity-edit-${item.id}`} label="Nome da atividade" maxLength={150} value={editing.name} error={editing.error} onChange={(event) => setEditing({ ...editing, name: event.target.value, error: '' })} />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit">{busy === item.id ? 'Salvando...' : 'Salvar nome'}</Button>
                      <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar edição</Button>
                    </div>
                  </fieldset>
                </form> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">{item.name}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>{item.active ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={busy !== null || editing !== null} aria-label={`Renomear ${item.name}`} onClick={() => { setEditing({ id: item.id, name: item.name, error: '' }); setMessage(null) }}>Renomear</Button>
                    <Button type="button" variant="secondary" disabled={busy !== null || editing !== null} aria-label={`${item.active ? 'Desativar' : 'Ativar'} ${item.name}`} onClick={() => void toggleStatus(item)}>{busy === item.id ? 'Salvando...' : item.active ? 'Desativar' : 'Ativar'}</Button>
                  </div>
                </div>}
              </li>)}
            </ul>}
          </>}
        </FormSection>
      </>}
    </div>
  )
}
