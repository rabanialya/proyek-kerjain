import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminFetchReports } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_CONFIG = {
  open:         { label: 'Terbuka',        cls: 'bg-red-100 text-red-700' },
  pending:      { label: 'Pending',        cls: 'bg-amber-100 text-amber-700' },
  under_review: { label: 'Ditinjau',       cls: 'bg-blue-100 text-blue-700' },
  resolved:     { label: 'Diselesaikan',   cls: 'bg-green-100 text-green-700' },
  rejected:     { label: 'Ditolak',        cls: 'bg-slate-100 text-slate-600' },
}

const REASON_LABELS = {
  fraud:          'Penipuan / Kecurangan',
  wrong_info:     'Informasi Tidak Sesuai',
  inappropriate:  'Perilaku Tidak Pantas',
  spam:           'Spam',
  rule_violation: 'Pelanggaran Aturan',
  other:          'Lainnya',
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function AdminReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter
  const [statusFilter, setStatusFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchReports()
      setReports(data ?? [])
    } catch (err) {
      setError(err.message ?? 'Gagal memuat laporan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReports() }, [loadReports])
  useEffect(() => { setPage(1) }, [statusFilter, reasonFilter, dateFrom, dateTo])

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = reports.filter((r) => {
    const matchStatus = !statusFilter || r.status === statusFilter
    const matchReason = !reasonFilter || r.reason_category === reasonFilter
    const createdAt = new Date(r.created_at)
    const matchFrom = !dateFrom || createdAt >= new Date(dateFrom)
    const matchTo = !dateTo || createdAt <= new Date(dateTo + 'T23:59:59')
    return matchStatus && matchReason && matchFrom && matchTo
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Hitung ringkasan status ───────────────────────────────────────────────
  const countByStatus = reports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Laporan pelanggaran yang dikirim pengguna
          </p>
        </div>
        <button
          onClick={loadReports}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          {loading ? 'Memuat…' : '↻ Refresh'}
        </button>
      </div>

      {/* Ringkasan status */}
      {!loading && reports.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === key
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {cfg.label}
              <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {countByStatus[key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadReports} className="ml-3 font-semibold underline">Coba lagi</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
        >
          <option value="">Semua Alasan</option>
          {Object.entries(REASON_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
          />
          <span className="text-slate-400 text-sm">s/d</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
          />
        </div>
        {(statusFilter || reasonFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setStatusFilter(''); setReasonFilter(''); setDateFrom(''); setDateTo('') }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            Hapus Filter
          </button>
        )}
      </div>

      {/* Ringkasan total */}
      {!loading && (
        <p className="text-sm text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700">{filtered.length}</span> dari{' '}
          <span className="font-semibold text-slate-700">{reports.length}</span> laporan
        </p>
      )}

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Judul Laporan</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Alasan</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tanggal</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {statusFilter || reasonFilter || dateFrom || dateTo
                      ? 'Tidak ada laporan yang sesuai filter.'
                      : 'Belum ada laporan masuk.'}
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {r.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 max-w-xs truncate">{r.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pelapor: {r.reported_by.slice(0, 8)}…
                        {r.reported_user_id && (
                          <> · Target user: {r.reported_user_id.slice(0, 8)}…</>
                        )}
                        {r.reported_task_id && (
                          <> · Target task: {r.reported_task_id.slice(0, 8)}…</>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.reason_category
                        ? REASON_LABELS[r.reason_category] ?? r.reason_category
                        : <span className="text-slate-300 italic">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/reports/${r.id}`}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            ← Sebelumnya
          </button>
          <span className="text-sm text-slate-500">
            Halaman <span className="font-semibold text-slate-700">{page}</span> dari{' '}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  )
}
