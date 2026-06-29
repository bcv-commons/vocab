// Custom gloss-language support — loads <Language>_glosses.csv files (same
// format as the original Danish_glosses.csv) and resolves the right gloss for a
// given word, mirroring the gloss-selection logic in Vocab.py's Test().
//
// CSV layout: an unnamed index column, then `lex`, then a `default` column and
// one column per verbal stem (qal, nif, piel, ...). For a verb, the gloss for
// its stem is used (falling back to the first non-empty stem); for everything
// else, the `default` column is used.

import type { WordEntry } from '../types'

export interface GlossLanguage {
  name: string
  file: string
}

export interface GlossSet {
  byLex: Map<string, Record<string, string>>
  columns: string[] // gloss columns in order: ['default', 'qal', 'nif', ...]
}

// Minimal RFC-4180-ish CSV parser: handles quoted fields containing commas and
// escaped "" quotes (the Danish file has e.g. "ville, ønske, akceptere").
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function parseGlossCsv(text: string): GlossSet {
  const rows = parseCsv(text)
  if (rows.length === 0) return { byLex: new Map(), columns: [] }
  const header = rows[0]
  const columns = header.slice(2) // skip index + lex columns
  const byLex = new Map<string, Record<string, string>>()
  for (const r of rows.slice(1)) {
    const lex = r[1]?.trim()
    if (!lex) continue
    const rec: Record<string, string> = {}
    columns.forEach((col, idx) => {
      const val = r[2 + idx]?.trim()
      if (val) rec[col] = val
    })
    if (Object.keys(rec).length > 0) byLex.set(lex, rec) // skip all-empty rows
  }
  return { byLex, columns }
}

export async function loadGlossLanguages(): Promise<GlossLanguage[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/glosses/manifest.json`)
    if (!res.ok) return []
    const m = (await res.json()) as { languages: GlossLanguage[] }
    return m.languages ?? []
  } catch {
    return []
  }
}

export async function loadGlossSet(file: string): Promise<GlossSet> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/glosses/${file}`)
  if (!res.ok) throw new Error(`Failed to load glosses: ${res.status}`)
  return parseGlossCsv(await res.text())
}

// Resolve a word's gloss from a custom set, or null if none exists.
export function resolveGloss(word: WordEntry, set: GlossSet): string | null {
  const rec = set.byLex.get(word.lex)
  if (!rec) return null
  if (word.stem !== 'NA') {
    if (rec[word.stem]) return rec[word.stem]
    for (const col of set.columns) if (rec[col]) return rec[col] // first non-empty
    return null
  }
  // Non-verb: prefer `default`, fall back to any non-empty column.
  if (rec.default) return rec.default
  for (const col of set.columns) if (rec[col]) return rec[col]
  return null
}

// Lexemes that have at least one gloss — the pool is restricted to these when a
// custom gloss language is selected (mirrors the dropna filter in the original).
export function lexemesWithGloss(set: GlossSet): Set<string> {
  return new Set(set.byLex.keys())
}
