import type { Filters, ScoreRecord, WordEntry } from '../types'
import { getLevel, meanScore } from '../lib/sr'

interface Props {
  pool: WordEntry[]
  scores: ScoreRecord[]
  threshold: number
  filters: Filters
}

// A minimal SVG pie (active vs. inactive) — replaces the matplotlib pie in Stats().
function Pie({ fraction }: { fraction: number }) {
  const r = 80
  const c = 2 * Math.PI * r
  const active = (fraction / 100) * c
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r={r} fill="#f97316" />
      <circle
        cx="90"
        cy="90"
        r={r / 2}
        fill="none"
        stroke="#2563eb"
        strokeWidth={r}
        strokeDasharray={`${active / 2} ${c}`}
        transform="rotate(-90 90 90)"
      />
    </svg>
  )
}

export default function Stats({ pool, scores, threshold, filters }: Props) {
  const potLexemes = new Set(pool.map((w) => w.lex))
  const now = Date.now() / 1000
  const mean = meanScore(scores)

  const active = scores.filter(
    (s) => potLexemes.has(s.lex) && getLevel(s.lex, scores, now, mean) < threshold,
  )
  const fraction = potLexemes.size > 0 ? (active.length / potLexemes.size) * 100 : 0
  const avgTime =
    active.length > 0 ? active.reduce((a, s) => a + s.timeScore, 0) / active.length : null

  const presets = [
    filters.language,
    ...filters.pos,
    ...filters.stems,
    ...filters.tenses,
    filters.language !== 'Greek' && filters.includeSuffix ? 'sfx' : '',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Overall stats</h2>
      <div className="stats-grid">
        <Pie fraction={fraction} />
        <div>
          <div className="stat-line">
            <b>{fraction.toFixed(2)}%</b> active at level {filters.startLevel}–{filters.endLevel}
          </div>
          <div className="stat-line">
            {active.length} of {potLexemes.size} lexemes active (blue)
          </div>
          {avgTime !== null && (
            <div className="stat-line">Average response time: {avgTime.toFixed(3)} s</div>
          )}
          <div className="stat-line" style={{ color: 'var(--muted)', fontSize: 13 }}>
            Presets: {presets || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
