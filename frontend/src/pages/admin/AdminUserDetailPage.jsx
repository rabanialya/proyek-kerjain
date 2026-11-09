import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminFetchUserDetail, adminUpdateUserStatus } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso, withTime = false) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  })
}

function parseJsonList(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ─── Sub-komponen ──────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-44 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 break-all">{value ?? '—'}</span>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 space-y-1">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function TagList({ items, emptyLabel = '—' }) {
  if (!items || items.length === 0) return <span className="text-sm text-slate-400">{emptyLabel}</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

// ─── Modal Konfirmasi ─────────────────────────────────────────────────────

function ConfirmModal({ isOpen, targetActive, onConfirm, onCancel, loading }) {
  if (!isOpen) return null

  const action = targetActive ? 'mengaktifkan' : 'menonaktifkan'
  const actionLabel = targetActive ? 'Aktifkan' : 'Nonaktifkan'
  const colorCls = targetActive
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-red-600 hover:bg-red-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Konfirmasi Perubahan</h3>
        <p className="mt-2 text-sm text-slate-600">
          Anda akan <strong>{action}</strong> akun pengguna ini. Apakah Anda yakin?
        </p>
        {!targetActive && (
          <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            Akun yang dinonaktifkan tidak dapat melakukan aktivitas yang membutuhkan autentikasi.
          </p>
        )}
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
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${colorCls}`}
          >
            {loading ? 'Memproses…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // State modal & aksi status
  const [modalOpen, setModalOpen] = useState(false)
  const [targetActive, setTargetActive] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  const loadUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchUserDetail(userId)
      setUser(data)
    } catch (err) {
      setError(err.message ?? 'Gagal memuat data pengguna.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  function openModal(activate) {
    setTargetActive(activate)
    setActionError(null)
    setActionSuccess(null)
    setModalOpen(true)
  }

  async function handleStatusChange() {
    setActionLoading(true)
    setActionError(null)
    try {
      await adminUpdateUserStatus(userId, targetActive)
      setUser((prev) => ({ ...prev, is_active: targetActive }))
      setActionSuccess(
        targetActive
          ? 'Akun berhasil diaktifkan.'
          : 'Akun berhasil dinonaktifkan.'
      )
      setModalOpen(false)
    } catch (err) {
      setActionError(err.message ?? 'Gagal mengubah status akun.')
      setModalOpen(false)
    } finally {
      setActionLoading(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-slate-200" />
        <div className="h-40 rounded-2xl bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadUser} className="ml-3 font-semibold underline underline-offset-2">
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  if (!user) return null

  const hasWorker = Boolean(user.worker_profile)
  const hasEmployer = Boolean(user.employer_profile)
  const workerSkills = parseJsonList(user.worker_profile?.skills)
  const workerShift = parseJsonList(user.worker_profile?.preferensi_shift)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Navigasi balik */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition"
      >
        ← Kembali ke Daftar Pengguna
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">
            {user.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{user.full_name}</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        {/* Badge status */}
        <div className="flex items-center gap-3">
          {user.is_admin && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              Admin
            </span>
          )}
          {user.is_active ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Aktif
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              Nonaktif
            </span>
          )}
        </div>
      </div>

      {/* Pesan sukses/error aksi */}
      {actionSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Info akun */}
      <SectionCard title="Informasi Akun">
        <InfoRow label="ID Pengguna" value={user.id} />
        <InfoRow label="Nama Lengkap" value={user.full_name} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Nomor Telepon" value={user.phone} />
        <InfoRow label="Role" value={user.is_admin ? 'Admin' : 'Pengguna'} />
        <InfoRow label="Tanggal Daftar" value={formatDate(user.created_at, true)} />
        <InfoRow label="Terakhir Diperbarui" value={formatDate(user.updated_at, true)} />
        <InfoRow label="Status Akun" value={user.is_active ? 'Aktif' : 'Nonaktif'} />
      </SectionCard>

      {/* Profil Worker */}
      {hasWorker && (
        <SectionCard title="Profil Worker">
          <InfoRow label="Nama Panggilan" value={user.worker_profile.nickname} />
          <InfoRow label="Lokasi" value={user.worker_profile.location} />
          <InfoRow label="Bio" value={user.worker_profile.bio} />
          <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:gap-4">
            <span className="w-44 shrink-0 text-sm text-slate-500">Keahlian</span>
            <TagList items={workerSkills} emptyLabel="Belum diisi" />
          </div>
          <InfoRow label="Status Pekerjaan" value={user.worker_profile.status_pekerjaan} />
          <InfoRow label="Komitmen Jam" value={user.worker_profile.komitmen_jam} />
          <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:gap-4">
            <span className="w-44 shrink-0 text-sm text-slate-500">Preferensi Shift</span>
            <TagList items={workerShift} emptyLabel="Belum diisi" />
          </div>
          <InfoRow label="Rating Rata-rata" value={`${user.worker_profile.rating_avg.toFixed(1)} / 5.0`} />
          <InfoRow label="Profil Dibuat" value={formatDate(user.worker_profile.created_at)} />
        </SectionCard>
      )}

      {/* Profil Employer */}
      {hasEmployer && (
        <SectionCard title="Profil Employer">
          <InfoRow label="Nama Tampilan" value={user.employer_profile.display_name} />
          <InfoRow label="Tipe Employer" value={user.employer_profile.tipe_employer} />
          <InfoRow label="Sektor" value={user.employer_profile.sektor} />
          <InfoRow label="Lokasi" value={user.employer_profile.location} />
          <InfoRow
            label="Status Verifikasi"
            value={user.employer_profile.is_verified ? 'Terverifikasi' : 'Belum terverifikasi'}
          />
          <InfoRow label="Rating Rata-rata" value={`${user.employer_profile.rating_avg.toFixed(1)} / 5.0`} />
          <InfoRow label="Profil Dibuat" value={formatDate(user.employer_profile.created_at)} />
        </SectionCard>
      )}

      {/* Tidak punya profil */}
      {!hasWorker && !hasEmployer && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
          Pengguna ini belum memiliki profil Worker maupun Employer.
        </div>
      )}

      {/* Pengelolaan status akun */}
      {!user.is_admin && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Pengelolaan Status
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Ubah status akun pengguna ini. Akun yang dinonaktifkan tidak dapat login.
          </p>
          <div className="flex gap-3">
            {user.is_active ? (
              <button
                onClick={() => openModal(false)}
                disabled={actionLoading}
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                Nonaktifkan Akun
              </button>
            ) : (
              <button
                onClick={() => openModal(true)}
                disabled={actionLoading}
                className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
              >
                Aktifkan Kembali
              </button>
            )}
          </div>
        </div>
      )}

      {/* Jika Admin — tidak bisa diubah */}
      {user.is_admin && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-500">
          Akun Admin tidak dapat dinonaktifkan melalui panel ini.
        </div>
      )}

      {/* Modal konfirmasi */}
      <ConfirmModal
        isOpen={modalOpen}
        targetActive={targetActive}
        onConfirm={handleStatusChange}
        onCancel={() => setModalOpen(false)}
        loading={actionLoading}
      />
    </div>
  )
}
