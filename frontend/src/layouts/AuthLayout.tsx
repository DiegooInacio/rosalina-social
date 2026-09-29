import { Link, Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 block text-center text-xl font-bold text-brand-700"
        >
          Rosalina Social
        </Link>
        <Outlet />
      </div>
    </main>
  )
}
