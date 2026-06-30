export type Language = 'Hebrew' | 'Aramaic' | 'Greek'

// How the learner answers: type the gloss and check it, or reveal it and
// self-grade. Reveal is the default for non-Latin gloss scripts (CJK, Ethiopic).
export type PracticeMode = 'type' | 'reveal'

export interface WordEntry {
  node: number
  lex: string
  lexUtf8: string
  language: Language
  pos: string
  stem: string    // verbal stem (Hebrew) / voice (Greek) / "NA"
  tense: string   // "NA" for non-verbals
  rank: number
  sfx: boolean
  gloss: string
  ref: string
  clauseWords: string[]
  targetIndex: number
}

export interface ScoreRecord {
  lex: string
  node: number
  timeScore: number
  timeStamp: number
  rep: number
}

export interface Filters {
  language: Language        // single — API takes one language per request
  startLevel: number
  endLevel: number
  pos: string[]             // human-readable labels (keys of the active mapPOS)
  stems: string[]           // codes: stem for Hebrew/Aramaic, voice for Greek
  tenses: string[]          // human-readable labels (keys of the active mapTense)
  glossLanguage: string
  includeSuffix: boolean    // Hebrew/Aramaic only; ignored for Greek
  showLex: boolean
}
