import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Melindungi route yang hanya boleh diakses Admin.
 *
 * - sessionLoading  → tampilkan layar tunggu (sesi belum selesai diperiksa)
 * - Belum login     → redirect ke /login
 * - Login tapi bukan admin → redirect ke /dashboard (role-based)
 * - Admin           → render <Outlet />
 *
 * Catatan keamanan:
 *   Pemeriksaan is_admin di sini hanya untuk UX — backend tetap
 *   memvalidasi get_current_admin() pada setiap endpoint sensitif.
 *   Jangan mengandalkan nilai ini sebagai satu-satunya penjaga akses.
 */
export default function AdminProtectedRoute() {
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

  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
