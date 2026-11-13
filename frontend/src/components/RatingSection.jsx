/**
 * RatingSection — Komponen untuk memberi atau menampilkan rating setelah pekerjaan selesai.
 *
 * Props:
 *   assignmentId     : string — UUID assignment
 *   assignmentStatus : string — status assignment saat ini
 *   toUserId         : string — UUID user yang akan diberi rating
 *   toUserName       : string — nama tampilan target rating
 *   role             : 'worker' | 'employer' — peran pengguna saat ini
 *   accentColor      : 'blue' | 'emerald' — warna aksen halaman (blue=Worker, emerald=Employer)
 *
 * Behavior:
 *   - Hanya tampil jika assignmentStatus === 'approved'
 *   - Saat mount, cek apakah rating sudah diberikan via GET /ratings/assignment/:id
 *   - Jika sudah, tampilkan rating yang ada (read-only)
 *   - Jika belum, tampilkan form interaktif dengan bintang 1–5 dan review opsional
 *   - Setelah submit berhasil, tampilkan notifikasi sukses dan rating yang diberikan
 */

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { createRating, fetchRatingsByAssignment } from '../lib/api'

// ─── StarRating — input bintang interaktif ─────────────────────────────────

function StarRating({ value, onChange, disabled = false }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Pilih rating bintang"
      onMouseLeave={() => !disabled && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= (hovered || value)
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            aria-label={`${star} bintang`}
            className={[
              'transition-transform focus:outline-none',
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95',
            ].join(' ')}
          >
            <Star
              size={28}
              className={[
                'transition-colors',
                isActive
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-slate-200 text-slate-200',
              ].join(' ')}
            />
          </button>
        )
      })}
    </div>
  )
}

// ─── StarDisplay — bintang read-only ───────────────────────────────────────

function StarDisplay({ score, size = 18 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${score} dari 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= score
            ? 'fill-amber-400 text-amber-400'
            : 'fill-slate-200 text-slate-200'
          }
        />
      ))}
    </div>
  )
}

// ─── Komponen utama ────────────────────────────────────────────────────────

const SCORE_LABELS = {
  1: 'Sangat Buruk',
  2: 'Kurang Baik',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik',
}

export default function RatingSection({
  assignmentId,
  assignmentStatus,
  toUserId,
  toUserName,
  role = 'worker',
  accentColor = 'blue',
}) {
  const [existingRating, setExistingRating] = useState(null)
  const [loadingCheck, setLoadingCheck] = useState(true)

  const [score, setScore] = useState(0)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedRating, setSubmittedRating] = useState(null)

  // Warna aksen berdasarkan peran
  const accent = {
    blue: {
      heading: 'text-blue-600',
      btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200',
      success: 'bg-blue-50 border-blue-200',
      successText: 'text-blue-700',
    },
    emerald: {
      heading: 'text-emerald-600',
      btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200',
      success: 'bg-emerald-50 border-emerald-200',
      successText: 'text-emerald-700',
    },
  }[accentColor] ?? {
    heading: 'text-slate-600',
    btn: 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-200',
    success: 'bg-slate-50 border-slate-200',
    successText: 'text-slate-700',
  }

  // Jangan tampilkan jika assignment belum approved
  if (assignmentStatus !== 'approved') return null
  // Jangan tampilkan jika tidak ada target
  if (!toUserId) return null

  // ── Load rating yang sudah ada ──────────────────────────────────────────

  useEffect(() => {
    if (assignmentStatus !== 'approved') {
      setLoadingCheck(false)
      return
    }
    let active = true
    async function checkExisting() {
      setLoadingCheck(true)
      try {
        const ratings = await fetchRatingsByAssignment(assignmentId)
        if (!active) return
        // Cari rating yang dikirim DARI current user: ditandai dengan to_user_id == toUserId
        // Backend hanya mengembalikan rating di assignment ini — kita cari yang targetnya toUserId
        // dan bukan yang dikirim ke current user (artinya, dikirim oleh current user)
        // Karena kita tidak tahu current user UUID di frontend tanpa context tambahan,
        // gunakan cara alternatif: cari rating yang to_user_id === toUserId
        // Ini valid karena dalam satu assignment, dari sisi Worker hanya ada 1 rating ke Employer
        // dan dari sisi Employer hanya ada 1 rating ke Worker.
        const myRating = ratings.find((r) => r.to_user_id === toUserId)
        setExistingRating(myRating ?? null)
      } catch (_) {
        // Gagal load tidak memblokir form — biarkan user tetap bisa mencoba submit
        setExistingRating(null)
      } finally {
        if (active) setLoadingCheck(false)
      }
    }
    checkExisting()
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, toUserId, assignmentStatus])

  // ── Submit rating ───────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    if (score === 0) {
      setSubmitError('Pilih rating bintang terlebih dahulu.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createRating({
        assignment_id: assignmentId,
        to_user_id: toUserId,
        score,
        review: review.trim() || null,
      })
      setSubmittedRating(created)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message ?? 'Gagal mengirim rating. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const targetLabel = role === 'worker' ? 'Employer' : 'Worker'
  const ratingToDisplay = submittedRating ?? existingRating

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className={`mb-1 text-sm font-semibold uppercase tracking-widest ${accent.heading}`}>
        Beri Rating {targetLabel}
      </h2>

      {/* Loading check */}
      {loadingCheck ? (
        <div className="mt-3 space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
        </div>
      ) : ratingToDisplay ? (
        // ── Rating sudah ada: tampilkan read-only ──
        <div className={`mt-3 rounded-xl border px-4 py-4 ${accent.success}`}>
          <div className="flex items-center gap-3">
            <StarDisplay score={ratingToDisplay.score} />
            <span className={`text-sm font-semibold ${accent.successText}`}>
              {SCORE_LABELS[ratingToDisplay.score] ?? ratingToDisplay.score}
            </span>
          </div>
          {ratingToDisplay.review && (
            <p className={`mt-2 text-sm ${accent.successText} opacity-90 leading-relaxed`}>
              "{ratingToDisplay.review}"
            </p>
          )}
          <p className={`mt-2 text-xs opacity-60 ${accent.successText}`}>
            Rating untuk {toUserName} •{' '}
            {new Date(ratingToDisplay.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      ) : (
        // ── Form rating ──
        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <p className="text-sm text-slate-500">
            Bagikan pengalamanmu bekerja dengan{' '}
            <span className="font-medium text-slate-700">{toUserName}</span>.
          </p>

          {/* Bintang */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Rating</p>
            <div className="flex items-center gap-3">
              <StarRating value={score} onChange={setScore} disabled={submitting} />
              {score > 0 && (
                <span className="text-sm font-medium text-slate-600">
                  {SCORE_LABELS[score]}
                </span>
              )}
            </div>
          </div>

          {/* Review opsional */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Ulasan <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={`Ceritakan pengalamanmu bekerja sama dengan ${toUserName}…`}
              rows={3}
              maxLength={500}
              disabled={submitting}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{review.length}/500</p>
          </div>

          {/* Error */}
          {submitError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || score === 0}
            className={[
              'w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition',
              'focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
              accent.btn,
            ].join(' ')}
          >
            {submitting ? 'Mengirim…' : 'Kirim Rating'}
          </button>
        </form>
      )}
    </section>
  )
}
