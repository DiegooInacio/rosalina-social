import { Link, useNavigate } from 'react-router'
import { clearTokens, getAccessToken } from '../../lib/auth'

export function Header() {
  const navigate = useNavigate()
  const isLoggedIn = Boolean(getAccessToken())

  function handleLogout() {
    clearTokens()
    navigate('/login')
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-bold text-brand-700">
          Rosalina Social
        </Link>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sair
          </button>
        ) : (
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  )
}