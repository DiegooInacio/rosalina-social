import { Link } from 'react-router'

const forms = [
  {
    to: '/app/alunos/novo',
    title: 'Cadastro de aluno',
    description: 'Identificação, informações familiares e situação socioeconômica.',
  },
  {
    to: '/app/levantamentos/novo',
    title: 'Levantamento populacional',
    description: 'Responsável familiar, moradia, saúde e composição da família.',
  },
]

export function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Visão geral</h1>
      <p className="mt-2 text-secondary">Consulte os dados já cadastrados ou inicie um novo preenchimento.</p>
      <section className="mt-8" aria-labelledby="consultas-title">
        <h2 id="consultas-title" className="text-lg font-semibold text-foreground">Consultar cadastros</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[
            { to: '/app/alunos', title: 'Alunos cadastrados', description: 'Busque por nome, CPF ou situação e consulte a ficha completa do aluno.' },
            { to: '/app/levantamentos', title: 'Levantamentos cadastrados', description: 'Consulte famílias, moradia, saúde, integrantes e o resumo financeiro.' },
          ].map((item) => <Link key={item.to} to={item.to} className="rounded-xl border border-line bg-surface p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md focus-visible:border-brand-500 focus-visible:shadow-md">
            <h3 className="font-semibold text-link">{item.title}</h3><p className="mt-2 text-sm leading-6 text-secondary">{item.description}</p>
          </Link>)}
        </div>
      </section>
      <h2 className="mt-8 text-lg font-semibold text-foreground">Novo preenchimento</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {forms.map((form) => (
          <Link
            key={form.to}
            to={form.to}
            className="rounded-xl border border-line bg-surface p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md focus-visible:border-brand-500 focus-visible:shadow-md"
          >
            <h3 className="font-semibold text-foreground">{form.title}</h3>
            <p className="mt-2 text-sm leading-6 text-secondary">{form.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
