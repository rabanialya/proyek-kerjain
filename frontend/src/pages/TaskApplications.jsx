import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchApplicationsByTask, fetchMyTasks, updateApplicationStatus, fetchMyAssignments, createAssignment } from '../lib/api'

// ─── Komponen kecil ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    pending:  { cls: 'bg-amber-50 text-amber-700',    label: 'Menunggu' },
    accepted: { cls: 'bg-emerald-50 text-emerald-700', label: 'Diterima' },
    rejected: { cls: 'bg-red-50 text-red-600',         label: 'Ditolak' },
  }
  const { cls, label } = map[status] ?? { cls: 'bg-slate-100 text-slate-500', label: status }
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

// ─── Dialog konfirmasi ─────────────────────────────────────────────────────

function ConfirmDialog({ isOpen, action, workerName, onConfirm, onCancel, loading }) {
  if (!isOpen) return null

  const isAccept = action === 'accepted'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-2xl text-center">{isAccept ? '✅' : '❌'}</p>
        <h3 className="mt-3 text-center font-semibold text-slate-900">
          {isAccept ? 'Terima pelamar?' : 'Tolak pelamar?'}
        </h3>
        <p className="mt-2 text-center text-sm text-slate-500">
          {isAccept
            ? `${workerName} akan diterima untuk tugas ini. Keputusan ini tidak dapat diubah.`
            : `Lamaran dari ${workerName} akan ditolak. Keputusan ini tidak dapat diubah.`}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={[
              'flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50',
              isAccept ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600',
            ].join(' ')}
          >
            {loading ? 'Memproses...' : isAccept ? 'Ya, terima' : 'Ya, tolak'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kartu pelamar ─────────────────────────────────────────────────────────

function ApplicantCard({ application, workerSlotFull, onAction, hasAssignment, onAssign, assignLoading, onViewProgress }) {
  const { worker, status } = application
  const isPending = status === 'pending'
  const isAccepted = status === 'accepted'
  const canAccept = isPending && !workerSlotFull
  // hasAssignment bisa berupa assignmentId (string) atau false/undefined
  const assignmentId = typeof hasAssignment === 'string' ? hasAssignment : null
  const isAssigned = !!assignmentId

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      {/* Baris atas: nama + badge status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{worker.full_name}</p>
          <p className="text-xs text-slate-400">{worker.email}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Rating */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-amber-400 text-sm">★</span>
        <span className="text-sm font-medium text-slate-700">
          {worker.rating_avg > 0 ? worker.rating_avg.toFixed(1) : '—'}
        </span>
        <span className="text-xs text-slate-400">rating</span>
      </div>

      {/* Bio & Skills */}
      {worker.bio && (
        <p className="mt-2 text-xs text-slate-500 line-clamp-2">{worker.bio}</p>
      )}
      {worker.skills && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {worker.skills.split(',').map((s) => s.trim()).filter(Boolean).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Metode pembayaran */}
      {worker.accepted_payment_methods && (
        <p className="mt-2 text-xs text-slate-400">
          Metode: {worker.accepted_payment_methods}
        </p>
      )}

      {/* Waktu melamar */}
      <p className="mt-2 text-xs text-slate-400">
        Melamar{' '}
        {new Date(application.applied_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      {/* Aksi — hanya tampil untuk lamaran pending */}
      {isPending && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onAction(application, 'accepted')}
            disabled={!canAccept}
            title={
              !canAccept
                ? 'Kuota worker sudah terpenuhi'
                : `Terima ${worker.full_name}`
            }
            className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✓ Terima
          </button>
          <button
            onClick={() => onAction(application, 'rejected')}
            className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            ✕ Tolak
          </button>
        </div>
      )}

      {/* Pesan jika kuota penuh tapi lamaran masih pending */}
      {isPending && workerSlotFull && (
        <p className="mt-2 text-center text-xs text-amber-600 font-medium">
          Kuota worker sudah terpenuhi — hanya penolakan yang tersedia
        </p>
      )}

      {/* Panel assignment — hanya untuk lamaran accepted */}
      {isAccepted && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {isAssigned ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <span className="text-emerald-600">✓</span>
                <p className="text-xs font-semibold text-emerald-700">
                  Sudah ditugaskan
                </p>
              </div>
              <button
                onClick={() => onViewProgress(assignmentId)}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                🔍 Lihat Progress & Tinjau Hasil
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAssign(application)}
              disabled={assignLoading === application.id}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {assignLoading === application.id ? 'Memproses...' : '📋 Tugaskan Worker Ini'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Halaman utama ─────────────────────────────────────────────────────────

export default function TaskApplications() {
  const { taskId } = useParams()
  const navigate = useNavigate()

  const [task, setTask]               = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Map application_id → assignment_id untuk yang sudah punya assignment
  const [assignedAppMap, setAssignedAppMap] = useState(new Map())

  // State dialog konfirmasi
  const [dialog, setDialog] = useState({
    open: false,
    application: null,
    action: null,   // 'accepted' | 'rejected'
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError]     = useState(null)

  // State untuk aksi tugaskan
  // Menyimpan application.id yang sedang diproses (string | null)
  const [assignLoading, setAssignLoading] = useState(null)
  const [assignError, setAssignError]     = useState(null)
  const [assignSuccess, setAssignSuccess] = useState(null)

  // ── Load data ──
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasksData, appsData, assignmentsData] = await Promise.all([
        fetchMyTasks(),
        fetchApplicationsByTask(taskId),
        fetchMyAssignments(),
      ])
      const found = (tasksData ?? []).find((t) => t.id === taskId)
      if (!found) {
        setError('Task tidak ditemukan atau Anda tidak memiliki akses.')
      } else {
        setTask(found)
        setApplications(appsData ?? [])
        // Bangun Map application_id → assignment_id untuk yang sudah punya assignment
        const map = new Map(
          (assignmentsData ?? []).map((a) => [String(a.application_id), String(a.id)])
        )
        setAssignedAppMap(map)
      }
    } catch (err) {
      setError(err.message ?? 'Gagal memuat data lamaran.')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    load()
  }, [load])

  // ── Hitung kuota ──
  const acceptedCount = applications.filter((a) => a.status === 'accepted').length
  const workerSlotFull = task ? acceptedCount >= task.worker_needed : false

  // ── Buka dialog konfirmasi ──
  const openDialog = (application, action) => {
    setActionError(null)
    setDialog({ open: true, application, action })
  }

  const closeDialog = () => {
    if (actionLoading) return
    setDialog({ open: false, application: null, action: null })
    setActionError(null)
  }

  // ── Eksekusi aksi accept/reject ──
  const handleConfirm = async () => {
    if (!dialog.application || !dialog.action) return
    setActionLoading(true)
    setActionError(null)
    try {
      await updateApplicationStatus(dialog.application.id, dialog.action)
      // Update state lokal — ubah status tanpa fetch ulang
      setApplications((prev) =>
        prev.map((a) =>
          a.id === dialog.application.id
            ? { ...a, status: dialog.action }
            : a
        )
      )
      setDialog({ open: false, application: null, action: null })
    } catch (err) {
      setActionError(err.message ?? 'Gagal memproses lamaran.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Buat assignment dari lamaran accepted ──
  const handleAssign = async (application) => {
    setAssignLoading(application.id)
    setAssignError(null)
    setAssignSuccess(null)
    try {
      await createAssignment(application.id)
      // Reload data agar mendapat assignment_id yang sesungguhnya
      await load()
      setAssignSuccess(
        `${application.worker?.full_name ?? 'Worker'} berhasil ditugaskan.`
      )
    } catch (err) {
      setAssignError(err.message ?? 'Gagal membuat penugasan.')
    } finally {
      setAssignLoading(null)
    }
  }

  // ── Navigasi ke halaman review progress ──
  const handleViewProgress = (assignmentId) => {
    navigate(`/employer/jobs/${assignmentId}`)
  }

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-10 w-56" />
          <SkeletonBlock className="h-20" />
          {[...Array(3)].map((_, i) => (
            <SkeletonBlock key={i} className="h-36" />
          ))}
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
          <h2 className="mt-3 font-semibold text-slate-900">Terjadi kesalahan</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => navigate('/employer/applications')}
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Kembali ke daftar tugas
          </button>
        </div>
      </main>
    )
  }

  // ── Kelompokkan lamaran berdasarkan status ──
  const pending  = applications.filter((a) => a.status === 'pending')
  const accepted = applications.filter((a) => a.status === 'accepted')
  const rejected = applications.filter((a) => a.status === 'rejected')

  return (
    <>
      {/* Dialog konfirmasi */}
      <ConfirmDialog
        isOpen={dialog.open}
        action={dialog.action}
        workerName={dialog.application?.worker?.full_name ?? ''}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
        loading={actionLoading}
      />

      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/employer/applications')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              ← Kembali
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Daftar Pelamar</h1>
              <p className="text-xs text-slate-500 line-clamp-1">{task?.title}</p>
            </div>
          </div>

          {/* ── Ringkasan task ── */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
              <div className="px-3">
                <p className="text-xl font-bold text-slate-900">{applications.length}</p>
                <p className="mt-0.5 text-xs text-slate-500">Total pelamar</p>
              </div>
              <div className="px-3">
                <p className="text-xl font-bold text-emerald-600">{acceptedCount}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Diterima / {task?.worker_needed ?? '?'}
                </p>
              </div>
              <div className="px-3">
                <p className="text-xl font-bold text-amber-600">{pending.length}</p>
                <p className="mt-0.5 text-xs text-slate-500">Menunggu</p>
              </div>
            </div>

            {workerSlotFull && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">
                ✓ Kuota worker sudah terpenuhi ({task?.worker_needed} dari {task?.worker_needed})
              </p>
            )}
          </section>

          {/* ── Error aksi accept/reject ── */}
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ⚠ {actionError}
            </div>
          )}

          {/* ── Error / sukses aksi assign ── */}
          {assignError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ⚠ {assignError}
            </div>
          )}
          {assignSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✓ {assignSuccess}
            </div>
          )}

          {/* ── Empty state ── */}
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-3xl">👤</p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Belum ada pelamar
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Worker belum melamar tugas ini.
              </p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Menunggu */}
              {pending.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-slate-700">
                    Menunggu keputusan ({pending.length})
                  </h2>
                  <div className="space-y-3">
                    {pending.map((app) => (
                      <ApplicantCard
                        key={app.id}
                        application={app}
                        workerSlotFull={workerSlotFull}
                        onAction={openDialog}
                        hasAssignment={assignedAppMap.get(String(app.id)) ?? null}
                        onAssign={handleAssign}
                        assignLoading={assignLoading}
                        onViewProgress={handleViewProgress}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Diterima */}
              {accepted.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-emerald-700">
                    Diterima ({accepted.length})
                  </h2>
                  <div className="space-y-3">
                    {accepted.map((app) => (
                      <ApplicantCard
                        key={app.id}
                        application={app}
                        workerSlotFull={workerSlotFull}
                        onAction={openDialog}
                        hasAssignment={assignedAppMap.get(String(app.id)) ?? null}
                        onAssign={handleAssign}
                        assignLoading={assignLoading}
                        onViewProgress={handleViewProgress}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Ditolak */}
              {rejected.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-red-600">
                    Ditolak ({rejected.length})
                  </h2>
                  <div className="space-y-3">
                    {rejected.map((app) => (
                      <ApplicantCard
                        key={app.id}
                        application={app}
                        workerSlotFull={workerSlotFull}
                        onAction={openDialog}
                        hasAssignment={assignedAppMap.get(String(app.id)) ?? null}
                        onAssign={handleAssign}
                        assignLoading={assignLoading}
                        onViewProgress={handleViewProgress}
                      />
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}

        </div>
      </main>
    </>
  )
}
