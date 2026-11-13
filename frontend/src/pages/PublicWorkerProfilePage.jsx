import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPublicWorkerProfile } from '../lib/api'
import { Flag, Star } from 'lucide-react'
import ReportModal from '../components/ReportModal'

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

export default function PublicWorkerProfilePage() {
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
    fetchPublicWorkerProfile(profileId)
      .then(setProfile)
      .catch((err) => setError(err.message ?? 'Gagal memuat profil.'))
      .finally(() => setLoading(false))
  }, [profileId])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-20" />
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
          <p className="mt-3 font-semibold text-slate-900">Profil tidak dapat dimuat</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            ← Kembali
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
                alt={profile.full_name}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white select-none">
                {(profile?.nickname ?? profile?.full_name ?? '?')[0].toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Worker
              </span>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 leading-tight">
                {profile?.full_name}
              </h1>
              {profile?.nickname && (
                <p className="text-sm text-slate-500">"{profile.nickname}"</p>
              )}

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
                <div className="mt-2 flex items-center gap-1.5">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {profile.rating_avg.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Tombol laporkan — ditampilkan di bawah header, tidak mendominasi */}
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

        {/* ── Metode pembayaran yang diterima ── */}
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
              value={
                profile.hari_tersedia?.length > 0
                  ? profile.hari_tersedia.join(', ')
                  : null
              }
            />
            <InfoRow label="Siap mulai" value={profile.tanggal_mulai} />
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
        targetName={profile.full_name}
      />
    )}
  </>
  )
}
