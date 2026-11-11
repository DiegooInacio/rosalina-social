import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { FormSection } from '../../components/ui/FormSection'
import { useUserRole } from '../auth/useUserRole'
import { AccountForm } from './AccountForm'
import { listUsers, type ManagedUser } from './users.api'

export function EditUserPage() {
  const role = useUserRole()
  const { id } = useParams()
  return role === 'ADMIN' ? <UserEditor key={id} id={id} /> : <Navigate to="/app" replace />
}

function UserEditor({ id }: { id?: string }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<ManagedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listUsers(controller.signal).then(users => {
      if (!controller.signal.aborted) setUser(users.find(user => user.id === id) ?? null)
    }).catch(() => {
      if (!controller.signal.aborted) setError(true)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [id, attempt])

  return <div className="mx-auto max-w-3xl space-y-6">
    <div>
      <p className="text-sm font-semibold text-link">Usuários e acessos</p>
      <h1 className="mt-1 text-2xl font-bold">Editar usuário</h1>
      <p className="mt-2 text-secondary">Atualize o nome e o cargo da conta.</p>
    </div>
    {loading ? <p role="status">Carregando usuário...</p> : error ? <div role="alert" className="space-y-3">
      <p>Não foi possível carregar o usuário.</p>
      <Button variant="secondary" onClick={() => { setLoading(true); setError(false); setAttempt(value => value + 1) }}>Tentar novamente</Button>
    </div> : user ? <FormSection title={`Dados de ${user.name}`} description="O e-mail de acesso é somente leitura. A redefinição de senha está disponível na lista de usuários.">
      <AccountForm user={user} onSaved={() => navigate('/app/usuarios', { replace: true, state: { userUpdated: true } })} onCancel={() => navigate('/app/usuarios')} />
    </FormSection> : <p role="alert">Usuário não encontrado.</p>}
    {!loading && (error || !user) && <Link to="/app/usuarios" className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline">Voltar para usuários</Link>}
  </div>
}
