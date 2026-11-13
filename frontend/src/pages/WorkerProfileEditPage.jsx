import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchMyWorkerProfile,
  fetchMyAvatarUrl,
  fetchWorkerDocumentUrl,
  updateWorkerProfile,
  uploadAvatar,
  uploadWorkerDocument,
} from '../lib/api'

// ── Konstanta pilihan (sama dengan WorkerProfileForm) ─────────────────────────

const OPSI_STATUS = ['Mahasiswa', 'Pelajar', 'Freelancer', 'Gap Year', 'Lainnya']

const OPSI_KOMITMEN = [
  '10-15 jam/minggu',
  '15-20 jam/minggu',
  '>20 jam/minggu',
]

const OPSI_SHIFT = [
  { value: 'pagi', label: 'Pagi' },
  { value: 'siang', label: 'Siang' },
  { value: 'malam', label: 'Malam' },
  { value: 'akhir_pekan', label: 'Akhir Pekan' },
]

const OPSI_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

const OPSI_PAYMENT = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer_bank', label: 'Transfer Bank' },
  { value: 'e_wallet', label: 'E-Wallet' },
]

// Pilihan bank populer
const OPSI_BANK = ['BCA', 'Bank Mandiri', 'BRI', 'BNI', 'BTN']

// Pilihan e-wallet populer
const OPSI_EWALLET = ['Dana', 'OVO', 'GoPay', 'LinkAja', 'ShopeePay']

// ── Komponen UI bersama ───────────────────────────────────────────────────────

function MultiSelectToggle({ options, selected, onChange }) {
  function toggle(value) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const active = selected.includes(value)
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function TagInput({ tags, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('')

  function addTag(raw) {
    const trimmed = raw.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInputValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-sm text-blue-800"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="ml-0.5 text-blue-500 hover:text-blue-700"
            aria-label={`Hapus ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[140px] flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, htmlFor, hint, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

// ── Komponen detail Transfer Bank ─────────────────────────────────────────────

function BankDetailForm({ bankName, accountNumber, onChange }) {
  const isCustom = bankName !== '' && !OPSI_BANK.includes(bankName)
  const [showCustomInput, setShowCustomInput] = useState(isCustom)

  function selectBank(name) {
    if (name === '__custom__') {
      setShowCustomInput(true)
      onChange({ bankName: '', accountNumber })
    } else {
      setShowCustomInput(false)
      onChange({ bankName: name, accountNumber })
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <p className="text-xs font-semibold text-blue-700">Detail Rekening Bank</p>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Nama Bank <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {OPSI_BANK.map((b) => (
            <button key={b} type="button" onClick={() => selectBank(b)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                bankName === b && !showCustomInput
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
              }`}>
              {b}
            </button>
          ))}
          <button type="button" onClick={() => selectBank('__custom__')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              showCustomInput
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
            }`}>
            Lainnya
          </button>
        </div>
        {showCustomInput && (
          <input type="text" value={bankName}
            onChange={(e) => onChange({ bankName: e.target.value, accountNumber })}
            placeholder="Ketik nama bank kamu..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Nomor Rekening <span className="text-red-500">*</span>
        </label>
        <input type="text" inputMode="numeric" value={accountNumber}
          onChange={(e) => onChange({ bankName, accountNumber: e.target.value.replace(/\D/g, '') })}
          placeholder="Contoh: 1234567890"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      </div>
    </div>
  )
}

// ── Komponen detail E-Wallet ──────────────────────────────────────────────────

function EwalletDetailForm({ provider, phoneNumber, onChange }) {
  const isCustom = provider !== '' && !OPSI_EWALLET.includes(provider)
  const [showCustomInput, setShowCustomInput] = useState(isCustom)

  function selectProvider(name) {
    if (name === '__custom__') {
      setShowCustomInput(true)
      onChange({ provider: '', phoneNumber })
    } else {
      setShowCustomInput(false)
      onChange({ provider: name, phoneNumber })
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <p className="text-xs font-semibold text-indigo-700">Detail E-Wallet</p>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Provider E-Wallet <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {OPSI_EWALLET.map((p) => (
            <button key={p} type="button" onClick={() => selectProvider(p)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                provider === p && !showCustomInput
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
              }`}>
              {p}
            </button>
          ))}
          <button type="button" onClick={() => selectProvider('__custom__')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              showCustomInput
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
            }`}>
            Lainnya
          </button>
        </div>
        {showCustomInput && (
          <input type="text" value={provider}
            onChange={(e) => onChange({ provider: e.target.value, phoneNumber })}
            placeholder="Ketik nama e-wallet kamu..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Nomor Telepon Terdaftar <span className="text-red-500">*</span>
        </label>
        <input type="tel" value={phoneNumber}
          onChange={(e) => onChange({ provider, phoneNumber: e.target.value })}
          placeholder="Contoh: 081234567890"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
        <p className="mt-1 text-xs text-slate-400">
          Nomor telepon yang terdaftar di {provider || 'e-wallet'} kamu.
        </p>
      </div>
    </div>
  )
}

// ── Komponen upload avatar ────────────────────────────────────────────────────

function AvatarUploader({ previewUrl, onUploaded, fallbackLabel }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [localPreview, setLocalPreview] = useState(null)

  // localPreview (object URL dari file baru) takes priority over previewUrl (dari server)
  const displayUrl = localPreview ?? previewUrl

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi sisi klien
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setUploadError('Format tidak didukung. Pilih file JPG, PNG, atau WEBP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file melebihi 5 MB.')
      return
    }

    setUploadError('')

    // Tampilkan preview langsung
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)

    // Upload ke server
    setUploading(true)
    uploadAvatar(file)
      .then((res) => {
        onUploaded?.(res.avatar_url)
      })
      .catch((err) => {
        setUploadError(err.message || 'Gagal mengunggah foto.')
        // Batalkan preview jika upload gagal
        URL.revokeObjectURL(objectUrl)
        setLocalPreview(null)
      })
      .finally(() => setUploading(false))
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Foto profil"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-blue-100 text-2xl font-bold text-blue-600">
              {(fallbackLabel || '?')[0].toUpperCase()}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          )}
        </div>

        {/* Tombol pilih foto */}
        <div className="flex-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {uploading ? 'Mengunggah...' : displayUrl ? 'Ganti Foto' : 'Pilih Foto'}
          </button>
          <p className="mt-1 text-xs text-slate-400">JPG, PNG, atau WEBP · Maks 5 MB</p>
        </div>
      </div>

      {/* Error upload */}
      {uploadError && (
        <p className="mt-2 text-xs text-red-500">{uploadError}</p>
      )}

      {/* Input tersembunyi */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ── Komponen upload dokumen ───────────────────────────────────────────────────

function DocumentUploader({ docType, label, hasExisting, onUploaded }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploaded, setUploaded] = useState(hasExisting ?? false)
  const [fileName, setFileName] = useState(null)

  // Sync jika hasExisting berubah dari luar (setelah data dimuat)
  const [synced, setSynced] = useState(false)
  if (!synced && hasExisting !== undefined) {
    setUploaded(hasExisting)
    setSynced(true)
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!allowed.includes(file.type)) {
      setUploadError('Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file melebihi 10 MB.')
      return
    }

    setUploadError('')
    setUploading(true)
    setFileName(file.name)

    uploadWorkerDocument(docType, file)
      .then(() => {
        setUploaded(true)
        onUploaded?.()
      })
      .catch((err) => {
        setUploadError(err.message || 'Gagal mengunggah.')
        setFileName(null)
      })
      .finally(() => setUploading(false))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm ${
            uploaded ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
          }`}>
            {uploaded ? '✓' : (docType === 'cv' ? '📄' : '🪪')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            {fileName ? (
              <p className="truncate text-xs text-blue-600">{fileName}</p>
            ) : uploaded ? (
              <p className="text-xs text-slate-400">File sudah diunggah</p>
            ) : (
              <p className="text-xs text-slate-400">Belum ada file</p>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
        >
          {uploading ? '⏳ Mengunggah...' : uploaded ? 'Ganti' : 'Pilih File'}
        </button>
      </div>

      {uploadError && (
        <p className="mt-2 text-xs text-red-500">{uploadError}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function WorkerProfileEditPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // State loading data awal
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // Avatar state
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)

  // Dokumen state (apakah sudah ada file di server)
  const [hasCv, setHasCv] = useState(false)
  const [hasIdDoc, setHasIdDoc] = useState(false)

  // Form state — di-pre-fill setelah data dimuat
  const [nickname, setNickname] = useState('')
  const [location, setLocation] = useState('')
  const [statusPekerjaan, setStatusPekerjaan] = useState('')
  const [komitmenJam, setKomitmenJam] = useState('')
  const [preferensiShift, setPreferensiShift] = useState([])
  const [hariTersedia, setHariTersedia] = useState([])
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [skills, setSkills] = useState([])
  const [bio, setBio] = useState('')
  const [paymentMethods, setPaymentMethods] = useState([])

  // Detail Bank
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  // Detail E-Wallet
  const [ewalletProvider, setEwalletProvider] = useState('')
  const [ewalletPhone, setEwalletPhone] = useState('')

  // UI state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState(false)

  // ── Load data lama ──────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetchMyWorkerProfile(),
      fetchMyAvatarUrl().catch(() => null), // null jika belum ada foto
      fetchWorkerDocumentUrl('cv').catch(() => null),
      fetchWorkerDocumentUrl('id').catch(() => null),
    ])
      .then(([p, avatarUrl, cvUrl, idUrl]) => {
        setNickname(p.nickname ?? '')
        setLocation(p.location ?? '')
        setStatusPekerjaan(p.status_pekerjaan ?? '')
        setKomitmenJam(p.komitmen_jam ?? '')
        // Normalize & filter: backend expects lowercase values (e.g. 'pagi', 'akhir_pekan')
        const validShiftValues = OPSI_SHIFT.map((o) => o.value)
        setPreferensiShift(
          (p.preferensi_shift ?? [])
            .map((v) => v.toLowerCase())
            .filter((v) => validShiftValues.includes(v))
        )
        setHariTersedia(p.hari_tersedia ?? [])
        setTanggalMulai(p.tanggal_mulai ?? '')
        setSkills(p.skills ?? [])
        setBio(p.bio ?? '')
        // Normalize & filter: backend expects lowercase values (e.g. 'cash', 'e_wallet')
        const validPaymentValues = OPSI_PAYMENT.map((o) => o.value)
        setPaymentMethods(
          (p.accepted_payment_methods ?? [])
            .map((v) => v.toLowerCase())
            .filter((v) => validPaymentValues.includes(v))
        )
        // Pre-fill detail bank
        if (p.bank_details) {
          setBankName(p.bank_details.bank_name ?? '')
          setAccountNumber(p.bank_details.account_number ?? '')
        }
        // Pre-fill detail e-wallet
        if (p.ewallet_details) {
          setEwalletProvider(p.ewallet_details.provider ?? '')
          setEwalletPhone(p.ewallet_details.phone_number ?? '')
        }
        setAvatarPreviewUrl(avatarUrl)
        setHasCv(!!cvUrl)
        setHasIdDoc(!!idUrl)
      })
      .catch((err) => setLoadError(err.message ?? 'Gagal memuat profil.'))
      .finally(() => setInitialLoading(false))
  }, [])

  const hasBank = paymentMethods.includes('transfer_bank')
  const hasEwallet = paymentMethods.includes('e_wallet')

  function handlePaymentToggle(methods) {
    setPaymentMethods(methods)
    if (!methods.includes('transfer_bank')) { setBankName(''); setAccountNumber('') }
    if (!methods.includes('e_wallet')) { setEwalletProvider(''); setEwalletPhone('') }
  }

  // ── Submit (PUT partial update) ─────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError('')

    // Validasi detail pembayaran
    if (hasBank && (!bankName.trim() || !accountNumber.trim())) {
      setSaveError('Nama bank dan nomor rekening wajib diisi untuk metode Transfer Bank.')
      return
    }
    if (hasEwallet && (!ewalletProvider.trim() || !ewalletPhone.trim())) {
      setSaveError('Provider dan nomor telepon e-wallet wajib diisi.')
      return
    }

    setSaving(true)

    try {
      const body = {
        nickname: nickname.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        skills: skills.length > 0 ? skills : null,
        status_pekerjaan: statusPekerjaan || null,
        komitmen_jam: komitmenJam || null,
        preferensi_shift: preferensiShift.length > 0 ? preferensiShift : null,
        hari_tersedia: hariTersedia.length > 0 ? hariTersedia : null,
        tanggal_mulai: tanggalMulai || null,
        accepted_payment_methods: paymentMethods.length > 0 ? paymentMethods : null,
        bank_details: hasBank
          ? { bank_name: bankName.trim(), account_number: accountNumber.trim() }
          : null,
        ewallet_details: hasEwallet
          ? { provider: ewalletProvider.trim(), phone_number: ewalletPhone.trim() }
          : null,
      }

      await updateWorkerProfile(body)
      setSuccess(true)
      setTimeout(() => navigate('/worker/profile'), 800)
    } catch (err) {
      setSaveError(err.message || 'Gagal menyimpan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render loading ──────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-56" />
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <p className="mt-3 font-semibold text-slate-900">Gagal memuat profil</p>
          <p className="mt-1 text-sm text-slate-500">{loadError}</p>
          <button
            onClick={() => navigate('/worker')}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Kembali ke dashboard
          </button>
        </div>
      </main>
    )
  }

  // ── Render form ─────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">

        {/* Header */}
        <div className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Worker
              </span>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900">Edit Profil</h1>
              <p className="mt-1 text-sm text-slate-500">
                Hanya field yang kamu ubah yang akan diperbarui.
              </p>
            </div>
            {/* Avatar di header */}
            <div className="h-12 w-12 overflow-hidden rounded-2xl">
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-600 text-lg font-bold text-white">
                  {(user?.full_name ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flash success */}
        {success && (
          <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            ✅ Profil berhasil diperbarui. Mengarahkan...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── A. Informasi pribadi ── */}
          <Section title="A. Informasi Pribadi">
            <Field label="Nama lengkap" hint="Diambil dari akun. Tidak dapat diubah di sini.">
              <input
                type="text"
                readOnly
                value={user?.full_name ?? ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
              />
            </Field>

            {/* Foto profil */}
            <Field label="Foto profil">
              <AvatarUploader
                previewUrl={avatarPreviewUrl}
                fallbackLabel={user?.full_name}
                onUploaded={() => {
                  // Reload preview dari server setelah upload berhasil
                  fetchMyAvatarUrl()
                    .then((url) => setAvatarPreviewUrl(url))
                    .catch(() => {})
                }}
              />
            </Field>

            <Field label="Nama panggilan" htmlFor="nickname">
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Contoh: Andi"
                className={inputCls}
              />
            </Field>
            <Field label="Domisili / kota" htmlFor="location">
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Jakarta Selatan"
                className={inputCls}
              />
            </Field>
          </Section>

          {/* ── B. Status & ketersediaan ── */}
          <Section title="B. Status & Ketersediaan">
            <Field label="Status saat ini">
              <div className="flex flex-wrap gap-2">
                {OPSI_STATUS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusPekerjaan(statusPekerjaan === s ? '' : s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      statusPekerjaan === s
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Komitmen waktu per minggu">
              <div className="flex flex-wrap gap-2">
                {OPSI_KOMITMEN.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKomitmenJam(komitmenJam === k ? '' : k)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      komitmenJam === k
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Preferensi shift" hint="Pilih satu atau lebih.">
              <MultiSelectToggle
                options={OPSI_SHIFT}
                selected={preferensiShift}
                onChange={setPreferensiShift}
              />
            </Field>

            <Field label="Hari tersedia" hint="Pilih satu atau lebih.">
              <MultiSelectToggle
                options={OPSI_HARI}
                selected={hariTersedia}
                onChange={setHariTersedia}
              />
            </Field>

            <Field label="Tanggal siap mulai" htmlFor="tanggalMulai">
              <input
                id="tanggalMulai"
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Section>

          {/* ── C. Keahlian & bio ── */}
          <Section title="C. Keahlian & Bio">
            <Field
              label="Keahlian"
              hint="Ketik lalu tekan Enter atau koma. Klik × untuk menghapus."
            >
              <TagInput
                tags={skills}
                onChange={setSkills}
                placeholder="Contoh: Las, Konstruksi"
              />
            </Field>

            <Field label="Bio / pengalaman singkat" htmlFor="bio">
              <textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ceritakan pengalamanmu..."
                className={inputCls}
              />
            </Field>
          </Section>

          {/* ── D. Dokumen ── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
              D. Dokumen
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Format yang diterima: JPG, PNG, WEBP, atau PDF · Maks 10 MB per file.
            </p>
            <div className="space-y-3">
              <DocumentUploader
                docType="cv"
                label="CV / Resume"
                hasExisting={hasCv}
                onUploaded={() => setHasCv(true)}
              />
              <DocumentUploader
                docType="id"
                label="KTP / KTM"
                hasExisting={hasIdDoc}
                onUploaded={() => setHasIdDoc(true)}
              />
            </div>
          </div>

          {/* ── E. Metode pembayaran ── */}
          <Section title="E. Metode Pembayaran yang Diterima">
            <Field hint="Pilih minimal satu. Admin akan mentransfer upah sesuai detail di bawah.">
              <MultiSelectToggle
                options={OPSI_PAYMENT}
                selected={paymentMethods}
                onChange={handlePaymentToggle}
              />
            </Field>

            {/* Detail Transfer Bank */}
            {hasBank && (
              <BankDetailForm
                bankName={bankName}
                accountNumber={accountNumber}
                onChange={({ bankName: bn, accountNumber: an }) => {
                  setBankName(bn)
                  setAccountNumber(an)
                }}
              />
            )}

            {/* Detail E-Wallet */}
            {hasEwallet && (
              <EwalletDetailForm
                provider={ewalletProvider}
                phoneNumber={ewalletPhone}
                onChange={({ provider: p, phoneNumber: ph }) => {
                  setEwalletProvider(p)
                  setEwalletPhone(ph)
                }}
              />
            )}

            {/* Info cash */}
            {paymentMethods.includes('cash') && !hasBank && !hasEwallet && (
              <p className="mt-2 text-xs text-slate-400">
                💡 Pembayaran cash dilakukan langsung — tidak perlu detail rekening.
              </p>
            )}
          </Section>

          {/* Error */}
          {saveError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {saveError}
            </p>
          )}

          {/* Submit */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <button
              type="submit"
              disabled={saving || success}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate('/worker/profile')}
                className="text-slate-400 hover:text-slate-600"
              >
                ← Batal
              </button>
              <button
                type="button"
                onClick={logout}
                className="text-slate-400 hover:text-slate-600"
              >
                Keluar
              </button>
            </div>
          </div>

        </form>
      </div>
    </main>
  )
}
