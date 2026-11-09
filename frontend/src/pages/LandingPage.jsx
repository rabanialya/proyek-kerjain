import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import KerjainLogo from '../components/KerjainLogo'
import {
  Search,
  User,
  Briefcase,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Hook: deteksi apakah user sudah scroll melewati Y
───────────────────────────────────────────── */
function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])
  return scrolled
}

/* ─────────────────────────────────────────────
   Navbar
───────────────────────────────────────────── */
function Navbar({ onScrollTo }) {
  const scrolled = useScrolled(20)
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Beranda', id: 'hero' },
    { label: 'Cara Kerja', id: 'how-it-works' },
    { label: 'Fitur', id: 'features' },
  ]

  function handleNav(id) {
    onScrollTo(id)
    setMenuOpen(false)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm shadow-slate-200/80'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 select-none">
          <KerjainLogo
            variant="full"
            size="md"
            theme={scrolled ? 'color' : 'white'}
          />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                scrolled ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTA buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              scrolled
                ? 'text-slate-700 hover:text-blue-600'
                : 'text-white hover:text-blue-300'
            }`}
          >
            Masuk
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-300/40 transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-300/50 active:scale-95"
          >
            Daftar
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Buka menu navigasi"
          className={`rounded-lg p-2 md:hidden transition-colors ${
            scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
          }`}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        } bg-white border-t border-slate-100 shadow-lg`}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              {link.label}
            </button>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              Masuk
            </Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────
   Hero Section
───────────────────────────────────────────── */
function HeroSection({ onScrollToHIW }) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background: '#0f172a',
      }}
    >
      {/* Background SVG */}
      <img
        src="/assets/hero-bg.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
        draggable="false"
      />

      {/* Subtle bottom fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: 'linear-gradient(to bottom, transparent, #0f172a)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-32 sm:px-8 md:py-40">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-medium text-blue-300 tracking-wide uppercase">
              Platform Freelance Indonesia
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Temukan Pekerjaan.{' '}
            <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
              Wujudkan Peluang.
            </span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-relaxed max-w-xl">
            Kerjain membantu mempertemukan pencari pekerjaan dengan pemberi pekerjaan
            dalam satu platform yang memudahkan proses pencarian, penugasan, hingga
            penyelesaian pekerjaan.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={onScrollToHIW}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
            >
              Jelajahi Cara Kerja
              <ChevronRight size={16} />
            </button>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500 hover:shadow-blue-400/40 active:scale-95"
            >
              Mulai Sekarang
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center gap-6">
            {[
              'Gratis Mendaftar',
              'Proses Transparan',
              'Pembayaran Aman',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <span className="text-sm text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   How It Works Section
───────────────────────────────────────────── */
const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Temukan Peluang',
    description:
      'Worker dapat melihat berbagai task yang tersedia dan melihat detail pekerjaan serta profil Employer sebelum melamar.',
    illustration: '/assets/illus-find-job.svg',
    alt: 'Ilustrasi orang mencari pekerjaan di laptop',
    color: 'from-blue-50 to-sky-50',
    accent: 'bg-blue-600',
    badge: 'text-blue-600 bg-blue-50 ring-1 ring-blue-200',
  },
  {
    step: '02',
    title: 'Mulai Bekerja',
    description:
      'Employer membuat task dan memilih Worker yang sesuai. Worker menerima penugasan dan mulai mengerjakan task.',
    illustration: '/assets/illus-start-work.svg',
    alt: 'Ilustrasi employer dan worker berkolaborasi',
    color: 'from-indigo-50 to-blue-50',
    accent: 'bg-indigo-600',
    badge: 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200',
  },
  {
    step: '03',
    title: 'Selesaikan Pekerjaan',
    description:
      'Worker mengunggah bukti pengerjaan. Employer memeriksa hasil pekerjaan dan memproses penyelesaian pembayaran.',
    illustration: '/assets/illus-complete-work.svg',
    alt: 'Ilustrasi penyelesaian pekerjaan dan pembayaran',
    color: 'from-sky-50 to-cyan-50',
    accent: 'bg-sky-600',
    badge: 'text-sky-600 bg-sky-50 ring-1 ring-sky-200',
  },
]

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-600 ring-1 ring-blue-100 mb-4">
            Cara Kerja
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Bagaimana Kerjain Bekerja?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            Mulai dari menemukan pekerjaan hingga menyelesaikannya, semua dapat dilakukan
            dalam satu platform.
          </p>
        </div>

        {/* Step cards */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <article
              key={step.step}
              className={`group relative flex flex-col rounded-3xl bg-gradient-to-br ${step.color} p-8 shadow-sm shadow-slate-200/50 ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-blue-100/60`}
            >
              {/* Step badge */}
              <span
                className={`mb-5 inline-flex w-fit items-center rounded-xl px-3 py-1 text-xs font-bold tracking-widest uppercase ${step.badge}`}
              >
                Langkah {step.step}
              </span>

              {/* Illustration */}
              <div className="mb-6 flex items-center justify-center overflow-hidden rounded-2xl bg-white/70 p-4 shadow-inner">
                <img
                  src={step.illustration}
                  alt={step.alt}
                  className="h-44 w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Text */}
              <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>

              {/* Connector arrow (desktop only, not on last) */}
              {step.step !== '03' && (
                <div className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md shadow-slate-200">
                    <ChevronRight size={18} className="text-blue-500" />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Features Section
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Search,
    title: 'Pencarian Task',
    description:
      'Temukan pekerjaan yang relevan berdasarkan kategori, lokasi, dan informasi task secara lengkap.',
    color: 'bg-blue-50 text-blue-600',
    border: 'border-blue-100',
  },
  {
    icon: User,
    title: 'Profil Pengguna',
    description:
      'Lihat informasi lengkap Worker dan Employer — portofolio, riwayat kerja, dan ulasan — sebelum berkolaborasi.',
    color: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-100',
  },
  {
    icon: Briefcase,
    title: 'Manajemen Pekerjaan',
    description:
      'Pantau setiap tahap — mulai dari lamaran, penugasan, hingga penyelesaian pekerjaan — dalam satu dashboard.',
    color: 'bg-sky-50 text-sky-600',
    border: 'border-sky-100',
  },
  {
    icon: ShieldCheck,
    title: 'Bukti & Pembayaran',
    description:
      'Worker mengunggah bukti pekerjaan, Employer memverifikasi, dan pembayaran diproses dengan aman dalam platform.',
    color: 'bg-cyan-50 text-cyan-600',
    border: 'border-cyan-100',
  },
]

function FeaturesSection() {
  return (
    <section id="features" className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-600 ring-1 ring-blue-100 mb-4">
            Fitur
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Semua yang Kamu Butuhkan{' '}
            <span className="text-blue-600">dalam Satu Platform</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            Kerjain dirancang untuk memudahkan Worker dan Employer dari proses pencarian
            hingga penyelesaian.
          </p>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                className={`group flex flex-col gap-4 rounded-2xl border ${feat.border} bg-white p-7 shadow-sm shadow-slate-100/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-blue-100/50`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${feat.color} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {feat.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Role split visual */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {/* Worker card */}
          <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white shadow-lg shadow-blue-200/50">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
              <User size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                Untuk Worker
              </p>
              <h3 className="mt-1 text-xl font-bold">Cari dan Kerjakan Task</h3>
              <p className="mt-2 text-sm leading-relaxed text-blue-100">
                Jelajahi ratusan task tersedia, lamar yang sesuai keahlianmu, dan terima
                bayaran setelah pekerjaan selesai.
              </p>
            </div>
            <Link
              to="/register"
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow transition-all hover:bg-blue-50 active:scale-95"
            >
              Daftar sebagai Worker
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Employer card */}
          <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white shadow-lg shadow-slate-300/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Untuk Employer
              </p>
              <h3 className="mt-1 text-xl font-bold">Post Task & Kelola Tim</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Buat task, pilih Worker terbaik dari profil lengkap mereka, pantau
                progres, dan proses pembayaran setelah pekerjaan selesai.
              </p>
            </div>
            <Link
              to="/register"
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
            >
              Daftar sebagai Employer
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   CTA Section
───────────────────────────────────────────── */
function CTASection() {
  return (
    <section className="relative overflow-hidden bg-blue-600 py-20 sm:py-28">
      {/* Decorative circles */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-700/50"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
          Siap Memulai Peluang Barumu?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-blue-100 sm:text-lg">
          Bergabung dengan Kerjain dan mulai temukan peluang pekerjaan atau pekerja yang
          sesuai dengan kebutuhanmu.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-blue-700 shadow-lg shadow-blue-800/30 transition-all hover:bg-blue-50 hover:shadow-xl active:scale-95"
          >
            Daftar Sekarang
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
          >
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Footer
───────────────────────────────────────────── */
function Footer({ onScrollTo }) {
  const footerLinks = [
    { label: 'Beranda', id: 'hero' },
    { label: 'Cara Kerja', id: 'how-it-works' },
    { label: 'Fitur', id: 'features' },
  ]

  return (
    <footer className="bg-slate-900 py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center">
              <KerjainLogo variant="full" size="md" theme="white" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Platform yang mempertemukan Worker dan Employer untuk proses pencarian,
              penugasan, dan penyelesaian pekerjaan secara mudah.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Navigasi
            </p>
            <nav className="flex flex-col gap-2">
              {footerLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onScrollTo(link.id)}
                  className="text-left text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Auth links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Akun
            </p>
            <nav className="flex flex-col gap-2">
              <Link
                to="/login"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                Daftar
              </Link>
            </nav>
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="mt-10 border-t border-slate-800 pt-8">
          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Kerjain. Hak cipta dilindungi undang-undang.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────────────────────────
   Main LandingPage Component
───────────────────────────────────────────── */
export default function LandingPage() {
  const { user, sessionLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect pengguna yang sudah login ke dashboard mereka
  useEffect(() => {
    if (!sessionLoading && user) {
      if (user.is_admin) {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [user, sessionLoading, navigate])

  // Fungsi smooth scroll ke section berdasarkan id
  function scrollToSection(id) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Selama session check belum selesai, tampilkan blank untuk menghindari flash
  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <KerjainLogo variant="full" size="lg" theme="white" />
          <p className="text-sm text-slate-400">Memuat...</p>
        </div>
      </div>
    )
  }

  // Jika user sudah login, jangan render landing (useEffect akan redirect)
  if (user) return null

  return (
    <div className="overflow-x-hidden">
      <Navbar onScrollTo={scrollToSection} />
      <HeroSection onScrollToHIW={() => scrollToSection('how-it-works')} />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
      <Footer onScrollTo={scrollToSection} />
    </div>
  )
}
