import { useCallback, useEffect, useState } from 'react'
import { fetchEmployerJobs } from '../lib/api'

/**
 * Hook untuk mengambil semua assignment milik Employer yang sedang login,
 * diperkaya dengan detail task, kategori, dan Worker.
 *
 * Data diambil dari: GET /assignments/employer/my-jobs
 * Response: EmployerJobResponse[]
 */
export function useEmployerJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEmployerJobs()
      setJobs(data ?? [])
    } catch (err) {
      setError(err.message ?? 'Gagal memuat daftar pekerjaan.')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    jobs,
    loading,
    error,
    reload: load,
  }
}
