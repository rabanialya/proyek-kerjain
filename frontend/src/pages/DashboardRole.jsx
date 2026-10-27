import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Dashboard pemilihan peran.
 *
 * Pengguna memilih Worker atau Employer.
 * Jika profil untuk peran tersebut sudah ada → arahkan ke halaman peran.
 * Jika belum ada → arahkan ke form pembuatan profil.
 *
 * Satu akun boleh punya kedua peran sekaligus.
 *
 * Admin yang membuka halaman ini (langsung via URL atau redirect lama)
 * otomatis diarahkan ke /admin sebelum halaman dirender.
 */
export default function DashboardRole() {
  const { user, profileStatus, profileLoading, logout } = useAuth()
  const navigate = useNavigate()

  // Admin tidak boleh melihat halaman pemilihan role ini.
  // Tangani kasus: Admin membuka /dashboard secara manual atau
  // datang dari redirect lama yang belum diperbaiki.
  useEffect(() => {
    if (user?.is_admin) {
      navigate('/admin', { replace: true })
    }
  }, [user, navigate])

  function handleSelectWorker() {
    if (profileStatus?.has_worker_profile) {
      navigate('/worker')
    } else {
      navigate('/worker/setup')
    }
  }

  function handleSelectEmployer() {
    if (profileStatus?.has_employer_profile) {
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

        {/* Status profil loading */}
        {profileLoading && (
          <p className="mb-6 text-center text-sm text-slate-400">
            Memeriksa status profil...
          </p>
        )}

        {/* Kartu pilihan peran */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Worker */}
          <button
            onClick={handleSelectWorker}
            disabled={profileLoading}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 p-6 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
          >
            <span className="text-3xl">🔨</span>
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
            disabled={profileLoading}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 p-6 text-left transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
          >
            <span className="text-3xl">🏢</span>
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
