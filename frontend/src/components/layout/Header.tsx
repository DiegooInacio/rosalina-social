import { useSessionToken } from '../../features/auth/useSessionToken'
import { Link, useNavigate } from 'react-router'
import { clearTokens } from '../../lib/auth'
import { ThemeSelector } from '../../features/theme/ThemeSelector'

export function Header() {
  const navigate = useNavigate()
  const isLoggedIn = Boolean(useSessionToken())

  function handleLogout() {
    clearTokens()
    navigate('/login')
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center rounded-md text-lg font-bold text-link transition-colors hover:text-link-hover">
          Rosalina Social
        </Link>
        <div className="flex flex-wrap items-center gap-3">
        <ThemeSelector />
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-body transition-colors hover:bg-subtle"
          >
            Sair
          </button>
        ) : (
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-body transition-colors hover:bg-subtle"
          >
            Entrar
          </Link>
        )}
        </div>
      </div>
    </header>
  )
}
