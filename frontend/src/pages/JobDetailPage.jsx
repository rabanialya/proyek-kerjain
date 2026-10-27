import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchMyWorkerJobs,
  updateAssignmentStatus,
  uploadWorkEvidence,
  fetchWorkEvidences,
  fetchPaymentsByAssignment,
  fetchWorkEvidenceFile,
  fetchDisbursementProofFile,
} from '../lib/api'

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Konfigurasi status ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  assigned: {
    label: 'Menunggu Dimulai',
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dot: 'bg-yellow-400',
    description: 'Penugasan diterima. Tekan "Mulai Pekerjaan" saat kamu siap.',
  },
  in_progress: {
    label: 'Sedang Dikerjakan',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    description: 'Pekerjaan sedang berlangsung. Kirim hasil saat sudah selesai.',
  },
  submitted: {
    label: 'Menunggu Persetujuan',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    description: 'Hasil kerjamu telah dikirim. Menunggu konfirmasi dari Employer.',
  },
  approved: {
    label: 'Selesai & Disetujui',
    cls: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
    description: 'Pekerjaan telah disetujui oleh Employer.',
  },
  disputed: {
    label: 'Dalam Dispute',
    cls: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    description: 'Pekerjaan sedang dalam proses dispute dengan Employer.',
  },
  disputed_closed: {
    label: 'Dispute Ditutup',
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    description: 'Dispute telah ditutup oleh Admin.',
  },
}

// ─── Komponen kecil ─────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
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
      <dt className="w-40 shrink-0 text-sm text-slate-400">{label}</dt>
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

// ─── Panel bukti pekerjaan ──────────────────────────────────────────────────
//
// Tampil hanya saat status in_progress atau lebih lanjut.
// Worker dapat upload file; semua pihak terkait dapat melihat daftar bukti.
// File diakses melalui endpoint terlindungi /files/work-evidence/{id} —
// tidak ada URL publik yang dibuka langsung.

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ALLOWED_LABELS = 'JPG, PNG, WEBP, PDF'
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

function fileIcon(fileUrl) {
  const ext = fileUrl.split('.').pop().toLowerCase()
  if (ext === 'pdf') return '📄'
  return '🖼️'
}

// ─── EvidenceItem — buka file via endpoint terlindungi ─────────────────────
//
// Menggunakan fetch dengan Bearer token, bukan URL publik langsung.
// Blob URL sementara dibuat dan langsung dibuka di tab baru, lalu direvoke.

function EvidenceItem({ evidenceId, filename, isPdf, uploadedDate }) {
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
      // Beri nama file yang bisa diunduh
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setOpenError(err.message ?? 'Gagal membuka file.')
    } finally {
      setOpening(false)
      // Revoke setelah jeda singkat agar browser sempat membuka tab
      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
      }
    }
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">{isPdf ? '📄' : '🖼️'}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-slate-700">{filename}</p>
          <p className="text-xs text-slate-400">{uploadedDate}</p>
        </div>
        <button
          onClick={handleOpen}
          disabled={opening}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-100 hover:bg-blue-50 transition disabled:opacity-60 disabled:cursor-wait"
        >
          {opening ? '⏳' : 'Lihat'}
        </button>
      </div>
      {openError && (
        <p className="text-xs text-red-500 mt-1">{openError}</p>
      )}
    </li>
  )
}

function WorkEvidencePanel({ job, onEvidenceChange }) {
  const [evidences, setEvidences] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)

  const [selectedFiles, setSelectedFiles] = useState([])
  const [fileError, setFileError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)

  const inputRef = useRef(null)

  const canUpload = job.assignment_status === 'in_progress'

  // ── Muat daftar evidence ──
  async function loadEvidences() {
    setLoadingList(true)
    setListError(null)
    try {
      const data = await fetchWorkEvidences(job.assignment_id)
      setEvidences(data)
      onEvidenceChange(data.length)
    } catch (err) {
      setListError(err.message ?? 'Gagal memuat daftar bukti.')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadEvidences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.assignment_id])

  // ── Validasi file di sisi klien ──
  function validateFiles(files) {
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        return `Format file "${f.name}" tidak didukung. Gunakan ${ALLOWED_LABELS}.`
      }
      if (f.size > MAX_SIZE_BYTES) {
        return `Ukuran file "${f.name}" melebihi 10 MB.`
      }
    }
    return null
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files ?? [])
    setFileError(null)
    setUploadError(null)
    setUploadSuccess(null)

    if (files.length === 0) {
      setSelectedFiles([])
      return
    }

    const err = validateFiles(files)
    if (err) {
      setFileError(err)
      setSelectedFiles([])
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setSelectedFiles(files)
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      await uploadWorkEvidence(job.assignment_id, selectedFiles)
      setUploadSuccess(`${selectedFiles.length} file berhasil diunggah.`)
      setSelectedFiles([])
      if (inputRef.current) inputRef.current.value = ''
      await loadEvidences()
    } catch (err) {
      setUploadError(err.message ?? 'Gagal mengunggah bukti.')
    } finally {
      setUploading(false)
    }
  }

  // ── Jangan tampil sama sekali kalau status masih assigned ──
  if (job.assignment_status === 'assigned') return null

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Bukti Pekerjaan
      </h2>

      {/* Area upload — hanya saat in_progress */}
      {canUpload && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            Unggah foto atau dokumen sebagai bukti pekerjaan. Format: {ALLOWED_LABELS}. Maks. 10 MB per file.
          </p>

          {/* Input file */}
          <label className="block">
            <span className="sr-only">Pilih file</span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          {/* Preview file terpilih */}
          {selectedFiles.length > 0 && (
            <ul className="space-y-1">
              {selectedFiles.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <span>{fileIcon(f.name)}</span>
                  <span className="truncate max-w-xs">{f.name}</span>
                  <span className="shrink-0 text-slate-400">
                    ({(f.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Pesan validasi file */}
          {fileError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {fileError}
            </p>
          )}

          {/* Pesan error upload */}
          {uploadError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {uploadError}
            </p>
          )}

          {/* Pesan sukses */}
          {uploadSuccess && (
            <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
              ✓ {uploadSuccess}
            </p>
          )}

          {/* Tombol upload */}
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? 'Mengunggah...' : `Unggah ${selectedFiles.length > 0 ? `${selectedFiles.length} file` : 'Bukti'}`}
          </button>
        </div>
      )}

      {/* Daftar bukti yang sudah diupload */}
      <div className={canUpload ? 'mt-6 border-t border-slate-100 pt-4' : 'mt-3'}>
        {loadingList ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : listError ? (
          <p className="text-sm text-red-500">{listError}</p>
        ) : evidences.length === 0 ? (
          <p className="text-sm italic text-slate-400">
            {canUpload
              ? 'Belum ada bukti yang diunggah. Unggah minimal satu file sebelum mengirim hasil.'
              : 'Tidak ada bukti yang diunggah.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {evidences.map((ev) => {
              const filename = ev.file_url.split('/').pop()
              const ext = filename.split('.').pop().toLowerCase()
              const isPdf = ext === 'pdf'
              const uploadedDate = new Date(ev.uploaded_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })

              return (
                <EvidenceItem
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
      </div>

      {/* Counter ringkas */}
      {evidences.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {evidences.length} bukti diunggah
        </p>
      )}
    </section>
  )
}

// ─── Panel status pembayaran Worker (read-only) ──────────────────────────────
//
// Ditampilkan hanya jika assignment sudah approved.
// Worker tidak dapat mengonfirmasi atau mengubah status pembayaran.

const WORKER_PAYMENT_STATUS = {
  pending: {
    label: 'Tagihan Dibuat',
    desc: 'Employer sedang menyiapkan pembayaran.',
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: '🕐',
  },
  awaiting_verification: {
    label: 'Menunggu Verifikasi',
    desc: 'Bukti transfer sedang diperiksa oleh Admin Kerjain.',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '🔍',
  },
  verified: {
    label: 'Dana Terverifikasi',
    desc: 'Dana dari Employer sudah dikonfirmasi masuk ke platform. Pencairan sedang diproses.',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '✅',
  },
  rejected: {
    label: 'Bukti Ditolak',
    desc: 'Admin menolak bukti transfer Employer. Employer perlu mengirim ulang.',
    cls: 'bg-red-50 text-red-700 border-red-200',
    icon: '⚠️',
  },
  disbursed: {
    label: 'Upah Sudah Dicairkan',
    desc: 'Admin telah mencatat bahwa upah Anda sudah ditransfer.',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    icon: '💰',
  },
  confirmed: {
    label: 'Terkonfirmasi',
    desc: 'Pembayaran terkonfirmasi.',
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: '✔️',
  },
}

function WorkerPaymentPanel({ assignmentId, assignmentStatus }) {
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // URL bukti disbursement — dimuat terpisah karena butuh otorisasi
  const [proofUrl, setProofUrl] = useState(null)
  const [proofLoading, setProofLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPaymentsByAssignment(assignmentId)
      // Worker hanya mendapat WORK_PAYMENT
      const wp = Array.isArray(data) ? data.find((p) => p.type === 'WORK_PAYMENT') : null
      setPayment(wp ?? null)

      // Jika sudah disbursed dan ada proof, ambil URL-nya
      if (wp?.status === 'disbursed' && wp?.disbursement_proof_url) {
        loadProof(wp.id)
      }
    } catch (err) {
      // 404 atau belum ada payment — bukan error kritis
      if (!err.message?.includes('404')) {
        setError(err.message ?? 'Gagal memuat status pembayaran.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadProof(paymentId) {
    setProofLoading(true)
    try {
      // Fetch file langsung via endpoint terlindungi — tidak ada URL publik
      const objectUrl = await fetchDisbursementProofFile(paymentId)
      setProofUrl(objectUrl)
    } catch (_) {
      // Proof opsional — gagal tidak blokir tampilan
    } finally {
      setProofLoading(false)
    }
  }

  useEffect(() => {
    if (assignmentStatus === 'approved' || assignmentStatus === 'disputed_closed') {
      load()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, assignmentStatus])

  // Jangan tampilkan jika belum approved
  if (!['approved', 'disputed_closed'].includes(assignmentStatus)) return null

  // disputed_closed — tampilkan info khusus
  if (assignmentStatus === 'disputed_closed') {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Status Pembayaran
        </h2>
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold">Dispute Ditutup</p>
          <p className="mt-1 text-xs text-slate-500">
            Dispute pada pekerjaan ini telah ditutup oleh Admin. Pembayaran tidak diproses.
            Hubungi Admin Kerjain jika ada pertanyaan.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Status Pembayaran
      </h2>

      {loading ? (
        <div className="space-y-2">
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : !payment ? (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          <p className="font-semibold">🕐 Menunggu Employer</p>
          <p className="mt-1 text-xs">
            Pekerjaan telah disetujui. Employer belum membuat tagihan pembayaran.
            Pembayaran akan diproses setelah Employer mentransfer ke rekening platform.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Status utama */}
          {(() => {
            const cfg = WORKER_PAYMENT_STATUS[payment.status] ?? {
              label: payment.status,
              desc: '',
              cls: 'bg-slate-50 text-slate-600 border-slate-200',
              icon: '•',
            }
            return (
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.cls}`}>
                <span className="text-lg shrink-0">{cfg.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{cfg.label}</p>
                  {cfg.desc && <p className="mt-0.5 text-xs opacity-80">{cfg.desc}</p>}
                </div>
              </div>
            )
          })()}

          {/* Info upah */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Upah Anda</span>
            <span className="text-sm font-bold text-slate-800">
              {`Rp ${Number(payment.amount).toLocaleString('id-ID')}`}
            </span>
          </div>

          {/* Detail pencairan — hanya saat disbursed */}
          {payment.status === 'disbursed' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-700">Rincian Pencairan</p>

              {/* Waktu konfirmasi */}
              {(payment.disbursed_at || payment.paid_at) && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Waktu Pencairan</span>
                  <span className="font-medium text-slate-700">
                    {new Date(payment.disbursed_at ?? payment.paid_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Referensi transaksi */}
              {payment.disbursement_reference && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Referensi Bank</span>
                  <span className="font-mono font-medium text-slate-700">{payment.disbursement_reference}</span>
                </div>
              )}

              {/* Catatan Admin */}
              {payment.disbursement_notes && (
                <div className="text-xs text-slate-600">
                  <span className="text-slate-400">Catatan: </span>
                  {payment.disbursement_notes}
                </div>
              )}

              {/* Bukti transfer keluar */}
              {payment.disbursement_proof_url && (
                <div className="pt-1">
                  <p className="text-xs text-slate-400 mb-1">Bukti Transfer Keluar</p>
                  {proofLoading ? (
                    <div className="h-6 w-32 animate-pulse rounded bg-emerald-100" />
                  ) : proofUrl ? (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      📄 Lihat Bukti Transfer ↗
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Bukti tidak dapat dimuat.</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Catatan untuk status non-disbursed */}
          {payment.status !== 'disbursed' && (
            <p className="text-xs text-slate-400 text-center">
              Konfirmasi pembayaran dilakukan oleh Admin setelah verifikasi dana masuk.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Panel aksi status ──────────────────────────────────────────────────────
//
// Worker hanya dapat mengubah status ke in_progress (dari assigned)
// atau submitted (dari in_progress). Tombol tidak muncul untuk status lain.
// Tombol Submit dinonaktifkan jika belum ada evidence yang terunggah.

function ActionPanel({ job, onStatusUpdate, evidenceCount }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleUpdate(newStatus) {
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      await updateAssignmentStatus(job.assignment_id, newStatus)
      setSuccessMsg(
        newStatus === 'in_progress'
          ? 'Pekerjaan berhasil dimulai!'
          : 'Hasil pekerjaan berhasil dikirim. Menunggu persetujuan Employer.',
      )
      onStatusUpdate()
    } catch (err) {
      setError(err.message ?? 'Gagal memperbarui status.')
    } finally {
      setLoading(false)
    }
  }

  const { assignment_status: status } = job

  // Tidak ada aksi untuk status terminal
  if (status === 'submitted' || status === 'approved' || status === 'disputed' || status === 'disputed_closed') {
    return null
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Aksi
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        {STATUS_CONFIG[status]?.description}
      </p>

      {successMsg && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {status === 'assigned' && (
        <button
          onClick={() => handleUpdate('in_progress')}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Memproses...' : '▶ Mulai Pekerjaan'}
        </button>
      )}

      {status === 'in_progress' && (
        <>
          {evidenceCount === 0 && (
            <p className="mb-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-sm text-yellow-700">
              ⚠️ Unggah minimal satu bukti pekerjaan sebelum mengirim hasil.
            </p>
          )}
          <button
            onClick={() => handleUpdate('submitted')}
            disabled={loading || evidenceCount === 0}
            className="w-full rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memproses...' : '✓ Kirim Hasil Pekerjaan'}
          </button>
        </>
      )}
    </section>
  )
}

// ─── Halaman utama ──────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [evidenceCount, setEvidenceCount] = useState(0)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // GET /assignments/worker/my-jobs mengembalikan seluruh daftar —
      // kita cari entry yang cocok dengan assignmentId dari URL.
      // Ini sekaligus memverifikasi kepemilikan: endpoint sudah menyaring
      // berdasarkan worker yang sedang login.
      const jobs = await fetchMyWorkerJobs()
      const found = jobs.find((j) => j.assignment_id === assignmentId)
      if (!found) {
        setError('Pekerjaan tidak ditemukan atau kamu tidak memiliki akses.')
        return
      }
      setJob(found)
    } catch (err) {
      setError(err.message ?? 'Gagal memuat detail pekerjaan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-10 w-2/3" />
          <SkeletonBlock className="h-52" />
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-32" />
        </div>
      </main>
    )
  }

  // ── Error / tidak ditemukan ──
  if (error || !job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">
            Pekerjaan tidak dapat dimuat
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {error ?? 'Data tidak ditemukan.'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={load}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Coba lagi
            </button>
            <button
              onClick={() => navigate('/worker/jobs')}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Pekerjaan Saya
            </button>
          </div>
        </div>
      </main>
    )
  }

  const cfg = STATUS_CONFIG[job.assignment_status]

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Navigasi atas */}
        <button
          onClick={() => navigate('/worker/jobs')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Pekerjaan Saya
        </button>

        {/* Header tugas */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {job.category_name && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-500">
                  {job.category_name}
                </p>
              )}
              <h1 className="text-2xl font-bold text-slate-900 leading-snug">
                {job.task_title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                📍 {job.task_location}
              </p>
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

        {/* Detail tugas & penugasan */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Detail Pekerjaan
          </h2>
          <dl className="space-y-3">
            <InfoRow
              label="Upah"
              value={formatCurrency(job.wage_amount)}
            />
            <InfoRow label="Metode pembayaran" value={job.payment_method} />
            <InfoRow label="Lokasi" value={job.task_location} />
            <InfoRow label="Kategori" value={job.category_name} />
            <InfoRow label="Employer" value={job.employer_display_name} />
          </dl>
        </section>

        {/* Status saat ini */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Status Penugasan
          </h2>

          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg?.cls ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${cfg?.dot ?? 'bg-slate-400'}`} />
            <div>
              <p className="font-semibold text-sm">{cfg?.label ?? job.assignment_status}</p>
              {cfg?.description && (
                <p className="mt-0.5 text-xs opacity-80">{cfg.description}</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <TimelineRow
              icon="📩"
              label="Lamaran dikirim"
              date={job.applied_at}
            />
            <TimelineRow
              icon="✅"
              label="Ditugaskan"
              date={job.assignment_created_at}
            />
            <TimelineRow
              icon="▶"
              label="Pekerjaan dimulai"
              date={job.started_at}
            />
            <TimelineRow
              icon="📤"
              label="Hasil dikirim"
              date={job.submitted_at}
            />
            <TimelineRow
              icon="🎉"
              label="Disetujui & selesai"
              date={job.approved_at ?? job.completed_at}
            />
          </div>
        </section>

        {/* Panel bukti pekerjaan — tampil dari status in_progress ke atas */}
        <WorkEvidencePanel
          job={job}
          onEvidenceChange={setEvidenceCount}
        />

        {/* Panel status pembayaran — hanya setelah approved */}
        <WorkerPaymentPanel
          assignmentId={job.assignment_id}
          assignmentStatus={job.assignment_status}
        />

        {/* Panel aksi — hanya tampil jika ada aksi yang tersedia */}
        <ActionPanel job={job} onStatusUpdate={load} evidenceCount={evidenceCount} />

        {/* Footer */}
        <p className="pb-4 text-center text-xs text-slate-300">
          ID Penugasan: {job.assignment_id}
        </p>

      </div>
    </main>
  )
}
