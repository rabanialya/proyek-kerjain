import { MapPin, Pencil, ArrowLeftRight, Building2, BadgeCheck, UserRound } from 'lucide-react'
import NotificationBell from '../NotificationBell'

/**
 * EmployerProfileHeader
 *
 * Props:
 *  - employerProfile   object | null
 *  - user              object | null  (dari AuthContext)
 *  - greeting          string         ("Selamat pagi", dll.)
 *  - onViewProfile     () => void
 *  - onEditProfile     () => void
 *  - onSwitchRole      () => void
 */
export default function EmployerProfileHeader({
  employerProfile,
  user,
  greeting,
  onViewProfile,
  onEditProfile,
  onSwitchRole,
}) {
  const displayName =
    employerProfile?.display_name ?? employerProfile?.company_name ?? user?.full_name ?? '—'

  // Inisial dari dua kata pertama (sama persis dengan WorkerProfileHeader)
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      {/* Strip aksen biru — identik dengan Worker Dashboard */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500" />

      <div className="p-5 sm:p-6">
        {/* Baris utama: avatar + info + tombol aksi kanan */}
        <div className="flex gap-4">
          {/* Avatar inisial */}
          <div className="relative shrink-0">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-md select-none"
              aria-hidden
            >
              {initials || '?'}
            </div>
            {/* Dot verifikasi */}
            {employerProfile?.is_verified && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-100">
                <BadgeCheck size={13} className="text-blue-500" />
              </span>
            )}
          </div>

          {/* Info profil */}
          <div className="min-w-0 flex-1">
            {/* Sapaan + badge role */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">{greeting},</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-600 ring-1 ring-blue-100">
                Employer
              </span>
              {employerProfile?.tipe_employer && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 ring-1 ring-indigo-100">
                  {employerProfile.tipe_employer}
                </span>
              )}
              {employerProfile?.is_verified && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                  <BadgeCheck size={10} />
                  Terverifikasi
                </span>
              )}
            </div>

            {/* Nama */}
            <h1 className="mt-0.5 truncate text-lg font-bold leading-tight text-slate-900 sm:text-xl">
              {displayName}
            </h1>

            {/* Sektor / industri */}
            {employerProfile?.sektor && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Building2 size={11} className="shrink-0 text-slate-400" />
                {employerProfile.sektor}
              </p>
            )}

            {/* Lokasi */}
            {employerProfile?.location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={11} className="shrink-0 text-slate-400" />
                {employerProfile.location}
              </p>
            )}
          </div>

          {/* Tombol kanan atas: notif + switch role */}
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
            <NotificationBell />
            <button
              onClick={onSwitchRole}
              title="Beralih ke mode Worker"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeftRight size={13} />
              <span className="hidden sm:inline">Beralih ke Worker</span>
              <span className="sm:hidden">Worker</span>
            </button>
          </div>
        </div>

        {/* Tagline / deskripsi */}
        <div className="mt-3">
          {employerProfile?.tagline ? (
            <p className="text-sm font-medium italic leading-relaxed text-slate-600">
              &ldquo;{employerProfile.tagline}&rdquo;
            </p>
          ) : employerProfile?.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
              {employerProfile.description}
            </p>
          ) : (
            <p className="text-sm italic text-slate-400">
              Belum ada deskripsi — lengkapi profil agar lebih menarik bagi Worker.
            </p>
          )}
        </div>

        {/* Tombol aksi bawah */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={onViewProfile}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            <UserRound size={14} />
            Lihat Profil
          </button>
          <button
            onClick={onEditProfile}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <Pencil size={14} />
            Edit Profil
          </button>
        </div>
      </div>
    </section>
  )
}
