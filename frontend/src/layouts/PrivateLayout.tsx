import { Navigate, Outlet } from 'react-router'
import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'
import { getUserSubject } from '../lib/auth'
import { useSessionToken } from '../features/auth/useSessionToken'

export function PrivateLayout() {
  if (!useSessionToken()) {
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