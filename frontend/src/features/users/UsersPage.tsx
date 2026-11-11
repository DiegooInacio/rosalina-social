import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { FormSection } from '../../components/ui/FormSection'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { ApiError } from '../../lib/api'
import { getUserSubject } from '../../lib/auth'
import { useUserRole } from '../auth/useUserRole'
import { listUsers, resetUserPassword, setUserStatus, type ManagedUser, type UserRole } from './users.api'

const roleName = (role: UserRole) => role === 'ADMIN' ? 'Administrador' : 'Operador'
const passwordRule = (value: string) => value.trim().length > 0 && value.length >= 8 && value.length <= 100 && new TextEncoder().encode(value).length <= 72 || 'Use de 8 a 100 caracteres, com no máximo 72 bytes (acentos ocupam mais espaço).'
const errorText = (error: unknown) => error instanceof ApiError ? error.message : 'Não foi possível salvar. Tente novamente.'

function ResetPasswordForm({ user, onDone, onCancel }: { user: ManagedUser; onDone: () => void; onCancel: () => void }) {
  const [message, setMessage] = useState<FormMessage | null>(null)
  const { register, getValues, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { newPassword: '', confirmation: '' } })
  return <form aria-label={`Redefinir senha de ${user.name}`} className="space-y-4" noValidate onSubmit={handleSubmit(async ({ newPassword }) => {
    setMessage(null)
    try { await resetUserPassword(user.id, newPassword); reset(); onDone() }
    catch (error) {
      if (error instanceof ApiError && error.fields.newPassword) setError('newPassword', { message: error.fields.newPassword })
      setMessage({ type: 'error', text: errorText(error) })
    }
  })}>
    <p className="text-sm text-secondary">Defina uma nova senha para {user.email}. As sessões anteriores serão encerradas. Informe a nova senha à pessoa; ela poderá trocá-la em Meu perfil.</p>
    <fieldset disabled={isSubmitting} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <legend className="sr-only">Nova senha</legend>
      <Input id="reset-password" label="Nova senha (obrigatória)" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword', { validate: passwordRule })} />
      <Input id="reset-confirmation" label="Confirmar nova senha (obrigatório)" type="password" autoComplete="new-password" error={errors.confirmation?.message} {...register('confirmation', { validate: value => value === getValues('newPassword') || 'As senhas não coincidem.' })} />
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" loading={isSubmitting}>Confirmar redefinição</Button><Button type="button" variant="secondary" onClick={onCancel}>Cancelar redefinição</Button></div>
    </fieldset>
    <FormFeedback message={message} hasErrors={Object.keys(errors).length > 0} />
  </form>
}

export function UsersPage() {
  const role = useUserRole()
  return role === 'ADMIN' ? <UserManagement /> : <Navigate to="/app" replace />
}

function UserManagement() {
  const location = useLocation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState<FormMessage | null>(() => location.state?.userCreated === true ? { type: 'success', text: 'Conta criada. A pessoa já pode entrar com o e-mail e a senha cadastrados.' } : location.state?.userUpdated === true ? { type: 'success', text: 'Dados da conta salvos.' } : null)
  const [action, setAction] = useState<{ user: ManagedUser } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (location.state?.userCreated === true || location.state?.userUpdated === true) navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location.state, location.pathname, location.search, navigate])
  useEffect(() => {
    const controller = new AbortController()
    listUsers(controller.signal).then(data => { if (!controller.signal.aborted) setUsers(data) })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])
  async function toggle(user: ManagedUser) {
    if (busy || !window.confirm(`${user.active ? 'Desativar' : 'Ativar'} o acesso de ${user.name}?${user.active ? ' A pessoa não poderá entrar e suas sessões serão encerradas.' : ''}`)) return
    setBusy(true); setMessage(null)
    try { const result = await setUserStatus(user.id, !user.active); setUsers(current => current.map(item => item.id === result.id ? result : item)); setMessage({ type: 'success', text: `Acesso ${result.active ? 'ativado' : 'desativado'}.` }) }
    catch (error) { setMessage({ type: 'error', text: errorText(error) }) }
    finally { setBusy(false) }
  }
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const visible = users.filter(user => normalize(`${user.name} ${user.email}`).includes(normalize(search.trim())) && (!status || user.active === (status === 'active'))).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return <div className="space-y-6">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div><h1 className="text-2xl font-bold">Usuários e acessos</h1><p className="mt-2 text-secondary">Consulte as contas e gerencie quem pode acessar os dados da associação.</p></div>
      {!action && <Link to="/app/usuarios/novo" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Novo usuário</Link>}
    </div>
    <FormFeedback message={message} hasErrors={false} />
    {loading ? <p role="status">Carregando usuários...</p> : loadError ? <div role="alert" className="space-y-3"><p>Não foi possível carregar os usuários.</p><Button variant="secondary" onClick={() => { setLoading(true); setLoadError(false); setAttempt(value => value + 1) }}>Tentar novamente</Button></div> : <>
      {action && <FormSection title={`Redefinir senha de ${action.user.name}`}>
        <ResetPasswordForm user={action.user} onCancel={() => setAction(null)} onDone={() => { setAction(null); setMessage({ type: 'success', text: 'Senha redefinida. As sessões anteriores foram encerradas.' }) }} />
      </FormSection>}
      <FormSection title="Contas cadastradas" description={`${users.filter(user => user.active).length} contas ativas de ${users.length}.`}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2"><Input id="user-search" label="Buscar por nome ou e-mail" type="search" value={search} onChange={event => setSearch(event.target.value)} /><Select id="user-status" label="Situação" placeholder="Todas" options={[{ value: 'active', label: 'Ativas' }, { value: 'inactive', label: 'Inativas' }]} value={status} onChange={event => setStatus(event.target.value)} /></div>
        {visible.length === 0 ? <p>Nenhuma conta encontrada.</p> : <ul className="divide-y divide-line" aria-label="Contas cadastradas">{visible.map(user => {
          const self = user.email === getUserSubject()
          return <li key={user.id} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:justify-between">
            <div className="min-w-0"><p className="break-words font-semibold">{user.name}{self ? ' (você)' : ''}</p><p className="break-all text-sm text-secondary">{user.email}</p><p className="mt-1 text-sm text-secondary">{roleName(user.role)} · {user.active ? 'Ativa' : 'Inativa'}</p></div>
            <div className="flex flex-wrap items-start gap-2"><Button variant="secondary" disabled={busy || Boolean(action)} aria-label={`Editar ${user.name}`} onClick={() => navigate(`/app/usuarios/${user.id}/editar`)}>Editar</Button>
              {!self && <><Button variant="secondary" disabled={busy || Boolean(action)} aria-label={`Redefinir senha de ${user.name}`} onClick={() => { setAction({ user }); setMessage(null) }}>Redefinir senha</Button><Button variant="secondary" disabled={busy || Boolean(action)} aria-label={`${user.active ? 'Desativar' : 'Ativar'} ${user.name}`} onClick={() => void toggle(user)}>{user.active ? 'Desativar' : 'Ativar'}</Button></>}
              {self && <Link to="/app/perfil" className="inline-flex min-h-11 items-center text-sm text-link underline">Meu perfil</Link>}
            </div>
          </li>
        })}</ul>}
      </FormSection>
    </>}
  </div>
}
