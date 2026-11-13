import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequestAuth, uploadAvatar, uploadWorkerDocument } from '../lib/api'
import { setLastRole } from '../lib/lastRole'
import { ChevronDown } from 'lucide-react'

/**
 * Form pembuatan profil Worker.
 * Endpoint: POST /profiles/worker
 *
 * Bagian:
 * A. Informasi pribadi
 * B. Status & ketersediaan
 * C. Keahlian & bio
 * D. Dokumen (opsional, diupload setelah profil dibuat)
 * E. Metode & detail pembayaran (WAJIB — min 1 metode + detail sesuai pilihan)
 */

// ── Konstanta pilihan ────────────────────────────────────────────────────────

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

// Pilihan bank populer — worker bisa juga ketik sendiri jika pilih "Lainnya"
const OPSI_BANK = ['BCA', 'Bank Mandiri', 'BRI', 'BNI', 'BTN']

// Pilihan e-wallet populer
const OPSI_EWALLET = ['Dana', 'OVO', 'GoPay', 'LinkAja', 'ShopeePay']

// ── Komponen toggle button multi-select ──────────────────────────────────────

function MultiSelectToggle({ options, selected, onChange }) {
  function toggle(value) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const isActive = selected.includes(value)
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              isActive
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

// ── Komponen tag input untuk skills ─────────────────────────────────────────

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
        <span key={tag} className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-sm text-blue-800">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="ml-0.5 text-blue-500 hover:text-blue-700" aria-label={`Hapus ${tag}`}>×</button>
        </span>
      ))}
      <input
        type="text" value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue) }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[140px] flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
    </div>
  )
}

// ── Komponen section wrapper ──────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-600">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, htmlFor, hint, required, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Komponen upload avatar ────────────────────────────────────────────────────

function AvatarUploader({ previewUrl, onPreviewChange, fallbackLabel }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Format tidak didukung. Pilih file JPG, PNG, atau WEBP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Ukuran file melebihi 5 MB.'); return }
    setUploadError('')
    const objectUrl = URL.createObjectURL(file)
    onPreviewChange(objectUrl)
    setUploading(true)
    uploadAvatar(file)
      .catch((err) => { setUploadError(err.message || 'Gagal mengunggah foto.'); URL.revokeObjectURL(objectUrl); onPreviewChange(null) })
      .finally(() => setUploading(false))
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100">
          {previewUrl
            ? <img src={previewUrl} alt="Foto profil" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center bg-blue-100 text-2xl font-bold text-blue-600">{(fallbackLabel || '?')[0].toUpperCase()}</div>
          }
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1">
          <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50">
            {uploading ? 'Mengunggah...' : previewUrl ? 'Ganti Foto' : 'Pilih Foto'}
          </button>
          <p className="mt-1 text-xs text-slate-400">JPG, PNG, atau WEBP · Maks 5 MB</p>
        </div>
      </div>
      {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
    </div>
  )
}

// ── Komponen pilih dokumen (upload ditunda sampai profil tersimpan) ───────────

function DocumentPicker({ docType, label, file, onFileSelected }) {
  const fileInputRef = useRef(null)
  const [validationError, setValidationError] = useState('')
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

  function handleFileChange(e) {
    const picked = e.target.files?.[0]
    if (!picked) return
    if (!allowed.includes(picked.type)) { setValidationError('Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.'); return }
    if (picked.size > 10 * 1024 * 1024) { setValidationError('Ukuran file melebihi 10 MB.'); return }
    setValidationError('')
    onFileSelected(picked)
    e.target.value = ''
  }

  const icon = docType === 'cv' ? '📄' : '🪪'
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm ${file ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
            {file ? '✓' : icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            {file ? <p className="truncate text-xs text-blue-600">{file.name}</p>
              : <p className="text-xs text-slate-400">Belum ada file — opsional</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {file && (
            <button type="button" onClick={() => { setValidationError(''); onFileSelected(null) }}
              className="text-xs text-slate-400 underline underline-offset-2 hover:text-red-500">Hapus</button>
          )}
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50">
            {file ? 'Ganti' : 'Pilih File'}
          </button>
        </div>
      </div>
      {validationError && <p className="mt-2 text-xs text-red-500">{validationError}</p>}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFileChange} />
    </div>
  )
}

// ── Komponen detail Transfer Bank ─────────────────────────────────────────────

/**
 * Menampilkan pilihan bank populer (single select) + input nama bank custom
 * + input nomor rekening.
 *
 * Props:
 *  - bankName        string
 *  - accountNumber   string
 *  - onChange        ({ bankName, accountNumber }) => void
 */
function BankDetailForm({ bankName, accountNumber, onChange }) {
  // Jika bankName diisi tapi bukan dari daftar, berarti custom
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

      {/* Pilih bank */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Nama Bank <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {OPSI_BANK.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => selectBank(b)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                bankName === b && !showCustomInput
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {b}
            </button>
          ))}
          {/* Tombol "Lainnya" */}
          <button
            type="button"
            onClick={() => selectBank('__custom__')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              showCustomInput
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            Lainnya
          </button>
        </div>

        {/* Input nama bank custom */}
        {showCustomInput && (
          <input
            type="text"
            value={bankName}
            onChange={(e) => onChange({ bankName: e.target.value, accountNumber })}
            placeholder="Ketik nama bank kamu..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        )}
      </div>

      {/* Nomor rekening */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Nomor Rekening <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => onChange({ bankName, accountNumber: e.target.value.replace(/\D/g, '') })}
          placeholder="Contoh: 1234567890"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>
    </div>
  )
}

// ── Komponen detail E-Wallet ──────────────────────────────────────────────────

/**
 * Menampilkan pilihan e-wallet populer + input custom + input nomor telepon.
 *
 * Props:
 *  - provider      string
 *  - phoneNumber   string
 *  - onChange      ({ provider, phoneNumber }) => void
 */
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

      {/* Pilih provider */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Provider E-Wallet <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {OPSI_EWALLET.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => selectProvider(p)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                provider === p && !showCustomInput
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => selectProvider('__custom__')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              showCustomInput
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
            }`}
          >
            Lainnya
          </button>
        </div>

        {showCustomInput && (
          <input
            type="text"
            value={provider}
            onChange={(e) => onChange({ provider: e.target.value, phoneNumber })}
            placeholder="Ketik nama e-wallet kamu..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        )}
      </div>

      {/* Nomor telepon e-wallet */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Nomor Telepon Terdaftar <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onChange({ provider, phoneNumber: e.target.value })}
          placeholder="Contoh: 081234567890"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
        <p className="mt-1 text-xs text-slate-400">
          Nomor telepon yang terdaftar di {provider || 'e-wallet'} kamu.
        </p>
      </div>
    </div>
  )
}

// ── Form utama ────────────────────────────────────────────────────────────────

export default function WorkerProfileForm() {
  const { user, refreshProfileStatus, logout } = useAuth()
  const navigate = useNavigate()

  // ── State form ──────────────────────────────────────────────────────────

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)

  // A. Informasi pribadi
  const [nickname, setNickname] = useState('')
  const [location, setLocation] = useState('')

  // B. Status & ketersediaan
  const [statusPekerjaan, setStatusPekerjaan] = useState('')
  const [komitmenJam, setKomitmenJam] = useState('')
  const [preferensiShift, setPreferensiShift] = useState([])
  const [hariTersedia, setHariTersedia] = useState([])
  const [tanggalMulai, setTanggalMulai] = useState('')

  // C. Keahlian & bio
  const [skills, setSkills] = useState([])
  const [bio, setBio] = useState('')

  // D. Dokumen — file dipilih, diupload setelah profil dibuat
  const [cvFile, setCvFile] = useState(null)
  const [idFile, setIdFile] = useState(null)

  // E. Metode pembayaran
  const [paymentMethods, setPaymentMethods] = useState([])

  // Detail Bank (muncul jika transfer_bank dipilih)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  // Detail E-Wallet (muncul jika e_wallet dipilih)
  const [ewalletProvider, setEwalletProvider] = useState('')
  const [ewalletPhone, setEwalletPhone] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [docStatus, setDocStatus] = useState('')

  const hasBank = paymentMethods.includes('transfer_bank')
  const hasEwallet = paymentMethods.includes('e_wallet')

  // ── Handler payment method toggle ──
  function handlePaymentToggle(methods) {
    setPaymentMethods(methods)
    // Reset detail jika metode dicabut
    if (!methods.includes('transfer_bank')) {
      setBankName('')
      setAccountNumber('')
    }
    if (!methods.includes('e_wallet')) {
      setEwalletProvider('')
      setEwalletPhone('')
    }
  }

  // ── Validasi sebelum submit ──
  function validate() {
    if (paymentMethods.length === 0) {
      return 'Pilih minimal satu metode pembayaran.'
    }
    if (hasBank) {
      if (!bankName.trim()) return 'Nama bank wajib diisi untuk metode Transfer Bank.'
      if (!accountNumber.trim()) return 'Nomor rekening wajib diisi untuk metode Transfer Bank.'
    }
    if (hasEwallet) {
      if (!ewalletProvider.trim()) return 'Provider e-wallet wajib dipilih.'
      if (!ewalletPhone.trim()) return 'Nomor telepon e-wallet wajib diisi.'
    }
    return null
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setDocStatus('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      // Scroll ke error
      document.querySelector('[data-section-payment]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    setLoading(true)

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
        accepted_payment_methods: paymentMethods,
        // Detail bank — hanya kirim jika transfer_bank dipilih
        bank_details: hasBank
          ? { bank_name: bankName.trim(), account_number: accountNumber.trim() }
          : null,
        // Detail e-wallet — hanya kirim jika e_wallet dipilih
        ewallet_details: hasEwallet
          ? { provider: ewalletProvider.trim(), phone_number: ewalletPhone.trim() }
          : null,
      }

      await apiRequestAuth('/profiles/worker', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      // Upload dokumen jika ada (opsional)
      const docUploads = []
      if (cvFile) docUploads.push({ type: 'cv', file: cvFile })
      if (idFile) docUploads.push({ type: 'id', file: idFile })

      if (docUploads.length > 0) {
        setDocStatus('Mengupload dokumen...')
        const results = await Promise.allSettled(
          docUploads.map(({ type, file }) => uploadWorkerDocument(type, file))
        )
        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length > 0) {
          setDocStatus(`Profil berhasil dibuat. ${failed.length} dokumen gagal — bisa coba lagi di Edit Profil.`)
          await new Promise((r) => setTimeout(r, 2500))
        }
      }

      await refreshProfileStatus()
      setLastRole(user.id, 'worker')
      navigate('/worker')
    } catch (err) {
      setError(err.message || 'Gagal membuat profil. Silakan coba lagi.')
    } finally {
      setLoading(false)
      setDocStatus('')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">

        {/* Header */}
        <div className="mb-6 rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xl">🔨</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">Worker</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Buat profil Worker</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Lengkapi informasi berikut untuk mulai melamar task. Field bertanda{' '}
            <span className="text-red-500">*</span> wajib diisi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── A. Informasi pribadi ───────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="A. Informasi Pribadi">
              <Field label="Nama lengkap" htmlFor="fullName" hint="Diambil dari akun. Hubungi admin untuk mengubah.">
                <input id="fullName" type="text" readOnly value={user?.full_name ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none" />
              </Field>
              <Field label="Email" htmlFor="email" hint="Diambil dari akun.">
                <input id="email" type="email" readOnly value={user?.email ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none" />
              </Field>
              <Field label="Nomor WhatsApp / telepon" htmlFor="phone" hint="Diambil dari akun.">
                <input id="phone" type="tel" readOnly value={user?.phone ?? '—'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none" />
              </Field>
              <Field label="Foto profil">
                <AvatarUploader previewUrl={avatarPreviewUrl} onPreviewChange={setAvatarPreviewUrl} fallbackLabel={user?.full_name} />
              </Field>
              <Field label="Nama panggilan" htmlFor="nickname">
                <input id="nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder="Contoh: Andi, Budi, Sari"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </Field>
              <Field label="Domisili / kota" htmlFor="location">
                <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Jakarta Selatan, Surabaya"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </Field>
            </Section>
          </div>

          {/* ── B. Status & ketersediaan ──────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="B. Status & Ketersediaan">
              <Field label="Status saat ini">
                <div className="flex flex-wrap gap-2">
                  {OPSI_STATUS.map((s) => (
                    <button key={s} type="button"
                      onClick={() => setStatusPekerjaan(statusPekerjaan === s ? '' : s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${statusPekerjaan === s ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Komitmen waktu per minggu">
                <div className="flex flex-wrap gap-2">
                  {OPSI_KOMITMEN.map((k) => (
                    <button key={k} type="button"
                      onClick={() => setKomitmenJam(komitmenJam === k ? '' : k)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${komitmenJam === k ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Preferensi shift" hint="Pilih satu atau lebih.">
                <MultiSelectToggle options={OPSI_SHIFT} selected={preferensiShift} onChange={setPreferensiShift} />
              </Field>
              <Field label="Hari tersedia" hint="Pilih satu atau lebih.">
                <MultiSelectToggle options={OPSI_HARI} selected={hariTersedia} onChange={setHariTersedia} />
              </Field>
              <Field label="Tanggal siap mulai" htmlFor="tanggalMulai">
                <input id="tanggalMulai" type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </Field>
            </Section>
          </div>

          {/* ── C. Keahlian & bio ─────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="C. Keahlian & Bio">
              <Field label="Keahlian" hint="Ketik keahlian lalu tekan Enter atau koma. Klik × untuk menghapus.">
                <TagInput tags={skills} onChange={setSkills} placeholder="Contoh: Las, Konstruksi, Instalasi Listrik" />
              </Field>
              <Field label="Bio / pengalaman singkat" htmlFor="bio">
                <textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan pengalamanmu, jenis pekerjaan yang pernah dilakukan, atau hal lain yang relevan untuk Employer..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </Field>
            </Section>
          </div>

          {/* ── D. Dokumen ────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="D. Dokumen">
              <p className="text-xs text-slate-400">
                Upload dokumen untuk memperkuat profil kamu. Format: JPG, PNG, WEBP, atau PDF · Maks 10 MB. Opsional — bisa dilewati.
              </p>
              <DocumentPicker docType="cv" label="CV / Resume" file={cvFile} onFileSelected={setCvFile} />
              <DocumentPicker docType="id" label="KTP / KTM" file={idFile} onFileSelected={setIdFile} />
            </Section>
          </div>

          {/* ── E. Metode & detail pembayaran ─────────────────────────── */}
          <div data-section-payment className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="E. Metode Pembayaran yang Diterima">

              <Field required hint="Pilih minimal satu. Admin akan mentransfer upah sesuai detail di bawah.">
                <MultiSelectToggle options={OPSI_PAYMENT} selected={paymentMethods} onChange={handlePaymentToggle} />
              </Field>

              {/* ── Detail Transfer Bank (muncul jika transfer_bank dipilih) ── */}
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

              {/* ── Detail E-Wallet (muncul jika e_wallet dipilih) ── */}
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
          </div>

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Submit & navigasi ──────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {docStatus ? docStatus : loading ? 'Menyimpan profil...' : 'Simpan Profil Worker'}
            </button>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-600">
                ← Kembali ke dashboard
              </button>
              <button type="button" onClick={logout} className="text-slate-400 hover:text-slate-600">
                Keluar
              </button>
            </div>
          </div>

        </form>
      </div>
    </main>
  )
}
