import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchCategories, fetchTaskById } from '../lib/api'
import { useApplicationStatus } from '../hooks/useApplicationStatus'

// ─── Helper ────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-sm text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{value ?? '—'}</dd>
    </div>
  )
}

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

// ─── Panel aksi lamaran ────────────────────────────────────────────────────
//
// Komponen terpisah agar logika lamaran tidak mencemari render utama.
// Menerima taskId dan mengelola status lamaran sendiri via useApplicationStatus.

function ApplicationPanel({ taskId }) {
  const { application, checkLoading, actionLoading, error, apply, cancel, clearError } =
    useApplicationStatus(taskId)

  // Pesan sukses lokal — ditampilkan sesaat setelah aksi berhasil
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleApply() {
    clearError()
    setSuccessMsg(null)
    const result = await apply()
    if (result.success) {
      setSuccessMsg('Lamaranmu berhasil dikirim! Status: Menunggu.')
    }
  }

  async function handleCancel() {
    clearError()
    setSuccessMsg(null)
    const result = await cancel()
    if (result.success) {
      setSuccessMsg('Lamaranmu berhasil dibatalkan.')
    }
  }

  // ── Badge status lamaran ──
  const statusConfig = {
    pending: {
      cls: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: '⏳',
      label: 'Menunggu review',
    },
    accepted: {
      cls: 'bg-green-50 border-green-200 text-green-800',
      icon: '✅',
      label: 'Lamaranmu diterima',
    },
    rejected: {
      cls: 'bg-red-50 border-red-200 text-red-800',
      icon: '❌',
      label: 'Lamaranmu ditolak',
    },
  }

  // ── Render saat cek awal masih berjalan ──
  if (checkLoading) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-10 w-full rounded-xl bg-slate-200" />
        </div>
      </section>
    )
  }

  // ── Sudah melamar ──
  if (application) {
    const cfg = statusConfig[application.status]

    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Status Lamaranmu
        </h2>

        {/* Badge status */}
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cfg?.cls ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}
        >
          <span className="text-lg">{cfg?.icon ?? '📄'}</span>
          <div>
            <p className="font-semibold text-sm">{cfg?.label ?? application.status}</p>
            <p className="text-xs opacity-70">
              Dikirim {formatDate(application.applied_at)}
            </p>
          </div>
        </div>

        {/* Pesan sukses */}
        {successMsg && (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </p>
        )}

        {/* Pesan error */}
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Tombol batalkan — hanya untuk pending */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {application.status === 'pending' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex-1 rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? 'Membatalkan...' : 'Batalkan Lamaran'}
            </button>
          )}
          <button
            onClick={() => window.history.back()}
            className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Tugas lainnya
          </button>
        </div>
      </section>
    )
  }

  // ── Belum melamar ──
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-slate-500">
        Tertarik dengan tugas ini? Kirim lamaranmu sekarang.
      </p>

      {/* Pesan sukses (muncul sesaat setelah apply, sebelum state application terisi) */}
      {successMsg && (
        <p className="mb-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </p>
      )}

      {/* Pesan error dari backend */}
      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={clearError}
            className="mt-1 text-xs text-red-500 underline underline-offset-2 hover:text-red-700"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleApply}
          disabled={actionLoading}
          className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading ? 'Mengirim lamaran...' : 'Lamar Tugas'}
        </button>
        <button
          onClick={() => window.history.back()}
          className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Tugas lainnya
        </button>
      </div>
    </section>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()

  const [task, setTask] = useState(null)
  const [categoryName, setCategoryName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [taskResult, categoriesResult] = await Promise.allSettled([
          fetchTaskById(taskId),
          fetchCategories(),
        ])

        if (!active) return

        if (taskResult.status === 'rejected') {
          setError(taskResult.reason?.message ?? 'Tugas tidak ditemukan.')
          return
        }

        const taskData = taskResult.value
        setTask(taskData)

        if (
          categoriesResult.status === 'fulfilled' &&
          Array.isArray(categoriesResult.value)
        ) {
          const found = categoriesResult.value.find(
            (c) => c.id === taskData.category_id,
          )
          setCategoryName(found?.name ?? null)
        }
      } catch (err) {
        if (active) setError(err.message ?? 'Gagal memuat detail tugas.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => { active = false }
  }, [taskId])

  // ── Loading state ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="h-10 w-2/3" />
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-28" />
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
            Tugas tidak dapat dimuat
          </h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              ← Kembali
            </button>
            <button
              onClick={() => navigate('/tasks')}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Lihat semua tugas
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── Konten utama ──
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Navigasi atas */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Kembali
        </button>

        {/* Header tugas */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {categoryName && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-500">
                  {categoryName}
                </p>
              )}
              <h1 className="text-2xl font-bold text-slate-900 leading-snug">
                {task.title}
              </h1>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              Published
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">📍 {task.location}</p>

          {task.description ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {task.description}
            </p>
          ) : (
            <p className="mt-4 text-sm italic text-slate-400">
              Tidak ada deskripsi.
            </p>
          )}
        </section>

        {/* Info detail */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Detail Tugas
          </h2>
          <dl className="space-y-3">
            <InfoRow
              label="Upah"
              value={`Rp ${Number(task.wage_amount).toLocaleString('id-ID')}`}
            />
            <InfoRow label="Metode pembayaran" value={task.payment_method} />
            <InfoRow
              label="Pekerja dibutuhkan"
              value={`${task.worker_needed} orang`}
            />
            <InfoRow label="Lokasi" value={task.location} />
            {categoryName && (
              <InfoRow label="Kategori" value={categoryName} />
            )}
            <InfoRow
              label="Dipublikasikan"
              value={formatDate(task.published_at)}
            />
          </dl>
        </section>

        {/* Panel lamaran — komponen terpisah dengan hook sendiri */}
        <ApplicationPanel taskId={taskId} />

        {/* Footer metadata */}
        <p className="pb-4 text-center text-xs text-slate-300">
          ID: {task.id} · Dibuat {formatDate(task.created_at)}
        </p>

      </div>
    </main>
  )
}
