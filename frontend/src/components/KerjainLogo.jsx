/**
 * KerjainLogo — Logo Kerjain: icon SVG + wordmark HTML.
 *
 * Menggunakan HTML untuk wordmark agar font merender sempurna di semua browser
 * tanpa risiko terpotong seperti SVG <text>.
 *
 * Props:
 *   variant   — "full" (icon + wordmark, default) | "icon" (icon saja)
 *   size      — "sm" | "md" (default) | "lg" | "xl"
 *   theme     — "color" (default) | "white" (untuk background gelap)
 *   className — class tambahan pada wrapper
 */
export default function KerjainLogo({
  variant = 'full',
  size = 'md',
  theme = 'color',
  className = '',
}) {
  // Tinggi icon dan ukuran font wordmark per size
  const config = {
    sm: { iconH: 24, fontSize: '1rem',    dotSize: 5,  gap: '6px'  },
    md: { iconH: 32, fontSize: '1.35rem', dotSize: 6,  gap: '8px'  },
    lg: { iconH: 44, fontSize: '1.85rem', dotSize: 8,  gap: '10px' },
    xl: { iconH: 60, fontSize: '2.5rem',  dotSize: 11, gap: '12px' },
  }
  const c = config[size] ?? config.md

  const isWhite  = theme === 'white'
  const textColor = isWhite ? '#ffffff' : '#0f2057'
  const dotColor  = isWhite ? '#ffffff' : '#2563eb'

  // ── Icon SVG (briefcase biru bergradien + huruf K putih di dalamnya) ──
  // Persis seperti logo: briefcase sebagai bentuk utama, K putih di dalam,
  // garis/swoosh putih diagonal melintasi K (checkmark style)
  const iconSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 90 96"
      height={c.iconH}
      width={c.iconH * (90 / 96)}
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        {/* Gradient biru utama untuk briefcase */}
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#3b82f6"/>
          <stop offset="100%" stopColor="#1a3fa8"/>
        </linearGradient>
        {/* Gradient untuk diagonal swoosh / K arm kanan */}
        <linearGradient id="armGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1d4ed8"/>
          <stop offset="100%" stopColor="#60a5fa"/>
        </linearGradient>
      </defs>

      {/* ── Handle briefcase ── */}
      <path
        d="M 28 16 L 28 10 Q 28 4 34 4 L 56 4 Q 62 4 62 10 L 62 16"
        stroke={isWhite ? 'rgba(255,255,255,0.9)' : '#1e3a8a'}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Body briefcase (rounded rect) ── */}
      <rect
        x="4" y="16" width="82" height="74" rx="12"
        fill={isWhite ? 'rgba(255,255,255,0.2)' : 'url(#bgGrad)'}
        stroke={isWhite ? 'rgba(255,255,255,0.5)' : 'none'}
        strokeWidth={isWhite ? '2' : '0'}
      />

      {/* ── Batang vertikal K (kiri) ── */}
      <rect
        x="18" y="26" width="13" height="54" rx="3"
        fill={isWhite ? 'rgba(255,255,255,0.9)' : 'white'}
      />

      {/* ── Lengan atas K (kanan atas, diagonal swoosh putih) ── */}
      <path
        d="M 31 53 L 67 26"
        stroke={isWhite ? 'rgba(255,255,255,0.7)' : 'white'}
        strokeWidth="13"
        strokeLinecap="round"
      />

      {/* ── Lengan bawah K (kanan bawah, diagonal lebih tebal/pendek) ── */}
      <path
        d="M 31 53 L 68 80"
        stroke={isWhite ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.75)'}
        strokeWidth="13"
        strokeLinecap="round"
      />

      {/* ── Garis tengah briefcase ── */}
      <line
        x1="4" y1="42" x2="86" y2="42"
        stroke={isWhite ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.25)'}
        strokeWidth="2.5"
      />
    </svg>
  )

  if (variant === 'icon') {
    return (
      <span
        className={`inline-flex items-center ${className}`}
        aria-label="Kerjain"
      >
        {iconSvg}
      </span>
    )
  }

  // ── Full: icon + wordmark ──
  // Wordmark pakai HTML <span> supaya tidak pernah terpotong
  return (
    <span
      className={`inline-flex items-center select-none ${className}`}
      aria-label="Kerjain"
      style={{ gap: c.gap }}
    >
      {iconSvg}

      {/* Wordmark: "Kerj" + "a" + "i" (dengan dot biru custom) + "n" */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
          fontWeight: 900,
          fontSize: c.fontSize,
          color: textColor,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {/* "Kerja" */}
        <span>Kerja</span>
        {/* "i" dengan dot biru di atas — pakai relative positioning */}
        <span style={{ position: 'relative', display: 'inline-block' }}>
          {/* Tubuh huruf i tanpa titik — pakai dotless i (ı) agar titik asli hilang */}
          <span style={{ display: 'inline-block' }}>ı</span>
          {/* Dot biru custom */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '85%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: c.dotSize,
              height: c.dotSize,
              borderRadius: '50%',
              background: dotColor,
              display: 'block',
            }}
          />
        </span>
        {/* "n" */}
        <span>n</span>
      </span>
    </span>
  )
}
