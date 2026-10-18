import { NavLink } from 'react-router'
import { getUserRole } from '../../lib/auth'

const links = [
  { to: '/app', label: 'Visão geral', end: true },
  { to: '/app/alunos/novo', label: 'Cadastro de aluno' },
  { to: '/app/levantamentos/novo', label: 'Levantamento populacional' },
]

export function Sidebar() {
  const visibleLinks = getUserRole() === 'ADMIN'
    ? [...links, { to: '/app/atividades', label: 'Atividades' }]
    : links
  return (
    <aside aria-label="Navegação da área interna">
      <nav className="flex gap-2 overflow-x-auto md:flex-col">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
