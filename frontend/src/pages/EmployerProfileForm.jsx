import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequestAuth } from '../lib/api'

/**
 * Form pembuatan profil Employer.
 * Endpoint: POST /profiles/employer
 *
 * Bagian:
 * A. Identitas (tipe, nama, sektor, logo-placeholder, tagline, deskripsi, domisili)
 * B. Kontak & verifikasi (email kontak, WhatsApp, website — is_verified dikelola sistem)
 * C. Jenis pekerjaan & format kerja (work_type, work_address)
 * D. Kebijakan kerja & pembayaran (payment_scheme, payment_schedule)
 *
 * Informasi sistem (rating, task aktif, ulasan) tidak diisi di form ini.
 */

// ── Konstanta pilihan ─────────────────────────────────────────────────────────

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

// ── Komponen pendukung ────────────────────────────────────────────────────────

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
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
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
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'

// ── Form utama ────────────────────────────────────────────────────────────────

export default function EmployerProfileForm() {
  const { user, refreshProfileStatus, logout } = useAuth()
  const navigate = useNavigate()

  // ── State form ──────────────────────────────────────────────────────────

  // A. Identitas
  const [displayName, setDisplayName] = useState('')
  const [tipeEmployer, setTipeEmployer] = useState('')
  const [sektor, setSektor] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')

  // B. Kontak
  const [contactEmail, setContactEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [website, setWebsite] = useState('')

  // C. Format kerja
  const [workType, setWorkType] = useState([])
  const [workAddress, setWorkAddress] = useState('')

  // D. Pembayaran
  const [paymentScheme, setPaymentScheme] = useState([])
  const [paymentSchedule, setPaymentSchedule] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Validasi ────────────────────────────────────────────────────────────

  function validate() {
    if (!displayName.trim() || displayName.trim().length < 2) {
      return 'Nama tampilan wajib diisi dan minimal 2 karakter.'
    }
    return null
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

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

      await apiRequestAuth('/profiles/employer', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      await refreshProfileStatus()
      navigate('/employer')
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
            <span className="text-xl">🏢</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              Employer
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Buat profil Employer</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Lengkapi informasi berikut untuk mulai merekrut Worker. Hanya{' '}
            <span className="font-medium text-slate-700">Nama tampilan</span> yang wajib diisi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── A. Identitas ───────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="A. Identitas">

              {/* Tipe employer */}
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

              {/* Nama tampilan — wajib */}
              <Field label="Nama perusahaan / usaha / nama pemilik" htmlFor="displayName" required>
                <input
                  id="displayName"
                  type="text"
                  required
                  minLength={2}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: PT Maju Bersama, Warung Bu Ani, Ahmad Fauzi"
                  className={inputClass}
                />
              </Field>

              {/* Sektor */}
              <Field label="Sektor / industri" htmlFor="sektor">
                <input
                  id="sektor"
                  type="text"
                  value={sektor}
                  onChange={(e) => setSektor(e.target.value)}
                  placeholder="Contoh: Kuliner, Konstruksi, Retail, Teknologi"
                  className={inputClass}
                />
              </Field>

              {/* Logo — ditunda */}
              <Field
                label="Logo / foto profil"
                hint="Upload logo belum tersedia — akan diaktifkan setelah integrasi storage selesai."
              >
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-lg text-slate-400">
                    🏢
                  </div>
                  <p className="text-sm text-slate-400 italic">Belum tersedia</p>
                </div>
              </Field>

              {/* Tagline */}
              <Field label="Tagline" htmlFor="tagline" hint="Slogan singkat, 1–2 kalimat.">
                <input
                  id="tagline"
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Contoh: Solusi tenaga kerja fleksibel untuk UMKM"
                  className={inputClass}
                />
              </Field>

              {/* Deskripsi */}
              <Field label="Deskripsi" htmlFor="description">
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ceritakan tentang perusahaan, jenis pekerjaan yang sering dibuka, dan lingkungan kerja..."
                  className={inputClass}
                />
              </Field>

              {/* Domisili */}
              <Field label="Domisili / lokasi utama" htmlFor="location">
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Surabaya, Jawa Timur"
                  className={inputClass}
                />
              </Field>

            </Section>
          </div>

          {/* ── B. Kontak & verifikasi ─────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="B. Kontak & Verifikasi">

              {/* Email akun — read-only */}
              <Field
                label="Email akun"
                htmlFor="emailAkun"
                hint="Email yang digunakan untuk login. Tidak ditampilkan publik."
              >
                <input
                  id="emailAkun"
                  type="email"
                  readOnly
                  value={user?.email ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              {/* Email kontak */}
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
                  className={inputClass}
                />
              </Field>

              {/* WhatsApp */}
              <Field label="Nomor WhatsApp / telepon" htmlFor="whatsapp">
                <input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className={inputClass}
                />
              </Field>

              {/* Website */}
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
                  className={inputClass}
                />
              </Field>

              {/* Status verifikasi — informasional */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="mt-0.5 text-base">🔒</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">Status verifikasi</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Status verifikasi dikelola oleh tim Kerjain dan tidak dapat dipilih
                    secara manual. Profil terverifikasi akan mendapatkan lencana khusus.
                  </p>
                </div>
              </div>

            </Section>
          </div>

          {/* ── C. Format kerja ────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="C. Jenis Pekerjaan & Format Kerja">

              {/* Work type */}
              <Field
                label="Format kerja yang ditawarkan"
                hint="Pilih satu atau lebih format kerja yang umum dibuka."
              >
                <MultiSelectToggle
                  options={OPSI_WORK_TYPE}
                  selected={workType}
                  onChange={setWorkType}
                />
              </Field>

              {/* Work address */}
              <Field
                label="Alamat lokasi kerja"
                htmlFor="workAddress"
                hint="Relevan untuk pekerjaan on-site. Boleh dikosongkan untuk pekerjaan remote."
              >
                <input
                  id="workAddress"
                  type="text"
                  value={workAddress}
                  onChange={(e) => setWorkAddress(e.target.value)}
                  placeholder="Contoh: Jl. Raya No. 10, Jakarta Selatan"
                  className={inputClass}
                />
              </Field>

            </Section>
          </div>

          {/* ── D. Kebijakan pembayaran ────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/60">
            <Section title="D. Kebijakan Kerja & Pembayaran">

              {/* Skema pembayaran */}
              <Field
                label="Skema pembayaran yang umum digunakan"
                hint="Pilih satu atau lebih skema yang biasa diterapkan."
              >
                <MultiSelectToggle
                  options={OPSI_PAYMENT_SCHEME}
                  selected={paymentScheme}
                  onChange={setPaymentScheme}
                />
              </Field>

              {/* Kebijakan waktu pembayaran */}
              <Field
                label="Kebijakan waktu pembayaran"
                htmlFor="paymentSchedule"
                hint="Contoh: Setelah pekerjaan selesai, H+3 setelah konfirmasi."
              >
                <input
                  id="paymentSchedule"
                  type="text"
                  value={paymentSchedule}
                  onChange={(e) => setPaymentSchedule(e.target.value)}
                  placeholder="Contoh: Setelah pekerjaan selesai dan diverifikasi"
                  className={inputClass}
                />
              </Field>

              {/* Catatan — informasi sistem */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Catatan:</span>{' '}
                  Rating, jumlah pekerjaan selesai, ulasan, dan daftar task aktif berasal
                  dari data sistem dan tidak diisi di sini.
                </p>
              </div>

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
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Menyimpan profil...' : 'Simpan Profil Employer'}
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
