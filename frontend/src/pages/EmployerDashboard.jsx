import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDashboardEmployer } from '../hooks/useDashboardEmployer'
import { publishTask } from '../lib/api'
import { setLastRole } from '../lib/lastRole'
import { AlertTriangle, CheckCircle2, X, ChevronRight, TrendingUp } from 'lucide-react'

import EmployerProfileHeader from '../components/employer/EmployerProfileHeader'
import EmployerStatCards from '../components/employer/EmployerStatCards'
import EmployerQuickActions from '../components/employer/EmployerQuickActions'
import EmployerActiveJobs from '../components/employer/EmployerActiveJobs'
import EmployerTaskList from '../components/employer/EmployerTaskList'

// ─── Sapaan berdasarkan waktu ──────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-2">
            <SkeletonBlock className="h-64" />
          </div>
          <div className="lg:col-span-3">
            <SkeletonBlock className="h-96" />
          </div>
        </div>
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

// ─── Dashboard utama ──────────────────────────────────────────────────────

export default function EmployerDashboard() {
  const { user, profileStatus, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Flash message dari halaman sebelumnya
  const [flash, setFlash] = useState(location.state?.flash ?? null)
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 5000)
    return () => clearTimeout(t)
  }, [flash])

  // State publish cepat dari dashboard
  const [publishing, setPublishing] = useState(null)
  const [publishError, setPublishError] = useState(null)

  const {
    employerProfile,
    myTasks,
    taskSummary,
    activeJobs,
    loading,
    error,
    reload,
  } = useDashboardEmployer()

  // ── Fungsi perpindahan role ──
  function handleSwitchToWorker() {
    if (profileStatus?.has_worker_profile) {
      setLastRole(user.id, 'worker')
      navigate('/worker')
    } else {
      navigate('/worker/setup')
    }
  }

  function handleEdit(taskId) {
    navigate(`/tasks/${taskId}/edit`)
  }

  async function handlePublish(task) {
    if (publishing) return
    setPublishing(task.id)
    setPublishError(null)
    try {
      await publishTask(task.id)
      setFlash(`Task "${task.title}" berhasil dipublikasikan.`)
      reload()
    } catch (err) {
      setPublishError(err.message ?? 'Gagal mempublikasikan task.')
    } finally {
      setPublishing(null)
    }
  }

  if (loading) return <DashboardSkeleton />
  if (error) return <DashboardError message={error} onRetry={reload} />

  const greeting = getGreeting()

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      {/* Wrapper max-width — proporsional di desktop, full-width di mobile */}
      <div className="mx-auto w-full max-w-5xl space-y-5">

        {/* ── Flash message ── */}
        {flash && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              {flash}
            </span>
            <button
              onClick={() => setFlash(null)}
              className="shrink-0 text-emerald-500 transition hover:text-emerald-700"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── 1. Header profil ── */}
        <EmployerProfileHeader
          employerProfile={employerProfile}
          user={user}
          greeting={greeting}
          onViewProfile={() => navigate('/employer/profile')}
          onEditProfile={() => navigate('/employer/profile/edit')}
          onSwitchRole={handleSwitchToWorker}
        />

        {/* ── 2. Ringkasan statistik ── */}
        <section>
          <SectionHeader title="Ringkasan Task" />
          <EmployerStatCards summary={taskSummary} />
        </section>

        {/* ── 3. Quick actions ── */}
        <EmployerQuickActions
          onCreateTask={() => navigate('/tasks/create')}
          onManageApps={() => navigate('/employer/applications')}
          onViewActiveJobs={() => navigate('/employer/jobs')}
        />

        {/* ── Layout dua kolom: kiri (pekerjaan berlangsung), kanan (daftar task) ── */}
        {/* Desktop: 2 kolom. Tablet ke bawah: 1 kolom stacked. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* Kolom kiri (lg: 2/5 lebar) — Pekerjaan berlangsung */}
          <div className="lg:col-span-2">
            <section>
              <SectionHeader
                title="Pekerjaan Berlangsung"
                action={
                  activeJobs.length > 0 && (
                    <button
                      onClick={() => navigate('/employer/jobs')}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                    >
                      Lihat semua <ChevronRight size={13} />
                    </button>
                  )
                }
              />
              <EmployerActiveJobs
                activeJobs={activeJobs}
                onViewAll={() => navigate('/employer/jobs')}
                onJobClick={(job) =>
                  navigate(`/employer/jobs/${job.assignment_id ?? job.id}`)
                }
                onFindApps={() => navigate('/employer/applications')}
              />
            </section>
          </div>

          {/* Kolom kanan (lg: 3/5 lebar) — Daftar task */}
          <div className="lg:col-span-3">
            <section>
              <SectionHeader
                title="Task yang Dibuat"
                action={
                  myTasks.length > 0 && (
                    <button
                      onClick={() => navigate('/employer/applications')}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                    >
                      <TrendingUp size={13} />
                      Kelola semua
                    </button>
                  )
                }
              />
              <EmployerTaskList
                tasks={myTasks}
                publishing={publishing}
                publishError={publishError}
                onEdit={handleEdit}
                onPublish={handlePublish}
                onViewAll={() => navigate('/employer/applications')}
                onCreateTask={() => navigate('/tasks/create')}
                onDismissError={() => setPublishError(null)}
              />
            </section>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-200 pb-6 pt-4 text-xs text-slate-400">
          <span>Kerjain · Employer Dashboard</span>
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
