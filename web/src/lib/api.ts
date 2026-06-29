// API client for the Shoresh word service.
// Replaces the static-file loader — all word data now comes from the API
// just-in-time. Scores, SR logic, and gloss customisation remain client-side.

import type { Filters, Language, WordEntry } from '../types'
import { mapGreekPOS, mapGreekTense, mapPOS, mapTense } from './mappings'

export interface BatchResponse {
  language: Language
  total_pool: number
  count: number
  words: WordEntry[]
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  ?? 'https://shoresh.up.qombi.com'

// CANDIDATE_LIMIT is the number of words fetched per session — larger than the
// session length so the SR algorithm has a real pool to choose "most difficult"
// from. Not user-facing.
export const CANDIDATE_LIMIT = 250

export async function fetchBatch(
  filters: Filters,
  limit = CANDIDATE_LIMIT,
  random = true,
): Promise<BatchResponse> {
  const isGreek = filters.language === 'Greek'
  const posMap = isGreek ? mapGreekPOS : mapPOS
  const tenseMap = isGreek ? mapGreekTense : mapTense

  const p = new URLSearchParams({ language: filters.language })

  const posCodes = filters.pos.map((l) => posMap[l]).filter(Boolean)
  if (posCodes.length) p.set('pos', posCodes.join(','))

  p.set('min_rank', String(filters.startLevel))
  // Only send max_rank when it's a real upper bound — the API spec says the
  // default is "unbounded", so omitting is cleaner than sending a huge number.
  if (filters.endLevel < 999999) p.set('max_rank', String(filters.endLevel))

  // Stems / voices
  if (!isGreek && filters.stems.length) p.set('stem', filters.stems.join(','))
  if (isGreek && filters.stems.length) p.set('stem', filters.stems.join(','))

  const tenseCodes = filters.tenses.map((l) => tenseMap[l]).filter(Boolean)
  if (tenseCodes.length) p.set('tense', tenseCodes.join(','))

  // suffix: omit when includeSuffix=true (API default = both); send false when
  // the user wants to exclude words with pronominal suffixes.
  if (!isGreek && !filters.includeSuffix) p.set('suffix', 'false')

  p.set('limit', String(Math.min(limit, 500)))
  if (random) p.set('random', 'true')

  const res = await fetch(`${BASE}/words?${p}`)
  if (!res.ok) {
    let msg = res.statusText
    try { msg = await res.text() } catch { /* ignore */ }
    throw new Error(`API ${res.status}: ${msg}`)
  }
  return res.json() as Promise<BatchResponse>
}

// Distinct stem/voice codes present in a word list (for the Stem/Voice filter).
export function availableStems(words: WordEntry[]): string[] {
  const s = new Set<string>()
  for (const w of words) if (w.stem && w.stem !== 'NA') s.add(w.stem)
  return [...s].sort()
}
