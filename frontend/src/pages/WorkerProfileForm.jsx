import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequestAuth } from '../lib/api'

/**
 * Form pembuatan profil Worker.
 * Endpoint: POST /profiles/worker
 *
 * Bagian:
 * A. Informasi pribadi (nama/email/phone dari akun — read-only, nickname & domisili bisa diisi)
 * B. Status & ketersediaan
 * C. Keahlian & bio
 * D. Dokumen (ditampilkan tapi upload ditunda — storage belum tersedia)
 * E. Metode pembayaran
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

// ── Komponen toggle button multi-select ──────────────────────────────────────

function MultiSelectToggle({ options, selected, onChange, accentColor = 'blue' }) {
  const colorMap = {
    blue: {
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50',
    },
  }
  const colors = colorMap[accentColor] ?? colorMap.blue

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
              isActive ? colors.active : colors.inactive
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
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
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

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag))
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
            onClick={() => removeTag(tag)}
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

// ── Komponen section wrapper ──────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-600">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, htmlFor, hint, required, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Form utama ────────────────────────────────────────────────────────────────

export default function WorkerProfileForm() {
  const { user, refreshProfileStatus, logout } = useAuth()
  const navigate = useNavigate()

  // ── State form ──────────────────────────────────────────────────────────

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

  // E. Metode pembayaran
  const [paymentMethods, setPaymentMethods] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const body = {
        // Kirim null untuk field opsional yang kosong agar konsisten
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
      }

      await apiRequestAuth('/profiles/worker', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      await refreshProfileStatus()
      navigate('/worker')
    } catch (err) {
      setError(err.message || 'Gagal membuat profil. Silakan coba lagi.')
    } finally {
      setLoading(false)
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
            <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Worker
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Buat profil Worker</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Lengkapi informasi berikut untuk mulai melamar task. Semua field kecuali yang
            ditandai <span className="text-red-500">*</span> bersifat opsional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── A. Informasi pribadi ───────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="A. Informasi Pribadi">

              {/* Nama lengkap — dari akun, read-only */}
              <Field label="Nama lengkap" htmlFor="fullName" hint="Diambil dari akun. Hubungi admin untuk mengubah.">
                <input
                  id="fullName"
                  type="text"
                  readOnly
                  value={user?.full_name ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              {/* Email — dari akun, read-only */}
              <Field label="Email" htmlFor="email" hint="Diambil dari akun.">
                <input
                  id="email"
                  type="email"
                  readOnly
                  value={user?.email ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              {/* Nomor telepon — dari akun, read-only */}
              <Field label="Nomor WhatsApp / telepon" htmlFor="phone" hint="Diambil dari akun.">
                <input
                  id="phone"
                  type="tel"
                  readOnly
                  value={user?.phone ?? '—'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              {/* Foto profil — ditunda */}
              <Field label="Foto profil" hint="Upload foto profil belum tersedia — fitur ini akan hadir setelah integrasi storage selesai.">
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-lg text-slate-400">
                    👤
                  </div>
                  <p className="text-sm text-slate-400 italic">Belum tersedia</p>
                </div>
              </Field>

              {/* Nama panggilan */}
              <Field label="Nama panggilan" htmlFor="nickname">
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Contoh: Andi, Budi, Sari"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </Field>

              {/* Domisili */}
              <Field label="Domisili / kota" htmlFor="location">
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Jakarta Selatan, Surabaya"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </Field>

            </Section>
          </div>

          {/* ── B. Status & ketersediaan ──────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="B. Status & Ketersediaan">

              {/* Status pekerjaan */}
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

              {/* Komitmen jam */}
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

              {/* Preferensi shift */}
              <Field label="Preferensi shift" hint="Pilih satu atau lebih.">
                <MultiSelectToggle
                  options={OPSI_SHIFT}
                  selected={preferensiShift}
                  onChange={setPreferensiShift}
                />
              </Field>

              {/* Hari tersedia */}
              <Field label="Hari tersedia" hint="Pilih satu atau lebih.">
                <MultiSelectToggle
                  options={OPSI_HARI}
                  selected={hariTersedia}
                  onChange={setHariTersedia}
                />
              </Field>

              {/* Tanggal mulai */}
              <Field label="Tanggal siap mulai" htmlFor="tanggalMulai">
                <input
                  id="tanggalMulai"
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </Field>

            </Section>
          </div>

          {/* ── C. Keahlian & bio ─────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="C. Keahlian & Bio">

              {/* Skills — tag input */}
              <Field
                label="Keahlian"
                hint="Ketik keahlian lalu tekan Enter atau koma untuk menambahkan. Klik × untuk menghapus."
              >
                <TagInput
                  tags={skills}
                  onChange={setSkills}
                  placeholder="Contoh: Las, Konstruksi, Instalasi Listrik"
                />
              </Field>

              {/* Bio */}
              <Field label="Bio / pengalaman singkat" htmlFor="bio">
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan pengalamanmu, jenis pekerjaan yang pernah dilakukan, atau hal lain yang relevan untuk Employer..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </Field>

            </Section>
          </div>

          {/* ── D. Dokumen (ditunda) ───────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="D. Dokumen">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">
                  Upload CV/Resume dan KTP/KTM
                </p>
                <p className="mt-1 text-xs text-slate-400 italic">
                  Fitur upload dokumen belum tersedia saat ini. Storage belum
                  dikonfigurasi. Akan diaktifkan pada tahap berikutnya.
                </p>
              </div>
            </Section>
          </div>

          {/* ── E. Metode pembayaran ───────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="E. Metode Pembayaran yang Diterima">
              <Field hint="Pilih metode pembayaran yang kamu terima dari Employer.">
                <MultiSelectToggle
                  options={OPSI_PAYMENT}
                  selected={paymentMethods}
                  onChange={setPaymentMethods}
                />
              </Field>
            </Section>
          </div>

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* ── Submit & navigasi ──────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Menyimpan profil...' : 'Simpan Profil Worker'}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-slate-400 hover:text-slate-600"
              >
                ← Kembali ke dashboard
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
