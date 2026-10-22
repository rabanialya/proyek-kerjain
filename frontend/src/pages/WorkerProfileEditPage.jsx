import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyWorkerProfile, updateWorkerProfile } from '../lib/api'

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

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function WorkerProfileEditPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // State loading data awal
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

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

  // UI state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState(false)

  // ── Load data lama ──────────────────────────────────────────────────────

  useEffect(() => {
    fetchMyWorkerProfile()
      .then((p) => {
        setNickname(p.nickname ?? '')
        setLocation(p.location ?? '')
        setStatusPekerjaan(p.status_pekerjaan ?? '')
        setKomitmenJam(p.komitmen_jam ?? '')
        // Normalize: backend expects lowercase values (e.g. 'pagi', 'akhir_pekan')
        setPreferensiShift((p.preferensi_shift ?? []).map((v) => v.toLowerCase()))
        setHariTersedia(p.hari_tersedia ?? [])
        setTanggalMulai(p.tanggal_mulai ?? '')
        setSkills(p.skills ?? [])
        setBio(p.bio ?? '')
        // Normalize: backend expects lowercase values (e.g. 'cash', 'e_wallet')
        setPaymentMethods((p.accepted_payment_methods ?? []).map((v) => v.toLowerCase()))
      })
      .catch((err) => setLoadError(err.message ?? 'Gagal memuat profil.'))
      .finally(() => setInitialLoading(false))
  }, [])

  // ── Submit (PUT partial update) ─────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError('')
    setSaving(true)

    try {
      // Hanya kirim field yang memiliki nilai — backend exclude_unset=True
      // akan mengabaikan field yang tidak dikirim dan mempertahankan nilai lama.
      // Kita kirim semua field yang ada di form; field kosong dikirim sebagai null
      // hanya jika user memang sengaja mengosongkannya.
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
      }

      await updateWorkerProfile(body)
      setSuccess(true)

      // Navigasi ke halaman detail setelah 800ms agar flash success terlihat
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
              {(user?.full_name ?? '?')[0].toUpperCase()}
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

          {/* ── D. Dokumen (ditunda) ── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-600">
              D. Dokumen
            </h2>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">Upload CV/Resume dan KTP/KTM</p>
              <p className="mt-1 text-xs text-slate-400 italic">
                Fitur upload belum tersedia. Akan diaktifkan setelah storage dikonfigurasi.
              </p>
            </div>
          </div>

          {/* ── E. Metode pembayaran ── */}
          <Section title="E. Metode Pembayaran yang Diterima">
            <MultiSelectToggle
              options={OPSI_PAYMENT}
              selected={paymentMethods}
              onChange={setPaymentMethods}
            />
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
