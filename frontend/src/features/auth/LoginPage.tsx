import { LoginForm } from './LoginForm'

export function LoginPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-950">Entrar</h1>
      <p className="mb-6 mt-2 text-sm text-slate-600">
        Acesse a área de formulários da comunidade.
      </p>
      <LoginForm />
    </section>
  )
}
