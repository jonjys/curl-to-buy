// Illustrations for the landing page. All artwork is drawn here in SVG/CSS:
// no stock photos, no network requests, fixed aspect ratios (no layout shift).
// Mock controls are plain elements inside aria-hidden figures, never buttons.

import { useId } from 'react'

const INK = '#16130f'

export function Art({ name, className = '', bare = false }) {
  const sun = `ctb-sun-${useId().replace(/:/g, '')}`
  const common = { viewBox: '0 0 400 300', preserveAspectRatio: 'xMidYMid slice', className: `block h-full w-full ${className}`, 'aria-hidden': true, focusable: 'false' }
  if (name === 'presets') return (
    <svg {...common}>
      <defs>
        <linearGradient id={sun} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb37a" /><stop offset="0.55" stopColor="#ff5b2e" /><stop offset="1" stopColor="#6b2447" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${sun})`} />
      <circle cx="270" cy="150" r="62" fill="#ffe0b8" opacity="0.9" />
      <path d="M0 210 C 80 180, 150 230, 230 200 S 360 190, 400 205 V300 H0Z" fill="#3b1830" opacity="0.85" />
      <path d="M0 240 C 90 220, 170 260, 260 236 S 370 232, 400 244 V300 H0Z" fill={INK} opacity="0.9" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={14 + i * 33} y="276" width="18" height="10" rx="2" fill="#f6f0e6" opacity="0.8" />)}
      {bare ? null : <text x="64" y="92" fill="#fffaf2" fontSize="22" fontWeight="800" letterSpacing="3">NORDIC FILM</text>}
      {bare ? null : <text x="64" y="114" fill="#fffaf2" fontSize="13" opacity="0.85" letterSpacing="2">12 PRESETS</text>}
    </svg>
  )
  if (name === 'guide') return (
    <svg {...common}>
      <rect width="400" height="300" fill="#ffe0d1" />
      <rect x="120" y="36" width="170" height="228" rx="10" fill={INK} transform="rotate(-6 205 150)" />
      <rect x="130" y="30" width="170" height="228" rx="10" fill="#ff5b2e" />
      <rect x="130" y="30" width="16" height="228" rx="4" fill="#d9431c" />
      <text x="162" y="84" fill={INK} fontSize="22" fontWeight="800">PRICING</text>
      <text x="162" y="110" fill={INK} fontSize="22" fontWeight="800">GUIDE</text>
      <rect x="162" y="130" width="100" height="6" rx="3" fill={INK} opacity="0.35" />
      <rect x="162" y="144" width="80" height="6" rx="3" fill={INK} opacity="0.35" />
      <circle cx="248" cy="218" r="22" fill="#fffaf2" />
      <text x="236" y="224" fill={INK} fontSize="16" fontWeight="800">$</text>
    </svg>
  )
  if (name === 'print') return (
    <svg {...common}>
      <rect width="400" height="300" fill="#ffedb5" />
      <rect x="110" y="24" width="180" height="252" rx="4" fill="#fffaf2" stroke={INK} strokeOpacity="0.12" />
      <circle cx="182" cy="130" r="54" fill="#ff5b2e" opacity="0.85" />
      <circle cx="224" cy="160" r="54" fill="#3a5bd9" opacity="0.75" style={{ mixBlendMode: 'multiply' }} />
      <rect x="138" y="232" width="70" height="5" rx="2.5" fill={INK} opacity="0.5" />
      <rect x="238" y="228" width="30" height="12" rx="2" fill={INK} opacity="0.12" />
    </svg>
  )
  if (name === 'files') return (
    <svg {...common}>
      <rect width="400" height="300" fill="#d8e7ff" />
      {[['ZIP', '#ff5b2e', 92, 64, -8], ['PDF', '#fffaf2', 158, 52, 0], ['WAV', INK, 224, 64, 8]].map(([label, fill, x, y, r]) => (
        <g key={label} transform={`rotate(${r} ${x + 42} ${y + 80})`}>
          <path d={`M${x} ${y} h60 l24 24 v136 h-84z`} fill={fill} stroke={INK} strokeOpacity="0.15" />
          <path d={`M${x + 60} ${y} v24 h24`} fill="none" stroke={INK} strokeOpacity="0.25" />
          {bare ? null : <text x={x + 16} y={y + 132} fill={fill === INK ? '#fffaf2' : INK} fontSize="18" fontWeight="800">{label}</text>}
        </g>
      ))}
    </svg>
  )
  if (name === 'photos') return (
    <svg {...common}>
      <rect width="400" height="300" fill="#d4efdc" />
      {[[70, 40, '#ffb37a'], [206, 40, '#3a5bd9'], [70, 160, INK], [206, 160, '#ff5b2e']].map(([x, y, sky], i) => (
        <g key={i}>
          <rect x={x} y={y} width="124" height="104" rx="10" fill={sky} />
          <circle cx={x + 90} cy={y + 30} r="12" fill="#fffaf2" opacity="0.9" />
          <path d={`M${x} ${y + 104} l40 -46 l28 30 l20 -18 l36 34z`} fill="#fffaf2" opacity="0.55" />
        </g>
      ))}
    </svg>
  )
  if (name === 'design') return (
    <svg {...common}>
      <rect width="400" height="300" fill="#e4dcff" />
      <rect x="60" y="40" width="280" height="220" rx="16" fill="#fffaf2" />
      <circle cx="130" cy="120" r="40" fill="#ff5b2e" />
      <rect x="190" y="80" width="80" height="80" rx="20" fill={INK} />
      <text x="96" y="226" fill={INK} fontSize="44" fontWeight="800">Aa</text>
      {['#ff5b2e', '#3a5bd9', '#ffedb5', INK].map((c, i) => <circle key={c} cx={200 + i * 30} cy="212" r="11" fill={c} stroke={INK} strokeOpacity="0.15" />)}
    </svg>
  )
  return null
}

function Check() {
  return <span aria-hidden="true" className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--ctb-accent)] text-[10px] font-black text-[#16130f]">✓</span>
}

function Pill({ children, dark = false, className = '' }) {
  return <span className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-bold ${dark ? 'bg-[#16130f] text-[#fffaf2]' : 'bg-[var(--ctb-accent)] text-[#16130f]'} ${className}`}>{children}</span>
}

// The link preview a chat app shows for a shared Curl-to-Buy link.
export function SharePreview({ example, chat, compact = false, onDark = false }) {
  return (
    <div className="w-full">
      <div className={`ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm ${onDark ? 'bg-[var(--ctb-accent)] font-semibold text-[#16130f]' : 'bg-[#16130f] text-[#fffaf2]'}`}>{chat}</div>
      <div className="mt-2 ml-auto w-full max-w-[18rem] overflow-hidden rounded-2xl rounded-br-md border border-[var(--color-line)] bg-white">
        <div className={compact ? 'aspect-[2/1]' : 'aspect-[1.91/1]'}><Art name={example.art} /></div>
        <div className="px-3.5 py-2.5">
          <p className="truncate text-sm font-bold">{example.name} | {example.price}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">pay.nyttolabs.com</p>
        </div>
      </div>
    </div>
  )
}

// A faithful miniature of the real buy page (/dl/[id]).
export function BuyCard({ example, copy, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-[1.5rem] border border-[var(--color-line)] bg-white ctb-shadow ${className}`}>
      <div className="aspect-[4/3]"><Art name={example.art} /></div>
      <div className="p-5">
        <p className="ctb-kicker text-[var(--color-muted)]">{example.kind === 'physical' ? copy.physical : copy.digital}</p>
        <p className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight">{example.name}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{example.meta}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">{example.desc}</p>
        <p className="mt-4 text-4xl font-extrabold tracking-tight">{example.price}</p>
        <Pill dark className="mt-3 w-full py-3 text-base">{copy.buyFor} {example.price}</Pill>
        <ul className="mt-4 grid gap-1.5 text-sm text-[var(--color-ink-soft)]">
          {example.gets.map((line) => <li key={line} className="flex gap-2"><Check />{line}</li>)}
        </ul>
      </div>
    </div>
  )
}

// Hero: create -> share -> buy, readable at a glance.
export function HeroStage({ copy }) {
  const example = { art: 'presets', name: copy.product, price: '$19' }
  const label = (text, n) => <p className="ctb-kicker mb-3 flex items-center gap-2 text-[var(--color-ink)]"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#16130f] text-[11px] text-[#fffaf2]">{n}</span>{text}</p>
  return (
    <figure className="relative" aria-label={copy.stage}>
      <div aria-hidden="true" className="relative grid gap-5 rounded-[2rem] bg-[var(--ctb-peach)] p-4 sm:p-6 md:grid-cols-3 md:items-center md:gap-6 lg:p-8">
        <div className="pointer-events-none absolute inset-x-[16%] top-1/2 hidden h-0.5 md:block">
          <div className="ctb-rail h-full w-full opacity-30" />
          <span className="ctb-travel absolute -top-[5px] h-3 w-3 rounded-full bg-[var(--ctb-accent)] ring-4 ring-[var(--ctb-peach)]" />
        </div>
        <div className="ctb-rise relative" style={{ '--d': '120ms' }}>
          {label(copy.create, 1)}
          <div className="ctb-float rounded-[1.5rem] border border-[var(--color-line)] bg-white p-4 ctb-shadow">
            <p className="text-sm font-bold">{copy.newLink}</p>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-paper-tint)] p-2.5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg"><Art name="presets" bare /></div>
              <p className="min-w-0 truncate text-xs font-medium">{copy.file}</p>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--color-paper)] px-3 py-2.5 text-sm">
              <span className="text-[var(--color-muted)]">{copy.price}</span><span className="font-extrabold">$19</span>
            </div>
            <Pill dark className="mt-3 w-full">{copy.makeLink}</Pill>
          </div>
        </div>
        <div className="ctb-rise relative" style={{ '--d': '260ms' }}>
          {label(copy.share, 2)}
          <div className="ctb-float rounded-[1.5rem] bg-[var(--color-paper)] p-3.5" style={{ '--d': '1.2s' }}>
            <SharePreview example={example} chat={copy.chat} compact />
          </div>
        </div>
        <div className="ctb-rise relative" style={{ '--d': '400ms' }}>
          {label(copy.buy, 3)}
          <div className="ctb-float overflow-hidden rounded-[1.5rem] border border-[var(--color-line)] bg-white ctb-shadow" style={{ '--d': '2.4s' }}>
            <div className="aspect-[16/9]"><Art name="presets" /></div>
            <div className="p-4">
              <p className="text-lg font-extrabold leading-tight">{copy.product}</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">$19</p>
              <Pill className="mt-3 w-full">{copy.buyFor} $19</Pill>
              <p className="mt-2.5 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]"><Check />{copy.instant}</p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  )
}

export function StepMock({ index, copy }) {
  const m = copy.mock
  if (index === 0) return (
    <div className="grid grid-cols-3 gap-2">
      {['files', 'presets', 'photos'].map((art) => <div key={art} className="aspect-square overflow-hidden rounded-xl border border-[var(--color-line)]"><Art name={art} bare /></div>)}
      <p className="col-span-3 mt-1 flex items-center justify-between text-xs font-semibold"><span>{m.files}</span><span className="flex items-center gap-1.5"><Check />{m.cover}</span></p>
    </div>
  )
  if (index === 1) return (
    <div className="space-y-2.5 text-sm">
      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 ctb-shadow"><span className="text-[var(--color-muted)]">{m.price}</span><span className="text-2xl font-extrabold tracking-tight">$19</span></div>
      <div className="flex flex-wrap gap-1.5">{['$10', '$15', '$19', '$29'].map((p) => <span key={p} className={`rounded-full px-3 py-1 text-xs font-bold ${p === '$19' ? 'bg-[#16130f] text-[#fffaf2]' : 'border border-[var(--color-line)] bg-white'}`}>{p}</span>)}</div>
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs"><span className="text-[var(--color-muted)]">{m.limit}</span><span className="font-semibold">{m.unlimited}</span></div>
    </div>
  )
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white py-1.5 pl-3 pr-1.5 text-xs">
        <span className="min-w-0 flex-1 truncate font-mono">pay.nyttolabs.com/dl/…</span>
        <Pill className="px-3 py-1 text-xs">{m.copied}</Pill>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-[#16130f] px-3 py-2.5 text-sm text-[#fffaf2]"><span>Nordic Film Presets</span><span className="rounded-full bg-[var(--ctb-mint)] px-2 py-0.5 text-xs font-bold text-[#16130f]">{m.paid} $19</span></div>
    </div>
  )
}
