import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDashboardEmployer } from '../hooks/useDashboardEmployer'
import { publishTask } from '../lib/api'
import NotificationBell from '../components/NotificationBell'

// ─── Komponen kecil ────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  const accents = {
    slate: 'bg-slate-50 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
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

function StatusBadge({ status }) {
  const map = {
    draft: { cls: 'bg-slate-100 text-slate-600', label: 'Draft' },
    published: { cls: 'bg-emerald-50 text-emerald-700', label: 'Published' },
    closed: { cls: 'bg-red-50 text-red-600', label: 'Ditutup' },
  }
  const { cls, label } = map[status] ?? { cls: 'bg-slate-100 text-slate-500', label: status }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function TaskRow({ task, onEdit, onPublish, publishing }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900 leading-snug">{task.title}</p>
        <StatusBadge status={task.status} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{task.location}</p>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-sm font-semibold text-slate-800">
          Rp {Number(task.wage_amount).toLocaleString('id-ID')}
        </p>
        <span className="text-xs text-slate-400">
          {task.worker_needed} worker dibutuhkan
        </span>
        <span className="text-xs text-slate-400">· {task.payment_method}</span>
      </div>

      {/* Aksi per task — hanya untuk draft dan published */}
      {task.status !== 'closed' && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => onEdit(task.id)}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            ✏️ Edit
          </button>
          {task.status === 'draft' && (
            <button
              onClick={() => onPublish(task)}
              disabled={publishing === task.id}
              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing === task.id ? 'Memproses…' : '🚀 Publikasikan'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

// ─── Dashboard utama ───────────────────────────────────────────────────────

export default function EmployerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Flash message dari halaman sebelumnya (misal: CreateTaskPage setelah berhasil)
  const [flash, setFlash] = useState(location.state?.flash ?? null)

  // Bersihkan flash setelah 5 detik
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 5000)
    return () => clearTimeout(t)
  }, [flash])

  // State untuk publish cepat dari dashboard
  const [publishing, setPublishing] = useState(null)   // task.id yang sedang diproses
  const [publishError, setPublishError] = useState(null)

  const {
    employerProfile,
    myTasks,
    taskSummary,
    loading,
    error,
    reload,
  } = useDashboardEmployer()

  // ── Navigasi ke halaman edit ──
  function handleEdit(taskId) {
    navigate(`/tasks/${taskId}/edit`)
  }

  // ── Publish langsung dari dashboard (untuk task draft) ──
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

  // ── Loading state ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-24" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonBlock key={i} className="h-20" />
            ))}
          </div>
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
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
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

        {/* ── Flash message ── */}
        {flash && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <span>✅ {flash}</span>
            <button
              onClick={() => setFlash(null)}
              className="shrink-0 text-emerald-500 hover:text-emerald-700"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Kartu profil Employer ── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Avatar inisial */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white select-none">
              {(employerProfile?.display_name ?? user?.full_name ?? '?')[0].toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                      Employer
                    </span>
                    {employerProfile?.tipe_employer && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        {employerProfile.tipe_employer}
                      </span>
                    )}
                    {employerProfile?.is_verified && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        ✓ Terverifikasi
                      </span>
                    )}
                  </div>
                  <h1 className="mt-0.5 text-lg font-bold text-slate-900 leading-tight">
                    {employerProfile?.display_name ?? user?.full_name}
                  </h1>
                  {employerProfile?.sektor && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {employerProfile.sektor}
                    </p>
                  )}
                  {employerProfile?.location && (
                    <p className="text-xs text-slate-500">
                      📍 {employerProfile.location}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <NotificationBell />
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Ganti peran
                  </button>
                </div>
              </div>

              {/* Tagline atau deskripsi */}
              {employerProfile?.tagline ? (
                <p className="mt-2 text-sm font-medium text-slate-600 italic">
                  "{employerProfile.tagline}"
                </p>
              ) : employerProfile?.description ? (
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                  {employerProfile.description}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-400 italic">
                  Belum ada deskripsi — lengkapi profilmu.
                </p>
              )}

              {/* Aksi profil */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate('/employer/profile')}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  Lihat Profil
                </button>
                <button
                  onClick={() => navigate('/employer/profile/edit')}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Edit Profil
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA buat tugas ── */}
        <section className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate('/tasks/create')}
            className="flex-1 rounded-2xl bg-emerald-600 px-5 py-4 text-left text-white transition hover:bg-emerald-700"
          >
            <p className="text-xl">➕</p>
            <p className="mt-1 font-semibold">Buat tugas baru</p>
            <p className="mt-0.5 text-xs text-emerald-200">
              Posting pekerjaan dan cari Worker
            </p>
          </button>
          <button
            onClick={() => navigate('/employer/applications')}
            className="flex-1 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100"
          >
            <p className="text-xl">📊</p>
            <p className="mt-1 font-semibold text-emerald-800">Manajemen lamaran</p>
            <p className="mt-0.5 text-xs text-emerald-600">Lihat & proses pelamar</p>
          </button>
        </section>

        {/* ── CTA pekerjaan aktif ── */}
        <button
          onClick={() => navigate('/employer/jobs')}
          className="w-full rounded-2xl border-2 border-blue-200 bg-blue-50 px-5 py-4 text-left transition hover:border-blue-400 hover:bg-blue-100"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xl">🔍</p>
              <p className="mt-1 font-semibold text-blue-900">Pekerjaan Aktif</p>
              <p className="mt-0.5 text-xs text-blue-600">
                Tinjau bukti kerja dan setujui hasil pekerjaan Worker
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Lihat →
            </span>
          </div>
        </button>

        {/* ── Ringkasan tugas ── */}
        <section>
          <SectionHeader title="Ringkasan tugas" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total published" value={taskSummary.published} accent="slate" />
            <StatCard label="Dibutuhkan" value={myTasks.reduce((s, t) => s + t.worker_needed, 0)} accent="blue" />
            <StatCard
              label="Total upah"
              value={
                myTasks.length === 0
                  ? '—'
                  : `${(myTasks.reduce((s, t) => s + Number(t.wage_amount), 0) / 1000).toFixed(0)}k`
              }
              accent="emerald"
            />
          </div>

          {/* Catatan keterbatasan */}
          {taskSummary.total === 0 && !loading && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Hanya menampilkan tugas berstatus <strong>published</strong>.
              Tugas draft atau closed belum tersedia dari API saat ini.
            </p>
          )}
        </section>

        {/* ── Daftar tugas ── */}
        <section>
          <SectionHeader
            title="Tugas yang dibuat"
            action={
              taskSummary.total > 0 && (
                <span className="text-xs text-slate-400">
                  {taskSummary.total} tugas
                </span>
              )
            }
          />

          {/* Error publish inline */}
          {publishError && (
            <div
              role="alert"
              className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {publishError}
              <button
                onClick={() => setPublishError(null)}
                className="ml-2 font-medium underline underline-offset-2 hover:no-underline"
              >
                Tutup
              </button>
            </div>
          )}

          {myTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center">
              <p className="text-3xl">📝</p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Belum ada tugas yang dibuat
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Buat tugas pertamamu dan mulai cari Worker.
              </p>
              <button
                onClick={() => navigate('/tasks/create')}
                className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Buat tugas sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={handleEdit}
                  onPublish={handlePublish}
                  publishing={publishing}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pb-6 text-xs text-slate-400">
          <span>Kerjain · Employer</span>
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
