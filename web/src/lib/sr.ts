// Spaced-repetition core — a direct port of getLevel() / GetWord() from Vocab.py.
//
// The model: a lexeme is "active" (well known) when its level is LOW, and due
// for practice when its level is HIGH. Level grows with (a) time since last
// seen, (b) how slowly you answered, and (c) how many times you've missed it.

import type { ScoreRecord, WordEntry } from '../types'

export function meanScore(scores: ScoreRecord[]): number {
  if (scores.length === 0) return 1
  return scores.reduce((sum, s) => sum + s.timeScore, 0) / scores.length
}

// level = elapsed_time * time_score * repetitions / mean_score / 86400
// (86400 = seconds per day). Returns Infinity for never-seen lexemes so they
// are always treated as "due".
export function getLevel(
  lex: string,
  scores: ScoreRecord[],
  now: number,
  mean = meanScore(scores),
): number {
  const rec = scores.find((s) => s.lex === lex)
  if (!rec) return Infinity
  const elapsed = now - rec.timeStamp
  return (elapsed * rec.timeScore * rec.rep) / mean / 86400
}

// Pick the next word to test. New lexemes are always eligible; known lexemes are
// only offered once their level exceeds the threshold (i.e. they're "due"),
// with up to 50 retries to find one before giving up. Never repeats `lastLex`
// back-to-back. Iterative rewrite of the original recursive GetWord().
export function getWord(
  words: WordEntry[],
  scores: ScoreRecord[],
  threshold: number,
  lastLex: string,
  now: number,
): WordEntry | null {
  if (words.length === 0) return null
  const mean = meanScore(scores)
  const scored = new Set(scores.map((s) => s.lex))
  const pick = () => words[Math.floor(Math.random() * words.length)]

  for (let iteration = 0; iteration <= 51; iteration++) {
    const word = pick()
    if (!scored.has(word.lex)) return word // new word: always eligible
    if (iteration > 50) return word // exhausted retries: take what we have
    if (word.lex === lastLex) continue // avoid immediate repetition
    if (getLevel(word.lex, scores, now, mean) > threshold) return word // due
    // otherwise still "active" — keep looking
  }
  return pick()
}
