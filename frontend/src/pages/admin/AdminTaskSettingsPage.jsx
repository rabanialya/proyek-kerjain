import { useCallback, useEffect, useRef, useState } from 'react'
import { Folder, FileText, Search, Info } from 'lucide-react'
import {
  adminFetchCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function cls(...classes) {
  return classes.filter(Boolean).join(' ')
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  )
}

// ─── Modal Kategori (Tambah / Edit) ───────────────────────────────────────

function CategoryModal({ isOpen, initial, onClose, onSave }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const nameRef = useRef()

  useEffect(() => {
    if (isOpen) {
      setName(initial?.name ?? '')
      setDescription(initial?.description ?? '')
      setError(null)
      setLoading(false)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [isOpen, initial])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama kategori tidak boleh kosong.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      let result
      if (initial) {
        result = await adminUpdateCategory(initial.id, {
          name: name.trim(),
          description: description.trim() || null,
        })
      } else {
        result = await adminCreateCategory({
          name: name.trim(),
          description: description.trim() || null,
        })
      }
      onSave(result)
    } catch (err) {
      setError(err.message ?? 'Gagal menyimpan kategori.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">
          {initial ? 'Edit Kategori' : 'Tambah Kategori'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nama Kategori <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Contoh: Konstruksi, Kuliner, Teknologi..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Deskripsi singkat tentang kategori ini..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
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
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Konfirmasi Hapus ────────────────────────────────────────────────

function DeleteModal({ category, onConfirm, onCancel, loading }) {
  if (!category) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Hapus Kategori?</h3>
        <p className="mt-2 text-sm text-slate-600">
          Kategori <strong>"{category.name}"</strong> akan dihapus permanen.
          Pastikan tidak ada task yang menggunakan kategori ini.
        </p>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Konfigurasi field form task (read-only reference) ────────────────────

const TASK_FORM_FIELDS = [
  { id: 'title',                label: 'Judul Pekerjaan',           type: 'text',     required: true,  active: true,  notes: 'Maks 120 karakter' },
  { id: 'category_id',         label: 'Kategori',                  type: 'select',   required: true,  active: true,  notes: 'Diisi dari daftar kategori aktif' },
  { id: 'description',         label: 'Deskripsi Pekerjaan',       type: 'textarea', required: false, active: true,  notes: 'Maks 2000 karakter' },
  { id: 'work_type',           label: 'Tipe Kerja',                type: 'radio',    required: false, active: true,  notes: 'on_site / remote / hybrid. Wajib saat publish.' },
  { id: 'location',            label: 'Lokasi',                    type: 'text',     required: false, active: true,  notes: 'Wajib jika tipe kerja on_site atau hybrid' },
  { id: 'worker_needed',       label: 'Jumlah Worker Dibutuhkan',  type: 'number',   required: true,  active: true,  notes: 'Minimal 1' },
  { id: 'wage_amount',         label: 'Nominal Upah',              type: 'number',   required: true,  active: true,  notes: 'Lebih dari 0' },
  { id: 'wage_rate',           label: 'Satuan Upah',               type: 'select',   required: false, active: true,  notes: 'per_proyek / per_hari / per_jam / per_output / bulanan. Wajib saat publish.' },
  { id: 'payment_method',      label: 'Metode Pembayaran',         type: 'select',   required: true,  active: true,  notes: 'transfer / cash / ewallet' },
  { id: 'application_deadline',label: 'Batas Akhir Pendaftaran',   type: 'datetime', required: false, active: true,  notes: 'Harus di masa depan' },
  { id: 'work_date',           label: 'Tanggal Kerja',             type: 'date',     required: false, active: true,  notes: 'Untuk kerja terjadwal' },
  { id: 'work_time_start',     label: 'Jam Mulai',                 type: 'time',     required: false, active: true,  notes: 'Untuk kerja terjadwal' },
  { id: 'work_time_end',       label: 'Jam Selesai',               type: 'time',     required: false, active: true,  notes: 'Harus setelah jam mulai' },
  { id: 'work_deadline_days',  label: 'Durasi Pengerjaan (hari)',  type: 'number',   required: false, active: true,  notes: '1–365 hari, untuk kerja berbasis proyek' },
  { id: 'required_skills',     label: 'Keahlian yang Dibutuhkan',  type: 'textarea', required: false, active: true,  notes: 'Teks bebas' },
  { id: 'requirements_flags',  label: 'Persyaratan Terstruktur',   type: 'checkbox', required: false, active: true,  notes: 'own_vehicle, own_device, local_domicile, minimum_age_18, no_criminal_record' },
  { id: 'requirements_note',   label: 'Catatan Persyaratan',       type: 'textarea', required: false, active: true,  notes: 'Teks bebas opsional' },
]

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function AdminTaskSettingsPage() {
  // ── State kategori ────────────────────────────────────────────────────
  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)
  const [catError, setCatError] = useState(null)
  const [catSearch, setCatSearch] = useState('')

  // ── Modal state ───────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // ── Tab ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('categories') // 'categories' | 'form'

  const loadCategories = useCallback(async () => {
    setCatLoading(true)
    setCatError(null)
    try {
      const data = await adminFetchCategories()
      setCategories(data ?? [])
    } catch (err) {
      setCatError(err.message ?? 'Gagal memuat kategori.')
    } finally {
      setCatLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  function handleSaveCategory(saved) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = saved
        return updated
      }
      return [saved, ...prev]
    })
    setAddOpen(false)
    setEditTarget(null)
  }

  async function handleToggleActive(cat) {
    try {
      const updated = await adminUpdateCategory(cat.id, { is_active: !cat.is_active })
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (err) {
      alert(err.message ?? 'Gagal mengubah status kategori.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await adminDeleteCategory(deleteTarget.id)
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err.message ?? 'Gagal menghapus kategori.')
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredCats = categories.filter((c) =>
    !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase())
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Task</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Kelola kategori pekerjaan dan konfigurasi form pembuatan task
        </p>
      </div>

      {/* Tab */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('categories')}
          className={cls(
            'rounded-lg px-4 py-2 text-sm font-medium transition flex items-center gap-2',
            tab === 'categories'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Folder size={14} /> Kategori
        </button>
        <button
          onClick={() => setTab('form')}
          className={cls(
            'rounded-lg px-4 py-2 text-sm font-medium transition flex items-center gap-2',
            tab === 'form'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <FileText size={14} /> Field Form Task
        </button>
      </div>

      {/* ── TAB KATEGORI ───────────────────────────────────────────────── */}
      {tab === 'categories' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
              <input
                type="text"
                placeholder="Cari kategori..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Tambah Kategori
            </button>
          </div>

          {/* Error hapus */}
          {deleteError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          {/* Error load */}
          {catError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {catError}
              <button onClick={loadCategories} className="ml-3 font-semibold underline">
                Coba lagi
              </button>
            </div>
          )}

          {/* Tabel */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Nama</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Deskripsi</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredCats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400">
                        {catSearch ? 'Tidak ada kategori yang sesuai.' : 'Belum ada kategori.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCats.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs">
                          {cat.description ?? <span className="italic text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {cat.is_active ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                              <span className="h-2 w-2 rounded-full bg-slate-300" />
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditTarget(cat)}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(cat)}
                              className={cls(
                                'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                                cat.is_active
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-green-600 hover:bg-green-50'
                              )}
                            >
                              {cat.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              onClick={() => { setDeleteError(null); setDeleteTarget(cat) }}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ringkasan */}
          {!catLoading && (
            <p className="text-xs text-slate-400">
              {categories.filter((c) => c.is_active).length} aktif ·{' '}
              {categories.filter((c) => !c.is_active).length} nonaktif ·{' '}
              {categories.length} total
            </p>
          )}
        </div>
      )}

      {/* ── TAB FIELD FORM TASK ─────────────────────────────────────────── */}
      {tab === 'form' && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Tentang Konfigurasi Field</p>
                <p className="mt-1 text-xs text-blue-700 leading-relaxed">
                  Field-field di bawah ini adalah struktur tetap form pembuatan task yang digunakan
                  Employer. Strukturnya mengikuti model Task di database. Informasi ini ditampilkan
                  sebagai referensi untuk Admin mengetahui field apa saja yang ada dan ketentuan validasinya.
                </p>
              </div>
            </div>
          </div>

          {/* Tabel field */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Label</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipe Input</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Wajib</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Catatan Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TASK_FORM_FIELDS.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{f.label}</span>
                        <span className="ml-2 font-mono text-[10px] text-slate-400">{f.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                          {f.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {f.required ? (
                          <span className="text-xs font-semibold text-red-500">Wajib</span>
                        ) : (
                          <span className="text-xs text-slate-400">Opsional</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Aktif
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{f.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {TASK_FORM_FIELDS.filter((f) => f.required).length} field wajib ·{' '}
            {TASK_FORM_FIELDS.filter((f) => !f.required).length} field opsional ·{' '}
            {TASK_FORM_FIELDS.length} total field
          </p>
        </div>
      )}

      {/* Modal Tambah/Edit */}
      <CategoryModal
        isOpen={addOpen || Boolean(editTarget)}
        initial={editTarget}
        onClose={() => { setAddOpen(false); setEditTarget(null) }}
        onSave={handleSaveCategory}
      />

      {/* Modal Hapus */}
      <DeleteModal
        category={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  )
}
