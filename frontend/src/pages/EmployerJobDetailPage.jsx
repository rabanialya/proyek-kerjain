import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchWorkEvidences,
  updateAssignmentStatus,
  settlePayment,
  uploadTransferProof,
  fetchPaymentsByAssignment,
  createDispute,
  fetchDisbursementProofFile,
  fetchWorkEvidenceFile,
} from '../lib/api'
import { useEmployerJobs } from '../hooks/useEmployerJobs'
import { EMPLOYER_STATUS_CONFIG } from './EmployerJobsPage'
import { PAYMENT_STATUS_LABELS as PAYMENT_STATUS_LABELS_SHARED } from '../lib/statusLabels'

// ─── Helpers ───────────────────────────────────────────────────────────────
// API_BASE_URL dihapus — semua file diakses via endpoint terlindungi, bukan URL publik.

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

// ─── Komponen kecil ─────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

function StatusBadge({ status }) {
  const cfg = EMPLOYER_STATUS_CONFIG[status] ?? {
    label: status,
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${cfg.cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{value}</dd>
    </div>
  )
}

function TimelineRow({ icon, label, date }) {
  if (!date) return null
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-base">{icon}</span>
      <div>
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-xs text-slate-400">{formatDate(date)}</p>
      </div>
    </div>
  )
}

// ─── Panel bukti pekerjaan (read-only untuk Employer) ───────────────────────

// ─── EmployerEvidenceItem — buka file via endpoint terlindungi ──────────────
function EmployerEvidenceItem({ evidenceId, filename, isPdf, uploadedDate }) {
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(null)

  async function handleOpen() {
    setOpening(true)
    setOpenError(null)
    let objectUrl = null
    try {
      objectUrl = await fetchWorkEvidenceFile(evidenceId)
      const a = document.createElement('a')
      a.href = objectUrl
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setOpenError(err.message ?? 'Gagal membuka file.')
    } finally {
      setOpening(false)
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
    }
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">{isPdf ? '📄' : '🖼️'}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-slate-700">{filename}</p>
          <p className="text-xs text-slate-400">{uploadedDate}</p>
        </div>
        <button
          onClick={handleOpen}
          disabled={opening}
          className="shrink-0 rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-wait"
        >
          {opening ? '⏳' : 'Lihat'}
        </button>
      </div>
      {openError && <p className="text-xs text-red-500 mt-1">{openError}</p>}
    </li>
  )
}

function WorkEvidencePanel({ assignmentId }) {
  const [evidences, setEvidences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWorkEvidences(assignmentId)
      setEvidences(data)
    } catch (err) {
      setError(err.message ?? 'Gagal memuat bukti pekerjaan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Bukti Pekerjaan
        </h2>
        {evidences.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {evidences.length} file
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          ⚠️ {error}
          <button
            onClick={load}
            className="ml-2 font-medium underline underline-offset-2 hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      ) : evidences.length === 0 ? (
        <p className="text-sm italic text-slate-400">
          Worker belum mengunggah bukti pekerjaan.
        </p>
      ) : (
        <ul className="space-y-2">
          {evidences.map((ev) => {
            const filename = ev.file_url.split('/').pop()
            const ext = filename.split('.').pop().toLowerCase()
            const isPdf = ext === 'pdf'
            const uploadedDate = new Date(ev.uploaded_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <EmployerEvidenceItem
                key={ev.id}
                evidenceId={ev.id}
                filename={filename}
                isPdf={isPdf}
                uploadedDate={uploadedDate}
              />
            )
          })}
        </ul>
      )}

      {/* Pratinjau inline dihapus — tidak bisa menggunakan URL publik.
          Employer dapat membuka file via tombol Lihat di setiap item. */}
    </section>
  )
}

// ─── Dialog konfirmasi approve ───────────────────────────────────────────────

function ApproveDialog({ isOpen, jobTitle, workerName, onConfirm, onCancel, loading }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-center text-3xl">✅</p>
        <h3 className="mt-3 text-center font-semibold text-slate-900">
          Setujui hasil pekerjaan?
        </h3>
        <p className="mt-2 text-center text-sm text-slate-500">
          Anda akan menyetujui hasil kerja{' '}
          <strong>{workerName}</strong> untuk tugas{' '}
          <strong>{jobTitle}</strong>.
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          Setelah disetujui, status tidak dapat diubah kembali.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Ya, Setujui'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dialog form dispute — dengan alasan wajib ────────────────────────────

/**
 * Dialog ini menggantikan DisputeDialog lama.
 *
 * Perubahan penting:
 *   - Sebelumnya: hanya konfirmasi sederhana, memanggil updateAssignmentStatus('disputed')
 *     yang TIDAK membuat record di tabel disputes.
 *   - Sekarang: ada field reason (wajib) dan description (opsional), memanggil
 *     POST /disputes yang membuat record resmi dan mengubah status assignment.
 *
 * Backend (routers/dispute.py) membutuhkan:
 *   { assignment_id, reason, description? }
 * dan memvalidasi assignment.status === "submitted".
 */
function DisputeFormDialog({ isOpen, assignmentId, jobTitle, workerName, onSuccess, onCancel }) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Reset form setiap kali dialog dibuka
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setDescription('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const canSubmit = reason.trim().length >= 5

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      await createDispute({
        assignment_id: assignmentId,
        reason: reason.trim(),
        description: description.trim() || null,
      })
      onSuccess()
    } catch (err) {
      setError(err.message ?? 'Gagal mengajukan dispute.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-center text-3xl">⚠️</p>
        <h3 className="mt-3 text-center font-semibold text-slate-900">
          Ajukan Dispute
        </h3>
        <p className="mt-1 text-center text-sm text-slate-500">
          Pekerjaan <strong>{workerName}</strong> pada tugas <strong>{jobTitle}</strong>
        </p>
        <p className="mt-1 text-center text-xs text-slate-400">
          Dispute akan diteruskan ke Admin Kerjain untuk ditinjau.
        </p>

        <div className="mt-5 space-y-4">
          {/* Alasan — wajib */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Alasan Dispute <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="Misal: tidak melampirkan bukti, hasil tidak sesuai…"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60"
              maxLength={200}
            />
            {reason.length > 0 && reason.length < 5 && (
              <p className="mt-1 text-xs text-red-500">Minimal 5 karakter.</p>
            )}
          </div>

          {/* Deskripsi — opsional */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="Jelaskan lebih detail apa yang bermasalah…"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60"
              maxLength={1000}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Ajukan Dispute'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Label status payment ────────────────────────────────────────────────────
// Gunakan PAYMENT_STATUS_LABELS dari statusLabels.js agar konsisten lintas
// halaman. Label "rejected" → "Bukti Transfer Ditolak" (lebih deskriptif dari
// "Bukti Ditolak"). Alur upload ulang dan panel tetap tidak berubah.

function PaymentStatusBadge({ status }) {
  const cfg = PAYMENT_STATUS_LABELS_SHARED[status] ?? { label: status, cls: 'bg-slate-50 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Panel pembayaran (status approved) ──────────────────────────────────────
//
// Alur:
//  1. Employer klik "Buat Tagihan" → POST /payments/settle → tampilkan rincian
//  2. Employer upload bukti transfer → POST /payments/:id/upload-proof
//  3. Status → awaiting_verification (menunggu Admin)
//  4. Jika rejected → Employer bisa upload ulang
//  5. Jika verified → tampilkan status, tidak ada aksi lagi untuk Employer

const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_PROOF_SIZE = 10 * 1024 * 1024 // 10 MB

function PaymentPanel({ job, onStatusUpdate }) {
  const [settlement, setSettlement] = useState(null)
  const [payments, setPayments] = useState(null)
  const [loadingSettle, setLoadingSettle] = useState(false)
  const [settleError, setSettleError] = useState(null)

  const [proofFile, setProofFile] = useState(null)
  const [proofFileError, setProofFileError] = useState(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const proofInputRef = useRef(null)

  // URL bukti disbursement — dimuat setelah status disbursed terdeteksi
  const [disbursementProofUrl, setDisbursementProofUrl] = useState(null)

  // Muat payment yang sudah ada saat halaman dibuka (idempoten)
  async function loadExistingPayments() {
    try {
      const data = await fetchPaymentsByAssignment(job.assignment_id)
      if (data && data.length > 0) {
        const wp = data.find((p) => p.type === 'WORK_PAYMENT')
        const pf = data.find((p) => p.type === 'PLATFORM_FEE')
        if (wp) {
          setPayments({ work_payment: wp, platform_fee: pf })
          // Jika sudah disbursed dan ada proof, ambil URL-nya
          if (wp.status === 'disbursed' && wp.disbursement_proof_url) {
            loadDisbursementProof(wp.id)
          }
        }
      }
    } catch (_) {
      // Belum ada payment — biarkan null
    }
  }

  async function loadDisbursementProof(paymentId) {
    try {
      // Fetch file langsung via endpoint terlindungi — tidak ada URL publik
      const objectUrl = await fetchDisbursementProofFile(paymentId)
      setDisbursementProofUrl(objectUrl)
    } catch (_) {
      // Proof opsional — gagal tidak blokir tampilan
    }
  }

  useEffect(() => {
    loadExistingPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.assignment_id])

  async function handleSettle() {
    setLoadingSettle(true)
    setSettleError(null)
    try {
      const result = await settlePayment(job.assignment_id)
      setSettlement(result)
      setPayments({ work_payment: result.work_payment, platform_fee: result.platform_fee })
    } catch (err) {
      setSettleError(err.message ?? 'Gagal membuat tagihan.')
    } finally {
      setLoadingSettle(false)
    }
  }

  function handleProofFileChange(e) {
    const file = e.target.files?.[0] ?? null
    setProofFileError(null)
    setUploadError(null)
    setUploadSuccess(null)
    if (!file) { setProofFile(null); return }

    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      setProofFileError('Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.')
      setProofFile(null)
      if (proofInputRef.current) proofInputRef.current.value = ''
      return
    }
    if (file.size > MAX_PROOF_SIZE) {
      setProofFileError('Ukuran file melebihi 10 MB.')
      setProofFile(null)
      if (proofInputRef.current) proofInputRef.current.value = ''
      return
    }
    setProofFile(file)
  }

  async function handleUploadProof() {
    if (!proofFile || !payments?.work_payment) return
    setUploadingProof(true)
    setUploadError(null)
    setUploadSuccess(null)
    try {
      await uploadTransferProof(payments.work_payment.id, proofFile)
      setUploadSuccess('Bukti transfer berhasil diunggah. Menunggu verifikasi Admin.')
      setProofFile(null)
      if (proofInputRef.current) proofInputRef.current.value = ''
      // Refresh payment state
      await loadExistingPayments()
    } catch (err) {
      setUploadError(err.message ?? 'Gagal mengunggah bukti transfer.')
    } finally {
      setUploadingProof(false)
    }
  }

  const wp = payments?.work_payment
  const pf = payments?.platform_fee

  // Belum ada tagihan sama sekali
  if (!wp) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Pembayaran
        </h2>
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          ✓ Pekerjaan telah disetujui pada {job.approved_at ? formatDate(job.approved_at) : '—'}.
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Buat tagihan pembayaran untuk melihat rincian transfer ke platform Kerjain.
        </p>
        {settleError && (
          <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            ⚠️ {settleError}
          </div>
        )}
        <button
          onClick={handleSettle}
          disabled={loadingSettle}
          className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingSettle ? 'Memproses...' : '📄 Buat Tagihan Pembayaran'}
        </button>
      </section>
    )
  }

  // Rincian tagihan + upload bukti
  const workerWage = settlement?.worker_wage ?? wp.amount
  const platformFeeAmount = settlement?.platform_fee_amount ?? pf?.amount ?? 0
  const totalTransfer = settlement?.total_transfer ?? (Number(workerWage) + Number(platformFeeAmount))
  const referenceCode = settlement?.reference_code ?? wp.transaction_reference ?? '—'
  const bankInfo = settlement?.platform_bank_info ?? null

  // Status upload: bisa upload jika pending atau rejected
  const canUploadProof = ['pending', 'rejected'].includes(wp.status)
  const isAwaiting = wp.status === 'awaiting_verification'
  const isVerified = wp.status === 'verified'
  const isDisbursed = wp.status === 'disbursed'

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Pembayaran
      </h2>

      {/* Rincian tagihan */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Rincian Tagihan
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Upah Worker</span>
          <span className="font-medium text-slate-800">{formatCurrency(workerWage)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Biaya Platform (10%)</span>
          <span className="font-medium text-slate-800">{formatCurrency(platformFeeAmount)}</span>
        </div>
        <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
          <span className="text-slate-800">Total Transfer</span>
          <span className="text-emerald-700">{formatCurrency(totalTransfer)}</span>
        </div>
        <div className="pt-1 flex justify-between text-xs text-slate-500">
          <span>Kode Referensi</span>
          <span className="font-mono font-semibold text-slate-700">{referenceCode}</span>
        </div>
      </div>

      {/* Informasi rekening platform */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
          Rekening Tujuan Transfer
        </p>
        {bankInfo?.is_configured ? (
          <div className="space-y-1 text-sm text-slate-700">
            <p><span className="text-slate-400 w-28 inline-block">Bank</span> <strong>{bankInfo.bank_name}</strong></p>
            <p><span className="text-slate-400 w-28 inline-block">No. Rekening</span> <strong className="font-mono">{bankInfo.account_number}</strong></p>
            <p><span className="text-slate-400 w-28 inline-block">Atas Nama</span> <strong>{bankInfo.account_holder}</strong></p>
            {bankInfo.branch && (
              <p><span className="text-slate-400 w-28 inline-block">Cabang</span> {bankInfo.branch}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-amber-700">
            ⚠️ Rekening platform belum dikonfigurasi. Hubungi Admin Kerjain untuk informasi rekening tujuan transfer.
          </p>
        )}
        {bankInfo?.transfer_note && bankInfo.is_configured && (
          <p className="mt-2 text-xs text-amber-600">{bankInfo.transfer_note}</p>
        )}
      </div>

      {/* Status payment saat ini */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">Status Pembayaran</span>
        <PaymentStatusBadge status={wp.status} />
      </div>

      {/* Alasan penolakan (jika rejected) */}
      {wp.status === 'rejected' && wp.rejection_reason && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold mb-1">Bukti Transfer Ditolak</p>
          <p>{wp.rejection_reason}</p>
          <p className="mt-1 text-xs text-red-500">Silakan upload ulang bukti transfer yang valid.</p>
        </div>
      )}

      {/* Upload bukti transfer */}
      {canUploadProof && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Upload Bukti Transfer
          </p>
          <p className="text-xs text-slate-500">
            Unggah screenshot atau PDF bukti transfer. Sertakan kode referensi{' '}
            <strong className="font-mono">{referenceCode}</strong> pada berita transfer.
            Format: JPG, PNG, WEBP, PDF. Maks. 10 MB.
          </p>
          <input
            ref={proofInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleProofFileChange}
            disabled={uploadingProof}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {proofFile && (
            <p className="text-xs text-slate-600">
              File dipilih: <span className="font-medium">{proofFile.name}</span>{' '}
              <span className="text-slate-400">({(proofFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            </p>
          )}
          {proofFileError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{proofFileError}</p>
          )}
          {uploadError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">⚠️ {uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
              ✓ {uploadSuccess}
            </p>
          )}
          <button
            onClick={handleUploadProof}
            disabled={!proofFile || uploadingProof}
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingProof ? 'Mengunggah...' : '📤 Kirim Bukti Transfer'}
          </button>
        </div>
      )}

      {/* Status menunggu verifikasi */}
      {isAwaiting && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          <p className="font-semibold">Menunggu Verifikasi Admin</p>
          <p className="mt-1 text-xs">
            Bukti transfer Anda sedang diperiksa. Admin akan memverifikasi bahwa dana sudah masuk ke rekening platform.
            Anda tidak perlu melakukan tindakan lebih lanjut saat ini.
          </p>
        </div>
      )}

      {/* Status verified */}
      {isVerified && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">✓ Dana Terverifikasi</p>
          <p className="mt-1 text-xs">
            Dana transfer Anda telah dikonfirmasi masuk ke platform. Proses pencairan ke Worker sedang dijadwalkan.
          </p>
        </div>
      )}

      {/* Status disbursed — tampilkan rincian pencairan ke Worker */}
      {isDisbursed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-4 text-sm text-emerald-800 space-y-3">
          <p className="font-semibold">✓ Pembayaran Selesai — Dana Dicairkan ke Worker</p>
          <p className="text-xs text-emerald-700">
            Dana dari transfer Anda telah diverifikasi dan dicairkan ke Worker oleh Admin Kerjain.
            Proses pembayaran untuk pekerjaan ini telah selesai.
          </p>

          {/* Rincian pencairan */}
          <div className="rounded-lg bg-white border border-emerald-200 px-3 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rincian Pencairan</p>

            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Nominal Dicairkan</span>
              <span className="font-semibold text-slate-700">{formatCurrency(wp.amount)}</span>
            </div>

            {(wp.disbursed_at || wp.paid_at) && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Waktu Pencairan</span>
                <span className="font-medium text-slate-700">
                  {new Date(wp.disbursed_at ?? wp.paid_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {wp.disbursement_reference && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Referensi Bank</span>
                <span className="font-mono font-medium text-slate-700">{wp.disbursement_reference}</span>
              </div>
            )}

            {wp.disbursement_notes && (
              <div className="text-xs text-slate-600 pt-1">
                <span className="text-slate-400">Catatan: </span>
                {wp.disbursement_notes}
              </div>
            )}
          </div>

          {/* Bukti transfer keluar — hanya tampilkan tautan, bukan detail rekening Worker */}
          {wp.disbursement_proof_url && (
            <div>
              <p className="text-xs text-emerald-700 mb-1 font-medium">Bukti Transfer Keluar (Platform → Worker)</p>
              {disbursementProofUrl ? (
                <a
                  href={disbursementProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                >
                  📄 Lihat Bukti Pencairan ↗
                </a>
              ) : (
                <span className="text-xs text-emerald-600">Memuat bukti…</span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Panel aksi Employer ─────────────────────────────────────────────────────

function EmployerActionPanel({ job, onStatusUpdate }) {
  const [approveOpen, setApproveOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const { assignment_status: status } = job

  async function handleApprove() {
    setActionLoading(true)
    setActionError(null)
    try {
      await updateAssignmentStatus(job.assignment_id, 'approved')
      setApproveOpen(false)
      setSuccessMsg('Hasil pekerjaan berhasil disetujui.')
      onStatusUpdate()
    } catch (err) {
      setApproveOpen(false)
      setActionError(err.message ?? 'Gagal menyetujui pekerjaan.')
    } finally {
      setActionLoading(false)
    }
  }

  // Status awal — menunggu Worker
  if (status === 'assigned') {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Status
        </h2>
        <p className="text-sm text-slate-500">
          {EMPLOYER_STATUS_CONFIG[status]?.description ?? 'Menunggu Worker menyelesaikan pekerjaan.'}
        </p>
      </section>
    )
  }

  // Worker sedang mengerjakan — termasuk setelah revisi dispute
  if (status === 'in_progress') {
    const isAfterDispute = job.submitted_at != null
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Status
        </h2>
        {isAfterDispute ? (
          // submitted_at ada artinya Worker pernah submit sebelumnya → ini revisi pasca-dispute
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">↩ Revisi Diminta</p>
            <p className="mt-1 text-xs leading-relaxed">
              Admin telah memutuskan bahwa pekerjaan perlu direvisi.
              Worker sedang mengerjakan ulang. Anda akan mendapatkan notifikasi
              saat hasil baru dikirim.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {EMPLOYER_STATUS_CONFIG[status]?.description ?? 'Worker sedang mengerjakan tugas.'}
          </p>
        )}
      </section>
    )
  }

  // Disputed — menunggu Admin
  if (status === 'disputed') {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Status
        </h2>
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">⚠️ Pekerjaan Dalam Dispute</p>
          <p className="mt-1 text-xs">
            Dispute sedang ditinjau oleh Admin Kerjain. Pembayaran diblokir sampai Admin menyelesaikan dispute.
            Anda akan diberitahu setelah keputusan diambil.
          </p>
        </div>
      </section>
    )
  }

  // disputed_closed — Admin tutup dispute tanpa approval
  if (status === 'disputed_closed') {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Status
        </h2>
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold">Dispute Ditutup</p>
          <p className="mt-1 text-xs">
            Admin telah menutup dispute ini. Pekerjaan tidak dilanjutkan ke pembayaran.
            Hubungi Admin Kerjain jika ada pertanyaan lebih lanjut.
          </p>
        </div>
      </section>
    )
  }

  // Approved — tampilkan panel pembayaran
  if (status === 'approved') {
    return <PaymentPanel job={job} onStatusUpdate={onStatusUpdate} />
  }

  // submitted — aksi utama Employer: approve atau dispute
  return (
    <>
      <ApproveDialog
        isOpen={approveOpen}
        jobTitle={job.task_title}
        workerName={job.worker_display_name}
        onConfirm={handleApprove}
        onCancel={() => setApproveOpen(false)}
        loading={actionLoading}
      />

      {/* DisputeFormDialog menangani pemanggilan createDispute sendiri */}
      <DisputeFormDialog
        isOpen={disputeOpen}
        assignmentId={job.assignment_id}
        jobTitle={job.task_title}
        workerName={job.worker_display_name}
        onSuccess={() => {
          setDisputeOpen(false)
          setSuccessMsg('Dispute berhasil diajukan. Admin akan meninjau pekerjaan ini.')
          onStatusUpdate()
        }}
        onCancel={() => setDisputeOpen(false)}
      />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Tinjau Hasil Pekerjaan
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Periksa bukti pekerjaan di atas, lalu pilih tindakan.
        </p>

        {successMsg && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            ✓ {successMsg}
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            ⚠️ {actionError}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setApproveOpen(true)}
            disabled={actionLoading}
            className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ✓ Setujui Hasil Pekerjaan
          </button>
          <button
            onClick={() => setDisputeOpen(true)}
            disabled={actionLoading}
            className="flex-1 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ⚠ Ajukan Dispute
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400 text-center">
          Persetujuan tidak dapat dibatalkan. Pastikan Anda sudah memeriksa semua bukti di atas.
        </p>
      </section>
    </>
  )
}

// ─── Halaman utama ──────────────────────────────────────────────────────────

export default function EmployerJobDetailPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()

  const { jobs, loading, error, reload } = useEmployerJobs()
  const [job, setJob] = useState(null)
  const [notFound, setNotFound] = useState(false)

  // Cari job yang sesuai dari list setelah data dimuat
  useEffect(() => {
    if (loading) return
    if (error) return
    const found = jobs.find((j) => j.assignment_id === assignmentId)
    if (!found) {
      setNotFound(true)
    } else {
      setJob(found)
      setNotFound(false)
    }
  }, [jobs, loading, error, assignmentId])

  // Callback setelah status berhasil diubah — reload list
  function handleStatusUpdate() {
    reload()
  }

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-10 w-2/3" />
          <SkeletonBlock className="h-52" />
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-32" />
        </div>
      </main>
    )
  }

  // ── Error ──
  if (error || notFound || !job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">
            Penugasan tidak ditemukan
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {error ?? 'Penugasan tidak ditemukan atau Anda tidak memiliki akses.'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={reload}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Coba lagi
            </button>
            <button
              onClick={() => navigate('/employer/jobs')}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Pekerjaan Aktif
            </button>
          </div>
        </div>
      </main>
    )
  }

  const cfg = EMPLOYER_STATUS_CONFIG[job.assignment_status]

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Navigasi atas */}
        <button
          onClick={() => navigate('/employer/jobs')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Pekerjaan Aktif
        </button>

        {/* Header tugas */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {job.category_name && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-500">
                  {job.category_name}
                </p>
              )}
              <h1 className="text-2xl font-bold text-slate-900 leading-snug">
                {job.task_title}
              </h1>
              {job.task_location && (
                <p className="mt-1 text-sm text-slate-500">
                  📍 {job.task_location}
                </p>
              )}
            </div>
            <StatusBadge status={job.assignment_status} />
          </div>

          {job.task_description ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {job.task_description}
            </p>
          ) : (
            <p className="mt-4 text-sm italic text-slate-400">
              Tidak ada deskripsi tugas.
            </p>
          )}
        </section>

        {/* Info Worker */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Worker
          </h2>
          <dl className="space-y-3">
            <InfoRow label="Nama" value={job.worker_display_name} />
            <InfoRow label="Email" value={job.worker_email} />
            <InfoRow label="Telepon" value={job.worker_phone} />
            <InfoRow
              label="Rating"
              value={
                job.worker_rating_avg > 0
                  ? `★ ${job.worker_rating_avg.toFixed(1)}`
                  : 'Belum ada rating'
              }
            />
          </dl>
        </section>

        {/* Detail tugas */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Detail Tugas
          </h2>
          <dl className="space-y-3">
            <InfoRow label="Upah" value={formatCurrency(job.wage_amount)} />
            <InfoRow label="Metode pembayaran" value={job.payment_method} />
            <InfoRow label="Kategori" value={job.category_name} />
            <InfoRow label="Lokasi" value={job.task_location} />
          </dl>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Timeline Penugasan
          </h2>

          {/* Status banner */}
          <div
            className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg?.cls ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${cfg?.dot ?? 'bg-slate-400'}`} />
            <div>
              <p className="font-semibold text-sm">{cfg?.label ?? job.assignment_status}</p>
              {cfg?.description && (
                <p className="mt-0.5 text-xs opacity-80">{cfg.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <TimelineRow icon="📩" label="Worker melamar" date={job.applied_at} />
            <TimelineRow icon="✅" label="Ditugaskan" date={job.assignment_created_at} />
            <TimelineRow icon="▶" label="Pekerjaan dimulai" date={job.started_at} />
            <TimelineRow icon="📤" label="Hasil dikirim" date={job.submitted_at} />
            <TimelineRow icon="🎉" label="Disetujui" date={job.approved_at} />
          </div>
        </section>

        {/* Panel bukti pekerjaan — tampil dari status in_progress ke atas */}
        {job.assignment_status !== 'assigned' && (
          <WorkEvidencePanel assignmentId={job.assignment_id} />
        )}

        {/* Panel aksi Employer */}
        <EmployerActionPanel job={job} onStatusUpdate={handleStatusUpdate} />

        {/* Footer */}
        <p className="pb-4 text-center text-xs text-slate-300">
          ID Penugasan: {job.assignment_id}
        </p>

      </div>
    </main>
  )
}
