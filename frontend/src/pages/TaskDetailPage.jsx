import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchCategories, fetchTaskById } from '../lib/api'
import { useApplicationStatus } from '../hooks/useApplicationStatus'

// ─── Konstanta label ────────────────────────────────────────────────────────

const WORK_TYPE_LABELS = {
  remote:  { label: 'Remote (WFH / Online)', icon: '🌐' },
  on_site: { label: 'On-site (Tatap Muka)',  icon: '📍' },
  hybrid:  { label: 'Hybrid',                icon: '🔀' },
}

const WAGE_RATE_LABELS = {
  project:    'per Proyek',
  hourly:     'per Jam',
  daily:      'per Hari',
  per_output: 'per Output',
}

const REQUIREMENT_FLAG_LABELS = {
  own_vehicle:        'Memiliki kendaraan sendiri',
  own_device:         'Memiliki perangkat sendiri (laptop/HP)',
  local_domicile:     'Berdomisili di lokasi yang sama',
  minimum_age_18:     'Usia minimal 18 tahun',
  no_criminal_record: 'Bebas catatan kriminal',
}

// ─── Helper format ──────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateTime(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(timeStr) {
  // timeStr dari backend: "09:00:00" atau "09:00"
  if (!timeStr) return null
  return timeStr.slice(0, 5) // ambil "HH:MM"
}

function formatRupiah(amount) {
  if (amount == null) return null
  return `Rp ${Number(amount).toLocaleString('id-ID')}`
}

/** true jika deadline sudah lewat */
function isDeadlinePassed(isoString) {
  if (!isoString) return false
  return new Date(isoString) <= new Date()
}

// ─── Komponen UI kecil ──────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

/** Baris label–value di section Detail. Tidak dirender jika value null/undefined/''. */
function InfoRow({ label, value, children }) {
  const content = children ?? value
  if (content == null || content === '') return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{content}</dd>
    </div>
  )
}

/** Badge pill kecil */
function Pill({ children, color = 'blue' }) {
  const cls = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-emerald-50 text-emerald-700',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-600',
    slate:  'bg-slate-100 text-slate-600',
  }[color] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  )
}

// ─── Panel lamaran ───────────────────────────────────────────────────────────

function ApplicationPanel({ taskId, task }) {
  const { application, checkLoading, actionLoading, error, apply, cancel, clearError } =
    useApplicationStatus(taskId)
  const [successMsg, setSuccessMsg] = useState(null)

  const deadlinePassed = isDeadlinePassed(task?.application_deadline)

  async function handleApply() {
    clearError()
    setSuccessMsg(null)
    const result = await apply()
    if (result.success) setSuccessMsg('Lamaranmu berhasil dikirim! Status: Menunggu.')
  }

  async function handleCancel() {
    clearError()
    setSuccessMsg(null)
    const result = await cancel()
    if (result.success) setSuccessMsg('Lamaranmu berhasil dibatalkan.')
  }

  const statusConfig = {
    pending:  { cls: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: '⏳', label: 'Menunggu review' },
    accepted: { cls: 'bg-green-50 border-green-200 text-green-800',  icon: '✅', label: 'Lamaranmu diterima' },
    rejected: { cls: 'bg-red-50 border-red-200 text-red-800',        icon: '❌', label: 'Lamaranmu ditolak' },
  }

  if (checkLoading) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-10 w-full rounded-xl bg-slate-200" />
        </div>
      </section>
    )
  }

  // ── Sudah melamar ──
  if (application) {
    const cfg = statusConfig[application.status]
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Status Lamaranmu
        </h2>
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cfg?.cls ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          <span className="text-lg">{cfg?.icon ?? '📄'}</span>
          <div>
            <p className="font-semibold text-sm">{cfg?.label ?? application.status}</p>
            <p className="text-xs opacity-70">Dikirim {formatDate(application.applied_at)}</p>
          </div>
        </div>

        {successMsg && (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{successMsg}</p>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {application.status === 'pending' && (
            <button onClick={handleCancel} disabled={actionLoading}
              className="flex-1 rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
              {actionLoading ? 'Membatalkan...' : 'Batalkan Lamaran'}
            </button>
          )}
          <button onClick={() => window.history.back()}
            className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ← Tugas lainnya
          </button>
        </div>
      </section>
    )
  }

  // ── Belum melamar ──
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Kirim Lamaran
      </h2>

      {/* Informasi deadline pendaftaran */}
      {task?.application_deadline && (
        <div className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
          deadlinePassed
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <span>{deadlinePassed ? '🔒' : '⏰'}</span>
          <div>
            <p className="font-medium">
              {deadlinePassed ? 'Pendaftaran sudah ditutup' : 'Batas akhir pendaftaran'}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              {formatDateTime(task.application_deadline)}
            </p>
          </div>
        </div>
      )}

      {/* Jika deadline sudah lewat — tidak tampilkan tombol lamar */}
      {deadlinePassed ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Batas akhir pendaftaran untuk tugas ini telah terlewati.
          </p>
          <button onClick={() => window.history.back()}
            className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ← Tugas lainnya
          </button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Tertarik dengan tugas ini? Kirim lamaranmu sekarang.
          </p>

          {successMsg && (
            <p className="mb-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{successMsg}</p>
          )}
          {error && (
            <div className="mb-3 rounded-xl bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button onClick={clearError}
                className="mt-1 text-xs text-red-500 underline underline-offset-2 hover:text-red-700">
                Tutup
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={handleApply} disabled={actionLoading}
              className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60">
              {actionLoading ? 'Mengirim lamaran...' : 'Lamar Tugas'}
            </button>
            <button onClick={() => window.history.back()}
              className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              ← Tugas lainnya
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// ─── Halaman utama ───────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const navigate   = useNavigate()

  const [task, setTask]               = useState(null)
  const [categoryName, setCategoryName] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [taskResult, categoriesResult] = await Promise.allSettled([
          fetchTaskById(taskId),
          fetchCategories(),
        ])
        if (!active) return
        if (taskResult.status === 'rejected') {
          setError(taskResult.reason?.message ?? 'Tugas tidak ditemukan.')
          return
        }
        const taskData = taskResult.value
        setTask(taskData)
        if (categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)) {
          const found = categoriesResult.value.find(c => c.id === taskData.category_id)
          setCategoryName(found?.name ?? null)
        }
      } catch (err) {
        if (active) setError(err.message ?? 'Gagal memuat detail tugas.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [taskId])

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="h-10 w-2/3" />
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-56" />
          <SkeletonBlock className="h-28" />
        </div>
      </main>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <h2 className="mt-3 font-semibold text-slate-900">Tugas tidak dapat dimuat</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={() => navigate(-1)}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              ← Kembali
            </button>
            <button onClick={() => navigate('/tasks')}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Lihat semua tugas
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── Data turunan ──
  const workTypeCfg = task.work_type ? WORK_TYPE_LABELS[task.work_type] : null
  const wageRateLabel = task.wage_rate ? WAGE_RATE_LABELS[task.wage_rate] : null
  const deadlinePassed = isDeadlinePassed(task.application_deadline)

  // Parse requirements_flags dari JSON string
  let requirementFlags = []
  if (task.requirements_flags) {
    try { requirementFlags = JSON.parse(task.requirements_flags) } catch { requirementFlags = [] }
  }

  // Format upah dengan satuan
  const wageDisplay = wageRateLabel
    ? `${formatRupiah(task.wage_amount)} / ${wageRateLabel}`
    : formatRupiah(task.wage_amount)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Navigasi atas */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Kembali
        </button>

        {/* ── Header tugas ── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {categoryName && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-500">
                  {categoryName}
                </p>
              )}
              <h1 className="text-2xl font-bold text-slate-900 leading-snug">
                {task.title}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Pill color="blue">Published</Pill>
              {workTypeCfg && (
                <Pill color="slate">
                  {workTypeCfg.icon} {workTypeCfg.label}
                </Pill>
              )}
            </div>
          </div>

          {/* Lokasi — hanya jika ada */}
          {task.location && (
            <p className="mt-2 text-sm text-slate-500">📍 {task.location}</p>
          )}

          {/* Upah ringkas di header */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-slate-900">{wageDisplay}</span>
            <span className="text-xs text-slate-400">· {task.payment_method}</span>
            <span className="text-xs text-slate-400">· {task.worker_needed} pekerja dibutuhkan</span>
          </div>

          {/* Peringatan deadline — di header agar mudah terlihat */}
          {task.application_deadline && deadlinePassed && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
              🔒 Pendaftaran sudah ditutup pada {formatDateTime(task.application_deadline)}
            </div>
          )}
          {task.application_deadline && !deadlinePassed && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
              ⏰ Daftar sebelum {formatDateTime(task.application_deadline)}
            </div>
          )}

          {/* Deskripsi */}
          {task.description ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {task.description}
            </p>
          ) : (
            <p className="mt-4 text-sm italic text-slate-400">Tidak ada deskripsi.</p>
          )}
        </section>

        {/* ── Detail Tugas ── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Detail Tugas
          </h2>
          <dl className="space-y-3">
            <InfoRow label="Tipe kerja">
              {workTypeCfg
                ? <span>{workTypeCfg.icon} {workTypeCfg.label}</span>
                : <span className="text-slate-400 italic">Belum ditentukan</span>
              }
            </InfoRow>

            <InfoRow label="Upah" value={wageDisplay} />

            <InfoRow label="Satuan upah">
              {wageRateLabel
                ? wageRateLabel
                : <span className="text-slate-400 italic">Belum ditentukan</span>
              }
            </InfoRow>

            <InfoRow label="Metode pembayaran" value={task.payment_method} />
            <InfoRow label="Pekerja dibutuhkan" value={`${task.worker_needed} orang`} />
            {task.location && <InfoRow label="Lokasi" value={task.location} />}
            {categoryName && <InfoRow label="Kategori" value={categoryName} />}
            <InfoRow label="Dipublikasikan" value={formatDate(task.published_at)} />
          </dl>
        </section>

        {/* ── Jadwal ── (hanya tampil jika ada minimal satu field jadwal) */}
        {(task.work_date || task.work_time_start || task.work_deadline_days) && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
              Jadwal
            </h2>
            <dl className="space-y-3">
              <InfoRow label="Tanggal kerja" value={formatDate(task.work_date)} />

              {(task.work_time_start || task.work_time_end) && (
                <InfoRow label="Jam kerja">
                  {[formatTime(task.work_time_start), formatTime(task.work_time_end)]
                    .filter(Boolean)
                    .join(' – ')}
                </InfoRow>
              )}

              {task.work_deadline_days && (
                <InfoRow label="Durasi pengerjaan">
                  {task.work_deadline_days} hari kalender sejak penugasan
                </InfoRow>
              )}
            </dl>
          </section>
        )}

        {/* ── Persyaratan ── (hanya tampil jika ada minimal satu field) */}
        {(task.required_skills || requirementFlags.length > 0 || task.requirements_note) && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
              Persyaratan
            </h2>
            <div className="space-y-4">

              {task.required_skills && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Keahlian yang dibutuhkan</p>
                  <p className="text-sm text-slate-800 whitespace-pre-line">{task.required_skills}</p>
                </div>
              )}

              {requirementFlags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Persyaratan khusus</p>
                  <ul className="space-y-1.5">
                    {requirementFlags.map(flag => (
                      <li key={flag} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="text-emerald-500 font-bold">✓</span>
                        {REQUIREMENT_FLAG_LABELS[flag] ?? flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {task.requirements_note && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Catatan tambahan</p>
                  <p className="text-sm text-slate-800 whitespace-pre-line">{task.requirements_note}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Panel lamaran ── */}
        <ApplicationPanel taskId={taskId} task={task} />

        {/* Footer */}
        <p className="pb-4 text-center text-xs text-slate-300">
          ID: {task.id} · Dibuat {formatDate(task.created_at)}
        </p>

      </div>
    </main>
  )
}
