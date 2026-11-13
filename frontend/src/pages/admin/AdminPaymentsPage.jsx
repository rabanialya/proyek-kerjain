import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminFetchPayments, adminFetchPaymentsAwaiting, adminFetchPlatformBankInfo, adminUpdatePlatformBankInfo } from '../../lib/api'

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

// ─── PlatformBankModal ─────────────────────────────────────────────────────

const PAYMENT_TYPES = [
  { value: 'bank', label: 'Bank Konvensional' },
  { value: 'ewallet', label: 'E-Wallet' },
]

function PlatformBankModal({ isOpen, onClose, existing, onSaved }) {
  const [paymentType, setPaymentType] = useState('bank')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [branch, setBranch] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [isConfigured, setIsConfigured] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Isi form jika sudah ada konfigurasi
  useEffect(() => {
    if (existing) {
      setPaymentType(existing.payment_type ?? 'bank')
      setBankName(existing.bank_name ?? '')
      setAccountNumber(existing.account_number ?? '')
      setAccountHolder(existing.account_holder ?? '')
      setBranch(existing.branch ?? '')
      setTransferNote(existing.transfer_note ?? '')
      setIsConfigured(existing.is_configured ?? true)
    } else {
      setPaymentType('bank')
      setBankName('')
      setAccountNumber('')
      setAccountHolder('')
      setBranch('')
      setTransferNote('')
      setIsConfigured(true)
    }
    setError(null)
  }, [existing, isOpen])

  if (!isOpen) return null

  const isEwallet = paymentType === 'ewallet'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const saved = await adminUpdatePlatformBankInfo({
        payment_type: paymentType,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
        branch: branch.trim(),
        transfer_note: transferNote.trim(),
        is_configured: isConfigured,
      })
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err.message ?? 'Gagal menyimpan konfigurasi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {existing ? 'Perbarui Rekening Platform' : 'Atur Rekening Platform'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Rekening ini akan ditampilkan ke Employer sebagai tujuan transfer pembayaran.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Tipe metode */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Tipe Metode Pembayaran
            </label>
            <div className="flex gap-3">
              {PAYMENT_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value={t.value}
                    checked={paymentType === t.value}
                    onChange={() => setPaymentType(t.value)}
                    className="accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Nama bank / e-wallet */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {isEwallet ? 'Nama E-Wallet' : 'Nama Bank'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={isEwallet ? 'Contoh: GoPay, OVO, Dana' : 'Contoh: BCA, Mandiri, BNI'}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {/* Nomor rekening / HP */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {isEwallet ? 'Nomor HP Terdaftar' : 'Nomor Rekening'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={isEwallet ? 'Contoh: 0812-3456-7890' : 'Contoh: 1234567890'}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {/* Nama pemilik */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {isEwallet ? 'Nama Terdaftar' : 'Nama Pemilik Rekening'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Contoh: PT Kerjain Indonesia"
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {/* Cabang — hanya untuk bank */}
          {!isEwallet && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Cabang <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Contoh: KCP Jakarta Selatan"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          )}

          {/* Catatan transfer */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Catatan untuk Employer <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Contoh: Sertakan kode referensi pada berita transfer"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {/* Toggle aktif */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              id="isConfigured"
              checked={isConfigured}
              onChange={(e) => setIsConfigured(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <label htmlFor="isConfigured" className="text-sm text-slate-700 cursor-pointer">
              Tampilkan rekening ini ke Employer (aktifkan)
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan…' : 'Simpan Rekening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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

  // Platform bank info state
  const [bankInfo, setBankInfo] = useState(null)
  const [bankInfoLoading, setBankInfoLoading] = useState(true)
  const [showBankModal, setShowBankModal] = useState(false)

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

  const loadBankInfo = useCallback(async () => {
    setBankInfoLoading(true)
    try {
      const info = await adminFetchPlatformBankInfo()
      setBankInfo(info)
    } catch (_) {
      // 404 berarti belum pernah dikonfigurasi — biarkan null
      setBankInfo(null)
    } finally {
      setBankInfoLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    loadBankInfo()
  }, [loadData, loadBankInfo])

  // Filter client-side
  const displayed = payments.filter((p) => {
    if (tab === 'awaiting' && p.status !== 'awaiting_verification') return false
    if (statusFilter && p.status !== statusFilter) return false
    if (typeFilter && p.type !== typeFilter) return false
    return true
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
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

      {/* Kartu rekening platform */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Rekening Platform
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Rekening tujuan transfer yang ditampilkan ke Employer saat tagihan dibuat.
            </p>
          </div>
          <button
            onClick={() => setShowBankModal(true)}
            className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {bankInfo ? '✎ Ubah Rekening' : '+ Atur Rekening'}
          </button>
        </div>

        {bankInfoLoading ? (
          <div className="animate-pulse h-10 rounded-xl bg-slate-100" />
        ) : bankInfo && bankInfo.is_configured ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 space-y-1">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-slate-400 text-xs">Tipe</span>{' '}
                <span className="font-semibold text-slate-700 capitalize">
                  {bankInfo.payment_type === 'ewallet' ? 'E-Wallet' : 'Bank'}
                </span>
              </span>
              <span>
                <span className="text-slate-400 text-xs">
                  {bankInfo.payment_type === 'ewallet' ? 'E-Wallet' : 'Bank'}
                </span>{' '}
                <span className="font-semibold text-slate-700">{bankInfo.bank_name}</span>
              </span>
              <span>
                <span className="text-slate-400 text-xs">No. Rekening</span>{' '}
                <span className="font-mono font-semibold text-slate-700">{bankInfo.account_number}</span>
              </span>
              <span>
                <span className="text-slate-400 text-xs">Atas Nama</span>{' '}
                <span className="font-semibold text-slate-700">{bankInfo.account_holder}</span>
              </span>
              {bankInfo.branch && (
                <span>
                  <span className="text-slate-400 text-xs">Cabang</span>{' '}
                  <span className="text-slate-700">{bankInfo.branch}</span>
                </span>
              )}
            </div>
            {bankInfo.transfer_note && (
              <p className="text-xs text-slate-500 mt-1">{bankInfo.transfer_note}</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            ⚠️ Rekening platform belum dikonfigurasi. Employer tidak dapat melihat tujuan transfer.
            Klik <strong>+ Atur Rekening</strong> untuk mengaturnya.
          </div>
        )}
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
              Reset Filter
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

    {/* Modal rekening platform */}
    <PlatformBankModal
      isOpen={showBankModal}
      onClose={() => setShowBankModal(false)}
      existing={bankInfo}
      onSaved={(saved) => setBankInfo(saved)}
    />
    </>
  )
}
