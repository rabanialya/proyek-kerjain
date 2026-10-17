import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyEmployerProfile } from '../lib/api'

// ── Label map untuk nilai enum ────────────────────────────────────────────────

const WORK_TYPE_LABEL = {
  remote: 'Remote',
  on_site: 'On-site',
  hybrid: 'Hybrid',
}

const PAYMENT_SCHEME_LABEL = {
  per_jam: 'Per Jam',
  per_hari: 'Per Hari',
  per_proyek: 'Per Proyek / Output',
  bulanan: 'Bulanan',
}

// ── Komponen atom ─────────────────────────────────────────────────────────────

function Pill({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-800',
    blue: 'bg-blue-100 text-blue-800',
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
      <span className="w-40 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 break-all">{value}</span>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-emerald-600">
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

export default function EmployerProfilePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMyEmployerProfile()
      .then(setProfile)
      .catch((err) => setError(err.message ?? 'Gagal memuat profil.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-36" />
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
            onClick={() => navigate('/employer')}
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Kembali ke dashboard
          </button>
        </div>
      </main>
    )
  }

  const hasContact = profile?.contact_email || profile?.website
  const hasWork = profile?.work_type?.length > 0 || profile?.work_address
  const hasPayment = profile?.payment_scheme?.length > 0 || profile?.payment_schedule

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* ── Header profil ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Avatar inisial */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white select-none">
              {(profile?.display_name ?? '?')[0].toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                      Employer
                    </span>
                    {profile?.tipe_employer && (
                      <Pill color="emerald">{profile.tipe_employer}</Pill>
                    )}
                    {profile?.is_verified && (
                      <Pill color="blue">✓ Terverifikasi</Pill>
                    )}
                  </div>
                  <h1 className="mt-0.5 text-xl font-bold text-slate-900 leading-tight">
                    {profile?.display_name}
                  </h1>
                  {profile?.sektor && (
                    <p className="text-sm text-slate-500">{profile.sektor}</p>
                  )}
                  {profile?.location && (
                    <p className="text-sm text-slate-500">📍 {profile.location}</p>
                  )}
                </div>
                <button
                  onClick={() => navigate('/employer/profile/edit')}
                  className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Edit Profil
                </button>
              </div>

              {/* Tagline */}
              {profile?.tagline && (
                <p className="mt-3 text-sm font-medium text-slate-600 italic">
                  "{profile.tagline}"
                </p>
              )}

              {/* Rating — hanya tampil jika ada data nyata */}
              {profile?.rating_avg > 0 && (
                <p className="mt-2 text-sm font-medium text-slate-700">
                  ⭐ {profile.rating_avg.toFixed(1)}
                </p>
              )}
            </div>
          </div>

          {/* Deskripsi */}
          {profile?.description && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600 leading-relaxed">
              {profile.description}
            </p>
          )}
        </div>

        {/* ── Kontak — hanya contact_email dan website, bukan email akun atau WA ── */}
        {hasContact && (
          <SectionCard title="Kontak">
            <InfoRow label="Email kontak" value={profile.contact_email} />
            <InfoRow label="Website / media sosial" value={profile.website} />
          </SectionCard>
        )}

        {/* ── Format kerja ── */}
        {hasWork && (
          <SectionCard title="Format Kerja">
            {profile.work_type?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {profile.work_type.map((w) => (
                  <Pill key={w} color="emerald">
                    {WORK_TYPE_LABEL[w] ?? w}
                  </Pill>
                ))}
              </div>
            )}
            <InfoRow label="Alamat lokasi kerja" value={profile.work_address} />
          </SectionCard>
        )}

        {/* ── Kebijakan pembayaran ── */}
        {hasPayment && (
          <SectionCard title="Kebijakan Pembayaran">
            {profile.payment_scheme?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {profile.payment_scheme.map((s) => (
                  <Pill key={s} color="emerald">
                    {PAYMENT_SCHEME_LABEL[s] ?? s}
                  </Pill>
                ))}
              </div>
            )}
            <InfoRow label="Waktu pembayaran" value={profile.payment_schedule} />
          </SectionCard>
        )}

        {/* ── Navigasi ── */}
        <div className="flex items-center justify-between pb-4 text-sm">
          <button
            onClick={() => navigate('/employer')}
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
