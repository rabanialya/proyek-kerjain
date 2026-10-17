import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyEmployerProfile, updateEmployerProfile } from '../lib/api'

// ── Konstanta pilihan (sama dengan EmployerProfileForm) ───────────────────────

const OPSI_TIPE = ['Perusahaan', 'UMKM', 'Usaha Mandiri', 'Perorangan']

const OPSI_WORK_TYPE = [
  { value: 'remote', label: 'Remote' },
  { value: 'on_site', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
]

const OPSI_PAYMENT_SCHEME = [
  { value: 'per_jam', label: 'Per Jam' },
  { value: 'per_hari', label: 'Per Hari' },
  { value: 'per_proyek', label: 'Per Proyek / Output' },
  { value: 'bulanan', label: 'Bulanan' },
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
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, htmlFor, hint, required, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function EmployerProfileEditPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [tipeEmployer, setTipeEmployer] = useState('')
  const [sektor, setSektor] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [website, setWebsite] = useState('')
  const [workType, setWorkType] = useState([])
  const [workAddress, setWorkAddress] = useState('')
  const [paymentScheme, setPaymentScheme] = useState([])
  const [paymentSchedule, setPaymentSchedule] = useState('')

  // UI state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState(false)

  // ── Load data lama ──────────────────────────────────────────────────────

  useEffect(() => {
    fetchMyEmployerProfile()
      .then((p) => {
        setDisplayName(p.display_name ?? '')
        setTipeEmployer(p.tipe_employer ?? '')
        setSektor(p.sektor ?? '')
        setTagline(p.tagline ?? '')
        setDescription(p.description ?? '')
        setLocation(p.location ?? '')
        setContactEmail(p.contact_email ?? '')
        setWhatsapp(p.whatsapp ?? '')
        setWebsite(p.website ?? '')
        setWorkType(p.work_type ?? [])
        setWorkAddress(p.work_address ?? '')
        setPaymentScheme(p.payment_scheme ?? [])
        setPaymentSchedule(p.payment_schedule ?? '')
      })
      .catch((err) => setLoadError(err.message ?? 'Gagal memuat profil.'))
      .finally(() => setInitialLoading(false))
  }, [])

  // ── Submit (PUT partial update) ─────────────────────────────────────────

  function validate() {
    if (!displayName.trim() || displayName.trim().length < 2) {
      return 'Nama tampilan wajib diisi dan minimal 2 karakter.'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError('')

    const err = validate()
    if (err) { setSaveError(err); return }

    setSaving(true)
    try {
      const body = {
        display_name: displayName.trim(),
        tipe_employer: tipeEmployer || null,
        sektor: sektor.trim() || null,
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        contact_email: contactEmail.trim() || null,
        whatsapp: whatsapp.trim() || null,
        website: website.trim() || null,
        work_type: workType.length > 0 ? workType : null,
        work_address: workAddress.trim() || null,
        payment_scheme: paymentScheme.length > 0 ? paymentScheme : null,
        payment_schedule: paymentSchedule.trim() || null,
      }

      await updateEmployerProfile(body)
      setSuccess(true)
      setTimeout(() => navigate('/employer/profile'), 800)
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
          <SkeletonBlock className="h-48" />
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
            onClick={() => navigate('/employer')}
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
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
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                Employer
              </span>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900">Edit Profil</h1>
              <p className="mt-1 text-sm text-slate-500">
                Hanya field yang kamu ubah yang akan diperbarui.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">
              {(displayName || '?')[0].toUpperCase()}
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

          {/* ── A. Identitas ── */}
          <Section title="A. Identitas">
            <Field label="Tipe entitas">
              <div className="flex flex-wrap gap-2">
                {OPSI_TIPE.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipeEmployer(tipeEmployer === t ? '' : t)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      tipeEmployer === t
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Nama tampilan" htmlFor="displayName" required>
              <input
                id="displayName"
                type="text"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama perusahaan / usaha / pemilik"
                className={inputCls}
              />
            </Field>

            <Field label="Sektor / industri" htmlFor="sektor">
              <input
                id="sektor"
                type="text"
                value={sektor}
                onChange={(e) => setSektor(e.target.value)}
                placeholder="Contoh: Kuliner, Konstruksi"
                className={inputCls}
              />
            </Field>

            {/* Logo — ditunda */}
            <Field
              label="Logo / foto profil"
              hint="Upload logo belum tersedia. Akan diaktifkan setelah storage dikonfigurasi."
            >
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                  🏢
                </div>
                <p className="text-sm text-slate-400 italic">Belum tersedia</p>
              </div>
            </Field>

            <Field label="Tagline" htmlFor="tagline" hint="Slogan singkat, 1–2 kalimat.">
              <input
                id="tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Contoh: Solusi tenaga kerja fleksibel untuk UMKM"
                className={inputCls}
              />
            </Field>

            <Field label="Deskripsi" htmlFor="description">
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ceritakan tentang perusahaan..."
                className={inputCls}
              />
            </Field>

            <Field label="Domisili / lokasi utama" htmlFor="location">
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Surabaya, Jawa Timur"
                className={inputCls}
              />
            </Field>
          </Section>

          {/* ── B. Kontak ── */}
          <Section title="B. Kontak">
            <Field
              label="Email kontak"
              htmlFor="contactEmail"
              hint="Email yang ditampilkan ke Worker. Boleh berbeda dari email akun."
            >
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="kontak@perusahaan.com"
                className={inputCls}
              />
            </Field>

            <Field
              label="Nomor WhatsApp / telepon"
              htmlFor="whatsapp"
              hint="Tidak ditampilkan kepada publik secara langsung."
            >
              <input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="08123456789"
                className={inputCls}
              />
            </Field>

            <Field
              label="Website / media sosial"
              htmlFor="website"
              hint="URL lengkap, contoh: https://instagram.com/nama_usaha"
            >
              <input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className={inputCls}
              />
            </Field>

            {/* Status verifikasi — informasional saja */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mt-0.5 text-base">🔒</span>
              <p className="text-xs text-slate-400">
                Status verifikasi dikelola oleh tim Kerjain dan tidak dapat diubah di sini.
              </p>
            </div>
          </Section>

          {/* ── C. Format kerja ── */}
          <Section title="C. Format Kerja">
            <Field label="Format kerja yang ditawarkan" hint="Pilih satu atau lebih.">
              <MultiSelectToggle
                options={OPSI_WORK_TYPE}
                selected={workType}
                onChange={setWorkType}
              />
            </Field>

            <Field label="Alamat lokasi kerja" htmlFor="workAddress">
              <input
                id="workAddress"
                type="text"
                value={workAddress}
                onChange={(e) => setWorkAddress(e.target.value)}
                placeholder="Contoh: Jl. Raya No. 10, Jakarta Selatan"
                className={inputCls}
              />
            </Field>
          </Section>

          {/* ── D. Kebijakan pembayaran ── */}
          <Section title="D. Kebijakan Pembayaran">
            <Field label="Skema pembayaran" hint="Pilih satu atau lebih.">
              <MultiSelectToggle
                options={OPSI_PAYMENT_SCHEME}
                selected={paymentScheme}
                onChange={setPaymentScheme}
              />
            </Field>

            <Field label="Kebijakan waktu pembayaran" htmlFor="paymentSchedule">
              <input
                id="paymentSchedule"
                type="text"
                value={paymentSchedule}
                onChange={(e) => setPaymentSchedule(e.target.value)}
                placeholder="Contoh: Setelah pekerjaan selesai dan diverifikasi"
                className={inputCls}
              />
            </Field>
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
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate('/employer/profile')}
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
