import { BriefcaseBusiness, User, ChevronRight, Search } from 'lucide-react'

/**
 * EmployerActiveJobs
 *
 * Props:
 *  - activeJobs    array   — dari useDashboardEmployer (filtered ke aktif)
 *  - onViewAll     () => void
 *  - onJobClick    (job) => void
 *  - onFindApps    () => void  — CTA saat kosong → ke halaman kelola pelamar
 */

// Tahapan progress pekerjaan — dari sudut pandang employer
const PROGRESS_STEPS = [
  { status: 'assigned',    label: 'Ditugaskan' },
  { status: 'in_progress', label: 'Dikerjakan' },
  { status: 'submitted',   label: 'Review' },
  { status: 'approved',    label: 'Selesai' },
]

function getStepIndex(status) {
  return PROGRESS_STEPS.findIndex((s) => s.status === status)
}

const STATUS_META = {
  assigned:    { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',         label: 'Ditugaskan',      dot: 'bg-blue-500' },
  in_progress: { cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',   label: 'Dikerjakan',      dot: 'bg-indigo-500' },
  submitted:   { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',      label: 'Menunggu review', dot: 'bg-amber-400' },
  approved:    { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', label: 'Disetujui',      dot: 'bg-emerald-500' },
  disputed:    { cls: 'bg-red-50 text-red-700 ring-1 ring-red-100',            label: 'Disengketakan',   dot: 'bg-red-500' },
}

function ProgressBar({ status }) {
  const currentIdx = getStepIndex(status)
  if (currentIdx === -1) return null

  return (
    <div className="mt-3">
      <div className="flex items-center gap-0.5">
        {PROGRESS_STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIdx
          const isCurrent = idx === currentIdx
          return (
            <div key={step.status} className="flex flex-1 items-center gap-0.5">
              <div
                className={`h-2 w-2 shrink-0 rounded-full transition-all ${
                  isCurrent
                    ? 'h-2.5 w-2.5 bg-blue-600 ring-2 ring-blue-200'
                    : isCompleted
                    ? 'bg-blue-400'
                    : 'bg-slate-200'
                }`}
              />
              {idx < PROGRESS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded-full transition-all ${
                    idx < currentIdx ? 'bg-blue-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between">
        {PROGRESS_STEPS.map((step, idx) => (
          <span
            key={step.status}
            className={`text-[10px] leading-tight ${
              idx === currentIdx ? 'font-semibold text-blue-600' : 'text-slate-400'
            }`}
            style={{
              flex: 1,
              textAlign:
                idx === 0 ? 'left'
                : idx === PROGRESS_STEPS.length - 1 ? 'right'
                : 'center',
            }}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ActiveJobCard({ job, onClick }) {
  const meta = STATUS_META[job.assignment_status] ?? {
    cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    label: job.assignment_status,
    dot: 'bg-slate-400',
  }

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Ikon + judul + nama worker */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 transition group-hover:bg-blue-100">
            <BriefcaseBusiness size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 leading-tight transition group-hover:text-blue-700">
              {job.task_title ?? 'Pekerjaan aktif'}
            </p>
            {job.worker_full_name && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <User size={11} className="shrink-0" />
                {job.worker_full_name}
              </p>
            )}
          </div>
        </div>

        {/* Badge status + chevron */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <ChevronRight size={14} className="text-slate-400 transition group-hover:text-blue-500" />
        </div>
      </div>

      {/* Progress bar tahapan */}
      <ProgressBar status={job.assignment_status} />
    </button>
  )
}

export default function EmployerActiveJobs({
  activeJobs,
  onViewAll,
  onJobClick,
  onFindApps,
}) {
  // Empty state
  if (!activeJobs || activeJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
          <BriefcaseBusiness size={32} className="text-blue-400" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">Belum ada pekerjaan berlangsung</p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          Terima lamaran dari Worker untuk memulai pekerjaan. Progresnya akan muncul di sini.
        </p>
        <button
          onClick={onFindApps}
          className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
        >
          <Search size={15} />
          Kelola Pelamar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activeJobs.slice(0, 3).map((job) => (
        <ActiveJobCard
          key={job.assignment_id ?? job.id}
          job={job}
          onClick={() => onJobClick(job)}
        />
      ))}

      {activeJobs.length > 3 && (
        <button
          onClick={onViewAll}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          Lihat {activeJobs.length - 3} pekerjaan lainnya
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
