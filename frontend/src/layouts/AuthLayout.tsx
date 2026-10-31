import { Link, Outlet } from 'react-router'
import { ThemeSelector } from '../features/theme/ThemeSelector'

export function AuthLayout() {
  return (
    <main className="flex min-h-screen flex-col bg-subtle px-4 py-6">
      <div className="self-end"><ThemeSelector /></div>
      <div className="mx-auto my-auto w-full max-w-md py-8">
        <Link
          to="/"
          className="mb-6 block text-center text-xl font-bold text-link"
        >
          Rosalina Social
        </Link>
        <Outlet />
      </div>
    </main>
  )
}
