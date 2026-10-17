import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Membungkus route yang membutuhkan autentikasi.
 *
 * - Selama sesi sedang diperiksa (sessionLoading) → tampilkan layar tunggu.
 * - Jika tidak ada user → redirect ke /login.
 * - Jika user ada → render <Outlet /> (halaman yang dilindungi).
 */
export default function ProtectedRoute() {
  const { user, sessionLoading } = useAuth()

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Memeriksa sesi...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
