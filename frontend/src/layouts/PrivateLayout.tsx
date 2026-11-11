import { Navigate, Outlet } from 'react-router'
import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'
import { getUserSubject } from '../lib/auth'
import { useVerifiedSession } from '../features/auth/useVerifiedSession'

export function PrivateLayout() {
  const session = useVerifiedSession()
  if (session.status === 'checking' && !session.hasVerifiedAccount) return <p role="status" className="p-6">Verificando sessão...</p>
  if (session.status === 'error' && !session.hasVerifiedAccount) return <div className="p-6"><p role="alert">Não foi possível verificar sua sessão. Confira a conexão.</p><button type="button" className="min-h-11 text-link underline" onClick={session.retry}>Tentar novamente</button></div>
  if (session.status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 md:grid-cols-[15rem_1fr] lg:px-8">
        <Sidebar />
        <main className="min-w-0">
          <Outlet key={getUserSubject() ?? 'unknown'} />
        </main>
      </div>
    </div>
  )
}