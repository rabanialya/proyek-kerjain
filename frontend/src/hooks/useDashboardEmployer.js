import { useCallback, useEffect, useState } from 'react'
import { fetchMyEmployerProfile, fetchMyTasks, fetchEmployerJobs } from '../lib/api'

/**
 * Hook untuk mengambil semua data yang dibutuhkan EmployerDashboard.
 *
 * Data yang diambil:
 * - employerProfile  → GET /profiles/employer
 * - myTasks          → GET /tasks/my  (semua status: draft, published, closed)
 * - activeJobs       → GET /assignments/employer/my-jobs (pekerjaan sedang berlangsung)
 *
 * Ringkasan pelamar pending dihitung dari myTasks × applications — tidak ada
 * endpoint single-call untuk ini, sehingga diestimasi dari data task yang tersedia.
 */
export function useDashboardEmployer() {
  const [employerProfile, setEmployerProfile] = useState(null)
  const [myTasks, setMyTasks] = useState([])
  const [activeJobs, setActiveJobs] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [profileResult, tasksResult, jobsResult] = await Promise.allSettled([
        fetchMyEmployerProfile(),
        fetchMyTasks(),
        fetchEmployerJobs(),
      ])

      if (profileResult.status === 'fulfilled') {
        setEmployerProfile(profileResult.value)
      } else {
        console.warn('Gagal mengambil employer profile:', profileResult.reason)
      }

      if (tasksResult.status === 'fulfilled') {
        const tasks = (tasksResult.value ?? []).slice().sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        )
        setMyTasks(tasks)
      } else {
        console.warn('Gagal mengambil tasks:', tasksResult.reason)
        setMyTasks([])
      }

      if (jobsResult.status === 'fulfilled') {
        const jobs = jobsResult.value ?? []
        // Pekerjaan aktif = assigned, in_progress, submitted
        const activeStatuses = ['assigned', 'in_progress', 'submitted']
        setActiveJobs(jobs.filter((j) => activeStatuses.includes(j.assignment_status)))
      } else {
        console.warn('Gagal mengambil employer jobs:', jobsResult.reason)
        setActiveJobs([])
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

  // Ringkasan task berdasarkan status
  const taskSummary = {
    total: myTasks.length,
    published: myTasks.filter((t) => t.status === 'published').length,
    draft: myTasks.filter((t) => t.status === 'draft').length,
    closed: myTasks.filter((t) => t.status === 'closed').length,
    // Task yang sedang ada pekerja aktif
    running: activeJobs.length,
  }

  return {
    employerProfile,
    myTasks,
    taskSummary,
    activeJobs,
    loading,
    error,
    reload: load,
  }
}
