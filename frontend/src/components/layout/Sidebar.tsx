import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSessionToken } from '../../features/auth/useSessionToken'
import { NavLink, useLocation } from 'react-router'
import { useUserRole } from '../../features/auth/useUserRole'

const links = [
  { to: '/app', label: 'Visão geral', end: true },
  { to: '/app/alunos', label: 'Alunos cadastrados', end: true },
  { to: '/app/levantamentos', label: 'Levantamentos cadastrados', end: true },
  { to: '/app/alunos/novo', label: 'Cadastro de aluno' },
  { to: '/app/levantamentos/novo', label: 'Levantamento populacional' },
]

export function Sidebar() {
  useSessionToken()
  const role = useUserRole()
  const location = useLocation()
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === location.key
  const setOpen = useCallback((value: boolean) => setOpenedAt(value ? location.key : null), [location.key])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current!
    const toggle = toggleRef.current
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width: 48rem)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    closeOnDesktop()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', closeOnDesktop)
      toggle?.focus()
    }
  }, [open, setOpen])

  const visibleLinks = [
    ...links,
    ...(role === 'ADMIN'
      ? [{ to: '/app/atividades', label: 'Atividades' }, { to: '/app/usuarios', label: 'Usuários e acessos' }]
      : []),
    { to: '/app/perfil', label: 'Meu perfil' },
  ]

  function renderLinks(onNavigate?: () => void) {
    return visibleLinks.map(link => <NavLink
      key={link.to}
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-success text-link' : 'text-secondary hover:bg-subtle hover:text-foreground'
        }`
      }
    >{link.label}</NavLink>)
  }

  return <>
    <aside className="sticky top-0 z-10 min-w-0 self-start bg-canvas py-2 md:top-8 md:py-0" aria-label="Navegação da área interna">
      <button ref={toggleRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'mobile-navigation' : undefined}
        onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-body hover:bg-subtle md:hidden">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        Menu
      </button>
      <nav className="hidden gap-2 md:flex md:max-h-[calc(100dvh-4rem)] md:flex-col md:overflow-y-auto" aria-label="Menu principal">
        {renderLinks()}
      </nav>
    </aside>
    {open && createPortal(<dialog ref={dialogRef} id="mobile-navigation" aria-labelledby="mobile-navigation-title"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-black/40">
      <div className="flex h-full w-[min(20rem,85vw)] flex-col border-r border-line bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id="mobile-navigation-title" className="font-semibold">Menu principal</h2>
          <button type="button" autoFocus onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-body hover:bg-subtle">
            <span aria-hidden="true">×</span> Fechar
          </button>
        </div>
        <nav aria-label="Navegação no celular" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
          {renderLinks(() => setOpen(false))}
        </nav>
      </div>
    </dialog>, document.body)}
  </>
}
