import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPublicEmployerProfile } from '../lib/api'
import { Flag, Star } from 'lucide-react'
import ReportModal from '../components/ReportModal'

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

export default function PublicEmployerProfilePage() {
  const { profileId } = useParams()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    if (!profileId) {
      setError('ID profil tidak valid.')
      setLoading(false)
      return
    }
    fetchPublicEmployerProfile(profileId)
      .then(setProfile)
      .catch((err) => setError(err.message ?? 'Gagal memuat profil.'))
      .finally(() => setLoading(false))
  }, [profileId])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-20" />
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
          <p className="mt-3 font-semibold text-slate-900">Profil tidak dapat dimuat</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            ← Kembali
          </button>
        </div>
      </main>
    )
  }

  const hasWork = profile?.work_type?.length > 0 || profile?.work_address
  const hasPayment = profile?.payment_scheme?.length > 0 || profile?.payment_schedule

  return (
    <>
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Navigasi atas */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Kembali
        </button>

        {/* ── Header profil ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Avatar — foto jika ada, fallback ke inisial */}
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white select-none">
                {(profile?.display_name ?? '?')[0].toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
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

              {/* Tagline */}
              {profile?.tagline && (
                <p className="mt-3 text-sm font-medium text-slate-600 italic">
                  "{profile.tagline}"
                </p>
              )}

              {/* Rating — hanya tampil jika ada data nyata */}
              {profile?.rating_avg > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {profile.rating_avg.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Deskripsi */}
          {profile?.description && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600 leading-relaxed">
              {profile.description}
            </p>
          )}

          {/* Tombol laporkan */}
          {profile?.user_id && (
            <div className="mt-4 border-t border-slate-100 pt-4 flex justify-end">
              <button
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
              >
                <Flag size={12} />
                Laporkan Pengguna
              </button>
            </div>
          )}
        </div>

        {/* ── Website ── (kontak publik yang aman ditampilkan) */}
        {profile?.website && (
          <SectionCard title="Tautan">
            <div className="flex items-start gap-3 py-1">
              <span className="w-40 shrink-0 text-xs font-medium text-slate-500">Website / media sosial</span>
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:underline break-all"
              >
                {profile.website}
              </a>
            </div>
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

        {/* Footer navigasi */}
        <div className="pb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← Kembali
          </button>
        </div>

      </div>
    </main>

    {/* Modal laporan */}
    {profile?.user_id && (
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        reportType="user"
        targetId={profile.user_id}
        targetName={profile.display_name}
      />
    )}
  </>
  )
}
