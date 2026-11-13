/**
 * ReportModal — Modal form untuk membuat laporan pelanggaran.
 *
 * Props:
 *   isOpen        : boolean — tampil/sembunyi modal
 *   onClose       : () => void — tutup modal tanpa submit
 *   reportType    : 'user' | 'task' — jenis laporan
 *   targetId      : string | null — UUID user atau task yang dilaporkan
 *   targetName    : string — nama tampilan target (untuk heading)
 *   onSuccess     : (report) => void — dipanggil setelah laporan berhasil dikirim
 *
 * Identitas pelapor diambil otomatis dari token (backend: current_user).
 * Komponen tidak menerima prop reportedBy — tidak ada input dari pengguna.
 */

import { useState } from 'react'
import { Flag, X, AlertTriangle, ChevronDown } from 'lucide-react'
import { createReport } from '../lib/api'

// ─── Kategori alasan yang sesuai dengan backend ────────────────────────────

const REASON_OPTIONS = [
  { value: 'fraud',          label: 'Penipuan / Kecurangan' },
  { value: 'wrong_info',     label: 'Informasi Tidak Sesuai' },
  { value: 'inappropriate',  label: 'Perilaku Tidak Pantas' },
  { value: 'spam',           label: 'Spam' },
  { value: 'rule_violation', label: 'Pelanggaran Aturan Platform' },
  { value: 'other',          label: 'Lainnya' },
]

// ─── Komponen utama ────────────────────────────────────────────────────────

export default function ReportModal({
  isOpen,
  onClose,
  reportType = 'user',   // 'user' | 'task'
  targetId = null,
  targetName = '',
  onSuccess,
}) {
  const [reasonCategory, setReasonCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  function handleClose() {
    if (loading) return
    // Reset state saat modal ditutup
    setReasonCategory('')
    setSubject('')
    setDescription('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      setError('Judul laporan dan deskripsi wajib diisi.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const body = {
        subject: subject.trim(),
        description: description.trim(),
        reason_category: reasonCategory || null,
        reported_user_id: reportType === 'user' ? targetId : null,
        reported_task_id: reportType === 'task' ? targetId : null,
      }
      const report = await createReport(body)
      setSuccess(true)
      if (onSuccess) onSuccess(report)
    } catch (err) {
      setError(err.message ?? 'Gagal mengirim laporan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const isUserReport = reportType === 'user'
  const heading = isUserReport
    ? `Laporkan Pengguna`
    : `Laporkan Task`

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
              <Flag size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{heading}</h2>
              {targetName && (
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  Target: <span className="font-medium text-slate-700">{targetName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* State sukses */}
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Flag size={24} className="text-emerald-500" />
              </div>
              <h3 className="font-semibold text-slate-900">Laporan Terkirim</h3>
              <p className="mt-1 text-sm text-slate-500">
                Laporan Anda telah diterima dan akan ditinjau oleh Admin Kerjain.
              </p>
              <button
                onClick={handleClose}
                className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 transition"
              >
                Tutup
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Info konteks laporan */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  <p>
                    Laporan ini bersifat serius dan akan ditinjau oleh Admin.
                    Pastikan informasi yang Anda berikan akurat.
                    Identitas Anda sebagai pelapor bersifat konfidensial.
                  </p>
                </div>
              </div>

              {/* Alasan laporan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Alasan Laporan <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    disabled={loading}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  >
                    <option value="">Pilih alasan (opsional)</option>
                    {REASON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Judul laporan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Judul Laporan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ringkasan singkat masalah yang dilaporkan"
                  maxLength={200}
                  disabled={loading}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{subject.length}/200</p>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kronologi / Deskripsi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan secara detail pelanggaran yang terjadi, kapan, dan bagaimana…"
                  rows={4}
                  maxLength={2000}
                  disabled={loading}
                  required
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{description.length}/2000</p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !subject.trim() || !description.trim()}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Mengirim…' : 'Kirim Laporan'}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  )
}
