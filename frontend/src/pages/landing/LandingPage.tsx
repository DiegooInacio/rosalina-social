import { Link } from 'react-router'

export function LandingPage() {
  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-600">
          Comunidade Rosalina
        </p>
        <h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Informação organizada para cuidar melhor da comunidade.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
          Uma plataforma para apoiar o cadastro de alunos e o levantamento
          populacional da Comunidade Rosalina.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
        >
          Acessar plataforma
        </Link>
      </div>
      <div className="rounded-3xl bg-brand-100 p-8 sm:p-12">
        <div className="aspect-[4/3] rounded-2xl border border-brand-500/20 bg-white/70" />
      </div>
    </section>
  )
}
