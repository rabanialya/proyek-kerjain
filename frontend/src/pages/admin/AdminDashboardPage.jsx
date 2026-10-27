import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminFetchStats } from '../../lib/api'

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

const ACTION_LABELS = {
  verify_payment: 'Verifikasi pembayaran',
  reject_payment: 'Tolak bukti transfer',
  disburse_payment: 'Pencairan ke Worker',
  resolve_dispute: 'Selesaikan dispute',
}

const ACTION_COLORS = {
  verify_payment: 'bg-green-100 text-green-700',
  reject_payment: 'bg-red-100 text-red-700',
  disburse_payment: 'bg-blue-100 text-blue-700',
  resolve_dispute: 'bg-purple-100 text-purple-700',
}

// ─── Komponen kecil ────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

function StatCard({ label, value, accent, to, icon }) {
  const accents = {
    slate: 'bg-white border-slate-200 text-slate-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
  }

  const inner = (
    <div className={`rounded-2xl border px-5 py-4 ${accents[accent] ?? accents.slate} ${to ? 'transition hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-3xl font-bold">{value}</p>
        {icon && <span className="text-2xl leading-none">{icon}</span>}
      </div>
      <p className="mt-1 text-sm font-medium opacity-80">{label}</p>
      {to && (
        <p className="mt-2 text-xs font-semibold opacity-60">Lihat semua →</p>
      )}
    </div>
  )

  if (to) {
    return <Link to={to}>{inner}</Link>
  }
  return inner
}

function StatCardSkeleton() {
  return <SkeletonBlock className="h-24" />
}

function ActivityRow({ log }) {
  const actionLabel = ACTION_LABELS[log.action] ?? log.action
  const colorCls = ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'

  return (
    <div className="flex items-start gap-3 py-3">
      <span
        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${colorCls}`}
      >
        {actionLabel}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-500">
          {log.entity_type} · {log.entity_id?.slice(0, 8)}…
        </p>
        <p className="text-xs text-slate-400">{formatDate(log.created_at)}</p>
      </div>
    </div>
  )
}

// ─── AdminDashboardPage ────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchStats()
      setStats(data)
    } catch (err) {
      setError(err.message ?? 'Gagal mengambil data statistik.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Ringkasan platform Kerjain
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          {loading ? 'Memuat…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={loadStats}
            className="ml-3 font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Stat cards — pengguna & task */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Platform
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                label="Total Pengguna"
                value={stats.total_users}
                accent="slate"
                icon="👥"
              />
              <StatCard
                label="Pengguna Aktif"
                value={stats.active_users}
                accent="green"
                icon="✅"
              />
              <StatCard
                label="Total Task"
                value={stats.total_tasks}
                accent="slate"
                icon="📋"
              />
              <StatCard
                label="Task Published"
                value={stats.published_tasks}
                accent="blue"
                icon="🚀"
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Stat cards — perlu tindakan */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Perlu Tindakan
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                label="Pembayaran Menunggu Verifikasi"
                value={stats.payments_awaiting_verification}
                accent={stats.payments_awaiting_verification > 0 ? 'yellow' : 'slate'}
                icon="💳"
                to="/admin/payments"
              />
              <StatCard
                label="Dispute Terbuka"
                value={stats.open_disputes}
                accent={stats.open_disputes > 0 ? 'red' : 'slate'}
                icon="⚖️"
                to="/admin/disputes"
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Stat dispute ringkasan */}
      {!loading && stats && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Dispute
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Dispute Terbuka"
              value={stats.open_disputes}
              accent="red"
              icon="🔴"
            />
            <StatCard
              label="Dispute Selesai"
              value={stats.resolved_disputes}
              accent="green"
              icon="✔️"
            />
          </div>
        </section>
      )}

      {/* Aktivitas terbaru */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Aktivitas Terbaru
          </h2>
          <Link
            to="/admin/activity-logs"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Lihat semua →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 divide-y divide-slate-100">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-8" />
              ))}
            </div>
          ) : !stats?.recent_activity?.length ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Belum ada aktivitas yang tercatat.
            </p>
          ) : (
            stats.recent_activity.map((log) => (
              <ActivityRow key={log.id} log={log} />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
