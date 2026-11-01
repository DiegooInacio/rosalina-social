import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="font-semibold text-link-hover">Erro 404</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Página não encontrada</h1>
        <Link to="/" className="mt-6 inline-block font-semibold text-link hover:underline">
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
