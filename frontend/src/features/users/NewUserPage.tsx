import { Navigate, useNavigate } from 'react-router'
import { FormSection } from '../../components/ui/FormSection'
import { getUserRole } from '../../lib/auth'
import { useSessionToken } from '../auth/useSessionToken'
import { AccountForm } from './AccountForm'

export function NewUserPage() {
  useSessionToken()
  return getUserRole() === 'ADMIN' ? <NewUserRegistration /> : <Navigate to="/app" replace />
}

function NewUserRegistration() {
  const navigate = useNavigate()
  return <div className="mx-auto max-w-3xl space-y-6">
    <div>
      <p className="text-sm font-semibold text-link">Usuários e acessos</p>
      <h1 className="mt-1 text-2xl font-bold">Novo usuário</h1>
      <p className="mt-2 text-secondary">Crie uma conta individual para acessar o sistema da associação.</p>
    </div>
    <FormSection title="Cargos e permissões">
      <p className="text-sm text-secondary"><strong>Operador:</strong> cadastra, consulta e edita alunos e levantamentos. <strong>Administrador:</strong> também gerencia usuários e atividades.</p>
    </FormSection>
    <FormSection title="Dados da nova conta" description="Informe um e-mail exclusivo e uma senha inicial. A pessoa poderá alterar o próprio nome e senha em Meu perfil.">
      <AccountForm onSaved={() => navigate('/app/usuarios', { replace: true, state: { userCreated: true } })} onCancel={() => navigate('/app/usuarios')} />
    </FormSection>
  </div>
}
