import { useVerifiedSession } from '../../features/auth/useVerifiedSession'
import { Link, useNavigate } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { getUserSubject } from '../../lib/auth'
import { logout } from '../../features/auth/logout'
import { ThemeSelector } from '../../features/theme/ThemeSelector'

export function Header() {
  const navigate = useNavigate()
  const session = useVerifiedSession()
  const isLoggedIn = session.status === 'authenticated'
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const accountRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true); setLogoutError('')
    try { await logout(); setOpen(false); navigate('/login') }
    catch { setLogoutError('Não foi possível encerrar a sessão no servidor. Verifique a conexão e tente sair novamente.') }
    finally { setLoggingOut(false) }
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center rounded-md text-lg font-bold text-link transition-colors hover:text-link-hover">
          Rosalina Social
        </Link>
        <div className="flex flex-wrap items-center gap-3">
        <ThemeSelector />
        {session.status === 'checking' ? <p role="status" className="text-sm text-secondary">Verificando sessão...</p> : session.status === 'error' ? <div className="text-sm text-secondary"><span role="status">Sessão não verificada.</span> <button type="button" onClick={session.retry} className="min-h-11 px-2 font-semibold text-link underline">Tentar novamente</button></div> : isLoggedIn ? (
          <div ref={accountRef} className="relative" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
          }}>
            <button ref={toggleRef} type="button" aria-expanded={open} aria-controls="account-navigation"
              onClick={() => setOpen(!open)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-body hover:bg-subtle">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-link">
                {getUserSubject()?.charAt(0).toUpperCase() || 'U'}
              </span>
              Minha conta <span aria-hidden="true">▾</span>
            </button>
            {open && <nav id="account-navigation" aria-label="Minha conta" className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg">
              <p className="break-all border-b border-line-soft px-3 py-3 text-sm text-muted">{getUserSubject()}</p>
              <Link to="/app/perfil" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-body hover:bg-subtle">Meu perfil</Link>
              <p className="px-3 py-2 text-xs text-muted">Ao sair, cópias pendentes nas abas serão removidas. Os rascunhos já salvos no servidor continuam disponíveis.</p>
              <button type="button" onClick={() => void handleLogout()} disabled={loggingOut} className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-body hover:bg-subtle">{loggingOut ? 'Saindo...' : 'Sair'}</button>
              {logoutError && <p role="alert" className="px-3 py-2 text-sm text-danger">{logoutError}</p>}
            </nav>}
          </div>
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
