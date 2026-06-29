// Answer checking — mirrors the matching logic in Vocab.py's Test():
//   test in [re.sub('\\([a-z]*\\)', '', w).rstrip() for w in gloss]
// where `gloss` was split on '; ' or ', '.

export function splitGlosses(gloss: string): string[] {
  return gloss.split(/; |, /).filter(Boolean)
}

// Strip a trailing "(...)" qualifier, e.g. "how (interr)" -> "how".
export function normalizeGloss(g: string): string {
  return g.replace(/\([a-z]*\)/g, '').trim()
}

export interface GlossResult {
  correct: boolean
  answers: string[] // all accepted glosses (for "other possible answers")
}

export function checkAnswer(input: string, gloss: string): GlossResult {
  const answers = splitGlosses(gloss)
  const accepted = answers.map(normalizeGloss)
  return { correct: accepted.includes(input.trim()), answers }
}
