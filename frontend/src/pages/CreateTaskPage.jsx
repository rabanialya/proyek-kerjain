import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTask, fetchCategories, publishTask } from '../lib/api'

// ─── Komponen kecil ────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-slate-700"
    >
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function InputField({
  id,
  label,
  error,
  required,
  hint,
  children,
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      <div className="mt-1">{children}</div>
      <FieldError message={error} />
    </div>
  )
}

// ─── Nilai default form ────────────────────────────────────────────────────

const INITIAL = {
  title: '',
  category_id: '',
  description: '',
  location: '',
  worker_needed: 1,
  wage_amount: '',
  payment_method: '',
}

const PAYMENT_OPTIONS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash', label: 'Tunai (Cash)' },
  { value: 'ewallet', label: 'E-Wallet' },
]

// ─── Validasi frontend ─────────────────────────────────────────────────────

function validate(fields) {
  const errors = {}

  if (!fields.title.trim()) {
    errors.title = 'Judul task wajib diisi.'
  } else if (fields.title.trim().length < 3) {
    errors.title = 'Judul minimal 3 karakter.'
  }

  if (!fields.category_id) {
    errors.category_id = 'Pilih kategori task.'
  }

  if (!fields.location.trim()) {
    errors.location = 'Lokasi wajib diisi.'
  }

  const workerNeeded = Number(fields.worker_needed)
  if (!Number.isInteger(workerNeeded) || workerNeeded < 1) {
    errors.worker_needed = 'Minimal 1 worker dibutuhkan.'
  }

  const wage = Number(fields.wage_amount)
  if (!fields.wage_amount || isNaN(wage) || wage <= 0) {
    errors.wage_amount = 'Upah harus lebih dari 0.'
  }

  if (!fields.payment_method) {
    errors.payment_method = 'Pilih metode pembayaran.'
  }

  return errors
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function CreateTaskPage() {
  const navigate = useNavigate()

  // State form
  const [fields, setFields] = useState(INITIAL)
  const [errors, setErrors] = useState({})

  // Data kategori
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(null)

  // State submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Cegah submit ganda
  const submittingRef = useRef(false)

  // Ambil kategori saat mount
  useEffect(() => {
    let active = true
    setCategoriesLoading(true)
    setCategoriesError(null)

    fetchCategories()
      .then((data) => {
        if (!active) return
        // Hanya tampilkan kategori yang aktif
        setCategories((data ?? []).filter((c) => c.is_active))
      })
      .catch((err) => {
        if (!active) return
        setCategoriesError(err.message ?? 'Gagal memuat kategori.')
      })
      .finally(() => {
        if (active) setCategoriesLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Handler perubahan field
  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    // Hapus error field ini saat diubah
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  // Submit dengan pilihan: simpan sebagai draft atau langsung publish
  async function handleSubmit(publishAfter = false) {
    // Cegah submit ganda
    if (submittingRef.current) return
    submittingRef.current = true

    // Validasi frontend
    const fieldErrors = validate(fields)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      submittingRef.current = false
      return
    }

    setErrors({})
    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        category_id: fields.category_id,
        title: fields.title.trim(),
        description: fields.description.trim() || null,
        location: fields.location.trim(),
        worker_needed: Number(fields.worker_needed),
        wage_amount: Number(fields.wage_amount),
        payment_method: fields.payment_method,
      }

      // 1. Buat task (status: draft)
      const created = await createTask(payload)

      // 2. Jika user memilih publish, panggil endpoint publish
      if (publishAfter) {
        await publishTask(created.id)
      }

      // 3. Arahkan ke Employer Dashboard
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

  // ── Render ──

  const inputCls =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employer')}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Kembali"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Buat Tugas Baru</h1>
            <p className="text-xs text-slate-500">
              Task akan disimpan sebagai <strong>draft</strong> terlebih dahulu.
            </p>
          </div>
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(false)
          }}
          noValidate
          className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
        >
          {/* Judul */}
          <InputField
            id="title"
            label="Judul Task"
            required
            error={errors.title}
          >
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Contoh: Pengemudi Grab harian Surabaya"
              value={fields.title}
              onChange={handleChange}
              disabled={submitting}
              maxLength={120}
              className={inputCls}
            />
          </InputField>

          {/* Kategori */}
          <InputField
            id="category_id"
            label="Kategori"
            required
            error={errors.category_id}
          >
            {categoriesLoading ? (
              <div className="mt-1 h-10 w-full animate-pulse rounded-xl bg-slate-200" />
            ) : categoriesError ? (
              <p className="mt-1 text-xs text-red-600">{categoriesError}</p>
            ) : (
              <select
                id="category_id"
                name="category_id"
                value={fields.category_id}
                onChange={handleChange}
                disabled={submitting}
                className={inputCls}
              >
                <option value="">-- Pilih kategori --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </InputField>

          {/* Deskripsi */}
          <InputField
            id="description"
            label="Deskripsi"
            hint="Opsional — jelaskan tugas, syarat, dan jadwal kerja."
            error={errors.description}
          >
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Jelaskan tugas secara detail…"
              value={fields.description}
              onChange={handleChange}
              disabled={submitting}
              maxLength={2000}
              className={`${inputCls} resize-y`}
            />
          </InputField>

          {/* Lokasi */}
          <InputField
            id="location"
            label="Lokasi"
            required
            error={errors.location}
          >
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Contoh: Jakarta Selatan"
              value={fields.location}
              onChange={handleChange}
              disabled={submitting}
              maxLength={120}
              className={inputCls}
            />
          </InputField>

          {/* Worker dibutuhkan + Upah — dua kolom */}
          <div className="grid grid-cols-2 gap-4">
            <InputField
              id="worker_needed"
              label="Jumlah Worker"
              required
              error={errors.worker_needed}
            >
              <input
                id="worker_needed"
                name="worker_needed"
                type="number"
                min={1}
                step={1}
                value={fields.worker_needed}
                onChange={handleChange}
                disabled={submitting}
                className={inputCls}
              />
            </InputField>

            <InputField
              id="wage_amount"
              label="Upah (Rp)"
              required
              error={errors.wage_amount}
            >
              <input
                id="wage_amount"
                name="wage_amount"
                type="number"
                min={1}
                step={1}
                placeholder="Contoh: 150000"
                value={fields.wage_amount}
                onChange={handleChange}
                disabled={submitting}
                className={inputCls}
              />
            </InputField>
          </div>

          {/* Metode pembayaran */}
          <InputField
            id="payment_method"
            label="Metode Pembayaran"
            required
            error={errors.payment_method}
          >
            <select
              id="payment_method"
              name="payment_method"
              value={fields.payment_method}
              onChange={handleChange}
              disabled={submitting}
              className={inputCls}
            >
              <option value="">-- Pilih metode --</option>
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </InputField>

          {/* Error submit dari backend */}
          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </div>
          )}

          {/* Tombol aksi */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            {/* Simpan sebagai draft */}
            <button
              type="submit"
              disabled={submitting || categoriesLoading}
              className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Menyimpan…' : 'Simpan sebagai Draft'}
            </button>

            {/* Simpan dan publish */}
            <button
              type="button"
              disabled={submitting || categoriesLoading}
              onClick={() => handleSubmit(true)}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
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
