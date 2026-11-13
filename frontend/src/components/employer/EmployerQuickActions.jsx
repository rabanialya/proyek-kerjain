import { Plus, LayoutList, Briefcase } from 'lucide-react'

/**
 * EmployerQuickActions
 *
 * Props:
 *  - onCreateTask      () => void
 *  - onManageApps      () => void
 *  - onViewActiveJobs  () => void
 */
export default function EmployerQuickActions({
  onCreateTask,
  onManageApps,
  onViewActiveJobs,
}) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Buat task baru — aksen utama biru */}
      <button
        onClick={onCreateTask}
        className="flex items-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-left text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md active:scale-[.98]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Plus size={20} />
        </div>
        <div>
          <p className="font-semibold leading-tight">Buat Task Baru</p>
          <p className="mt-0.5 text-xs text-blue-200">Post pekerjaan baru</p>
        </div>
      </button>

      {/* Kelola pelamar — aksen indigo outline */}
      <button
        onClick={onManageApps}
        className="flex items-center gap-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-5 py-4 text-left transition hover:border-indigo-400 hover:bg-indigo-100 hover:shadow-sm active:scale-[.98]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
          <LayoutList size={20} className="text-indigo-700" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900 leading-tight">Kelola Pelamar</p>
          <p className="mt-0.5 text-xs text-indigo-600">Terima atau tolak lamaran</p>
        </div>
      </button>

      {/* Pekerjaan berlangsung — aksen emerald outline */}
      <button
        onClick={onViewActiveJobs}
        className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-sm active:scale-[.98]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <Briefcase size={20} className="text-emerald-700" />
        </div>
        <div>
          <p className="font-semibold text-emerald-900 leading-tight">Pekerjaan Aktif</p>
          <p className="mt-0.5 text-xs text-emerald-600">Review &amp; setujui hasil</p>
        </div>
      </button>
    </section>
  )
}
