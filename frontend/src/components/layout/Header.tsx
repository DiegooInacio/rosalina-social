import { Link } from 'react-router'

export function Header() {
  return (
    <header className="border-b-4 border-accent-500">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-bold text-brand-700">
          Rosalina Social
        </Link>
        <Link
          to="/login"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Entrar
        </Link>
      </div>
    </header>
  )
}
