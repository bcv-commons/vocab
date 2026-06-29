import type { ScoreRecord, WordEntry } from '../types'
import { getLevel, meanScore } from '../lib/sr'

interface Props {
  scores: ScoreRecord[]
  words: WordEntry[]
}

// Mirrors the two tables at the bottom of the notebook: lexemes with the
// highest "level" (most overdue/difficult) and those repeated most often.
export default function DifficultTables({ scores, words }: Props) {
  const now = Date.now() / 1000
  const mean = meanScore(scores)
  const heb = (lex: string) => words.find((w) => w.lex === lex)?.lexUtf8 ?? ''

  if (scores.length === 0) {
    return <p className="empty">No practice history yet — train a few words and they'll show up here.</p>
  }

  const byLevel = [...scores]
    .map((s) => ({ ...s, level: getLevel(s.lex, scores, now, mean) }))
    .sort((a, b) => b.level - a.level)
    .slice(0, 10)

  const byRep = [...scores].sort((a, b) => b.rep - a.rep).slice(0, 10)

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Most difficult lexemes</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>Highest level (most overdue):</p>
      <table>
        <thead>
          <tr>
            <th>Lexeme</th>
            <th></th>
            <th>Level</th>
            <th>Reps</th>
          </tr>
        </thead>
        <tbody>
          {byLevel.map((s) => (
            <tr key={s.lex}>
              <td className="heb" lang="he">
                {heb(s.lex)}
              </td>
              <td style={{ color: 'var(--muted)' }}>{s.lex}</td>
              <td>{Number.isFinite(s.level) ? s.level.toFixed(2) : '∞'}</td>
              <td>{s.rep}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 24 }}>Repeated most times</h2>
      <table>
        <thead>
          <tr>
            <th>Lexeme</th>
            <th></th>
            <th>Reps</th>
          </tr>
        </thead>
        <tbody>
          {byRep.map((s) => (
            <tr key={s.lex}>
              <td className="heb" lang="he">
                {heb(s.lex)}
              </td>
              <td style={{ color: 'var(--muted)' }}>{s.lex}</td>
              <td>{s.rep}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
