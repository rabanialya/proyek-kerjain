import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTaskList } from '../hooks/useTaskList'

// ─── Komponen kecil ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm">
      <div className="h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
      <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
    </div>
  )
}

function TaskCard({ task, categoryName, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 leading-snug">
          {task.title}
        </h3>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          Published
        </span>
      </div>

      {categoryName && (
        <p className="mt-1 text-xs font-medium text-slate-400">{categoryName}</p>
      )}

      <p className="mt-1 text-sm text-slate-500">📍 {task.location}</p>

      {task.description && (
        <p className="mt-2 text-sm text-slate-500 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm font-bold text-slate-800">
          Rp {Number(task.wage_amount).toLocaleString('id-ID')}
        </p>
        <span className="text-xs text-slate-400">· {task.payment_method}</span>
        <span className="text-xs text-slate-400">
          · {task.worker_needed} pekerja dibutuhkan
        </span>
      </div>
    </button>
  )
}

function FilterBadge({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
      {label}
      <button
        onClick={onRemove}
        className="text-blue-500 hover:text-blue-800"
        aria-label={`Hapus filter ${label}`}
      >
        ✕
      </button>
    </span>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function TaskListPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const {
    tasks,
    totalUnfiltered,
    categories,
    categoryMap,
    uniqueLocations,
    loading,
    error,
    reload,
    query,
    setQuery,
    locationFilter,
    setLocationFilter,
    categoryId,
    setCategoryId,
    hasActiveFilter,
    resetFilters,
  } = useTaskList()

  // ── Error state ──
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">
            Gagal memuat tugas
          </h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={reload}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Coba lagi
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* ── Navigasi atas ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/worker')}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Kembali ke Dashboard
          </button>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-slate-600 hover:underline underline-offset-2"
          >
            Keluar
          </button>
        </div>

        {/* ── Header ── */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔨</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Worker
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Cari Tugas
          </h1>
          {!loading && (
            <p className="mt-0.5 text-sm text-slate-500">
              {totalUnfiltered} tugas tersedia
            </p>
          )}
        </div>

        {/* ── Search bar ── */}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul atau deskripsi tugas..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {/* ── Filter baris ── */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Filter lokasi */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Semua lokasi</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {/* Filter kategori */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Semua kategori</option>
            {categories
              .filter((c) => c.is_active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        {/* ── Badge filter aktif ── */}
        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-2">
            {query.trim() && (
              <FilterBadge
                label={`"${query.trim()}"`}
                onRemove={() => setQuery('')}
              />
            )}
            {locationFilter && (
              <FilterBadge
                label={locationFilter}
                onRemove={() => setLocationFilter('')}
              />
            )}
            {categoryId && (
              <FilterBadge
                label={categoryMap[categoryId] ?? 'Kategori'}
                onRemove={() => setCategoryId('')}
              />
            )}
            <button
              onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2"
            >
              Hapus semua filter
            </button>
          </div>
        )}

        {/* ── Daftar tugas ── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
            <p className="text-3xl">📋</p>
            <p className="mt-2 font-medium text-slate-700">
              {hasActiveFilter
                ? 'Tidak ada tugas yang sesuai filter'
                : 'Belum ada tugas yang tersedia'}
            </p>
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Hapus filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                categoryName={categoryMap[task.category_id]}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))}
            <p className="pt-1 text-center text-xs text-slate-400">
              Menampilkan {tasks.length}
              {hasActiveFilter && ` dari ${totalUnfiltered}`} tugas
            </p>
          </div>
        )}

        {/* ── Catatan keterbatasan ── */}
        <p className="pb-4 text-center text-xs text-slate-300">
          Pencarian dan filter dilakukan secara lokal.
          Backend belum mendukung server-side search.
        </p>

      </div>
    </main>
  )
}
