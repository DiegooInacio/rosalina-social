import { useSessionToken } from '../../features/auth/useSessionToken'
import { NavLink } from 'react-router'
import { getUserRole } from '../../lib/auth'

const links = [
  { to: '/app', label: 'Visão geral', end: true },
  { to: '/app/alunos', label: 'Alunos cadastrados', end: true },
  { to: '/app/levantamentos', label: 'Levantamentos cadastrados', end: true },
  { to: '/app/alunos/novo', label: 'Cadastro de aluno' },
  { to: '/app/levantamentos/novo', label: 'Levantamento populacional' },
]

export function Sidebar() {
  useSessionToken()
  const visibleLinks = getUserRole() === 'ADMIN'
    ? [...links, { to: '/app/atividades', label: 'Atividades' }]
    : links
  return (
    <aside className="min-w-0" aria-label="Navegação da área interna">
      <nav className="flex gap-2 overflow-x-auto md:flex-col">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-success text-link'
                  : 'text-secondary hover:bg-subtle hover:text-foreground'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
