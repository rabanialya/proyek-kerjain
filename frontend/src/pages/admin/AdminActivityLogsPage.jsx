import { useCallback, useEffect, useState } from 'react'
import { adminFetchActivityLogs, adminFetchActivityLogDetail } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Render value JSON dengan format yang mudah dibaca.
 * Menampilkan sebagai tabel key→value jika objek flat,
 * atau sebagai blok kode jika nested.
 */
function JsonValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 italic">—</span>
  }

  const entries = Object.entries(value)

  // Jika semua value adalah primitif, tampilkan sebagai tabel ringkas
  const allPrimitive = entries.every(
    ([, v]) => v === null || typeof v !== 'object'
  )

  if (allPrimitive) {
    return (
      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-xs">
            <span className="w-36 shrink-0 text-slate-400">{k}</span>
            <span className="font-medium text-slate-700 break-all">
              {v === null ? <span className="italic text-slate-300">null</span> : String(v)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Fallback ke blok JSON
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

// ─── Konfigurasi aksi ──────────────────────────────────────────────────────

const ACTION_CONFIG = {
  verify_payment: {
    label: 'Verifikasi Pembayaran',
    cls: 'bg-green-100 text-green-700',
    icon: '✓',
  },
  reject_payment: {
    label: 'Tolak Bukti Transfer',
    cls: 'bg-red-100 text-red-700',
    icon: '✕',
  },
  disburse_payment: {
    label: 'Pencairan ke Worker',
    cls: 'bg-blue-100 text-blue-700',
    icon: '→',
  },
  resolve_dispute: {
    label: 'Selesaikan Dispute',
    cls: 'bg-purple-100 text-purple-700',
    icon: '⚖',
  },
}

const ENTITY_LABELS = {
  payment: 'Pembayaran',
  dispute: 'Dispute',
  user: 'Pengguna',
  task: 'Task',
  assignment: 'Assignment',
}

// ─── Komponen kecil ────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] ?? {
    label: action,
    cls: 'bg-slate-100 text-slate-600',
    icon: '·',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function EntityTag({ entityType, entityId }) {
  const label = ENTITY_LABELS[entityType] ?? entityType
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <span className="font-mono text-slate-400">{String(entityId).slice(0, 8)}…</span>
    </span>
  )
}

// ─── Detail drawer — tampil inline di bawah baris yang diklik ─────────────

function LogDetail({ log, onClose }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-blue-800">Detail Activity Log</p>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
        >
          Tutup ✕
        </button>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 text-xs">
        <div className="flex gap-2">
          <span className="w-28 text-slate-400">ID Log</span>
          <span className="font-mono text-slate-700 break-all">{log.id}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-28 text-slate-400">User ID</span>
          <span className="font-mono text-slate-700 break-all">
            {log.user_id ?? <span className="italic text-slate-400">—</span>}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="w-28 text-slate-400">Entity Type</span>
          <span className="text-slate-700">{log.entity_type}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-28 text-slate-400">Entity ID</span>
          <span className="font-mono text-slate-700 break-all">{log.entity_id}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-28 text-slate-400">Action</span>
          <span className="text-slate-700">{log.action}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-28 text-slate-400">Waktu</span>
          <span className="text-slate-700">{formatDate(log.created_at)}</span>
        </div>
      </div>

      {/* Old value / New value */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Sebelum (old_value)</p>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 min-h-[3rem]">
            <JsonValue value={log.old_value} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Sesudah (new_value)</p>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 min-h-[3rem]">
            <JsonValue value={log.new_value} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Baris log ─────────────────────────────────────────────────────────────

function LogRow({ log, isExpanded, onToggle }) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:shadow-sm ${
          isExpanded ? 'border-blue-300 shadow-sm' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Kiri */}
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge action={log.action} />
            <EntityTag entityType={log.entity_type} entityId={log.entity_id} />
          </div>

          {/* Kanan */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400">{formatDate(log.created_at)}</span>
            <span className={`text-xs text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </div>

        {/* User ID ringkas */}
        {log.user_id && (
          <p className="mt-1 font-mono text-[11px] text-slate-300">
            by {String(log.user_id).slice(0, 8)}…
          </p>
        )}
      </button>

      {isExpanded && (
        <LogDetail log={log} onClose={onToggle} />
      )}
    </div>
  )
}

// ─── AdminActivityLogsPage ─────────────────────────────────────────────────

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Filter
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchActivityLogs()
      setLogs(data)
    } catch (err) {
      setError(err.message ?? 'Gagal mengambil activity log.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // Filter client-side
  const displayed = logs.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false
    if (entityFilter && log.entity_type !== entityFilter) return false
    return true
  })

  // Opsi filter action — hanya aksi yang memang ada di data
  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort()
  const uniqueEntities = [...new Set(logs.map((l) => l.entity_type))].sort()

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Riwayat tindakan Admin pada platform
          </p>
        </div>
        <button
          onClick={loadLogs}
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
            onClick={loadLogs}
            className="ml-3 font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Filter */}
      {!loading && logs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {/* Filter aksi */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setExpandedId(null) }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Semua Aksi</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {ACTION_CONFIG[a]?.label ?? a}
              </option>
            ))}
          </select>

          {/* Filter entity */}
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setExpandedId(null) }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Semua Entity</option>
            {uniqueEntities.map((e) => (
              <option key={e} value={e}>
                {ENTITY_LABELS[e] ?? e}
              </option>
            ))}
          </select>

          {(actionFilter || entityFilter) && (
            <button
              onClick={() => { setActionFilter(''); setEntityFilter(''); setExpandedId(null) }}
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
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="text-sm text-slate-400">
            {logs.length === 0
              ? 'Belum ada aktivitas yang tercatat.'
              : 'Tidak ada log yang sesuai filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Menampilkan {displayed.length} dari {logs.length} log
          </p>
          {displayed.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              isExpanded={expandedId === log.id}
              onToggle={() => toggleExpand(log.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
