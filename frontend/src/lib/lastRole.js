/**
 * Utilitas untuk menyimpan dan membaca preferensi role terakhir pengguna.
 *
 * Data disimpan di localStorage dengan kunci per userId sehingga
 * preferensi tidak tercampur antar akun di perangkat yang sama.
 *
 * Role yang valid: 'worker' | 'employer'
 */

const STORAGE_KEY_PREFIX = 'kerjain_last_role_'

/**
 * Simpan preferensi role terakhir untuk userId tertentu.
 * @param {string} userId  UUID user
 * @param {'worker'|'employer'} role
 */
export function setLastRole(userId, role) {
  if (!userId || (role !== 'worker' && role !== 'employer')) return
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, role)
  } catch {
    // localStorage mungkin tidak tersedia (private browsing mode ketat).
  }
}

/**
 * Baca preferensi role terakhir untuk userId tertentu.
 * @param {string} userId  UUID user
 * @returns {'worker'|'employer'|null}  null jika belum pernah disimpan
 */
export function getLastRole(userId) {
  if (!userId) return null
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    if (stored === 'worker' || stored === 'employer') return stored
    return null
  } catch {
    return null
  }
}

/**
 * Hapus preferensi role saat user logout atau akun dihapus.
 * @param {string} userId  UUID user
 */
export function clearLastRole(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`)
  } catch {
    // ignore
  }
}
