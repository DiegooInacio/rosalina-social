import { LoginForm } from './LoginForm'

export function LoginPage() {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">Entrar</h1>
      <p className="mb-6 mt-2 text-sm text-secondary">
        Acesse a área de formulários da comunidade.
      </p>
      <LoginForm />
    </section>
  )
}
