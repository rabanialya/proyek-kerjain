import { ClipboardList, CalendarDays, ChevronRight, CircleCheck, CircleX, Clock } from 'lucide-react'

/**
 * WorkerApplicationList
 *
 * Props:
 *  - applications    array
 *  - onViewAll       () => void  (opsional, tampilkan tombol lihat semua)
 */

const STATUS_CONFIG = {
  pending: {
    label: 'Menunggu',
    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    icon: Clock,
    iconColor: 'text-amber-500',
    dot: 'bg-amber-400',
  },
  accepted: {
    label: 'Diterima',
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    icon: CircleCheck,
    iconColor: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Ditolak',
    cls: 'bg-red-50 text-red-600 ring-1 ring-red-100',
    icon: CircleX,
    iconColor: 'text-red-400',
    dot: 'bg-red-400',
  },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
  }
  return (
    <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function ApplicationRow({ app }) {
  const cfg = STATUS_CONFIG[app.status]
  const StatusIcon = cfg?.icon ?? Clock

  const dateLabel = app.applied_at
    ? new Date(app.applied_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50/60">
      {/* Ikon status */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        app.status === 'accepted'
          ? 'bg-emerald-50'
          : app.status === 'rejected'
          ? 'bg-red-50'
          : 'bg-amber-50'
      }`}>
        <StatusIcon size={16} className={cfg?.iconColor ?? 'text-slate-400'} />
      </div>

      {/* Judul + tanggal */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {app.task_title ?? `Lamaran #${String(app.task_id ?? '').slice(0, 8) || '—'}`}
        </p>
        {dateLabel && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <CalendarDays size={11} className="shrink-0" />
            {dateLabel}
          </p>
        )}
      </div>

      {/* Badge status */}
      <StatusBadge status={app.status} />
    </li>
  )
}

export default function WorkerApplicationList({ applications, onViewAll }) {
  if (!applications || applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
          <ClipboardList size={28} className="text-slate-300" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-600">Belum ada lamaran</p>
        <p className="mt-1 text-xs text-slate-400">Lamar pekerjaan dan lacak statusnya di sini.</p>
      </div>
    )
  }

  const displayed = applications.slice(0, 5)
  const remaining = applications.length - displayed.length

  return (
    <div>
      <ul className="space-y-2">
        {displayed.map((app) => (
          <ApplicationRow key={app.id ?? app.task_id} app={app} />
        ))}
      </ul>

      {remaining > 0 && onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          +{remaining} lamaran lainnya
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  )
}
