import { useNavigate } from 'react-router-dom'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'

// Tombol lonceng notifikasi dengan indikator jumlah belum dibaca.
// Ditempatkan di navigasi dashboard Worker & Employer. Klik → /notifications.
//
// Badge unread selalu merah agar menonjol terlepas dari warna dashboard.
export default function NotificationBell({ className = '' }) {
  const navigate = useNavigate()
  const { unreadCount, loading } = useUnreadNotifications()

  return (
    <button
      type="button"
      onClick={() => navigate('/notifications')}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} notifikasi belum dibaca`
          : 'Notifikasi'
      }
      className={`relative inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 ${className}`}
    >
      <span className="text-base leading-none" aria-hidden>🔔</span>
      {!loading && unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
