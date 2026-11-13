import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getLastRole, setLastRole } from '../lib/lastRole'
import { Hammer, Building2 } from 'lucide-react'

/**
 * Dashboard pemilihan peran.
 *
 * Logika smart redirect:
 * - Admin                        → /admin
 * - Hanya punya WorkerProfile    → langsung /worker
 * - Hanya punya EmployerProfile  → langsung /employer
 * - Punya kedua + ada lastRole   → langsung ke lastRole dashboard
 * - Punya kedua + tanpa lastRole → tampilkan pilihan
 * - Belum punya profil apapun    → tampilkan pilihan (akan ke /setup)
 *
 * Satu akun boleh punya kedua peran sekaligus.
 */
export default function DashboardRole() {
  const { user, profileStatus, profileLoading, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Admin tidak boleh di halaman ini.
    if (user?.is_admin) {
      navigate('/admin', { replace: true })
      return
    }

    // Jangan redirect sebelum profileStatus selesai dimuat.
    if (profileLoading || profileStatus === null) return

    const hasWorker = profileStatus.has_worker_profile
    const hasEmployer = profileStatus.has_employer_profile

    if (hasWorker && !hasEmployer) {
      // Hanya punya Worker → langsung masuk.
      setLastRole(user.id, 'worker')
      navigate('/worker', { replace: true })
    } else if (hasEmployer && !hasWorker) {
      // Hanya punya Employer → langsung masuk.
      setLastRole(user.id, 'employer')
      navigate('/employer', { replace: true })
    } else if (hasWorker && hasEmployer) {
      // Punya keduanya → pakai preferensi terakhir jika ada.
      const lastRole = getLastRole(user.id)
      if (lastRole === 'worker') {
        navigate('/worker', { replace: true })
      } else if (lastRole === 'employer') {
        navigate('/employer', { replace: true })
      }
      // lastRole null → tampilkan pilihan (tidak redirect)
    }
    // Tidak punya profil apapun → tampilkan pilihan
  }, [user, profileStatus, profileLoading, navigate])

  function handleSelectWorker() {
    if (profileStatus?.has_worker_profile) {
      setLastRole(user.id, 'worker')
      navigate('/worker')
    } else {
      navigate('/worker/setup')
    }
  }

  function handleSelectEmployer() {
    if (profileStatus?.has_employer_profile) {
      setLastRole(user.id, 'employer')
      navigate('/employer')
    } else {
      navigate('/employer/setup')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            K
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Halo, {user?.full_name}!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Pilih peran yang ingin kamu gunakan sekarang.
          </p>
        </div>

        {/* Loading profil — saat redirect otomatis sedang diproses */}
        {(profileLoading || profileStatus === null) && (
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-slate-400">Memeriksa status profil...</p>
          </div>
        )}

        {/* Kartu pilihan peran — hanya tampil saat tidak ada auto-redirect */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Worker */}
          <button
            onClick={handleSelectWorker}
            disabled={profileLoading || profileStatus === null}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 p-6 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
          >
            <span className="text-3xl"><Hammer size={32} className="text-blue-600" /></span>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-blue-700">
                Worker
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {profileStatus?.has_worker_profile
                  ? 'Profil sudah ada'
                  : 'Buat profil baru'}
              </p>
            </div>
          </button>

          {/* Employer */}
          <button
            onClick={handleSelectEmployer}
            disabled={profileLoading || profileStatus === null}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 p-6 text-left transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
          >
            <span className="text-3xl"><Building2 size={32} className="text-emerald-600" /></span>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-emerald-700">
                Employer
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {profileStatus?.has_employer_profile
                  ? 'Profil sudah ada'
                  : 'Buat profil baru'}
              </p>
            </div>
          </button>
        </div>

        {/* Logout */}
        <div className="mt-8 text-center">
          <button
            onClick={logout}
            className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
          >
            Keluar
          </button>
        </div>
      </section>
    </main>
  )
}
