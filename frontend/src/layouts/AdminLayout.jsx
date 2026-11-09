import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Scale,
  Flag,
  Settings2,
  ClipboardList,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'

// ─── Konfigurasi navigasi sidebar ─────────────────────────────────────────
//
// Susunan menu:
//   OPERASIONAL    : Dashboard, Pengguna, Pembayaran, Dispute, Laporan
//   PENGELOLAAN    : Pengaturan Task
//   SISTEM         : Activity Log, Notifikasi
//
// ──────────────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Operasional',
    items: [
      { to: '/admin',          end: true, icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/users',               icon: Users,           label: 'Pengguna' },
      { to: '/admin/payments',            icon: CreditCard,      label: 'Pembayaran' },
      { to: '/admin/disputes',            icon: Scale,           label: 'Dispute' },
      { to: '/admin/reports',             icon: Flag,            label: 'Laporan' },
    ],
  },
  {
    label: 'Pengelolaan Platform',
    items: [
      { to: '/admin/task-settings', icon: Settings2, label: 'Pengaturan Task' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/admin/activity-logs', icon: ClipboardList, label: 'Activity Log' },
    ],
  },
]

// ─── Komponen sidebar item ─────────────────────────────────────────────────

function SidebarLink({ to, end, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`
      }
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

// ─── Notifikasi (sidebar) ───────────────────────────────────────────────────

function SidebarNotificationLink({ onClose }) {
  const { unreadCount } = useUnreadNotifications()
  return (
    <NavLink
      to="/admin/notifications"
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`
      }
    >
      <Bell size={16} className="shrink-0" />
      <span>Notifikasi</span>
      {unreadCount > 0 && (
        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </NavLink>
  )
}

// ─── Sidebar utama ─────────────────────────────────────────────────────────

function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-800">
      {/* Logo / brand */}
      <div className="flex items-center justify-between px-5 py-5">
        <Link
          to="/admin"
          className="text-lg font-bold tracking-tight text-white hover:opacity-80"
          onClick={onClose}
        >
          Kerjain
          <span className="ml-2 rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
            ADMIN
          </span>
        </Link>
        {/* Tombol tutup — hanya tampil di mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigasi */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.to} {...item} onClick={onClose} />
              ))}

              {/* Notifikasi masuk di grup Sistem */}
              {group.label === 'Sistem' && (
                <SidebarNotificationLink onClose={onClose} />
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Info admin + logout */}
      <div className="border-t border-slate-700 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {user?.full_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {user?.full_name ?? 'Admin'}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-red-600 hover:text-white flex items-center justify-center gap-2"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </aside>
  )
}

// ─── AdminLayout ───────────────────────────────────────────────────────────

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar desktop — selalu terlihat */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="h-screen w-64 overflow-y-auto sticky top-0">
          <Sidebar />
        </div>
      </div>

      {/* Overlay drawer mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Drawer */}
          <div
            className="relative z-50 flex h-full w-64 flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Konten utama */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar mobile */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-slate-700">
            Admin Kerjain
          </span>
        </header>

        {/* Area halaman */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
