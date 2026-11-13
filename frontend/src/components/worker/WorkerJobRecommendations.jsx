import { MapPin, CalendarDays, Banknote, Tag, TrendingUp, ArrowRight } from 'lucide-react'

/**
 * WorkerJobRecommendations
 *
 * Props:
 *  - tasks       array   — dari recentTasks (5 task terbaru dari endpoint publik)
 *  - onViewAll   () => void
 *  - onTaskClick (task) => void
 */

function formatWage(amount, method) {
  if (!amount) return null
  const formatted = `Rp ${Number(amount).toLocaleString('id-ID')}`
  return method ? `${formatted} · ${method}` : formatted
}

function TaskCard({ task, onClick }) {
  const deadline = task.application_deadline
    ? new Date(task.application_deadline).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  const wage = formatWage(task.wage_amount, task.payment_method)

  // Warna aksen bergilir berdasarkan index — gunakan kategori sebagai seed
  const accentColors = [
    'from-blue-50 to-indigo-50 border-blue-100',
    'from-violet-50 to-purple-50 border-violet-100',
    'from-teal-50 to-emerald-50 border-teal-100',
    'from-orange-50 to-amber-50 border-orange-100',
    'from-sky-50 to-cyan-50 border-sky-100',
  ]
  // Hash sederhana dari task.id untuk memilih warna
  const colorIdx = (parseInt(String(task.id ?? 0).replace(/\D/g, '').slice(-2) || '0') % accentColors.length)
  const accent = accentColors[colorIdx]

  return (
    <article className={`group flex flex-col rounded-2xl border bg-gradient-to-br p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${accent}`}>
      {/* Kategori */}
      {task.category_name && (
        <div className="mb-2 flex items-center gap-1 self-start">
          <span className="flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/60">
            <Tag size={10} className="text-slate-400" />
            {task.category_name}
          </span>
        </div>
      )}

      {/* Judul */}
      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-blue-700 transition">
        {task.title}
      </h3>

      {/* Deskripsi singkat */}
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {task.description}
        </p>
      )}

      {/* Meta info */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {wage && (
          <span className="flex items-center gap-1 text-sm font-bold text-emerald-700">
            <Banknote size={14} className="text-emerald-500 shrink-0" />
            {wage}
          </span>
        )}
        {task.location && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} className="shrink-0 text-slate-400" />
            {task.location}
          </span>
        )}
        {deadline && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <CalendarDays size={11} className="shrink-0 text-slate-400" />
            {deadline}
          </span>
        )}
      </div>

      {/* Tombol lihat detail */}
      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
        >
          Lihat Detail
          <ArrowRight size={13} />
        </button>
      </div>
    </article>
  )
}

export default function WorkerJobRecommendations({ tasks, onViewAll, onTaskClick }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
          <TrendingUp size={30} className="text-slate-300" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600">Belum ada pekerjaan tersedia</p>
        <p className="mt-1 text-xs text-slate-400">
          Cek kembali nanti, peluang baru terus bertambah.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Grid: 1 kolom mobile, 2 kolom tablet, 3 kolom desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          Lihat Semua Pekerjaan
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
