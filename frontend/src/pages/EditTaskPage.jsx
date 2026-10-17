import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchCategories, fetchMyTaskById, updateTask } from '../lib/api'

// ─── Komponen kecil (sama pola dengan CreateTaskPage) ─────────────────────

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

function InputField({ id, label, error, required, hint, children }) {
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

function SkeletonBlock({ className }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  )
}

// ─── Konstanta ─────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash', label: 'Tunai (Cash)' },
  { value: 'ewallet', label: 'E-Wallet' },
]

// ─── Validasi frontend (sama aturan dengan CreateTaskPage) ─────────────────

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

export default function EditTaskPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()

  // ── State loading data awal ──
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(null)

  // ── State form ──
  const [fields, setFields] = useState(null)   // null = belum diisi
  const [errors, setErrors] = useState({})
  const [taskStatus, setTaskStatus] = useState(null)  // untuk info status

  // ── Kategori ──
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(null)

  // ── Submit ──
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Cegah submit ganda
  const submittingRef = useRef(false)

  // ── Ambil data task + kategori saat mount ──
  useEffect(() => {
    let active = true

    async function load() {
      setPageLoading(true)
      setPageError(null)

      try {
        const [task, cats] = await Promise.all([
          fetchMyTaskById(taskId),
          fetchCategories(),
        ])

        if (!active) return

        // Task closed tidak bisa diedit — tampilkan pesan
        if (task.status === 'closed') {
          setPageError('Task yang sudah ditutup tidak dapat diedit.')
          return
        }

        // Isi form dengan data existing
        setFields({
          title: task.title,
          category_id: task.category_id,
          description: task.description ?? '',
          location: task.location,
          worker_needed: task.worker_needed,
          wage_amount: String(task.wage_amount),
          payment_method: task.payment_method,
        })
        setTaskStatus(task.status)

        // Hanya kategori aktif, tapi pastikan kategori task saat ini tetap muncul
        // (meskipun kategorinya sedang tidak aktif) agar data tidak hilang
        const activeCats = (cats ?? []).filter((c) => c.is_active)
        const currentCatIncluded = activeCats.some((c) => c.id === task.category_id)
        if (!currentCatIncluded) {
          const currentCat = (cats ?? []).find((c) => c.id === task.category_id)
          if (currentCat) activeCats.unshift(currentCat)
        }
        setCategories(activeCats)
      } catch (err) {
        if (!active) return
        setPageError(err.message ?? 'Gagal memuat data task.')
      } finally {
        if (active) {
          setPageLoading(false)
          setCategoriesLoading(false)
        }
      }
    }

    load()
    return () => { active = false }
  }, [taskId])

  // ── Handler perubahan field ──
  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  // ── Submit update ──
  async function handleSubmit(e) {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true

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

      const updated = await updateTask(taskId, payload)

      navigate('/employer', {
        state: {
          flash: `Task "${updated.title}" berhasil diperbarui.`,
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

  // ─── Render: Loading ───────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-xl space-y-5">
          <SkeletonBlock className="h-12" />
          <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            {[...Array(6)].map((_, i) => (
              <SkeletonBlock key={i} className="h-12" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  // ─── Render: Error (task tidak ditemukan / akses ditolak / task closed) ─

  if (pageError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">
            Tidak dapat mengedit task
          </h2>
          <p className="mt-2 text-sm text-slate-500">{pageError}</p>
          <button
            onClick={() => navigate('/employer')}
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    )
  }

  // ─── Render: Form ──────────────────────────────────────────────────────

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
            aria-label="Kembali ke dashboard"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Edit Tugas</h1>
            <p className="text-xs text-slate-500">
              Perubahan disimpan ke task dengan status{' '}
              <strong className={taskStatus === 'published' ? 'text-emerald-700' : 'text-slate-700'}>
                {taskStatus === 'published' ? 'Published' : 'Draft'}
              </strong>
              .
            </p>
          </div>
        </div>

        {/* ── Info task published ── */}
        {taskStatus === 'published' && (
          <div
            role="note"
            className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            ℹ️ Task ini sudah dipublikasikan. Perubahan akan langsung terlihat oleh Worker.
          </div>
        )}

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit}
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
                    {!c.is_active ? ' (tidak aktif)' : ''}
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

          {/* Error dari backend */}
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
            <button
              type="button"
              onClick={() => navigate('/employer')}
              disabled={submitting}
              className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || categoriesLoading}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>

      </div>
    </main>
  )
}
