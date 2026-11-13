import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { adminFetchUsers } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getRoleBadges(user) {
  if (user.is_admin) {
    return [{ label: 'Admin', cls: 'bg-purple-100 text-purple-700' }]
  }
  const badges = []
  if (user.worker_profile)   badges.push({ label: 'Worker',   cls: 'bg-blue-100 text-blue-700' })
  if (user.employer_profile) badges.push({ label: 'Employer', cls: 'bg-emerald-100 text-emerald-700' })
  if (badges.length === 0)   badges.push({ label: 'Pengguna', cls: 'bg-slate-100 text-slate-600' })
  return badges
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  )
}

// ─── Komponen filter ───────────────────────────────────────────────────────

function FilterBar({ search, onSearch, roleFilter, onRoleFilter, statusFilter, onStatusFilter }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Pencarian */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Filter role */}
      <select
        value={roleFilter}
        onChange={(e) => onRoleFilter(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
      >
        <option value="">Semua Role</option>
        <option value="admin">Admin</option>
        <option value="worker">Worker</option>
        <option value="employer">Employer</option>
        <option value="user">Pengguna (tanpa profil)</option>
      </select>

      {/* Filter status */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilter(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
      >
        <option value="">Semua Status</option>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
    </div>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter & search
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchUsers()
      setUsers(data ?? [])
    } catch (err) {
      setError(err.message ?? 'Gagal memuat data pengguna.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Reset halaman saat filter berubah
  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter])

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)

    const matchRole =
      !roleFilter ||
      (roleFilter === 'admin'    && u.is_admin) ||
      (roleFilter === 'worker'   && !u.is_admin && Boolean(u.worker_profile)) ||
      (roleFilter === 'employer' && !u.is_admin && Boolean(u.employer_profile)) ||
      (roleFilter === 'user'     && !u.is_admin && !u.worker_profile && !u.employer_profile)

    const matchStatus =
      !statusFilter ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active)

    return matchSearch && matchRole && matchStatus
  })

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengguna</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Kelola seluruh akun terdaftar di Kerjain
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          {loading ? 'Memuat…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadUsers} className="ml-3 font-semibold underline underline-offset-2">
            Coba lagi
          </button>
        </div>
      )}

      {/* Filter bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        roleFilter={roleFilter}
        onRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {/* Ringkasan total */}
      {!loading && (
        <p className="text-sm text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700">{filtered.length}</span> dari{' '}
          <span className="font-semibold text-slate-700">{users.length}</span> pengguna
        </p>
      )}

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nama</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Terdaftar</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {search || roleFilter || statusFilter
                      ? 'Tidak ada pengguna yang sesuai filter.'
                      : 'Belum ada pengguna terdaftar.'}
                  </td>
                </tr>
              ) : (
                paginated.map((user) => {
                  const roles = getRoleBadges(user)
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar initial */}
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {user.full_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <span className="font-medium text-slate-800">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {roles.map((r) => (
                            <span key={r.label} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.cls}`}>
                              {r.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3">
                        {user.is_active ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                            <span className="h-2 w-2 rounded-full bg-red-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            ← Sebelumnya
          </button>
          <span className="text-sm text-slate-500">
            Halaman <span className="font-semibold text-slate-700">{page}</span> dari{' '}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  )
}
