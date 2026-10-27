import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminFetchDisputes } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open: {
    label: 'Terbuka',
    cls: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  resolved: {
    label: 'Selesai',
    cls: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
}

const DECISION_CONFIG = {
  approve_work: { label: 'Terima Pekerjaan', cls: 'bg-green-100 text-green-700' },
  reject_work: { label: 'Tolak Pekerjaan', cls: 'bg-red-100 text-red-700' },
  needs_revision: { label: 'Perlu Revisi', cls: 'bg-yellow-100 text-yellow-700' },
}

// ─── Komponen kecil ────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function DecisionBadge({ decision }) {
  if (!decision) return null
  const cfg = DECISION_CONFIG[decision] ?? { label: decision, cls: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function DisputeRow({ dispute }) {
  return (
    <Link
      to={`/admin/disputes/${dispute.id}`}
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Kiri */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={dispute.status} />
          {dispute.decision && <DecisionBadge decision={dispute.decision} />}
        </div>
        <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-1">
          {dispute.reason}
        </p>
        {dispute.description && (
          <p className="text-xs text-slate-400 line-clamp-1">{dispute.description}</p>
        )}
      </div>

      {/* Kanan */}
      <div className="flex flex-col items-start gap-0.5 shrink-0 sm:items-end">
        <span className="text-xs text-slate-400">{formatDate(dispute.created_at)}</span>
        <span className="font-mono text-[11px] text-slate-300">
          {String(dispute.id).slice(0, 8)}…
        </span>
      </div>
    </Link>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  )
}

// ─── AdminDisputesPage ─────────────────────────────────────────────────────

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const loadDisputes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchDisputes()
      setDisputes(data)
    } catch (err) {
      setError(err.message ?? 'Gagal mengambil data dispute.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDisputes()
  }, [loadDisputes])

  const displayed = statusFilter
    ? disputes.filter((d) => d.status === statusFilter)
    : disputes

  const openCount = disputes.filter((d) => d.status === 'open').length

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispute</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Tangani sengketa antara Employer dan Worker
          </p>
        </div>
        <button
          onClick={loadDisputes}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          {loading ? 'Memuat…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={loadDisputes}
            className="ml-3 font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Ringkasan cepat */}
      {!loading && disputes.length > 0 && (
        <div className="flex gap-3">
          <div className={`rounded-xl border px-4 py-2 text-sm font-semibold ${openCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            {openCount} Terbuka
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            {disputes.length - openCount} Selesai
          </div>
        </div>
      )}

      {/* Filter status */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: '', label: 'Semua' },
          { value: 'open', label: 'Terbuka' },
          { value: 'resolved', label: 'Selesai' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              statusFilter === opt.value
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Daftar */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          message={
            statusFilter === 'open'
              ? 'Tidak ada dispute yang terbuka.'
              : statusFilter === 'resolved'
              ? 'Belum ada dispute yang diselesaikan.'
              : 'Belum ada dispute.'
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Menampilkan {displayed.length} dari {disputes.length} dispute
          </p>
          {displayed.map((d) => (
            <DisputeRow key={d.id} dispute={d} />
          ))}
        </div>
      )}
    </div>
  )
}
