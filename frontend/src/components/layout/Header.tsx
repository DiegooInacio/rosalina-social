import { Link, useNavigate } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { clearTokens, getAccessToken, getUserSubject } from '../../lib/auth'

export function Header() {
  const navigate = useNavigate()
  const isLoggedIn = Boolean(getAccessToken())
  const [open, setOpen] = useState(false)
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

  function handleLogout() {
    setOpen(false)
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
          <div ref={accountRef} className="relative" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
          }}>
            <button ref={toggleRef} type="button" aria-expanded={open} aria-controls="account-navigation"
              onClick={() => setOpen(!open)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                {getUserSubject()?.charAt(0).toUpperCase() || 'U'}
              </span>
              Minha conta <span aria-hidden="true">▾</span>
            </button>
            {open && <nav id="account-navigation" aria-label="Minha conta" className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <p className="break-all border-b border-slate-100 px-3 py-3 text-sm text-slate-500">{getUserSubject()}</p>
              <Link to="/app/perfil" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Meu perfil</Link>
              <button type="button" onClick={handleLogout} className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100">Sair</button>
            </nav>}
          </div>
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
