import { useCallback, useEffect, useState } from 'react'
import { fetchMyWorkerJobs } from '../lib/api'

/**
 * Hook untuk mengambil daftar pekerjaan Worker yang sedang login.
 *
 * Memanggil GET /assignments/worker/my-jobs yang mengembalikan assignment
 * diperkaya dengan data task, kategori, dan employer.
 *
 * Hanya assignment yang berasal dari application berstatus *accepted* yang
 * muncul — dijaga oleh backend.
 */
export function useMyWorkerJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyWorkerJobs()
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

  return { jobs, loading, error, reload: load }
}
