import { useEffect, useState } from 'react'
import { hasPasswordChangedNotice, clearPasswordChangedNotice } from '../../lib/auth'
import { useLocation } from 'react-router'
import { LoginForm } from './LoginForm'

export function LoginPage() {
  const location = useLocation()
  const [passwordChanged] = useState(() => location.state?.passwordChanged === true || hasPasswordChangedNotice())
  useEffect(() => { clearPasswordChangedNotice() }, [])
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">Entrar</h1>
      <p className="mb-6 mt-2 text-sm text-secondary">
        Acesse a área de formulários da comunidade.
      </p>
      {passwordChanged && <p role="status" className="mb-4 text-sm text-link">Senha alterada com sucesso. Suas sessões foram encerradas. Entre com a nova senha.</p>}
      <LoginForm />
    </section>
  )
}
