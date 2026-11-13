import {
  FileText, MapPin, Banknote, Users, Clock,
  Pencil, Rocket, ChevronRight, Plus, AlertCircle,
  Tag, CalendarDays,
} from 'lucide-react'

/**
 * EmployerTaskList
 *
 * Props:
 *  - tasks         array   — dari myTasks (useDashboardEmployer)
 *  - publishing    string | null  — ID task yang sedang di-publish
 *  - publishError  string | null
 *  - onEdit        (taskId) => void
 *  - onPublish     (task)   => void
 *  - onViewAll     () => void
 *  - onCreateTask  () => void
 *  - onDismissError () => void
 */

// ─── Badge status task ─────────────────────────────────────────────────────

const TASK_STATUS = {
  draft: {
    cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
    label: 'Draft',
  },
  published: {
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    dot: 'bg-emerald-500',
    label: 'Published',
  },
  closed: {
    cls: 'bg-red-50 text-red-600 ring-1 ring-red-100',
    dot: 'bg-red-400',
    label: 'Ditutup',
  },
}

function TaskStatusBadge({ status }) {
  const cfg = TASK_STATUS[status] ?? {
    cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
    label: status,
  }
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Kartu satu task ───────────────────────────────────────────────────────

function TaskCard({ task, publishing, onEdit, onPublish }) {
  const deadline = task.application_deadline
    ? new Date(task.application_deadline).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  const isPublishing = publishing === task.id

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
      {/* Baris atas: judul + badge */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-snug text-slate-900">{task.title}</p>
        <TaskStatusBadge status={task.status} />
      </div>

      {/* Kategori */}
      {task.category_name && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
          <Tag size={11} className="shrink-0" />
          {task.category_name}
        </p>
      )}

      {/* Lokasi */}
      {task.location && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={11} className="shrink-0" />
          {task.location}
        </p>
      )}

      {/* Meta: budget, worker, deadline */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {task.wage_amount && (
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
            <Banknote size={13} className="shrink-0 text-emerald-500" />
            Rp {Number(task.wage_amount).toLocaleString('id-ID')}
          </span>
        )}
        {task.worker_needed && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Users size={11} className="shrink-0" />
            {task.worker_needed} worker
          </span>
        )}
        {deadline && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <CalendarDays size={11} className="shrink-0" />
            {deadline}
          </span>
        )}
      </div>

      {/* Pelamar (jika tersedia dari data) */}
      {typeof task.applicant_count === 'number' && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 font-medium">
          <Users size={11} className="shrink-0" />
          {task.applicant_count} pelamar
        </p>
      )}

      {/* Tombol aksi — hanya jika bukan closed */}
      {task.status !== 'closed' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => onEdit(task.id)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <Pencil size={12} />
            Edit
          </button>

          {task.status === 'draft' && (
            <button
              onClick={() => onPublish(task)}
              disabled={isPublishing}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              {isPublishing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  Memproses…
                </>
              ) : (
                <>
                  <Rocket size={12} />
                  Publikasikan
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Komponen utama ────────────────────────────────────────────────────────

export default function EmployerTaskList({
  tasks,
  publishing,
  publishError,
  onEdit,
  onPublish,
  onViewAll,
  onCreateTask,
  onDismissError,
}) {
  // Empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
          <FileText size={30} className="text-slate-300" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">Belum ada task yang dibuat</p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          Mulai posting pekerjaan dan temukan Worker yang tepat untuk tim kamu.
        </p>
        <button
          onClick={onCreateTask}
          className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
        >
          <Plus size={15} />
          Buat Task Sekarang
        </button>
      </div>
    )
  }

  const displayed = tasks.slice(0, 5)
  const remaining = tasks.length - displayed.length

  return (
    <div>
      {/* Error publish inline */}
      {publishError && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            {publishError}
          </span>
          <button
            onClick={onDismissError}
            className="shrink-0 text-xs font-semibold underline underline-offset-2 hover:no-underline"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            publishing={publishing}
            onEdit={onEdit}
            onPublish={onPublish}
          />
        ))}
      </div>

      {remaining > 0 && (
        <button
          onClick={onViewAll}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          +{remaining} task lainnya
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  )
}
