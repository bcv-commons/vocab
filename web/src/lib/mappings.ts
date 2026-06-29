// label → BHSA/API code maps for the filter panel.
// Human-readable labels are what the UI shows; codes are what the API receives.

// ── Hebrew / Aramaic ──────────────────────────────────────────────────────────

export const mapPOS: Record<string, string> = {
  noun: 'subs',
  verb: 'verb',
  preposition: 'prep',
  conjunction: 'conj',
  'proper noun': 'nmpr',
  article: 'art',
  adjective: 'adjv',
  negative: 'nega',
  'personal pronoun': 'prps',
  adverb: 'advb',
  'demonstrative pronoun': 'prde',
  interjection: 'intj',
  'interrogative particle': 'inrg',
  'interrogative pronoun': 'prin',
}

export const mapTense: Record<string, string> = {
  qatal: 'perf',
  yiqtol: 'impf',
  wayyiqtol: 'wayq',
  'active particple': 'ptca', // (sic) — preserved from original
  'infinitive construct': 'infc',
  imperative: 'impv',
  'passive participle': 'ptcp',
  'infinitive absolute': 'infa',
}

export const stemLabel: Record<string, string> = {
  qal: 'qal', nif: 'nifal', piel: 'piel', pual: 'pual', hit: 'hitpael',
  hif: 'hifil', hof: 'hofal', hsht: 'hishtafel', pasq: 'passive qal',
  etpa: 'etpaal', nit: 'nitpael', hotp: 'hotpaal', tif: 'tifal',
  htpa: 'hitpaal', poal: 'poal', poel: 'poel',
}

// ── Greek ─────────────────────────────────────────────────────────────────────

export const mapGreekPOS: Record<string, string> = {
  verb: 'verb',
  noun: 'noun',
  adjective: 'adj',
  adverb: 'adv',
  preposition: 'prep',
  conjunction: 'conj',
  determiner: 'det',
  pronoun: 'pron',
  particle: 'ptcl',
  interjection: 'intj',
  numeral: 'num',
}

// API returns and accepts full tense names for Greek (label == code).
export const mapGreekTense: Record<string, string> = {
  present: 'present',
  aorist: 'aorist',
  future: 'future',
  perfect: 'perfect',
  imperfect: 'imperfect',
  pluperfect: 'pluperfect',
}

// Voices (Greek equivalent of Hebrew verbal stems).
// The API returns and accepts full words, not abbreviations.
export const GREEK_VOICES: string[] = ['active', 'middle', 'middlepassive', 'passive']
export const greekVoiceLabel: Record<string, string> = {
  active: 'active', middle: 'middle', middlepassive: 'middle-passive', passive: 'passive',
}

// ── Reverse lookups ───────────────────────────────────────────────────────────

export const posLabel: Record<string, string> = Object.fromEntries(
  Object.entries(mapPOS).map(([label, code]) => [code, label]),
)
export const tenseLabel: Record<string, string> = Object.fromEntries(
  Object.entries(mapTense).map(([label, code]) => [code, label]),
)
export const greekPosLabel: Record<string, string> = Object.fromEntries(
  Object.entries(mapGreekPOS).map(([label, code]) => [code, label]),
)
export const greekTenseLabel: Record<string, string> = Object.fromEntries(
  Object.entries(mapGreekTense).map(([label, code]) => [code, label]),
)
