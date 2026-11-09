import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, RefreshCw } from 'lucide-react'
import {
  fetchNotifications,
  markNotificationRead,
  fetchPaymentById,
} from '../../lib/api'

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

const ENTITY_LABELS = {
  application: 'Lamaran',
  assignment: 'Penugasan',
  dispute: 'Dispute',
  payment: 'Pembayaran',
}

// Resolve entity_type + entity_id + target_role → route yang valid (admin context)
async function resolveRoute(notification) {
  const { entity_type, entity_id, target_role } = notification
  if (!entity_type || !entity_id || !target_role) return null

  switch (entity_type) {
    case 'assignment':
      if (target_role === 'worker') return `/worker/jobs/${entity_id}`
      if (target_role === 'employer') return `/employer/jobs/${entity_id}`
      return null

    case 'dispute':
      if (target_role === 'admin') return `/admin/disputes/${entity_id}`
      if (target_role === 'employer') return '/employer/jobs'
      if (target_role === 'worker') return '/worker/jobs'
      return null

    case 'application':
      if (target_role === 'employer') return '/employer/applications'
      if (target_role === 'worker') return '/worker'
      return null

    case 'payment':
      if (target_role === 'admin') return `/admin/payments/${entity_id}`
      try {
        const payment = await fetchPaymentById(entity_id)
        if (payment?.assignment_id) {
          return target_role === 'employer'
            ? `/employer/jobs/${payment.assignment_id}`
            : `/worker/jobs/${payment.assignment_id}`
        }
      } catch {
        // Gagal resolve — fallback null
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

// ─── AdminNotificationsPage ─────────────────────────────────────────────────

export default function AdminNotificationsPage() {
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

    // Tandai sudah dibaca jika belum — update state lokal agar instan
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
        // Gagal menandai — tetap lanjut navigasi
      }
    }

    let route = null
    try {
      route = await resolveRoute(notification)
    } catch {
      route = null
    }

    setActingId(null)
    if (route) {
      navigate(route)
    }
  }

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifikasi</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {notifications !== null && notifications.length > 0
              ? `${notifications.length} notifikasi${
                  unreadCount > 0 ? ` · ${unreadCount} belum dibaca` : ''
                }`
              : 'Semua pemberitahuan untukmu ada di sini.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600">
              {unreadCount} baru
            </span>
          )}
          <button
            onClick={load}
            disabled={notifications === null}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={14} className={notifications === null ? 'animate-spin' : ''} />
            {notifications === null ? 'Memuat…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={load}
            className="ml-3 font-semibold underline underline-offset-2 hover:opacity-70"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {notifications === null && !error && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      )}

      {/* Daftar kosong */}
      {notifications !== null && notifications.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <Bell size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-base font-semibold text-slate-700">
            Belum ada notifikasi
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed px-6">
            Notifikasi akan muncul di sini saat ada lamaran, penugasan,
            dispute, atau pembayaran yang berkaitan denganmu.
          </p>
        </div>
      )}

      {/* Daftar notifikasi */}
      {notifications !== null && notifications.length > 0 && (
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

      {notifications !== null && notifications.length > 0 && (
        <p className="pb-4 text-center text-xs text-slate-400">
          Klik notifikasi untuk membuka halaman terkait dan menandainya dibaca.
        </p>
      )}
    </div>
  )
}
