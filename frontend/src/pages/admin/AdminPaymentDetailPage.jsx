import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  adminFetchPaymentDetail,
  adminVerifyPayment,
  adminRejectPayment,
  adminDisbursePayment,
  fetchTransferProofFile,
  fetchDisbursementProofFile,
} from '../../lib/api'

// API_BASE_URL dihapus — semua file diakses via endpoint terlindungi.

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

function formatCurrency(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`
}

// buildFileUrl dihapus — file tidak lagi diakses via URL publik.
// Gunakan SecureFilePanel yang fetch file melalui endpoint terlindungi.

// ─── Status & type config ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  awaiting_verification: { label: 'Menunggu Verifikasi', cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  verified: { label: 'Terverifikasi', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  disbursed: { label: 'Dicairkan ke Worker', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
}

const TYPE_LABELS = {
  WORK_PAYMENT: 'Pembayaran Kerja (WORK_PAYMENT)',
  PLATFORM_FEE: 'Biaya Platform (PLATFORM_FEE)',
}

const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_PROOF_SIZE = 10 * 1024 * 1024 // 10 MB

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
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4 sm:py-2">
      <dt className="w-52 shrink-0 text-sm text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 break-all">{value}</dd>
    </div>
  )
}

// ─── SecureFilePanel — download file via endpoint terlindungi ────────────
//
// fetchFn: async (paymentId) => objectUrl
// Tidak ada URL publik. File di-fetch dengan Bearer token, disajikan
// sebagai Blob object URL yang hanya hidup di tab saat ini.

function SecureFilePanel({ paymentId, fetchFn, emptyLabel }) {
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMsg, setErrorMsg] = useState(null)
  const [objectUrl, setObjectUrl] = useState(null)

  // Muat file saat panel pertama kali ditampilkan
  useEffect(() => {
    if (!paymentId) return
    let cancelled = false
    setStatus('loading')
    setErrorMsg(null)
    fetchFn(paymentId)
      .then((url) => {
        if (!cancelled) { setObjectUrl(url); setStatus('idle') }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err.message ?? 'Gagal memuat file.')
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
      // Revoke saat komponen unmount
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId])

  if (!paymentId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center">
        <div className="mx-auto h-6 w-48 animate-pulse rounded bg-slate-200" />
        <p className="mt-3 text-xs text-slate-400">Memuat file…</p>
      </div>
    )
  }

  if (status === 'error' || !objectUrl) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
        <p className="text-sm text-red-500">{errorMsg ?? emptyLabel}</p>
      </div>
    )
  }

  // objectUrl adalah Blob URL — aman, tidak bisa ditebak, tidak publik
  const isPdf = objectUrl.toLowerCase().includes('pdf') || false

  return (
    <div className="space-y-3">
      {/* Pratinjau gambar inline — hanya jika bukan PDF */}
      {!isPdf && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img
            src={objectUrl}
            alt="Bukti transfer"
            className="mx-auto max-h-[480px] w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}
      <div className="text-center">
        <a
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 underline hover:opacity-70"
        >
          {isPdf ? 'Buka PDF di tab baru ↗' : 'Buka di tab baru ↗'}
        </a>
      </div>
    </div>
  )
}

// ─── Dialog konfirmasi generik ────────────────────────────────────────────

function ConfirmDialog({ isOpen, title, description, children, onCancel, onConfirm, loading, confirmLabel, confirmCls }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirmCls ?? 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Memproses…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel rincian pencairan (sudah disbursed) ────────────────────────────

function DisburseInfoPanel({ payment }) {
  if (payment.status !== 'disbursed') return null

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-3">
      <h2 className="text-sm font-semibold text-blue-700">✓ Pencairan ke Worker Selesai</h2>
      <dl className="divide-y divide-blue-100">
        <InfoRow label="Nominal Dicairkan" value={formatCurrency(payment.amount)} />
        <InfoRow label="Waktu Konfirmasi" value={formatDate(payment.disbursed_at ?? payment.paid_at)} />
        <InfoRow label="Referensi Bank" value={payment.disbursement_reference} />
        <InfoRow label="Catatan Admin" value={payment.disbursement_notes} />
        <InfoRow
          label="Dikonfirmasi oleh"
          value={
            payment.disbursed_by
              ? <span className="font-mono text-xs">{payment.disbursed_by}</span>
              : <span className="text-slate-400 text-xs">—</span>
          }
        />
      </dl>

      {payment.disbursement_proof_url ? (
        <div className="pt-2">
          <p className="text-xs font-semibold text-blue-600 mb-2">Bukti Transfer Keluar</p>
          <SecureFilePanel
            paymentId={payment.id}
            fetchFn={fetchDisbursementProofFile}
            emptyLabel="Bukti transfer keluar belum diunggah."
          />
        </div>
      ) : (
        <p className="text-xs text-blue-500 pt-1">Bukti transfer keluar tidak diunggah saat pencairan.</p>
      )}
    </div>
  )
}

// ─── Panel aksi admin ─────────────────────────────────────────────────────

function ActionPanel({ payment, onSuccess }) {
  const [dialog, setDialog] = useState(null) // null | 'verify' | 'reject' | 'disburse'

  // State verify
  const [verifyNotes, setVerifyNotes] = useState('')

  // State reject
  const [rejectReason, setRejectReason] = useState('')

  // State disburse — form pencairan
  const [disburseRef, setDisburseRef] = useState('')
  const [disburseNotes, setDisburseNotes] = useState('')
  const [disburseFile, setDisburseFile] = useState(null)
  const [disburseFileError, setDisburseFileError] = useState(null)
  const disburseFileRef = useRef(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Hanya WORK_PAYMENT yang bisa diaksi
  if (payment.type !== 'WORK_PAYMENT') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        PLATFORM_FEE tidak memiliki aksi langsung — diproses otomatis bersama WORK_PAYMENT.
      </div>
    )
  }

  const status = payment.status
  const canVerify = status === 'awaiting_verification' || status === 'pending'
  const canReject = status === 'awaiting_verification'
  const canDisburse = status === 'verified'

  if (!canVerify && !canReject && !canDisburse) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Tidak ada aksi yang tersedia untuk status <strong>{status}</strong>.
      </div>
    )
  }

  function handleDisburseFileChange(e) {
    const file = e.target.files?.[0] ?? null
    setDisburseFileError(null)
    if (!file) { setDisburseFile(null); return }
    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      setDisburseFileError('Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.')
      setDisburseFile(null)
      if (disburseFileRef.current) disburseFileRef.current.value = ''
      return
    }
    if (file.size > MAX_PROOF_SIZE) {
      setDisburseFileError('Ukuran file melebihi 10 MB.')
      setDisburseFile(null)
      if (disburseFileRef.current) disburseFileRef.current.value = ''
      return
    }
    setDisburseFile(file)
  }

  function resetDisburseForm() {
    setDisburseRef('')
    setDisburseNotes('')
    setDisburseFile(null)
    setDisburseFileError(null)
    if (disburseFileRef.current) disburseFileRef.current.value = ''
  }

  async function handleConfirm() {
    setActionLoading(true)
    setActionError(null)
    try {
      if (dialog === 'verify') {
        await adminVerifyPayment(payment.id, { notes: verifyNotes || null })
      } else if (dialog === 'reject') {
        if (!rejectReason.trim() || rejectReason.trim().length < 5) {
          throw new Error('Alasan penolakan minimal 5 karakter.')
        }
        await adminRejectPayment(payment.id, { rejection_reason: rejectReason.trim() })
      } else if (dialog === 'disburse') {
        await adminDisbursePayment(payment.id, {
          disbursementReference: disburseRef.trim() || undefined,
          disbursementNotes: disburseNotes.trim() || undefined,
          proofFile: disburseFile || undefined,
        })
        resetDisburseForm()
      }
      setDialog(null)
      setVerifyNotes('')
      setRejectReason('')
      onSuccess()
    } catch (err) {
      setActionError(err.message ?? 'Terjadi kesalahan.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canVerify && (
            <button
              onClick={() => { setDialog('verify'); setActionError(null) }}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              ✓ Verifikasi Dana Masuk
            </button>
          )}
          {canReject && (
            <button
              onClick={() => { setDialog('reject'); setActionError(null) }}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              ✕ Tolak Bukti Transfer
            </button>
          )}
          {canDisburse && (
            <button
              onClick={() => { setDialog('disburse'); setActionError(null) }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              💸 Catat Pencairan ke Worker
            </button>
          )}
        </div>

        {canVerify && (
          <p className="text-xs text-slate-400">
            Klik Verifikasi hanya setelah memastikan dana benar-benar masuk ke rekening platform.
          </p>
        )}
        {canDisburse && (
          <p className="text-xs text-slate-400">
            Lakukan transfer ke rekening Worker terlebih dahulu, lalu isi form pencairan dan klik konfirmasi.
          </p>
        )}
      </div>

      {/* Dialog verifikasi */}
      <ConfirmDialog
        isOpen={dialog === 'verify'}
        title="Verifikasi Dana Masuk"
        description="Konfirmasi bahwa dana transfer dari Employer sudah masuk ke rekening platform. Tindakan ini tidak dapat dibatalkan."
        onCancel={() => setDialog(null)}
        onConfirm={handleConfirm}
        loading={actionLoading}
        confirmLabel="Verifikasi"
        confirmCls="bg-green-600 hover:bg-green-700"
      >
        <div className="space-y-3">
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Catatan (opsional)</label>
            <textarea
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              rows={2}
              placeholder="Misal: Dana masuk 15/01, nomor ref …"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* Dialog tolak */}
      <ConfirmDialog
        isOpen={dialog === 'reject'}
        title="Tolak Bukti Transfer"
        description="Employer perlu mengunggah ulang bukti transfer. Alasan penolakan akan ditampilkan kepada Employer."
        onCancel={() => setDialog(null)}
        onConfirm={handleConfirm}
        loading={actionLoading}
        confirmLabel="Tolak Bukti"
        confirmCls="bg-red-600 hover:bg-red-700"
      >
        <div className="space-y-3">
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Jelaskan mengapa bukti ditolak, misal: Dana belum masuk, nominal tidak sesuai…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            {rejectReason.length > 0 && rejectReason.length < 5 && (
              <p className="mt-1 text-xs text-red-500">Minimal 5 karakter.</p>
            )}
          </div>
        </div>
      </ConfirmDialog>

      {/* Dialog pencairan — form lengkap */}
      <ConfirmDialog
        isOpen={dialog === 'disburse'}
        title="Konfirmasi Pencairan ke Worker"
        description={null}
        onCancel={() => { setDialog(null); resetDisburseForm() }}
        onConfirm={handleConfirm}
        loading={actionLoading}
        confirmLabel="Konfirmasi Pencairan"
        confirmCls="bg-blue-600 hover:bg-blue-700"
      >
        <div className="space-y-4">
          {/* Peringatan penting */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            ⚠️ <strong>Perhatian:</strong> Lakukan transfer ke rekening Worker terlebih dahulu di luar aplikasi.
            Isi form ini <em>setelah</em> transfer benar-benar selesai dilakukan.
            Status akan berubah menjadi <strong>Dicairkan</strong> setelah dikonfirmasi dan tidak dapat dibatalkan.
          </div>

          {/* Ringkasan nominal */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-slate-600">Nominal Pencairan</span>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(payment.amount)}</span>
          </div>

          {actionError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {/* Referensi transaksi */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Referensi Transaksi Bank <span className="text-slate-400">(opsional)</span>
            </label>
            <input
              type="text"
              value={disburseRef}
              onChange={(e) => setDisburseRef(e.target.value)}
              placeholder="Contoh: TRF-20261023-0001 atau nomor referensi bank"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Upload bukti transfer keluar */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Bukti Transfer Keluar <span className="text-slate-400">(opsional — JPG, PNG, WEBP, PDF, maks 10 MB)</span>
            </label>
            <input
              ref={disburseFileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleDisburseFileChange}
              disabled={actionLoading}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {disburseFile && (
              <p className="mt-1 text-xs text-slate-600">
                File dipilih: <span className="font-medium">{disburseFile.name}</span>{' '}
                <span className="text-slate-400">({(disburseFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              </p>
            )}
            {disburseFileError && (
              <p className="mt-1 text-xs text-red-500">{disburseFileError}</p>
            )}
          </div>

          {/* Catatan */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Catatan <span className="text-slate-400">(opsional)</span>
            </label>
            <textarea
              value={disburseNotes}
              onChange={(e) => setDisburseNotes(e.target.value)}
              rows={2}
              placeholder="Misal: Transfer via BCA 23/10/2026, bukti dilampirkan"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </ConfirmDialog>
    </>
  )
}

// ─── AdminPaymentDetailPage ────────────────────────────────────────────────

export default function AdminPaymentDetailPage() {
  const { paymentId } = useParams()
  const navigate = useNavigate()

  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadPayment = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchPaymentDetail(paymentId)
      setPayment(data)
    } catch (err) {
      setError(err.message ?? 'Gagal mengambil data pembayaran.')
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    loadPayment()
  }, [loadPayment])

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-48" />
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
            onClick={loadPayment}
            className="ml-3 font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  if (!payment) return null

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <button onClick={() => navigate('/admin/payments')} className="hover:text-slate-600">
          ← Pembayaran
        </button>
        <span>/</span>
        <span className="font-mono text-slate-500">{String(payment.id).slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {TYPE_LABELS[payment.type] ?? payment.type}
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">{payment.id}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      {/* Info utama */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Informasi Pembayaran</h2>
        <dl className="divide-y divide-slate-100">
          <InfoRow label="Nominal" value={formatCurrency(payment.amount)} />
          <InfoRow label="Metode" value={payment.method} />
          <InfoRow label="Status" value={<StatusBadge status={payment.status} />} />
          <InfoRow label="Dibuat" value={formatDate(payment.created_at)} />
          <InfoRow label="Diverifikasi" value={formatDate(payment.verified_at)} />
          <InfoRow label="Referensi Transaksi (masuk)" value={payment.transaction_reference} />
          <InfoRow
            label="Assignment ID"
            value={payment.assignment_id
              ? <span className="font-mono text-xs">{payment.assignment_id}</span>
              : null}
          />
          <InfoRow
            label="Task ID"
            value={payment.task_id
              ? <span className="font-mono text-xs">{payment.task_id}</span>
              : null}
          />
          <InfoRow
            label="Diverifikasi oleh"
            value={payment.verified_by
              ? <span className="font-mono text-xs">{payment.verified_by}</span>
              : null}
          />
        </dl>
      </div>

      {/* Alasan penolakan */}
      {payment.rejection_reason && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-600 mb-1">Alasan Penolakan</p>
          <p className="text-sm text-red-700">{payment.rejection_reason}</p>
        </div>
      )}

      {/* Bukti transfer masuk (Employer → Platform) */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Bukti Transfer Masuk (Employer → Platform)</h2>
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          ⚠️ Verifikasi manual ke rekening platform diperlukan sebelum mengklik tombol Verifikasi.
        </div>
        {payment.transfer_proof_url ? (
          <SecureFilePanel
            paymentId={payment.id}
            fetchFn={fetchTransferProofFile}
            emptyLabel="Bukti transfer belum diunggah oleh Employer."
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
            <p className="text-sm text-slate-400">Bukti transfer belum diunggah oleh Employer.</p>
          </div>
        )}
      </div>

      {/* Rincian pencairan (jika sudah disbursed) */}
      {payment.status === 'disbursed' && (
        <DisburseInfoPanel payment={payment} />
      )}

      {/* Panel aksi admin */}
      {payment.type === 'WORK_PAYMENT' && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Tindakan Admin</h2>
          <ActionPanel payment={payment} onSuccess={loadPayment} />
        </div>
      )}
    </div>
  )
}
