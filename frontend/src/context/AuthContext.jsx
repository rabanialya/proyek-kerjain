import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiRequest, apiRequestAuth, fetchProfileStatus, getAuthToken } from '../lib/api'

/**
 * Shape:
 * {
 *   user: object | null,
 *   profileStatus: { has_worker_profile: bool, has_employer_profile: bool } | null,
 *   sessionLoading: bool,       // true saat pertama kali periksa token
 *   profileLoading: bool,       // true saat mengambil profileStatus
 *   login: async (email, password) => void,  // melempar Error jika gagal
 *   logout: () => void,
 *   refreshProfileStatus: async () => void,  // panggil ulang /profiles/status
 * }
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profileStatus, setProfileStatus] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Normalise response /profiles/status menjadi { has_worker_profile, has_employer_profile }.
  // Backend mengembalikan { worker_profile: {...}|null, employer_profile: {...}|null }.
  function normalizeProfileStatus(raw) {
    return {
      has_worker_profile: raw.worker_profile !== null && raw.worker_profile !== undefined,
      has_employer_profile: raw.employer_profile !== null && raw.employer_profile !== undefined,
    }
  }

  // Ambil status profil — dapat dipanggil ulang kapan saja (misal setelah buat profil).
  const refreshProfileStatus = useCallback(async () => {
    setProfileLoading(true)
    try {
      const raw = await fetchProfileStatus()
      setProfileStatus(normalizeProfileStatus(raw))
    } catch {
      // Token mungkin sudah kedaluwarsa — biarkan sessionLoading berikutnya yang menangani.
      setProfileStatus(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Periksa sesi saat aplikasi pertama kali dibuka.
  useEffect(() => {
    let active = true

    async function checkSession() {
      const token = getAuthToken()

      if (!token) {
        if (active) setSessionLoading(false)
        return
      }

      try {
        const currentUser = await apiRequest('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!active) return

        setUser(currentUser)

        // Ambil status profil bersamaan dengan restore sesi.
        try {
          const raw = await fetchProfileStatus()
          if (active) setProfileStatus(normalizeProfileStatus(raw))
        } catch {
          if (active) setProfileStatus(null)
        }
      } catch {
        // Token tidak valid — bersihkan.
        sessionStorage.removeItem('kerjain_token')
      } finally {
        if (active) setSessionLoading(false)
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [])

  // Login: simpan token, ambil user, ambil status profil.
  // Melempar Error agar komponen pemanggil bisa menampilkan pesan.
  async function login(email, password) {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    sessionStorage.setItem('kerjain_token', result.access_token)

    const currentUser = await apiRequest('/auth/me', {
      headers: { Authorization: `Bearer ${result.access_token}` },
    })

    setUser(currentUser)

    // Ambil status profil setelah login berhasil.
    setProfileLoading(true)
    try {
      const raw = await fetchProfileStatus()
      setProfileStatus(normalizeProfileStatus(raw))
    } catch {
      setProfileStatus(null)
    } finally {
      setProfileLoading(false)
    }
  }

  function logout() {
    sessionStorage.removeItem('kerjain_token')
    setUser(null)
    setProfileStatus(null)
  }

  const value = {
    user,
    profileStatus,
    sessionLoading,
    profileLoading,
    login,
    logout,
    refreshProfileStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook nyaman — melempar Error jika dipakai di luar AuthProvider.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam <AuthProvider>.')
  }
  return ctx
}
