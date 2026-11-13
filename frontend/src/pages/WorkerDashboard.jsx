import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDashboardWorker } from '../hooks/useDashboardWorker'
import { setLastRole } from '../lib/lastRole'

import WorkerProfileHeader from '../components/worker/WorkerProfileHeader'
import WorkerStatCards from '../components/worker/WorkerStatCards'
import WorkerActiveJobs from '../components/worker/WorkerActiveJobs'
import WorkerApplicationList from '../components/worker/WorkerApplicationList'
import WorkerJobRecommendations from '../components/worker/WorkerJobRecommendations'

// ─── Sapaan berdasarkan waktu ──────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

// ─── Progress kelengkapan profil ──────────────────────────────────────────

function calcProfileCompletion(profile) {
  if (!profile) return { pct: 0, missing: [] }
  const checks = [
    { key: 'nickname', label: 'Nama panggilan' },
    { key: 'bio', label: 'Bio' },
    { key: 'location', label: 'Lokasi' },
    { key: 'status_pekerjaan', label: 'Status pekerjaan' },
    { key: 'komitmen_jam', label: 'Komitmen jam' },
  ]
  const hasSkills = profile.skills?.length > 0
  const hasPayment = profile.accepted_payment_methods?.length > 0

  const filled =
    checks.filter((c) => !!profile[c.key]).length +
    (hasSkills ? 1 : 0) +
    (hasPayment ? 1 : 0)
  const total = checks.length + 2
  const missing = [
    ...checks.filter((c) => !profile[c.key]).map((c) => c.label),
    ...(!hasSkills ? ['Keahlian (skills)'] : []),
    ...(!hasPayment ? ['Metode pembayaran'] : []),
  ]
  return { pct: Math.round((filled / total) * 100), missing }
}

// ─── Skeleton loading ─────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 ${className}`} />
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <SkeletonBlock className="h-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-56" />
      </div>
    </main>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────

function DashboardError({ message, onRetry }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-slate-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <AlertTriangle size={32} className="text-amber-400" />
        </div>
        <h2 className="mt-4 font-bold text-slate-900">Gagal memuat dashboard</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button
          onClick={onRetry}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
        >
          Coba lagi
        </button>
      </div>
    </main>
  )
}

// ─── Section header ───────────────────────────────────────────────────────

function SectionHeader({ title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {action}
    </div>
  )
}

// ─── Profile completion bar ───────────────────────────────────────────────

function ProfileCompletion({ profile, onEdit }) {
  const { pct, missing } = calcProfileCompletion(profile)
  if (pct === 100) return null

  const barColor =
    pct < 40 ? 'bg-red-400' : pct < 70 ? 'bg-amber-400' : 'bg-emerald-500'
  const pctColor =
    pct < 40 ? 'text-red-500' : pct < 70 ? 'text-amber-500' : 'text-emerald-600'

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">Kelengkapan profil</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Profil lengkap meningkatkan peluang diterima employer.
          </p>
        </div>
        <span className={`shrink-0 text-lg font-extrabold ${pctColor}`}>{pct}%</span>
      </div>

      {/* Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Missing items + tombol lengkapi */}
      {missing.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Belum diisi:{' '}
            <span className="text-slate-600">
              {missing.slice(0, 2).join(', ')}
              {missing.length > 2 ? `, +${missing.length - 2} lainnya` : ''}
            </span>
          </p>
          <button
            onClick={onEdit}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Lengkapi
          </button>
        </div>
      )}
    </section>
  )
}

// ─── Dashboard utama ──────────────────────────────────────────────────────

export default function WorkerDashboard() {
  const { user, profileStatus, logout } = useAuth()
  const navigate = useNavigate()

  const {
    workerProfile,
    applicationSummary,
    applications,
    recentTasks,
    activeJobs,
    activeJobsCount,
    loading,
    error,
    reload,
  } = useDashboardWorker()

  // ── Perpindahan role ──
  function handleSwitchToEmployer() {
    if (profileStatus?.has_employer_profile) {
      setLastRole(user.id, 'employer')
      navigate('/employer')
    } else {
      navigate('/employer/setup')
    }
  }

  if (loading) return <DashboardSkeleton />
  if (error) return <DashboardError message={error} onRetry={reload} />

  const greeting = getGreeting()

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      {/* Wrapper max-width — proporsional di desktop, full-width di mobile */}
      <div className="mx-auto w-full max-w-5xl space-y-5">

        {/* ── 1. Header profil ── */}
        <WorkerProfileHeader
          workerProfile={workerProfile}
          user={user}
          greeting={greeting}
          onViewProfile={() => navigate('/worker/profile')}
          onEditProfile={() => navigate('/worker/profile/edit')}
          onSwitchRole={handleSwitchToEmployer}
        />

        {/* ── 2. Kelengkapan profil ── */}
        <ProfileCompletion
          profile={workerProfile}
          onEdit={() => navigate('/worker/profile/edit')}
        />

        {/* ── 3. Ringkasan lamaran ── */}
        <section>
          <SectionHeader
            title="Ringkasan Lamaran"
            action={
              applicationSummary.total > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-100">
                  {applicationSummary.total} total
                </span>
              )
            }
          />
          <WorkerStatCards summary={applicationSummary} />
        </section>

        {/* ── Layout dua kolom: kiri (pekerjaan aktif + lamaran), kanan (rekomendasi) ── */}
        {/* Desktop: 2 kolom. Tablet ke bawah: 1 kolom stacked. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* Kolom kiri (lg: 2/5 lebar) */}
          <div className="space-y-5 lg:col-span-2">

            {/* ── 4. Pekerjaan aktif ── */}
            <section>
              <SectionHeader
                title="Pekerjaan Aktif"
                action={
                  activeJobsCount > 0 && (
                    <button
                      onClick={() => navigate('/worker/jobs')}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                    >
                      Lihat semua <ChevronRight size={13} />
                    </button>
                  )
                }
              />
              <WorkerActiveJobs
                activeJobs={activeJobs}
                activeJobsCount={activeJobsCount}
                onViewAll={() => navigate('/worker/jobs')}
                onFindJobs={() => navigate('/tasks')}
                onJobClick={() => navigate('/worker/jobs')}
              />
            </section>

            {/* ── 5. Lamaran terbaru ── */}
            <section>
              <SectionHeader
                title="Lamaran Terbaru"
                action={
                  applications.length > 5 && (
                    <span className="text-xs text-slate-400">
                      +{applications.length - 5} lainnya
                    </span>
                  )
                }
              />
              <WorkerApplicationList
                applications={applications}
                onViewAll={applications.length > 5 ? () => navigate('/worker/applications') : undefined}
              />
            </section>

          </div>

          {/* Kolom kanan (lg: 3/5 lebar) — Rekomendasi pekerjaan */}
          <div className="lg:col-span-3">
            <section>
              <SectionHeader
                title="Rekomendasi Pekerjaan"
                action={
                  <button
                    onClick={() => navigate('/tasks')}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                  >
                    <TrendingUp size={13} />
                    Lihat semua
                  </button>
                }
              />
              <WorkerJobRecommendations
                tasks={recentTasks}
                onViewAll={() => navigate('/tasks')}
                onTaskClick={(task) => navigate(`/tasks/${task.id}`)}
              />
            </section>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-200 pb-6 pt-4 text-xs text-slate-400">
          <span>Kerjain · Worker Dashboard</span>
          <button
            onClick={logout}
            className="transition hover:text-slate-600 hover:underline underline-offset-2"
          >
            Keluar
          </button>
        </div>

      </div>
    </main>
  )
}
