import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCategories, fetchPublishedTasks } from '../lib/api'

/**
 * Hook untuk halaman daftar tugas (TaskListPage).
 *
 * Sumber data:
 * - GET /tasks       → semua published tasks (publik, tanpa token)
 * - GET /categories  → untuk resolve category_id → name (publik, tanpa token)
 *
 * Filter dilakukan client-side karena backend tidak menyediakan query params.
 * Filter yang tersedia:
 * - query    : mencocokkan title atau description (case-insensitive)
 * - location : mencocokkan location (case-insensitive, substring)
 * - categoryId : UUID kategori — filter exact match pada category_id
 *
 * Keterbatasan yang perlu dilaporkan ke backend:
 * - Backend tidak mendukung server-side search/filter (tidak ada ?q=, ?location=, ?category_id=)
 * - Seluruh task dimuat sekaligus; belum ada pagination dari backend
 */
export function useTaskList() {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter state
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [tasksResult, categoriesResult] = await Promise.allSettled([
      fetchPublishedTasks(),
      fetchCategories(),
    ])

    if (tasksResult.status === 'fulfilled') {
      // Sort: terbaru dulu
      const sorted = [...(tasksResult.value ?? [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      setTasks(sorted)
    } else {
      setError(tasksResult.reason?.message ?? 'Gagal memuat daftar tugas.')
      setTasks([])
    }

    if (categoriesResult.status === 'fulfilled') {
      setCategories(categoriesResult.value ?? [])
    } else {
      // Kategori gagal tidak fatal — filter kategori tidak akan muncul
      setCategories([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Filter client-side ────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let result = tasks

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      )
    }

    if (locationFilter.trim()) {
      const loc = locationFilter.trim().toLowerCase()
      result = result.filter((t) =>
        (t.location ?? '').toLowerCase().includes(loc),
      )
    }

    if (categoryId) {
      result = result.filter((t) => t.category_id === categoryId)
    }

    return result
  }, [tasks, query, locationFilter, categoryId])

  // ── Helper: name dari category_id ────────────────────────────────────────
  const categoryMap = useMemo(() => {
    const map = {}
    for (const c of categories) map[c.id] = c.name
    return map
  }, [categories])

  // Daftar lokasi unik dari semua tasks — untuk dropdown filter
  // location bisa null (task Remote) — filter sebelum masuk Set
  const uniqueLocations = useMemo(() => {
    const set = new Set(tasks.map((t) => t.location).filter(Boolean))
    return [...set].sort()
  }, [tasks])

  function resetFilters() {
    setQuery('')
    setLocationFilter('')
    setCategoryId('')
  }

  const hasActiveFilter = query.trim() || locationFilter || categoryId

  return {
    // Data
    tasks: filteredTasks,
    totalUnfiltered: tasks.length,
    categories,
    categoryMap,
    uniqueLocations,

    // Status
    loading,
    error,
    reload: load,

    // Filter state & setters
    query,
    setQuery,
    locationFilter,
    setLocationFilter,
    categoryId,
    setCategoryId,
    hasActiveFilter,
    resetFilters,
  }
}
