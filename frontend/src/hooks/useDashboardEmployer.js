import { useCallback, useEffect, useState } from 'react'
import { fetchMyEmployerProfile, fetchMyTasks } from '../lib/api'

/**
 * Hook untuk mengambil semua data yang dibutuhkan EmployerDashboard.
 *
 * Data yang diambil:
 * - employerProfile → GET /profiles/employer
 * - myTasks         → GET /tasks/my  (semua status: draft, published, closed)
 */
export function useDashboardEmployer() {
  const [employerProfile, setEmployerProfile] = useState(null)
  const [myTasks, setMyTasks] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [profileResult, tasksResult] = await Promise.allSettled([
        fetchMyEmployerProfile(),
        fetchMyTasks(),
      ])

      if (profileResult.status === 'fulfilled') {
        setEmployerProfile(profileResult.value)
      } else {
        console.warn(
          'Gagal mengambil employer profile:',
          profileResult.reason,
        )
      }

      if (tasksResult.status === 'fulfilled') {
        // Backend sudah mengurutkan dari terbaru, tapi sort ulang di sini
        // untuk jaga-jaga jika urutan berubah.
        const tasks = (tasksResult.value ?? []).slice().sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        )
        setMyTasks(tasks)
      } else {
        console.warn('Gagal mengambil tasks:', tasksResult.reason)
        setMyTasks([])
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

  // Ringkasan task berdasarkan status (semua status tersedia)
  const taskSummary = {
    total: myTasks.length,
    published: myTasks.filter((t) => t.status === 'published').length,
    draft: myTasks.filter((t) => t.status === 'draft').length,
    closed: myTasks.filter((t) => t.status === 'closed').length,
  }

  return {
    employerProfile,
    myTasks,
    taskSummary,
    loading,
    error,
    reload: load,
  }
}
