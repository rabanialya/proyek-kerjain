import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTask, fetchCategories, publishTask } from '../lib/api'

// ─── Konstanta ─────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash',     label: 'Tunai (Cash)' },
  { value: 'ewallet',  label: 'E-Wallet' },
]

const WORK_TYPE_OPTIONS = [
  { value: 'on_site', label: 'On-site (Tatap Muka)',   desc: 'Pekerjaan dilakukan di lokasi fisik.' },
  { value: 'remote',  label: 'Remote (WFH / Online)',  desc: 'Pekerjaan dilakukan jarak jauh.' },
  { value: 'hybrid',  label: 'Hybrid',                 desc: 'Sebagian on-site, sebagian remote.' },
]

const WAGE_RATE_OPTIONS = [
  { value: 'project',    label: 'Per Proyek' },
  { value: 'daily',      label: 'Per Hari' },
  { value: 'hourly',     label: 'Per Jam' },
  { value: 'per_output', label: 'Per Output / Task' },
]

const REQUIREMENT_FLAG_OPTIONS = [
  { value: 'own_vehicle',       label: 'Memiliki kendaraan sendiri' },
  { value: 'own_device',        label: 'Memiliki perangkat sendiri (laptop/HP)' },
  { value: 'local_domicile',    label: 'Berdomisili di lokasi yang sama' },
  { value: 'minimum_age_18',    label: 'Usia minimal 18 tahun' },
  { value: 'no_criminal_record',label: 'Bebas catatan kriminal' },
]

// ─── Nilai awal form ────────────────────────────────────────────────────────

const INITIAL = {
  title:                '',
  category_id:          '',
  description:          '',
  // Tipe kerja & lokasi
  work_type:            '',
  location:             '',
  // Worker & upah
  worker_needed:        1,
  wage_amount:          '',
  wage_rate:            '',
  payment_method:       '',
  // Deadline pendaftaran
  application_deadline: '',
  // Jadwal — kerja terjadwal
  work_date:            '',
  work_time_start:      '',
  work_time_end:        '',
  // Jadwal — kerja berbasis proyek
  work_deadline_days:   '',
  // Persyaratan
  required_skills:      '',
  requirements_flags:   [],   // array string, dikumpulkan dari checkbox
  requirements_note:    '',
}

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Bangun payload dari fields form — hanya sertakan field yang terisi.
 * requirements_flags diubah ke JSON string jika tidak kosong.
 */
function buildPayload(fields) {
  const p = {
    category_id:    fields.category_id,
    title:          fields.title.trim(),
    description:    fields.description.trim() || null,
    work_type:      fields.work_type || null,
    location:       fields.location.trim() || null,
    worker_needed:  Number(fields.worker_needed),
    wage_amount:    Number(fields.wage_amount),
    wage_rate:      fields.wage_rate || null,
    payment_method: fields.payment_method,
  }

  if (fields.application_deadline) {
    // datetime-local value: "2026-10-25T09:00" — kirim sebagai ISO string UTC-aware
    p.application_deadline = new Date(fields.application_deadline).toISOString()
  }

  if (fields.work_date)       p.work_date        = fields.work_date
  if (fields.work_time_start) p.work_time_start  = fields.work_time_start
  if (fields.work_time_end)   p.work_time_end    = fields.work_time_end

  if (fields.work_deadline_days !== '') {
    p.work_deadline_days = Number(fields.work_deadline_days)
  }

  if (fields.required_skills.trim())  p.required_skills  = fields.required_skills.trim()
  if (fields.requirements_note.trim()) p.requirements_note = fields.requirements_note.trim()

  if (fields.requirements_flags.length > 0) {
    p.requirements_flags = JSON.stringify(fields.requirements_flags)
  }

  return p
}

// ─── Validasi frontend ──────────────────────────────────────────────────────

function validate(fields, isPublish) {
  const errors = {}

  if (!fields.title.trim())                errors.title          = 'Judul task wajib diisi.'
  else if (fields.title.trim().length < 3) errors.title          = 'Judul minimal 3 karakter.'

  if (!fields.category_id)                 errors.category_id    = 'Pilih kategori task.'

  const wage = Number(fields.wage_amount)
  if (!fields.wage_amount || isNaN(wage) || wage <= 0) errors.wage_amount = 'Upah harus lebih dari 0.'

  const wn = Number(fields.worker_needed)
  if (!Number.isInteger(wn) || wn < 1)    errors.worker_needed  = 'Minimal 1 worker dibutuhkan.'

  if (!fields.payment_method)             errors.payment_method = 'Pilih metode pembayaran.'

  // Validasi wajib hanya saat publish
  if (isPublish) {
    if (!fields.work_type)   errors.work_type = 'Tipe kerja wajib dipilih sebelum dipublikasikan.'
    if (!fields.wage_rate)   errors.wage_rate  = 'Satuan upah wajib dipilih sebelum dipublikasikan.'

    if (fields.work_type === 'on_site' || fields.work_type === 'hybrid') {
      if (!fields.location.trim()) errors.location = 'Lokasi fisik wajib diisi untuk tipe kerja ini.'
    }
  }

  // Jam selesai harus setelah jam mulai
  if (fields.work_time_start && fields.work_time_end) {
    if (fields.work_time_end <= fields.work_time_start) {
      errors.work_time_end = 'Jam selesai harus lebih dari jam mulai.'
    }
  }

  // Deadline harus di masa depan
  if (fields.application_deadline) {
    if (new Date(fields.application_deadline) <= new Date()) {
      errors.application_deadline = 'Batas akhir pendaftaran harus di masa depan.'
    }
  }

  // work_deadline_days range
  if (fields.work_deadline_days !== '') {
    const d = Number(fields.work_deadline_days)
    if (!Number.isInteger(d) || d < 1 || d > 365) {
      errors.work_deadline_days = 'Durasi pengerjaan harus antara 1–365 hari.'
    }
  }

  return errors
}

// ─── Sub-komponen ────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function InputField({ id, label, required, hint, error, children }) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      <div className="mt-1">{children}</div>
      <FieldError message={error} />
    </div>
  )
}

function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

// ─── Halaman utama ───────────────────────────────────────────────────────────

export default function CreateTaskPage() {
  const navigate = useNavigate()
  const [fields, setFields]     = useState(INITIAL)
  const [errors, setErrors]     = useState({})
  const [categories, setCategories]       = useState([])
  const [catLoading, setCatLoading]       = useState(true)
  const [catError, setCatError]           = useState(null)
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState(null)
  const submittingRef = useRef(false)

  // Ambil kategori
  useEffect(() => {
    let active = true
    setCatLoading(true)
    fetchCategories()
      .then(data => { if (active) setCategories((data ?? []).filter(c => c.is_active)) })
      .catch(err => { if (active) setCatError(err.message ?? 'Gagal memuat kategori.') })
      .finally(() => { if (active) setCatLoading(false) })
    return () => { active = false }
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setFields(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  function handleFlagChange(value) {
    setFields(prev => {
      const flags = prev.requirements_flags.includes(value)
        ? prev.requirements_flags.filter(f => f !== value)
        : [...prev.requirements_flags, value]
      return { ...prev, requirements_flags: flags }
    })
  }

  async function handleSubmit(publishAfter = false) {
    if (submittingRef.current) return
    submittingRef.current = true

    const fieldErrors = validate(fields, publishAfter)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      submittingRef.current = false
      return
    }

    setErrors({})
    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload = buildPayload(fields)
      const created = await createTask(payload)

      if (publishAfter) {
        await publishTask(created.id)
      }

      navigate('/employer', {
        state: {
          flash: publishAfter
            ? `Task "${created.title}" berhasil dipublikasikan.`
            : `Task "${created.title}" disimpan sebagai draft.`,
        },
        replace: true,
      })
    } catch (err) {
      setSubmitError(err.message ?? 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  const inp = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/employer')}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Kembali">←</button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Buat Tugas Baru</h1>
            <p className="text-xs text-slate-500">
              Task akan disimpan sebagai <strong>draft</strong> terlebih dahulu.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(false) }} noValidate
          className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">

          {/* ── Seksi 1: Informasi Dasar ── */}
          <SectionDivider title="Informasi Dasar" />

          {/* Judul */}
          <InputField id="title" label="Judul Task" required error={errors.title}>
            <input id="title" name="title" type="text"
              placeholder="Contoh: Pengemudi harian Surabaya"
              value={fields.title} onChange={handleChange}
              disabled={submitting} maxLength={120} className={inp} />
          </InputField>

          {/* Kategori */}
          <InputField id="category_id" label="Kategori" required error={errors.category_id}>
            {catLoading ? (
              <div className="mt-1 h-10 animate-pulse rounded-xl bg-slate-200" />
            ) : catError ? (
              <p className="mt-1 text-xs text-red-600">{catError}</p>
            ) : (
              <select id="category_id" name="category_id" value={fields.category_id}
                onChange={handleChange} disabled={submitting} className={inp}>
                <option value="">-- Pilih kategori --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </InputField>

          {/* Deskripsi */}
          <InputField id="description" label="Deskripsi"
            hint="Opsional — jelaskan tugas, syarat, dan jadwal kerja." error={errors.description}>
            <textarea id="description" name="description" rows={4}
              placeholder="Jelaskan tugas secara detail…"
              value={fields.description} onChange={handleChange}
              disabled={submitting} maxLength={2000} className={`${inp} resize-y`} />
          </InputField>

          {/* ── Seksi 2: Tipe Kerja & Lokasi ── */}
          <SectionDivider title="Tipe Kerja & Lokasi" />

          {/* Tipe kerja */}
          <InputField id="work_type" label="Tipe Kerja"
            hint="Wajib dipilih sebelum task dapat dipublikasikan." error={errors.work_type}>
            <div className="mt-2 space-y-2">
              {WORK_TYPE_OPTIONS.map(opt => (
                <label key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    fields.work_type === opt.value
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <input type="radio" name="work_type" value={opt.value}
                    checked={fields.work_type === opt.value}
                    onChange={handleChange} disabled={submitting}
                    className="mt-0.5 accent-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </InputField>

          {/* Lokasi */}
          <InputField id="location" label="Lokasi"
            required={fields.work_type === 'on_site' || fields.work_type === 'hybrid'}
            hint={
              fields.work_type === 'remote'
                ? 'Opsional untuk tipe Remote.'
                : fields.work_type === 'on_site' || fields.work_type === 'hybrid'
                  ? 'Wajib untuk tipe kerja ini.'
                  : 'Lokasi fisik tempat kerja.'
            }
            error={errors.location}>
            <input id="location" name="location" type="text"
              placeholder="Contoh: Jakarta Selatan"
              value={fields.location} onChange={handleChange}
              disabled={submitting} maxLength={120} className={inp} />
          </InputField>

          {/* ── Seksi 3: Upah & Pembayaran ── */}
          <SectionDivider title="Upah & Pembayaran" />

          {/* Upah + Satuan upah — satu baris */}
          <div>
            <FieldLabel required>Upah</FieldLabel>
            <div className="mt-1 flex gap-2">
              <div className="flex-1">
                <input id="wage_amount" name="wage_amount" type="number"
                  min={1} step={1} placeholder="Contoh: 150000"
                  value={fields.wage_amount} onChange={handleChange}
                  disabled={submitting}
                  className={`${inp} ${errors.wage_amount ? 'border-red-300' : ''}`} />
              </div>
              <div className="w-44">
                <select id="wage_rate" name="wage_rate" value={fields.wage_rate}
                  onChange={handleChange} disabled={submitting}
                  className={`${inp} ${errors.wage_rate ? 'border-red-300' : ''}`}>
                  <option value="">Satuan…</option>
                  {WAGE_RATE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <FieldError message={errors.wage_amount} />
            <FieldError message={errors.wage_rate} />
          </div>

          {/* Jumlah worker + Metode pembayaran */}
          <div className="grid grid-cols-2 gap-4">
            <InputField id="worker_needed" label="Jumlah Worker" required error={errors.worker_needed}>
              <input id="worker_needed" name="worker_needed" type="number"
                min={1} step={1} value={fields.worker_needed}
                onChange={handleChange} disabled={submitting} className={inp} />
            </InputField>

            <InputField id="payment_method" label="Metode Pembayaran" required error={errors.payment_method}>
              <select id="payment_method" name="payment_method" value={fields.payment_method}
                onChange={handleChange} disabled={submitting} className={inp}>
                <option value="">-- Pilih --</option>
                {PAYMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </InputField>
          </div>

          {/* ── Seksi 4: Jadwal ── */}
          <SectionDivider title="Jadwal" />

          {/* Deadline pendaftaran */}
          <InputField id="application_deadline" label="Batas Akhir Pendaftaran"
            hint="Opsional — Worker tidak bisa melamar setelah tanggal ini."
            error={errors.application_deadline}>
            <input id="application_deadline" name="application_deadline"
              type="datetime-local" value={fields.application_deadline}
              onChange={handleChange} disabled={submitting} className={inp} />
          </InputField>

          {/* Jenis kerja: terjadwal vs proyek */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Jadwal Pelaksanaan
            </p>

            {/* Kerja terjadwal */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">
                Kerja terjadwal — isi tanggal dan jam jika pekerjaan terjadwal tetap:
              </p>
              <div className="grid grid-cols-3 gap-3">
                <InputField id="work_date" label="Tanggal Kerja" error={errors.work_date}>
                  <input id="work_date" name="work_date" type="date"
                    value={fields.work_date} onChange={handleChange}
                    disabled={submitting} className={inp} />
                </InputField>
                <InputField id="work_time_start" label="Jam Mulai" error={errors.work_time_start}>
                  <input id="work_time_start" name="work_time_start" type="time"
                    value={fields.work_time_start} onChange={handleChange}
                    disabled={submitting} className={inp} />
                </InputField>
                <InputField id="work_time_end" label="Jam Selesai" error={errors.work_time_end}>
                  <input id="work_time_end" name="work_time_end" type="time"
                    value={fields.work_time_end} onChange={handleChange}
                    disabled={submitting} className={inp} />
                </InputField>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <div className="flex-1 h-px bg-slate-100" />
              <span>atau</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Kerja berbasis proyek */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">
                Kerja berbasis proyek — isi durasi jika deadline dihitung dari tanggal penugasan:
              </p>
              <InputField id="work_deadline_days" label="Durasi Pengerjaan (hari)"
                hint="1–365 hari kalender setelah worker diterima & ditugaskan."
                error={errors.work_deadline_days}>
                <input id="work_deadline_days" name="work_deadline_days" type="number"
                  min={1} max={365} step={1} placeholder="Contoh: 3"
                  value={fields.work_deadline_days} onChange={handleChange}
                  disabled={submitting} className={inp} />
              </InputField>
            </div>
          </div>

          {/* ── Seksi 5: Persyaratan (opsional) ── */}
          <SectionDivider title="Persyaratan (Opsional)" />

          {/* Keahlian */}
          <InputField id="required_skills" label="Keahlian yang Dibutuhkan"
            hint="Contoh: Microsoft Excel, komunikasi, mengemudi motor."
            error={errors.required_skills}>
            <textarea id="required_skills" name="required_skills" rows={2}
              placeholder="Tuliskan keahlian yang dibutuhkan…"
              value={fields.required_skills} onChange={handleChange}
              disabled={submitting} className={`${inp} resize-y`} />
          </InputField>

          {/* Checklist persyaratan */}
          <div>
            <FieldLabel>Persyaratan Khusus</FieldLabel>
            <p className="mt-0.5 text-xs text-slate-400">
              Centang persyaratan yang berlaku untuk task ini.
            </p>
            <div className="mt-2 space-y-2">
              {REQUIREMENT_FLAG_OPTIONS.map(opt => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" value={opt.value}
                    checked={fields.requirements_flags.includes(opt.value)}
                    onChange={() => handleFlagChange(opt.value)}
                    disabled={submitting}
                    className="h-4 w-4 rounded accent-emerald-600" />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Catatan persyaratan */}
          <InputField id="requirements_note" label="Catatan Persyaratan Tambahan"
            hint="Opsional — penjelasan tambahan tentang persyaratan."
            error={errors.requirements_note}>
            <textarea id="requirements_note" name="requirements_note" rows={2}
              placeholder="Contoh: Bawa KTP dan pas foto saat hari pertama."
              value={fields.requirements_note} onChange={handleChange}
              disabled={submitting} className={`${inp} resize-y`} />
          </InputField>

          {/* Error backend */}
          {submitError && (
            <div role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Tombol aksi */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button type="submit" disabled={submitting || catLoading}
              className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Menyimpan…' : 'Simpan sebagai Draft'}
            </button>
            <button type="button" disabled={submitting || catLoading}
              onClick={() => handleSubmit(true)}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Memproses…' : 'Simpan & Publikasikan'}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            Draft bisa dipublikasikan nanti dari halaman dashboard.
          </p>
        </form>
      </div>
    </main>
  )
}
