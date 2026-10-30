import { useCallback, useEffect, useState } from 'react'
import { fetchUnreadNotifications } from '../lib/api'

// Mengambil jumlah notifikasi belum dibaca untuk user yang sedang login.
//
// Ringan — hanya memanggil GET /notifications/unread lalu menghitung panjangnya,
// bukan mengambil seluruh daftar. Dipakai oleh tombol lonceng di dashboard
// Worker/Employer untuk menampilkan indikator jumlah belum dibaca.
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchUnreadNotifications()
      setUnreadCount(Array.isArray(data) ? data.length : 0)
    } catch {
      // Token hilang/gagal — anggap 0, jangan blokir UI.
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { unreadCount, loading, refresh }
}
