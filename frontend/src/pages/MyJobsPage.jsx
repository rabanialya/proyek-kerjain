import { useNavigate } from 'react-router-dom'
import { useMyWorkerJobs } from '../hooks/useMyWorkerJobs'

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

const STATUS_CONFIG = {
  assigned: {
    label: 'Menunggu Dimulai',
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dot: 'bg-yellow-400',
    description: 'Penugasan diterima, belum dimulai.',
  },
  in_progress: {
    label: 'Sedang Dikerjakan',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    description: 'Pekerjaan sedang berlangsung.',
  },
  submitted: {
    label: 'Menunggu Persetujuan',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    description: 'Hasil pekerjaan telah dikirim, menunggu konfirmasi Employer.',
  },
  approved: {
    label: 'Selesai',
    cls: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
    description: 'Pekerjaan disetujui oleh Employer.',
  },
  disputed: {
    label: 'Dalam Dispute',
    cls: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    description: 'Pekerjaan sedang dalam proses dispute.',
  },
}

// ─── Komponen kecil ────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
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

function JobCard({ job, onClick }) {
  const cfg = STATUS_CONFIG[job.assignment_status]
  const dateLabel = job.started_at
    ? `Dimulai ${formatDate(job.started_at)}`
    : `Ditugaskan ${formatDate(job.assignment_created_at)}`

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      {/* Header: judul + badge status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {job.category_name && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-500">
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
          <span>📍</span>
          <span>{job.task_location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>🏢</span>
          <span>{job.employer_display_name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>📅</span>
          <span>{dateLabel}</span>
        </div>
      </div>

      {/* Footer: upah + keterangan status */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-800">
          {formatCurrency(job.wage_amount)}
          <span className="ml-1 text-xs font-normal text-slate-400">
            · {job.payment_method}
          </span>
        </p>
        {cfg?.description && (
          <p className="text-right text-xs text-slate-400 leading-snug max-w-[40%]">
            {cfg.description}
          </p>
        )}
      </div>

      <p className="mt-3 text-xs font-medium text-blue-600">
        Lihat detail →
      </p>
    </button>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function MyJobsPage() {
  const navigate = useNavigate()
  const { jobs, loading, error, reload } = useMyWorkerJobs()

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="h-8 w-1/2" />
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
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Coba lagi
            </button>
            <button
              onClick={() => navigate('/worker')}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Kembali ke Dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Navigasi atas */}
        <button
          onClick={() => navigate('/worker')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Dashboard
        </button>

        {/* Header halaman */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Pekerjaan Saya
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Pekerjaan yang lamarannya telah diterima dan ditugaskan.
            </p>
          </div>
          {jobs.length > 0 && (
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              {jobs.length} pekerjaan
            </span>
          )}
        </div>

        {/* Daftar kosong */}
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <p className="text-4xl">💼</p>
            <h2 className="mt-3 text-base font-semibold text-slate-700">
              Belum ada pekerjaan aktif
            </h2>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed px-6">
              Pekerjaan akan muncul di sini setelah lamaranmu diterima dan
              Employer membuat penugasan.
            </p>
            <button
              onClick={() => navigate('/tasks')}
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Cari tugas →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.assignment_id}
                job={job}
                onClick={() => navigate(`/worker/jobs/${job.assignment_id}`)}
              />
            ))}
          </div>
        )}

        {/* Catatan kaki */}
        <p className="pb-4 text-center text-xs text-slate-400">
          Hanya pekerjaan yang telah ditugaskan yang ditampilkan di sini.
        </p>

      </div>
    </main>
  )
}
