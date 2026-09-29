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

// The link preview a chat app shows for a shared Nytto Checkout link.
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

// Hero scene: add it -> price it -> share it -> get paid, in one layered
// composition built from the same pieces as the rest of the page.
export function HeroScene({ copy }) {
  const [add, price, share] = copy.flow
  const badge = (n, text, delay) => <span className="ctb-badge ctb-step" style={{ '--d': delay }}><b>{n}</b>{text}</span>
  return (
    <figure className="ctb-scene relative isolate w-full" aria-label={copy.stage}>
      <div aria-hidden="true" className="ctb-scene-in relative aspect-[20/19] w-full">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 95" preserveAspectRatio="none" focusable="false">
          <path className="ctb-dash" d="M18 50 C 16 55, 16 58, 18 62 M58 77 C 66 77, 70 74, 72 68" fill="none" stroke="#16130f" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="ctb-rise absolute left-0 top-[7%] z-20 w-[47%]" style={{ '--d': '80ms' }}>
          <div className="ctb-float" style={{ '--d': '0s' }}>
            <div className="ctb-layer -rotate-[5deg] p-[1em]">
              <p className="text-[1.1em] font-bold">{copy.newLink}</p>
              <div className="relative mt-[0.8em] flex items-center gap-[0.7em] rounded-[0.9em] border border-dashed border-[var(--color-line)] bg-[var(--color-paper-tint)] p-[0.55em]">
                <div className="h-[2.8em] w-[2.8em] shrink-0 overflow-hidden rounded-[0.6em]"><Art name="presets" bare /></div>
                <p className="min-w-0 truncate text-[0.85em] font-medium">{copy.file}</p>
              </div>
              <div className="mt-[0.6em] flex items-center justify-between rounded-[0.9em] bg-[var(--color-paper)] px-[0.8em] py-[0.6em]">
                <span className="text-[0.9em] text-[var(--color-muted)]">{copy.price}</span><span className="text-[1.5em] font-extrabold tracking-tight">$19</span>
              </div>
              <span className="mt-[0.7em] flex w-full items-center justify-center rounded-full bg-[#16130f] py-[0.6em] text-[0.9em] font-bold text-[#fffaf2]">{copy.makeLink}</span>
            </div>
            <div className="absolute -left-[0.4em] -top-[1.1em] flex flex-col items-start gap-[0.35em]">{badge(1, add, '0s')}</div>
            <div className="absolute -left-[0.8em] top-[44%]">{badge(2, price, '2s')}</div>
          </div>
        </div>

        <div className="ctb-rise absolute right-0 top-[11%] z-10 w-[51%]" style={{ '--d': '200ms' }}>
          <div className="ctb-float" style={{ '--d': '1.6s' }}>
            <div className="ctb-layer rotate-[3deg] overflow-hidden">
              <div className="aspect-[16/10]"><Art name="presets" /></div>
              <div className="p-[1em]">
                <p className="text-[1.3em] font-extrabold leading-tight tracking-tight">{copy.product}</p>
                <p className="mt-[0.15em] text-[2.1em] font-extrabold leading-none tracking-tight">$19</p>
                <span className="mt-[0.6em] flex w-full items-center justify-center rounded-full bg-[var(--ctb-accent)] py-[0.65em] text-[0.95em] font-bold text-[#16130f]">{copy.buyFor} $19</span>
                <p className="mt-[0.6em] flex items-center gap-[0.5em] text-[0.8em] text-[var(--color-ink-soft)]"><Check />{copy.instant}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="ctb-paid absolute right-[3%] top-0 z-40">
          <span className="ctb-layer flex items-center gap-[0.6em] rounded-full py-[0.45em] pl-[0.45em] pr-[1em]">
            <b className="inline-flex h-[1.9em] w-[1.9em] items-center justify-center rounded-full bg-[var(--ctb-accent)] text-[0.9em] text-[#16130f]">4</b>
            <span className="text-[0.95em] font-bold">{copy.sold} $19</span>
          </span>
        </div>

        <div className="ctb-rise absolute left-[2%] top-[66%] z-30 w-[58%]" style={{ '--d': '320ms' }}>
          <div className="ctb-float" style={{ '--d': '3.2s' }}>
            <div className="-rotate-[2deg] space-y-[0.5em]">
              <div className="w-fit max-w-full rounded-[1.1em] rounded-bl-[0.3em] bg-[#16130f] px-[1em] py-[0.6em] text-[0.95em] text-[#fffaf2] shadow-lg">{copy.chat}</div>
              <div className="ctb-layer flex items-center gap-[0.5em] rounded-full py-[0.4em] pl-[0.9em] pr-[0.4em]">
                <span className="min-w-0 flex-1 truncate font-mono text-[0.8em]">{copy.link}</span>
                <span className="rounded-full bg-[var(--ctb-accent)] px-[0.8em] py-[0.35em] text-[0.8em] font-bold text-[#16130f]">{copy.copied}</span>
              </div>
            </div>
            <div className="absolute -bottom-[1.4em] left-[1em]">{badge(3, share, '4s')}</div>
          </div>
        </div>
      </div>
    </figure>
  )
}
