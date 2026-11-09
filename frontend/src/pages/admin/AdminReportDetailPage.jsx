import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminFetchReportDetail, adminUpdateReportStatus, adminUpdateUserStatus } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso, withTime = false) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  })
}

const STATUS_CONFIG = {
  open:         { label: 'Terbuka',      cls: 'bg-red-100 text-red-700' },
  pending:      { label: 'Pending',      cls: 'bg-amber-100 text-amber-700' },
  under_review: { label: 'Ditinjau',     cls: 'bg-blue-100 text-blue-700' },
  resolved:     { label: 'Diselesaikan', cls: 'bg-green-100 text-green-700' },
  rejected:     { label: 'Ditolak',      cls: 'bg-slate-100 text-slate-600' },
}

const REASON_LABELS = {
  fraud:          'Penipuan / Kecurangan',
  wrong_info:     'Informasi Tidak Sesuai',
  inappropriate:  'Perilaku Tidak Pantas',
  spam:           'Spam',
  rule_violation: 'Pelanggaran Aturan Platform',
  other:          'Lainnya',
}

const STATUS_OPTIONS = [
  { value: 'open',         label: 'Terbuka' },
  { value: 'pending',      label: 'Pending' },
  { value: 'under_review', label: 'Ditinjau' },
  { value: 'resolved',     label: 'Diselesaikan' },
  { value: 'rejected',     label: 'Ditolak' },
]

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <span className="w-44 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 break-all">{value ?? '—'}</span>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

// ─── Panel Penanganan Laporan ─────────────────────────────────────────────

function HandleReportPanel({ report, onUpdated }) {
  const [newStatus, setNewStatus] = useState(report.status)
  const [adminNotes, setAdminNotes] = useState(report.admin_notes ?? '')
  const [resolution, setResolution] = useState(report.resolution ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const needsResolution = newStatus === 'resolved' || newStatus === 'rejected'

  async function handleSubmit(e) {
    e.preventDefault()
    if (needsResolution && !resolution.trim()) {
      setError('Keterangan penyelesaian wajib diisi untuk status ini.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const updated = await adminUpdateReportStatus(report.id, {
        status: newStatus,
        admin_notes: adminNotes.trim() || null,
        resolution: resolution.trim() || null,
      })
      onUpdated(updated)
    } catch (err) {
      setError(err.message ?? 'Gagal memperbarui laporan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Penanganan Laporan
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Perbarui Status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewStatus(opt.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  newStatus === opt.value
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catatan Admin */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Catatan Admin <span className="text-slate-400 font-normal">(opsional)</span>
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="Catatan internal untuk penanganan laporan ini..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>

        {/* Keterangan penyelesaian */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Keterangan Penyelesaian
            {needsResolution
              ? <span className="ml-1 text-red-500">*</span>
              : <span className="ml-1 text-slate-400 font-normal">(opsional)</span>
            }
          </label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            placeholder={
              needsResolution
                ? 'Wajib diisi — jelaskan keputusan penyelesaian laporan...'
                : 'Keterangan tambahan tentang penyelesaian laporan...'
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || newStatus === report.status && !adminNotes.trim() && !resolution.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Panel Tindak Lanjut ──────────────────────────────────────────────────

function FollowUpPanel({ report }) {
  const hasTargetUser = Boolean(report.reported_user_id)
  const [deactivating, setDeactivating] = useState(false)
  const [followUpMsg, setFollowUpMsg] = useState(null)
  const [followUpError, setFollowUpError] = useState(null)

  async function handleDeactivateUser() {
    if (!window.confirm(
      'Nonaktifkan akun yang dilaporkan? Tindakan ini dapat dibalik oleh Admin.'
    )) return

    setDeactivating(true)
    setFollowUpError(null)
    try {
      await adminUpdateUserStatus(report.reported_user_id, false)
      setFollowUpMsg('Akun berhasil dinonaktifkan.')
    } catch (err) {
      setFollowUpError(err.message ?? 'Gagal menonaktifkan akun.')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
        Tindak Lanjut
      </h2>
      <p className="mb-4 text-xs text-amber-700">
        Tindakan di bawah ini bersifat langsung dan tidak otomatis dibatalkan.
        Pastikan laporan sudah diperiksa sebelum mengambil tindakan.
      </p>

      {followUpMsg && (
        <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {followUpMsg}
        </div>
      )}
      {followUpError && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {followUpError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {hasTargetUser && (
          <button
            onClick={handleDeactivateUser}
            disabled={deactivating}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {deactivating ? 'Memproses…' : 'Nonaktifkan Akun yang Dilaporkan'}
          </button>
        )}
        <p className="self-center text-xs text-amber-600 italic">
          Tindakan lain dapat dilakukan melalui halaman Pengguna atau Task.
        </p>
      </div>
    </div>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function AdminReportDetailPage() {
  const { reportId } = useParams()
  const navigate = useNavigate()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchReportDetail(reportId)
      setReport(data)
    } catch (err) {
      setError(err.message ?? 'Gagal memuat laporan.')
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => { loadReport() }, [loadReport])

  function handleUpdated(updated) {
    setReport(updated)
    setSuccessMsg('Laporan berhasil diperbarui.')
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-slate-200" />
        <div className="h-40 rounded-2xl bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadReport} className="ml-3 font-semibold underline">Coba lagi</button>
        </div>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Navigasi */}
      <button
        onClick={() => navigate('/admin/reports')}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition"
      >
        ← Kembali ke Daftar Laporan
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{report.subject}</h1>
          <p className="mt-1 font-mono text-xs text-slate-400">ID: {report.id}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* Pesan sukses */}
      {successMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Detail laporan */}
      <SectionCard title="Detail Laporan">
        <InfoRow label="Dikirim Oleh" value={report.reported_by} />
        {report.reported_user_id && (
          <InfoRow label="Target Pengguna" value={report.reported_user_id} />
        )}
        {report.reported_task_id && (
          <InfoRow label="Target Task" value={report.reported_task_id} />
        )}
        <InfoRow
          label="Kategori Alasan"
          value={
            report.reason_category
              ? REASON_LABELS[report.reason_category] ?? report.reason_category
              : null
          }
        />
        <InfoRow label="Tanggal Laporan" value={formatDate(report.created_at, true)} />
      </SectionCard>

      {/* Isi laporan */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Deskripsi Laporan
        </h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {report.description}
        </p>
      </div>

      {/* Status & catatan yang sudah ada */}
      {(report.admin_notes || report.resolution) && (
        <SectionCard title="Catatan Penanganan">
          {report.admin_notes && (
            <div className="py-2.5">
              <p className="text-xs font-semibold text-slate-500 mb-1">Catatan Admin</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.admin_notes}</p>
            </div>
          )}
          {report.resolution && (
            <div className="py-2.5">
              <p className="text-xs font-semibold text-slate-500 mb-1">Keterangan Penyelesaian</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.resolution}</p>
            </div>
          )}
          {report.resolved_by && (
            <InfoRow label="Diselesaikan Oleh" value={report.resolved_by} />
          )}
          {report.resolved_at && (
            <InfoRow label="Waktu Penyelesaian" value={formatDate(report.resolved_at, true)} />
          )}
        </SectionCard>
      )}

      {/* Panel penanganan */}
      <HandleReportPanel report={report} onUpdated={handleUpdated} />

      {/* Panel tindak lanjut */}
      {report.status !== 'rejected' && (
        <FollowUpPanel report={report} />
      )}
    </div>
  )
}
