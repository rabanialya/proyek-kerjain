import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployerJobs } from '../hooks/useEmployerJobs'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`
}

// ─── Konfigurasi status assignment ─────────────────────────────────────────

export const EMPLOYER_STATUS_CONFIG = {
  assigned: {
    label: 'Belum Dimulai',
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dot: 'bg-yellow-400',
    description: 'Worker belum memulai pekerjaan.',
  },
  in_progress: {
    label: 'Sedang Dikerjakan',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    description: 'Worker sedang mengerjakan tugas.',
  },
  submitted: {
    label: 'Menunggu Persetujuan',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    description: 'Worker telah mengirim hasil. Perlu ditinjau.',
  },
  approved: {
    label: 'Selesai & Disetujui',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Pekerjaan telah disetujui.',
  },
  disputed: {
    label: 'Dalam Dispute',
    cls: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    description: 'Pekerjaan sedang dalam proses dispute.',
  },
  disputed_closed: {
    label: 'Dispute Ditutup',
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    description: 'Dispute telah ditutup oleh Admin. Pekerjaan tidak dilanjutkan.',
  },
}

// ─── Komponen kecil ────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

function StatusBadge({ status }) {
  const cfg = EMPLOYER_STATUS_CONFIG[status] ?? {
    label: status,
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function AssignmentCard({ job, onClick }) {
  const dateLabel = job.submitted_at
    ? `Dikirim ${formatDate(job.submitted_at)}`
    : job.started_at
      ? `Dimulai ${formatDate(job.started_at)}`
      : `Ditugaskan ${formatDate(job.assignment_created_at)}`

  const needsAction = job.assignment_status === 'submitted'

  return (
    <button
      onClick={onClick}
      className={[
        'w-full rounded-2xl border bg-white p-5 text-left transition',
        needsAction
          ? 'border-purple-300 ring-1 ring-purple-200 hover:border-purple-400 hover:shadow-md'
          : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-emerald-200',
      ].join(' ')}
    >
      {/* Perhatian badge untuk status submitted */}
      {needsAction && (
        <p className="mb-2 text-xs font-semibold text-purple-600 uppercase tracking-wide">
          ⚡ Membutuhkan tindakan
        </p>
      )}

      {/* Header: judul + badge status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {job.category_name && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-500">
              {job.category_name}
            </p>
          )}
          <h3 className="font-semibold text-slate-900 leading-snug">
            {job.task_title}
          </h3>
        </div>
        <StatusBadge status={job.assignment_status} />
      </div>

      {/* Info baris */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>👷</span>
          <span>{job.worker_display_name}</span>
          {job.worker_rating_avg > 0 && (
            <span className="text-amber-500 font-medium">
              ★ {job.worker_rating_avg.toFixed(1)}
            </span>
          )}
        </div>
        {job.task_location && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>📍</span>
            <span>{job.task_location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>📅</span>
          <span>{dateLabel}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-800">
          {formatCurrency(job.wage_amount)}
          <span className="ml-1 text-xs font-normal text-slate-400">
            · {job.payment_method}
          </span>
        </p>
        <p className="text-xs font-medium text-emerald-600">
          {needsAction ? 'Tinjau sekarang →' : 'Lihat detail →'}
        </p>
      </div>
    </button>
  )
}

// ─── Tab filter ─────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'submitted', label: 'Perlu Ditinjau' },
  { key: 'in_progress', label: 'Sedang Dikerjakan' },
  { key: 'assigned', label: 'Belum Dimulai' },
  { key: 'approved', label: 'Selesai' },
]

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function EmployerJobsPage() {
  const navigate = useNavigate()
  const { jobs, loading, error, reload } = useEmployerJobs()

  // State tab aktif disimpan lokal
  const [activeTab, setActiveTab] = useState('all')

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="h-8 w-1/2" />
          <SkeletonBlock className="h-10 w-full" />
          {[...Array(3)].map((_, i) => (
            <SkeletonBlock key={i} className="h-40" />
          ))}
        </div>
      </main>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">
            Gagal memuat pekerjaan
          </h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={reload}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Coba lagi
            </button>
            <button
              onClick={() => navigate('/employer')}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Kembali ke Dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Filter berdasarkan tab aktif
  const filtered =
    activeTab === 'all'
      ? jobs
      : jobs.filter((j) => j.assignment_status === activeTab)

  // Hitung badge per tab
  const counts = {
    all: jobs.length,
    submitted: jobs.filter((j) => j.assignment_status === 'submitted').length,
    in_progress: jobs.filter((j) => j.assignment_status === 'in_progress').length,
    assigned: jobs.filter((j) => j.assignment_status === 'assigned').length,
    approved: jobs.filter((j) => j.assignment_status === 'approved').length,
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Navigasi atas */}
        <button
          onClick={() => navigate('/employer')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Dashboard
        </button>

        {/* Header halaman */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Pekerjaan Aktif
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Pantau dan tinjau progress pekerjaan Worker.
            </p>
          </div>
          {jobs.length > 0 && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              {jobs.length} penugasan
            </span>
          )}
        </div>

        {/* Alert perlu tindakan */}
        {counts.submitted > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3">
            <span className="text-xl">🔔</span>
            <p className="text-sm font-medium text-purple-800">
              {counts.submitted} pekerjaan menunggu persetujuan Anda.
            </p>
          </div>
        )}

        {/* Tab filter */}
        {jobs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map((tab) => {
              const count = counts[tab.key]
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300',
                  ].join(' ')}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                        isActive
                          ? 'bg-emerald-500 text-white'
                          : tab.key === 'submitted'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Daftar kosong */}
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <p className="text-4xl">📋</p>
            <h2 className="mt-3 text-base font-semibold text-slate-700">
              Belum ada penugasan aktif
            </h2>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed px-6">
              Penugasan akan muncul di sini setelah Anda menugaskan Worker
              dari halaman manajemen lamaran.
            </p>
            <button
              onClick={() => navigate('/employer/applications')}
              className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Manajemen lamaran →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center">
            <p className="text-sm text-slate-400">
              Tidak ada pekerjaan dengan status ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => (
              <AssignmentCard
                key={job.assignment_id}
                job={job}
                onClick={() =>
                  navigate(`/employer/jobs/${job.assignment_id}`)
                }
              />
            ))}
          </div>
        )}

        {/* Catatan kaki */}
        <p className="pb-4 text-center text-xs text-slate-400">
          Hanya penugasan yang telah dibuat yang ditampilkan.
        </p>

      </div>
    </main>
  )
}
