import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminFetchPayments, adminFetchPaymentsAwaiting } from '../../lib/api'

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

function formatCurrency(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    cls: 'bg-slate-100 text-slate-600',
  },
  awaiting_verification: {
    label: 'Menunggu Verifikasi',
    cls: 'bg-yellow-100 text-yellow-700',
  },
  verified: {
    label: 'Terverifikasi',
    cls: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: 'Ditolak',
    cls: 'bg-red-100 text-red-700',
  },
  disbursed: {
    label: 'Dicairkan',
    cls: 'bg-blue-100 text-blue-700',
  },
  confirmed: {
    label: 'Confirmed (Legacy)',
    cls: 'bg-slate-100 text-slate-500',
  },
}

const TYPE_CONFIG = {
  WORK_PAYMENT: { label: 'Pembayaran Kerja', cls: 'bg-blue-50 text-blue-700' },
  PLATFORM_FEE: { label: 'Biaya Platform', cls: 'bg-purple-50 text-purple-700' },
}

// ─── Komponen kecil ────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, cls: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function PaymentRow({ payment }) {
  return (
    <Link
      to={`/admin/payments/${payment.id}`}
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Kiri — tipe, status, nominal */}
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={payment.type} />
        <StatusBadge status={payment.status} />
        <span className="text-sm font-semibold text-slate-800">
          {formatCurrency(payment.amount)}
        </span>
        {payment.transaction_reference && (
          <span className="hidden text-xs text-slate-400 sm:inline">
            Ref: {payment.transaction_reference.slice(0, 24)}…
          </span>
        )}
      </div>

      {/* Kanan — tanggal & ID potongan */}
      <div className="flex flex-col items-start gap-0.5 sm:items-end">
        <span className="text-xs text-slate-400">{formatDate(payment.created_at)}</span>
        <span className="font-mono text-[11px] text-slate-300">
          {String(payment.id).slice(0, 8)}…
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

// ─── Filter bar ────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'awaiting_verification', label: 'Menunggu Verifikasi' },
  { value: 'verified', label: 'Terverifikasi' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'disbursed', label: 'Dicairkan' },
  { value: 'pending', label: 'Pending' },
]

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'WORK_PAYMENT', label: 'Pembayaran Kerja' },
  { value: 'PLATFORM_FEE', label: 'Biaya Platform' },
]

// ─── AdminPaymentsPage ─────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [awaitingCount, setAwaitingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter state — dilakukan di sisi client dari data yang sudah diambil
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [tab, setTab] = useState('all') // 'all' | 'awaiting'

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [all, awaiting] = await Promise.all([
        adminFetchPayments(),
        adminFetchPaymentsAwaiting(),
      ])
      setPayments(all)
      setAwaitingCount(awaiting.length)
    } catch (err) {
      setError(err.message ?? 'Gagal mengambil data pembayaran.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter client-side
  const displayed = payments.filter((p) => {
    if (tab === 'awaiting' && p.status !== 'awaiting_verification') return false
    if (statusFilter && p.status !== statusFilter) return false
    if (typeFilter && p.type !== typeFilter) return false
    return true
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Verifikasi dana masuk dan catat pencairan ke Worker
          </p>
        </div>
        <button
          onClick={loadData}
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
            onClick={loadData}
            className="ml-3 font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Tab — Semua vs Antrean Verifikasi */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab('all'); setStatusFilter('') }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            tab === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => { setTab('awaiting'); setStatusFilter('') }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            tab === 'awaiting'
              ? 'bg-yellow-500 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-yellow-300'
          }`}
        >
          Antrean Verifikasi
          {awaitingCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                tab === 'awaiting' ? 'bg-white text-yellow-600' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {awaitingCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter — hanya tampil di tab 'all' */}
      {tab === 'all' && (
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {TYPE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(statusFilter || typeFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setTypeFilter('') }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 hover:text-slate-700"
            >
              ✕ Reset
            </button>
          )}
        </div>
      )}

      {/* Daftar */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          message={
            tab === 'awaiting'
              ? 'Tidak ada pembayaran yang menunggu verifikasi.'
              : 'Tidak ada pembayaran yang sesuai filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Menampilkan {displayed.length} dari {payments.length} record
          </p>
          {displayed.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </div>
      )}
    </div>
  )
}
