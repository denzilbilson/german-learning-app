/**
 * GenderBadge — coloured pill badge showing German noun gender.
 *
 * Parses the Part of Speech string and detects gender from:
 *   - Explicit markers: (m.), (f.), (n.), maskulin, feminin, neutral, pl.
 *   - Article prefix in the word itself: "der Tisch", "die Frau", "das Kind"
 *
 * Gender → colour mapping:
 *   masculine → der       → accent-blue   (#4A90D9)
 *   feminine  → die       → accent-red    (#D94A6B)
 *   neuter    → das       → accent-green  (#4AD97A)
 *   plural    → die (pl.) → accent-purple (#9B59B6)
 *
 * Exports:
 *   default GenderBadge({ pos: string, className?: string })
 *     — renders the badge, or null if gender cannot be detected
 *   detectGender(posString: string) → 'masculine'|'feminine'|'neuter'|'plural'|null
 *     — exported helper for use in other components
 *   GenderLegend()
 *     — compact legend showing all four genders; used in the sidebar footer
 */

const GENDERS = {
  masculine: { label: 'der',  color: '#4A90D9', bg: 'rgba(74,144,217,0.12)',  border: 'rgba(74,144,217,0.3)'  },
  feminine:  { label: 'die',  color: '#D94A6B', bg: 'rgba(217,74,107,0.12)', border: 'rgba(217,74,107,0.3)' },
  neuter:    { label: 'das',  color: '#4AD97A', bg: 'rgba(74,217,122,0.12)', border: 'rgba(74,217,122,0.3)' },
  plural:    { label: 'die (pl.)', color: '#9B59B6', bg: 'rgba(155,89,182,0.12)', border: 'rgba(155,89,182,0.3)' },
}

export function detectGender(posString = '') {
  const s = posString.toLowerCase()
  // Explicit plural markers
  if (s.includes('pl.') || s.includes('plural') || s.includes('(pl)')) return 'plural'
  // Explicit gender markers: (m.), (f.), (n.), maskulin, feminin, neutral
  if (s.includes('(m.)') || s.includes('maskulin') || s.includes(' m,') || s === 'm' || s.includes('masc')) return 'masculine'
  if (s.includes('(f.)') || s.includes('feminin')  || s.includes(' f,') || s === 'f' || s.includes('fem'))  return 'feminine'
  if (s.includes('(n.)') || s.includes('neutral')  || s.includes('neut') || s === 'n') return 'neuter'
  // Article prefix in the word itself: "die Vorstellung", "der Tisch", "das Kind"
  if (s.startsWith('der ') || s === 'der') return 'masculine'
  if (s.startsWith('die ') || s === 'die') return 'feminine'
  if (s.startsWith('das ') || s === 'das') return 'neuter'
  return null
}

export default function GenderBadge({ pos, className = '' }) {
  const gender = detectGender(pos)
  if (!gender) return null
  const { label, color, bg, border } = GENDERS[gender]

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${className}`}
      style={{ color, backgroundColor: bg, border: `1px solid ${border}` }}
      title={`${gender} noun`}
    >
      {label}
    </span>
  )
}

/**
 * Standalone legend component for the sidebar footer.
 */
export function GenderLegend() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] text-warm-700 uppercase tracking-widest font-medium mb-0.5">Noun Gender</p>
      {Object.entries(GENDERS).map(([, { label, color, bg, border }]) => (
        <span key={label} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span
            className="text-xs px-1.5 py-0 rounded font-medium leading-5"
            style={{ color, backgroundColor: bg, border: `1px solid ${border}` }}
          >
            {label}
          </span>
        </span>
      ))}
    </div>
  )
}
