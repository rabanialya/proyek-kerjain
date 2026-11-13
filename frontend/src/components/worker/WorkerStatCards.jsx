import { ClipboardList, Clock, CircleCheck, CircleX } from 'lucide-react'

/**
 * WorkerStatCards
 *
 * Props:
 *  - summary  { total, pending, accepted, rejected }
 */

const STATS = [
  {
    key: 'total',
    label: 'Total Lamaran',
    icon: ClipboardList,
    bg: 'bg-white',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    valueColor: 'text-slate-900',
    border: 'ring-1 ring-slate-100',
    accent: 'border-l-4 border-blue-500',
  },
  {
    key: 'pending',
    label: 'Menunggu',
    icon: Clock,
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
    border: 'ring-1 ring-amber-100',
    accent: 'border-l-4 border-amber-400',
  },
  {
    key: 'accepted',
    label: 'Diterima',
    icon: CircleCheck,
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
    border: 'ring-1 ring-emerald-100',
    accent: 'border-l-4 border-emerald-500',
  },
  {
    key: 'rejected',
    label: 'Ditolak',
    icon: CircleX,
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    valueColor: 'text-red-600',
    border: 'ring-1 ring-red-100',
    accent: 'border-l-4 border-red-400',
  },
]

function StatCard({ config, value }) {
  const { label, icon: Icon, bg, iconBg, iconColor, valueColor, border, accent } = config
  return (
    <div
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-md ${bg} ${border} ${accent}`}
    >
      {/* Ikon */}
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>

      {/* Angka besar */}
      <p className={`text-3xl font-extrabold leading-none tracking-tight ${valueColor}`}>
        {value}
      </p>

      {/* Label */}
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

export default function WorkerStatCards({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATS.map((config) => (
        <StatCard key={config.key} config={config} value={summary[config.key] ?? 0} />
      ))}
    </div>
  )
}
