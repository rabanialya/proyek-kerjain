import { useCallback, useEffect, useState } from 'react'
import { applyToTask, cancelApplication, fetchMyApplications } from '../lib/api'

/**
 * Hook untuk mengelola status lamaran Worker pada satu task tertentu.
 *
 * Strategi:
 * - Panggil GET /applications/my sekali saat mount, cari entry dengan task_id === taskId.
 * - Simpan object application yang ditemukan (atau null jika belum melamar).
 * - Sediakan fungsi apply() dan cancel() yang memperbarui state lokal setelah
 *   request berhasil, tanpa perlu refetch seluruh daftar.
 *
 * State yang dikembalikan:
 *   application   — object ApplicationResponse atau null
 *   checkLoading  — true selama GET /applications/my berjalan (cek awal)
 *   actionLoading — true selama POST atau DELETE sedang berjalan
 *   error         — pesan error terakhir dari aksi apply/cancel, atau null
 *   apply()       — kirim POST /applications, update state
 *   cancel()      — kirim DELETE /applications/:id, update state
 *   clearError()  — reset error ke null
 *
 * Catatan:
 * - Jika user tidak punya Worker Profile, GET /applications/my mengembalikan 403.
 *   Hook menangani ini secara graceful: application = null, tidak melempar error ke UI.
 * - taskId harus berupa string UUID yang valid.
 */
export function useApplicationStatus(taskId) {
  // application object dari server, atau null jika belum melamar
  const [application, setApplication] = useState(null)

  // true saat GET /applications/my sedang berjalan
  const [checkLoading, setCheckLoading] = useState(true)

  // true saat POST apply atau DELETE cancel sedang berjalan
  const [actionLoading, setActionLoading] = useState(false)

  // pesan error dari aksi terakhir (bukan dari cek awal)
  const [error, setError] = useState(null)

  // ── Cek awal: apakah user sudah melamar task ini? ──
  useEffect(() => {
    if (!taskId) {
      setCheckLoading(false)
      return
    }

    let active = true

    async function checkExisting() {
      setCheckLoading(true)
      try {
        const applications = await fetchMyApplications()
        if (!active) return

        const found = applications.find((a) => a.task_id === taskId) ?? null
        setApplication(found)
      } catch {
        // 403 = tidak punya Worker Profile, atau token invalid.
        // Keduanya graceful — tombol Lamar akan tetap ditampilkan,
        // backend yang akan memvalidasi saat submit.
        if (active) setApplication(null)
      } finally {
        if (active) setCheckLoading(false)
      }
    }

    checkExisting()

    return () => {
      active = false
    }
  }, [taskId])

  // ── Kirim lamaran ──
  const apply = useCallback(async () => {
    setError(null)
    setActionLoading(true)
    try {
      const newApplication = await applyToTask(taskId)
      setApplication(newApplication)
      return { success: true }
    } catch (err) {
      const message = err.message ?? 'Gagal mengirim lamaran.'
      setError(message)
      return { success: false, message }
    } finally {
      setActionLoading(false)
    }
  }, [taskId])

  // ── Batalkan lamaran ──
  const cancel = useCallback(async () => {
    if (!application) return
    setError(null)
    setActionLoading(true)
    try {
      await cancelApplication(application.id)
      setApplication(null)
      return { success: true }
    } catch (err) {
      const message = err.message ?? 'Gagal membatalkan lamaran.'
      setError(message)
      return { success: false, message }
    } finally {
      setActionLoading(false)
    }
  }, [application])

  function clearError() {
    setError(null)
  }

  return {
    application,
    checkLoading,
    actionLoading,
    error,
    apply,
    cancel,
    clearError,
  }
}
