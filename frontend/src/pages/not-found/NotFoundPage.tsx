import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="font-semibold text-brand-600">Erro 404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Página não encontrada</h1>
        <Link to="/" className="mt-6 inline-block font-semibold text-brand-700 hover:underline">
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
