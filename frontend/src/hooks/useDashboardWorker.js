import { useCallback, useEffect, useState } from 'react'
import {
  fetchMyApplications,
  fetchMyWorkerJobs,
  fetchMyWorkerProfile,
  fetchPublishedTasks,
} from '../lib/api'

/**
 * Hook untuk mengambil semua data yang dibutuhkan WorkerDashboard.
 *
 * Data yang diambil:
 * - workerProfile  → GET /profiles/worker
 * - applications   → GET /applications/my
 * - recentTasks    → GET /tasks (published, maks 5 terbaru, tanpa token)
 *
 * Catatan keterbatasan:
 * - Tidak ada endpoint GET /tasks/applied-by-me yang menyertakan detail task.
 *   applications hanya mengembalikan { task_id, status, ... } tanpa judul task.
 *   Untuk menampilkan judul task di ringkasan lamaran, perlu cross-reference
 *   dengan data tasks atau endpoint GET /tasks/:id per lamaran (belum diimplementasi).
 * - recentTasks diambil dari endpoint publik — tidak memerlukan token.
 */
export function useDashboardWorker() {
  const [workerProfile, setWorkerProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [recentTasks, setRecentTasks] = useState([])
  const [activeJobsCount, setActiveJobsCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Panggil keempat endpoint paralel — lebih cepat, dan kegagalan satu
      // tidak memblokir yang lain.
      const [profileResult, applicationsResult, tasksResult, jobsResult] =
        await Promise.allSettled([
          fetchMyWorkerProfile(),
          fetchMyApplications(),
          fetchPublishedTasks(),
          fetchMyWorkerJobs(),
        ])

      // Worker Profile
      if (profileResult.status === 'fulfilled') {
        setWorkerProfile(profileResult.value)
      } else {
        // Profile wajib ada (user sudah lewat setup), tapi tidak fatal.
        console.warn('Gagal mengambil worker profile:', profileResult.reason)
      }

      // Applications — jika gagal, tampilkan empty state bukan error total.
      if (applicationsResult.status === 'fulfilled') {
        setApplications(applicationsResult.value ?? [])
      } else {
        console.warn('Gagal mengambil applications:', applicationsResult.reason)
        setApplications([])
      }

      // Recent tasks — ambil 5 terbaru (sort by created_at desc).
      if (tasksResult.status === 'fulfilled') {
        const sorted = [...(tasksResult.value ?? [])].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        )
        setRecentTasks(sorted.slice(0, 5))
      } else {
        console.warn('Gagal mengambil tasks:', tasksResult.reason)
        setRecentTasks([])
      }

      // Jumlah pekerjaan aktif (assigned + in_progress + submitted).
      if (jobsResult.status === 'fulfilled') {
        const jobs = jobsResult.value ?? []
        const activeStatuses = ['assigned', 'in_progress', 'submitted']
        setActiveJobsCount(
          jobs.filter((j) => activeStatuses.includes(j.assignment_status)).length,
        )
      } else {
        console.warn('Gagal mengambil worker jobs:', jobsResult.reason)
        setActiveJobsCount(0)
      }
    } catch (err) {
      setError(err.message ?? 'Gagal memuat data dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Ringkasan lamaran berdasarkan status
  const applicationSummary = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }

  return {
    workerProfile,
    applications,
    applicationSummary,
    recentTasks,
    activeJobsCount,
    loading,
    error,
    reload: load,
  }
}
