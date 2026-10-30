import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchNotifications,
  markNotificationRead,
  fetchPaymentById,
} from '../lib/api'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelative(isoString) {
  if (!isoString) return null
  const now = Date.now()
  const t = new Date(isoString).getTime()
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Baru saja'
  if (min < 60) return `${min} menit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} hari lalu`
  return formatDate(isoString)
}

// Tentukan peran aktif untuk navigasi berbasis notifikasi.
// Admin > Employer > Worker. Pengguna dengan dua profil default ke Employer
// (keterbatasan: notifikasi worker-side bisa mendarat di rute employer —
//  halaman tujuan menangani "tidak ditemukan" dengan anggun).
function getRole(user, profileStatus) {
  if (user?.is_admin) return 'admin'
  if (profileStatus?.has_employer_profile) return 'employer'
  if (profileStatus?.has_worker_profile) return 'worker'
  return null
}

// Label singkat untuk entity_type — ditampilkan sebagai konteks pada kartu.
const ENTITY_LABELS = {
  application: 'Lamaran',
  assignment: 'Penugasan',
  dispute: 'Dispute',
  payment: 'Pembayaran',
}

// Resolusi entity_type + entity_id → route yang valid di App.jsx.
// Mengembalikan string route, atau null jika tidak dapat ditentukan
// (pemanggil tetap berada di /notifications, tidak membuat URL tidak valid).
//
// Catatan pemetaan:
//  - assignment → detail pekerjaan (worker/employer) langsung pakai entity_id.
//  - dispute (admin) → detail dispute; (employer/worker) tidak ada halaman
//    detail dispute, jadi arahkan ke daftar pekerjaan mereka (rute valid &
//    relevan).
//  - application → employer ke manajemen lamaran; worker ke dashboard
//    (menampilkan lamaran terbaru). Tidak ada rute detail aplikasi tunggal.
//  - payment (admin) → detail pembayaran; (employer/worker) entity_id adalah
//    payment id — perlu resolve payment.assignment_id via API agar bisa ke
//    detail pekerjaan. Gagal resolve → null.
async function resolveRoute(notification, role) {
  const { entity_type, entity_id } = notification
  if (!entity_type || !entity_id) return null

  switch (entity_type) {
    case 'assignment':
      if (role === 'worker') return `/worker/jobs/${entity_id}`
      if (role === 'employer') return `/employer/jobs/${entity_id}`
      return null

    case 'dispute':
      if (role === 'admin') return `/admin/disputes/${entity_id}`
      if (role === 'employer') return '/employer/jobs'
      if (role === 'worker') return '/worker/jobs'
      return null

    case 'application':
      if (role === 'employer') return '/employer/applications'
      if (role === 'worker') return '/worker'
      return null

    case 'payment':
      if (role === 'admin') return `/admin/payments/${entity_id}`
      // Employer/Worker: entity_id adalah payment id — perlu assignment_id.
      try {
        const payment = await fetchPaymentById(entity_id)
        if (payment?.assignment_id) {
          return role === 'employer'
            ? `/employer/jobs/${payment.assignment_id}`
            : `/worker/jobs/${payment.assignment_id}`
        }
      } catch {
        // Gagal resolve — fallback null (tetap di /notifications).
      }
      return null

    default:
      return null
  }
}

// ─── Komponen kecil ─────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

function NotificationItem({ notification, onOpen, acting }) {
  const { title, message, entity_type, is_read, created_at } = notification
  const entityLabel = ENTITY_LABELS[entity_type] ?? null

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      disabled={acting}
      className={[
        'w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200',
        is_read
          ? 'border-slate-200 bg-slate-50/70'
          : 'border-blue-200 bg-white ring-1 ring-blue-100 hover:border-blue-300',
        acting ? 'opacity-60' : 'hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Indikator belum dibaca */}
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            is_read ? 'bg-transparent' : 'bg-blue-500'
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`text-sm leading-snug ${
                is_read
                  ? 'font-medium text-slate-700'
                  : 'font-semibold text-slate-900'
              }`}
            >
              {title}
            </p>
            <span className="shrink-0 text-xs text-slate-400">
              {formatRelative(created_at)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>
          <div className="mt-2 flex items-center gap-2">
            {entityLabel && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {entityLabel}
              </span>
            )}
            {!is_read && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                Baru
              </span>
            )}
            {acting && (
              <span className="text-[11px] text-slate-400">Membuka…</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Halaman ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user, profileStatus } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(null) // null = loading
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)

  async function load() {
    setNotifications(null)
    setError(null)
    try {
      const data = await fetchNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message ?? 'Gagal memuat notifikasi.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleOpen(notification) {
    setActingId(notification.id)

    // Tandai sudah dibaca jika belum — update state lokal agar instan.
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id)
        setNotifications((prev) =>
          prev
            ? prev.map((n) =>
                n.id === notification.id ? { ...n, is_read: true } : n
              )
            : prev
        )
      } catch {
        // Gagal menandai dibaca — tetap lanjut navigasi.
      }
    }

    // Resolve route berdasarkan entity_type + entity_id.
    const role = getRole(user, profileStatus)
    let route = null
    try {
      route = await resolveRoute(notification, role)
    } catch {
      route = null
    }

    setActingId(null)
    if (route) {
      navigate(route)
    }
    // Jika route tidak dapat ditentukan → tetap di /notifications.
  }

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  // Tombol kembali berdasarkan peran.
  const backTo = user?.is_admin
    ? '/admin'
    : profileStatus?.has_employer_profile
      ? '/employer'
      : '/worker'

  // ── Loading ──
  if (notifications === null && !error) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="h-8 w-1/3" />
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      </main>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">
            Gagal memuat notifikasi
          </h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={load}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Coba lagi
            </button>
            <button
              onClick={() => navigate(backTo)}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Kembali
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Navigasi atas */}
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Kembali
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifikasi</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {notifications.length > 0
                ? `${notifications.length} notifikasi${
                    unreadCount > 0 ? ` · ${unreadCount} belum dibaca` : ''
                  }`
                : 'Semua pemberitahuan untukmu ada di sini.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600">
              {unreadCount} baru
            </span>
          )}
        </div>

        {/* Daftar kosong */}
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <p className="text-4xl">🔔</p>
            <h2 className="mt-3 text-base font-semibold text-slate-700">
              Belum ada notifikasi
            </h2>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed px-6">
              Notifikasi akan muncul di sini saat ada lamaran, penugasan,
              dispute, atau pembayaran yang berkaitan denganmu.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={handleOpen}
                acting={actingId === n.id}
              />
            ))}
          </div>
        )}

        <p className="pb-4 text-center text-xs text-slate-400">
          Klik notifikasi untuk membuka halaman terkait dan menandainya dibaca.
        </p>
      </div>
    </main>
  )
}
