import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ─── Konfigurasi navigasi sidebar ─────────────────────────────────────────

const NAV_ITEMS = [
  {
    to: '/admin',
    end: true,
    icon: '🏠',
    label: 'Dashboard',
  },
  {
    to: '/admin/payments',
    icon: '💳',
    label: 'Pembayaran',
  },
  {
    to: '/admin/disputes',
    icon: '⚖️',
    label: 'Dispute',
  },
  {
    to: '/admin/activity-logs',
    icon: '📋',
    label: 'Activity Log',
  },
]

// Navigasi yang belum diimplementasi — tampilkan sebagai disabled
const NAV_COMING_SOON = [
  { icon: '👥', label: 'Pengguna' },
  { icon: '📁', label: 'Kategori' },
  { icon: '📝', label: 'Task' },
  { icon: '🚨', label: 'Laporan' },
]

// ─── Komponen sidebar item ─────────────────────────────────────────────────

function SidebarLink({ to, end, icon, label, onClick }) {
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
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

function SidebarDisabled({ icon, label }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 cursor-not-allowed select-none">
      <span className="text-base leading-none opacity-50">{icon}</span>
      <span className="opacity-50">{label}</span>
      <span className="ml-auto rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
        soon
      </span>
    </div>
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
            ✕
          </button>
        )}
      </div>

      {/* Navigasi */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} onClick={onClose} />
        ))}

        {NAV_COMING_SOON.length > 0 && (
          <>
            <div className="my-3 border-t border-slate-700" />
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
              Segera Hadir
            </p>
            {NAV_COMING_SOON.map((item) => (
              <SidebarDisabled key={item.label} {...item} />
            ))}
          </>
        )}
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
          className="w-full rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-red-600 hover:text-white"
        >
          Keluar
        </button>
      </div>
    </aside>
  )
}

// ─── AdminLayout ───────────────────────────────────────────────────────────

/**
 * Layout wrapper untuk semua halaman Admin.
 * Menggunakan sidebar tetap di desktop, drawer overlay di mobile.
 */
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
            ☰
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
