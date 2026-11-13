import { MapPin, UserRound, Pencil, ArrowLeftRight } from 'lucide-react'
import NotificationBell from '../NotificationBell'

/**
 * WorkerProfileHeader
 *
 * Props:
 *  - workerProfile   object | null
 *  - user            object | null  (dari AuthContext)
 *  - greeting        string         ("Selamat pagi", dll.)
 *  - onViewProfile   () => void
 *  - onEditProfile   () => void
 *  - onSwitchRole    () => void
 */
export default function WorkerProfileHeader({
  workerProfile,
  user,
  greeting,
  onViewProfile,
  onEditProfile,
  onSwitchRole,
}) {
  const displayName = workerProfile?.nickname ?? user?.full_name ?? '—'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      {/* Strip aksen biru di atas */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500" />

      <div className="p-5 sm:p-6">
        {/* Baris utama: avatar + info + tombol aksi kanan */}
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-md select-none sm:h-18 sm:w-18"
              aria-hidden
            >
              {initials || '?'}
            </div>
            {/* Dot status online jika ada status pekerjaan */}
            {workerProfile?.status_pekerjaan && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-slate-100">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            )}
          </div>

          {/* Info profil */}
          <div className="min-w-0 flex-1">
            {/* Sapaan + badge role */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">{greeting},</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-600 ring-1 ring-blue-100">
                Worker
              </span>
              {workerProfile?.status_pekerjaan && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                  {workerProfile.status_pekerjaan}
                </span>
              )}
            </div>

            {/* Nama */}
            <h1 className="mt-0.5 truncate text-lg font-bold leading-tight text-slate-900 sm:text-xl">
              {workerProfile?.nickname
                ? workerProfile.nickname
                : user?.full_name ?? '—'}
            </h1>
            {/* Nama lengkap jika nickname berbeda */}
            {workerProfile?.nickname && user?.full_name && workerProfile.nickname !== user.full_name && (
              <p className="text-xs text-slate-400 truncate">{user.full_name}</p>
            )}

            {/* Lokasi */}
            {workerProfile?.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={12} className="shrink-0 text-slate-400" />
                {workerProfile.location}
              </p>
            )}
          </div>

          {/* Tombol kanan atas: notif + switch role */}
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
            <NotificationBell />
            <button
              onClick={onSwitchRole}
              title="Beralih ke mode Employer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <ArrowLeftRight size={13} />
              <span className="hidden sm:inline">Beralih ke Employer</span>
              <span className="sm:hidden">Employer</span>
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-3">
          {workerProfile?.bio ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
              {workerProfile.bio}
            </p>
          ) : (
            <p className="text-sm italic text-slate-400">
              Belum ada bio — lengkapi profil agar terlihat lebih menarik.
            </p>
          )}
        </div>

        {/* Skill pills */}
        {workerProfile?.skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workerProfile.skills.slice(0, 6).map((skill) => (
              <span
                key={skill}
                className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
              >
                {skill}
              </span>
            ))}
            {workerProfile.skills.length > 6 && (
              <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-400 ring-1 ring-slate-200">
                +{workerProfile.skills.length - 6}
              </span>
            )}
          </div>
        )}

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
