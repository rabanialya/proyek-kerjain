import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyTasks } from '../lib/api'

// ─── Komponen kecil ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    draft:     { cls: 'bg-slate-100 text-slate-600',   label: 'Draft' },
    published: { cls: 'bg-emerald-50 text-emerald-700', label: 'Published' },
    closed:    { cls: 'bg-red-50 text-red-600',         label: 'Ditutup' },
  }
  const { cls, label } = map[status] ?? { cls: 'bg-slate-100 text-slate-500', label: status }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function ApplicationManagement() {
  const navigate = useNavigate()

  const [tasks, setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyTasks()
      setTasks(data ?? [])
    } catch (err) {
      setError(err.message ?? 'Gagal memuat daftar tugas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-10 w-48" />
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
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
          <h2 className="mt-3 font-semibold text-slate-900">Gagal memuat tugas</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={load}
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Coba lagi
          </button>
          <button
            onClick={() => navigate('/employer')}
            className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employer')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ← Kembali
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Manajemen Lamaran</h1>
            <p className="text-xs text-slate-500">
              Pilih tugas untuk melihat daftar pelamarnya
            </p>
          </div>
        </div>

        {/* ── Empty state ── */}
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="text-3xl">📋</p>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Belum ada tugas yang dibuat
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Buat tugas terlebih dahulu sebelum mengelola lamaran.
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
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/employer/applications/${task.id}`)}
              />
            ))}
          </div>
        )}

      </div>
    </main>
  )
}

// ─── TaskCard ──────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }) {
  // Hanya task published yang bisa menerima lamaran baru,
  // tapi employer tetap boleh melihat lamaran task yang sudah closed.
  const isInteractable = task.status === 'published' || task.status === 'closed'

  return (
    <button
      onClick={onClick}
      disabled={task.status === 'draft'}
      title={
        task.status === 'draft'
          ? 'Publish tugas terlebih dahulu agar bisa menerima lamaran'
          : 'Lihat lamaran untuk tugas ini'
      }
      className={[
        'w-full rounded-xl border bg-white p-4 text-left transition',
        isInteractable
          ? 'border-slate-200 hover:border-emerald-300 hover:shadow-sm cursor-pointer'
          : 'border-slate-200 opacity-50 cursor-not-allowed',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900 leading-snug">{task.title}</p>
        <StatusBadge status={task.status} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{task.location}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-slate-800">
          Rp {Number(task.wage_amount).toLocaleString('id-ID')}
        </span>
        <span className="text-xs text-slate-400">
          {task.worker_needed} worker dibutuhkan
        </span>
        <span className="text-xs text-slate-400">· {task.payment_method}</span>
      </div>
      {task.status === 'draft' && (
        <p className="mt-2 text-xs text-amber-600 font-medium">
          ⚠ Publish tugas ini agar bisa menerima lamaran
        </p>
      )}
    </button>
  )
}
