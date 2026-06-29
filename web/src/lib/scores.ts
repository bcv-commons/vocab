// Persistence for the spaced-repetition score data.
// The original app kept a <Language>_score.csv on disk; here we use the
// browser's localStorage, keyed per gloss language so each track is separate.

import type { ScoreRecord, WordEntry } from '../types'

const keyFor = (glossLanguage: string) => `vocab.scores.${glossLanguage}`

export function loadScores(glossLanguage: string): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(keyFor(glossLanguage))
    return raw ? (JSON.parse(raw) as ScoreRecord[]) : []
  } catch {
    return []
  }
}

export function saveScores(glossLanguage: string, scores: ScoreRecord[]): void {
  localStorage.setItem(keyFor(glossLanguage), JSON.stringify(scores))
}

// Update the repetition counter exactly as Vocab.py does:
//   - correct & rep > 1  -> rep - 1   (you're learning it)
//   - wrong              -> rep + 1   (needs more practice)
//   - otherwise (new, or correct at rep 1) -> rep stays at its default of 1
export function updateScore(
  scores: ScoreRecord[],
  word: WordEntry,
  timeSpent: number,
  timeStamp: number,
  correct: boolean,
): ScoreRecord[] {
  const existing = scores.find((s) => s.lex === word.lex)
  let rep = 1
  if (existing) {
    if (existing.rep > 1 && correct) rep = existing.rep - 1
    else if (!correct) rep = existing.rep + 1
    else rep = existing.rep
  }
  const rest = scores.filter((s) => s.lex !== word.lex)
  const updated: ScoreRecord = {
    lex: word.lex,
    node: word.node,
    timeScore: timeSpent,
    timeStamp,
    rep,
  }
  return [...rest, updated].sort((a, b) => a.lex.localeCompare(b.lex))
}
