import { Outlet } from 'react-router'
import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'

export function PrivateLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[15rem_1fr] lg:px-8">
        <Sidebar />
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
