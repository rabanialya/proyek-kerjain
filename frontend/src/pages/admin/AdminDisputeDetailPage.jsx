import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminFetchDisputeDetail, adminResolveDispute } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Konfigurasi keputusan ─────────────────────────────────────────────────

const DECISIONS = [
  {
    value: 'approve_work',
    label: 'Terima Pekerjaan',
    description:
      'Hasil pekerjaan diterima. Assignment berubah ke status approved dan alur pembayaran dapat dilanjutkan.',
    cls: 'border-green-300 bg-green-50',
    activeCls: 'border-green-500 bg-green-100 ring-2 ring-green-300',
    labelCls: 'text-green-800',
    icon: '✓',
  },
  {
    value: 'needs_revision',
    label: 'Perlu Revisi',
    description:
      'Worker perlu merevisi pekerjaan. Assignment dikembalikan ke status in_progress. Tidak ada refund otomatis.',
    cls: 'border-yellow-300 bg-yellow-50',
    activeCls: 'border-yellow-500 bg-yellow-100 ring-2 ring-yellow-300',
    labelCls: 'text-yellow-800',
    icon: '↩',
  },
  {
    value: 'reject_work',
    label: 'Tolak Pekerjaan',
    description:
      'Hasil pekerjaan ditolak. Assignment berubah ke status disputed_closed. Kebijakan refund belum ditetapkan — tidak ada refund otomatis dari sistem.',
    cls: 'border-red-300 bg-red-50',
    activeCls: 'border-red-500 bg-red-100 ring-2 ring-red-300',
    labelCls: 'text-red-800',
    icon: '✕',
    warning: true,
  },
]

const STATUS_CONFIG = {
  open: { label: 'Terbuka', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  resolved: { label: 'Selesai', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

const DECISION_RESULT = {
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${cfg.cls}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 break-all">{value}</dd>
    </div>
  )
}

// ─── Panel form penyelesaian ───────────────────────────────────────────────

function ResolvePanel({ dispute, onSuccess }) {
  const [selectedDecision, setSelectedDecision] = useState('')
  const [resolution, setResolution] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Dispute sudah selesai
  if (dispute.status === 'resolved') {
    const decisionCfg = DECISION_RESULT[dispute.decision] ?? {
      label: dispute.decision ?? '—',
      cls: 'bg-slate-100 text-slate-600',
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Keputusan:</span>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${decisionCfg.cls}`}>
            {decisionCfg.label}
          </span>
        </div>

        {/* Peringatan reject_work — tidak ada refund otomatis */}
        {dispute.decision === 'reject_work' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            ⚠️ Keputusan ini <strong>tidak menghasilkan refund otomatis</strong>.
            Kebijakan kompensasi untuk penolakan pekerjaan belum ditetapkan dan perlu
            ditangani secara manual oleh Admin.
          </div>
        )}

        {dispute.resolution && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold text-slate-500">Alasan Keputusan</p>
            <p className="text-sm text-slate-700">{dispute.resolution}</p>
          </div>
        )}

        <dl className="divide-y divide-slate-100">
          <InfoRow
            label="Diselesaikan oleh"
            value={
              dispute.resolved_by
                ? <span className="font-mono text-xs">{dispute.resolved_by}</span>
                : null
            }
          />
          <InfoRow label="Waktu selesai" value={formatDate(dispute.resolved_at)} />
        </dl>
      </div>
    )
  }

  // Form penyelesaian
  const canSubmit = selectedDecision && resolution.trim().length >= 10

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await adminResolveDispute(dispute.id, {
        decision: selectedDecision,
        resolution: resolution.trim(),
      })
      setShowConfirm(false)
      onSuccess()
    } catch (err) {
      setError(err.message ?? 'Gagal menyelesaikan dispute.')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const chosenDecision = DECISIONS.find((d) => d.value === selectedDecision)

  return (
    <>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pilihan keputusan */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Pilih Keputusan</p>
          {DECISIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setSelectedDecision(d.value)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedDecision === d.value ? d.activeCls : d.cls
              } hover:opacity-90`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 text-lg font-bold ${d.labelCls}`}>{d.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${d.labelCls}`}>{d.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    {d.description}
                  </p>
                  {d.warning && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      ⚠️ Tidak ada refund otomatis. Tangani kompensasi secara manual.
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Alasan keputusan */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Alasan Keputusan <span className="text-red-500">*</span>
          </label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={4}
            placeholder="Jelaskan dasar keputusan secara rinci. Minimal 10 karakter."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className={`mt-1 text-xs ${resolution.length > 0 && resolution.length < 10 ? 'text-red-500' : 'text-slate-400'}`}>
            {resolution.length}/minimal 10 karakter
          </p>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSubmit || loading}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Memproses…' : 'Selesaikan Dispute'}
        </button>
      </div>

      {/* Dialog konfirmasi */}
      {showConfirm && chosenDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Konfirmasi Keputusan</h3>
            <p className="mt-1 text-sm text-slate-500">
              Keputusan yang sudah disimpan tidak dapat diubah.
            </p>

            <div className={`mt-4 rounded-xl border p-4 ${chosenDecision.cls}`}>
              <p className={`text-sm font-semibold ${chosenDecision.labelCls}`}>
                {chosenDecision.icon} {chosenDecision.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">{chosenDecision.description}</p>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Alasan:</p>
              <p className="text-sm text-slate-700">{resolution}</p>
            </div>

            {chosenDecision.warning && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                ⚠️ Tindakan ini <strong>tidak menghasilkan refund otomatis</strong>.
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Memproses…' : 'Ya, Simpan Keputusan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── AdminDisputeDetailPage ────────────────────────────────────────────────

export default function AdminDisputeDetailPage() {
  const { disputeId } = useParams()
  const navigate = useNavigate()

  const [dispute, setDispute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDispute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchDisputeDetail(disputeId)
      setDispute(data)
    } catch (err) {
      setError(err.message ?? 'Gagal mengambil data dispute.')
    } finally {
      setLoading(false)
    }
  }, [disputeId])

  useEffect(() => {
    loadDispute()
  }, [loadDispute])

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-64" />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={loadDispute}
            className="ml-3 font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  if (!dispute) return null

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <button
          onClick={() => navigate('/admin/disputes')}
          className="hover:text-slate-600"
        >
          ← Dispute
        </button>
        <span>/</span>
        <span className="font-mono text-slate-500">{String(dispute.id).slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Detail Dispute</h1>
          <p className="mt-1 font-mono text-xs text-slate-400">{dispute.id}</p>
        </div>
        <StatusBadge status={dispute.status} />
      </div>

      {/* Informasi dispute */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Informasi Dispute</h2>
        <dl className="divide-y divide-slate-100">
          <InfoRow label="Alasan" value={dispute.reason} />
          <InfoRow label="Deskripsi" value={dispute.description} />
          <InfoRow label="Diajukan" value={formatDate(dispute.created_at)} />
          <InfoRow
            label="Diajukan oleh"
            value={<span className="font-mono text-xs">{dispute.raised_by}</span>}
          />
          <InfoRow
            label="Assignment ID"
            value={<span className="font-mono text-xs">{dispute.assignment_id}</span>}
          />
        </dl>
      </div>

      {/* Panel penyelesaian / hasil keputusan */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          {dispute.status === 'resolved' ? 'Hasil Keputusan' : 'Selesaikan Dispute'}
        </h2>
        <ResolvePanel dispute={dispute} onSuccess={loadDispute} />
      </div>

      {/* Catatan transisi assignment */}
      {dispute.status !== 'resolved' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-600">Dampak keputusan terhadap assignment:</p>
          <ul className="list-inside list-disc space-y-0.5">
            <li><strong>Terima Pekerjaan</strong> → assignment berubah ke <code>approved</code></li>
            <li><strong>Perlu Revisi</strong> → assignment kembali ke <code>in_progress</code></li>
            <li><strong>Tolak Pekerjaan</strong> → assignment berubah ke <code>disputed_closed</code>, tidak ada refund otomatis</li>
          </ul>
        </div>
      )}
    </div>
  )
}
