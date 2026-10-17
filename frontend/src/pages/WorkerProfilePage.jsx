import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyWorkerProfile } from '../lib/api'

// ── Label map untuk nilai enum ────────────────────────────────────────────────

const SHIFT_LABEL = {
  pagi: 'Pagi',
  siang: 'Siang',
  malam: 'Malam',
  akhir_pekan: 'Akhir Pekan',
}

const PAYMENT_LABEL = {
  cash: 'Cash',
  transfer_bank: 'Transfer Bank',
  e_wallet: 'E-Wallet',
}

// ── Komponen atom ─────────────────────────────────────────────────────────────

function Pill({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
  }
  return (
    <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="w-36 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  )
}

function SectionCard({ title, accent = 'blue', children }) {
  const accentMap = {
    blue: 'text-blue-600',
    slate: 'text-slate-500',
  }
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className={`mb-4 text-xs font-semibold uppercase tracking-wider ${accentMap[accent]}`}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function WorkerProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMyWorkerProfile()
      .then(setProfile)
      .catch((err) => setError(err.message ?? 'Gagal memuat profil.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-40" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">⚠️</p>
          <p className="mt-3 font-semibold text-slate-900">Gagal memuat profil</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => navigate('/worker')}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Kembali ke dashboard
          </button>
        </div>
      </main>
    )
  }

  const hasAvailability =
    profile?.status_pekerjaan ||
    profile?.komitmen_jam ||
    profile?.preferensi_shift?.length > 0 ||
    profile?.hari_tersedia?.length > 0 ||
    profile?.tanggal_mulai

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* ── Header profil ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Avatar inisial */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white select-none">
              {(profile?.nickname ?? user?.full_name ?? '?')[0].toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                    Worker
                  </span>
                  <h1 className="mt-0.5 text-xl font-bold text-slate-900 leading-tight">
                    {user?.full_name}
                  </h1>
                  {profile?.nickname && (
                    <p className="text-sm text-slate-500">"{profile.nickname}"</p>
                  )}
                </div>
                <button
                  onClick={() => navigate('/worker/profile/edit')}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Edit Profil
                </button>
              </div>

              {profile?.location && (
                <p className="mt-2 text-sm text-slate-500">📍 {profile.location}</p>
              )}

              {profile?.status_pekerjaan && (
                <div className="mt-2">
                  <Pill color="blue">{profile.status_pekerjaan}</Pill>
                </div>
              )}

              {/* Rating — hanya tampil jika ada data nyata */}
              {profile?.rating_avg > 0 && (
                <p className="mt-2 text-sm font-medium text-slate-700">
                  ⭐ {profile.rating_avg.toFixed(1)}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600 leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* ── Keahlian ── */}
        {profile?.skills?.length > 0 && (
          <SectionCard title="Keahlian">
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <Pill key={s} color="blue">{s}</Pill>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Metode pembayaran ── */}
        {profile?.accepted_payment_methods?.length > 0 && (
          <SectionCard title="Metode Pembayaran yang Diterima">
            <div className="flex flex-wrap gap-2">
              {profile.accepted_payment_methods.map((m) => (
                <Pill key={m} color="green">
                  {PAYMENT_LABEL[m] ?? m}
                </Pill>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Ketersediaan ── */}
        {hasAvailability && (
          <SectionCard title="Status & Ketersediaan">
            <InfoRow label="Status" value={profile.status_pekerjaan} />
            <InfoRow label="Komitmen" value={profile.komitmen_jam} />
            <InfoRow
              label="Preferensi shift"
              value={
                profile.preferensi_shift?.length > 0
                  ? profile.preferensi_shift.map((s) => SHIFT_LABEL[s] ?? s).join(', ')
                  : null
              }
            />
            <InfoRow
              label="Hari tersedia"
              value={profile.hari_tersedia?.length > 0
                ? profile.hari_tersedia.join(', ')
                : null}
            />
            <InfoRow label="Siap mulai" value={profile.tanggal_mulai} />
          </SectionCard>
        )}

        {/* ── Navigasi ── */}
        <div className="flex items-center justify-between pb-4 text-sm">
          <button
            onClick={() => navigate('/worker')}
            className="text-slate-400 hover:text-slate-600"
          >
            ← Kembali ke dashboard
          </button>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-slate-600"
          >
            Keluar
          </button>
        </div>

      </div>
    </main>
  )
}
