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
      <h1 className="text-2xl font-bold text-slate-950">Formulários</h1>
      <p className="mt-2 text-slate-600">Selecione o cadastro que deseja iniciar.</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {forms.map((form) => (
          <Link
            key={form.to}
            to={form.to}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-950">{form.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{form.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
