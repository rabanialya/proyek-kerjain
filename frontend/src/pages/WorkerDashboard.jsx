import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDashboardWorker } from '../hooks/useDashboardWorker'

// ─── Komponen kecil ────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  const accents = {
    slate: 'bg-slate-50 text-slate-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className={`rounded-2xl px-5 py-4 ${accents[accent] ?? accents.slate}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs font-medium">{label}</p>
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {action}
    </div>
  )
}

function TaskCard({ task, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900 leading-snug">{task.title}</p>
        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
          Published
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{task.location}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">
        Rp {Number(task.wage_amount).toLocaleString('id-ID')}
        <span className="ml-1 text-xs font-normal text-slate-400">
          · {task.payment_method}
        </span>
      </p>
    </button>
  )
}

function ApplicationRow({ app }) {
  const statusStyle = {
    pending: 'bg-yellow-50 text-yellow-700',
    accepted: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
  }
  const statusLabel = {
    pending: 'Menunggu',
    accepted: 'Diterima',
    rejected: 'Ditolak',
  }
  const style = statusStyle[app.status] ?? 'bg-slate-50 text-slate-600'
  const label = statusLabel[app.status] ?? app.status

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-xs text-slate-400">Task ID</p>
        <p className="text-sm font-medium text-slate-700 font-mono">
          {String(app.task_id).slice(0, 8)}…
        </p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
        {label}
      </span>
    </div>
  )
}

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

// ─── Dashboard utama ───────────────────────────────────────────────────────

export default function WorkerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const {
    workerProfile,
    applicationSummary,
    applications,
    recentTasks,
    activeJobsCount,
    loading,
    error,
    reload,
  } = useDashboardWorker()

  // ── Loading state ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-24" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonBlock key={i} className="h-20" />
            ))}
          </div>
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-56" />
        </div>
      </main>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">
            Gagal memuat dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={reload}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Coba lagi
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Kartu profil Worker ── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Avatar inisial */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white select-none">
              {(workerProfile?.nickname ?? user?.full_name ?? '?')[0].toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                      Worker
                    </span>
                    {workerProfile?.status_pekerjaan && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {workerProfile.status_pekerjaan}
                      </span>
                    )}
                  </div>
                  <h1 className="mt-0.5 text-lg font-bold text-slate-900 leading-tight">
                    {workerProfile?.nickname
                      ? `${workerProfile.nickname} · ${user?.full_name}`
                      : user?.full_name}
                  </h1>
                  {workerProfile?.location && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      📍 {workerProfile.location}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Ganti peran
                </button>
              </div>

              {/* Bio */}
              {workerProfile?.bio ? (
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                  {workerProfile.bio}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-400 italic">
                  Belum ada bio — lengkapi profilmu.
                </p>
              )}

              {/* Skills pills */}
              {workerProfile?.skills?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {workerProfile.skills.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {s}
                    </span>
                  ))}
                  {workerProfile.skills.length > 4 && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                      +{workerProfile.skills.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Aksi profil */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate('/worker/profile')}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  Lihat Profil
                </button>
                <button
                  onClick={() => navigate('/worker/profile/edit')}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Edit Profil
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ringkasan lamaran ── */}
        <section>
          <SectionHeader
            title="Ringkasan lamaranmu"
            action={
              applicationSummary.total > 0 && (
                <span className="text-xs text-slate-400">
                  {applicationSummary.total} total
                </span>
              )
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={applicationSummary.total} accent="slate" />
            <StatCard label="Menunggu" value={applicationSummary.pending} accent="yellow" />
            <StatCard label="Diterima" value={applicationSummary.accepted} accent="green" />
            <StatCard label="Ditolak" value={applicationSummary.rejected} accent="red" />
          </div>
        </section>

        {/* ── Pekerjaan Saya ── */}
        <section>
          <SectionHeader title="Pekerjaan Saya" />
          <button
            onClick={() => navigate('/worker/jobs')}
            className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  💼
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    Pekerjaan yang Diterima
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {activeJobsCount > 0
                      ? `${activeJobsCount} pekerjaan sedang aktif`
                      : 'Belum ada pekerjaan aktif'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeJobsCount > 0 && (
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    {activeJobsCount}
                  </span>
                )}
                <span className="text-sm text-blue-600 font-medium">
                  Lihat →
                </span>
              </div>
            </div>
          </button>
        </section>

        {/* ── Daftar lamaran terbaru ── */}
        {applications.length > 0 && (
          <section>
            <SectionHeader title="Lamaran terbaru" />
            <div className="space-y-2">
              {applications.slice(0, 5).map((app) => (
                <ApplicationRow key={app.id} app={app} />
              ))}
              {applications.length > 5 && (
                <p className="pt-1 text-center text-xs text-slate-400">
                  +{applications.length - 5} lamaran lainnya
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Tugas tersedia ── */}
        <section>
          <SectionHeader
            title="Tugas tersedia"
            action={
              <button
                onClick={() => navigate('/tasks')}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Lihat semua →
              </button>
            }
          />
          {recentTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center">
              <p className="text-2xl">📋</p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Belum ada tugas yang tersedia
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Cek kembali nanti.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pb-6 text-xs text-slate-400">
          <span>{user?.email}</span>
          <button
            onClick={logout}
            className="hover:text-slate-600 hover:underline underline-offset-2"
          >
            Keluar
          </button>
        </div>

      </div>
    </main>
  )
}
