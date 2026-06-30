import { useEffect, useRef, useState, useCallback } from 'react'
import type { Language, PracticeMode, ScoreRecord, WordEntry } from '../types'
import { getWord } from '../lib/sr'
import { checkAnswer, splitGlosses } from '../lib/glossCheck'
import { updateScore } from '../lib/scores'
import { greekPosLabel, greekTenseLabel, posLabel, tenseLabel } from '../lib/mappings'

const WINDOW = 5
const CHOICE_COUNT = 4 // total options including the correct one

const MODE_META: Record<PracticeMode, { icon: string; label: string }> = {
  type:   { icon: 'Aa',   label: 'Type' },
  choice: { icon: '☰',   label: 'Choice' },
  reveal: { icon: '○→●', label: 'Reveal' },
}

function pickChoices(pool: WordEntry[], correct: WordEntry, glossFor: (w: WordEntry) => string): string[] {
  const correctGloss = glossFor(correct)
  // Collect unique glosses from other pool words that differ from the correct one.
  const seen = new Set<string>([correctGloss])
  const distractors: string[] = []
  // Shuffle a copy of pool indices for random sampling without repetition.
  const indices = pool.map((_, i) => i).sort(() => Math.random() - 0.5)
  for (const i of indices) {
    if (distractors.length >= CHOICE_COUNT - 1) break
    const g = glossFor(pool[i])
    if (!g || g.trim() === '-' || seen.has(g)) continue
    // Use just the first gloss variant to keep buttons short.
    const short = g.split(/[;,]/)[0].trim()
    if (seen.has(short)) continue
    seen.add(short)
    distractors.push(short)
  }
  // Combine and shuffle.
  const options = [correctGloss, ...distractors]
  return options.sort(() => Math.random() - 0.5)
}

function windowClause(clauseWords: string[], targetIndex: number) {
  if (clauseWords.length <= WINDOW * 2 + 1) return { clauseWords, targetIndex }
  const start = Math.max(0, targetIndex - WINDOW)
  const end = Math.min(clauseWords.length, targetIndex + WINDOW + 1)
  return { clauseWords: clauseWords.slice(start, end), targetIndex: targetIndex - start }
}

interface PrevResult {
  word: WordEntry
  correct: boolean
  given: string
  answers: string[]
  clauseWords: string[]
  targetIndex: number
  mode: PracticeMode
}

interface Props {
  pool: WordEntry[]
  scores: ScoreRecord[]
  threshold: number
  showLex: boolean
  sessionLength: number | null
  language: Language
  practiceMode: PracticeMode
  glossFor: (w: WordEntry) => string
  onScores: (next: ScoreRecord[]) => void
  onSessionComplete: () => void
  onPracticeMode: (m: PracticeMode) => void
}

const nowSec = () => Date.now() / 1000

export default function Trainer({
  pool, scores, threshold, showLex, sessionLength, language, practiceMode,
  glossFor, onScores, onSessionComplete, onPracticeMode,
}: Props) {
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null)
  const [prevResult, setPrevResult] = useState<PrevResult | null>(null)
  const [input, setInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [choices, setChoices] = useState<string[]>([])
  const [modeOpen, setModeOpen] = useState(false)
  const modePickerRef = useRef<HTMLDivElement>(null)

  const closeModeOnOutside = useCallback((e: MouseEvent) => {
    if (modePickerRef.current && !modePickerRef.current.contains(e.target as Node)) {
      setModeOpen(false)
    }
  }, [])
  useEffect(() => {
    if (modeOpen) document.addEventListener('mousedown', closeModeOnOutside)
    return () => document.removeEventListener('mousedown', closeModeOnOutside)
  }, [modeOpen, closeModeOnOutside])
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const lastLex = useRef('')
  const questionStart = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const revealBtnRef = useRef<HTMLButtonElement>(null)
  const scoresRef = useRef(scores)
  scoresRef.current = scores
  const modeRef = useRef(practiceMode)
  modeRef.current = practiceMode

  const isGreek = language === 'Greek'
  const dir = isGreek ? 'ltr' : 'rtl'
  const align = isGreek ? 'left' : 'right'
  const lang = isGreek ? 'el' : 'he'

  function drawNext(updatedScores: ScoreRecord[]) {
    const w = getWord(pool, updatedScores, threshold, lastLex.current, nowSec())
    setCurrentWord(w)
    setInput('')
    setRevealed(false)
    if (w && modeRef.current === 'choice') setChoices(pickChoices(pool, w, glossFor))
    else setChoices([])
    questionStart.current = nowSec()
    if (w) lastLex.current = w.lex
    requestAnimationFrame(() => {
      if (modeRef.current === 'type') inputRef.current?.focus()
      else revealBtnRef.current?.focus()
    })
  }

  useEffect(() => { drawNext(scoresRef.current) }, []) // mount only; key={batchId} resets on new session

  const sessionDone = sessionLength !== null && questionsAnswered >= sessionLength

  // Shared scoring path for both modes.
  function record(correct: boolean, given: string, answers: string[]) {
    if (!currentWord || sessionDone) return
    const timeSpent = Math.max(0.001, nowSec() - questionStart.current)
    // Wrong answers are predated so the SR algorithm resurfaces them soon.
    const timeStamp = correct ? questionStart.current : nowSec() - threshold * 200000
    const updated = updateScore(scoresRef.current, currentWord, timeSpent, timeStamp, correct)
    onScores(updated)

    const { clauseWords: cw, targetIndex: ti } = windowClause(
      currentWord.clauseWords, currentWord.targetIndex,
    )
    setPrevResult({ word: currentWord, correct, given, answers, clauseWords: cw, targetIndex: ti, mode: modeRef.current })

    const newCount = questionsAnswered + 1
    setQuestionsAnswered(newCount)
    if (correct) setCorrectCount((n) => n + 1)

    if (sessionLength !== null && newCount >= sessionLength) {
      setCurrentWord(null) // triggers session-done state
    } else {
      drawNext(updated)
    }
  }

  const submitTyped = () => {
    if (!currentWord) return
    const { correct, answers } = checkAnswer(input, glossFor(currentWord))
    record(correct, input, answers)
  }

  const grade = (correct: boolean) => {
    if (!currentWord) return
    record(correct, '', splitGlosses(glossFor(currentWord)))
  }

  const pickChoice = (chosen: string) => {
    if (!currentWord) return
    const correctGloss = glossFor(currentWord)
    const correct = chosen === correctGloss
    record(correct, chosen, splitGlosses(correctGloss))
  }

  // Keyboard for reveal mode: Space/Enter reveals; then 1/← = didn't know, 2/→ = knew it.
  useEffect(() => {
    if (practiceMode !== 'reveal' || !currentWord || sessionDone) return
    const onKey = (e: KeyboardEvent) => {
      if (!revealed) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRevealed(true) }
      } else if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); grade(false) }
      else if (e.key === '2' || e.key === 'ArrowRight') { e.preventDefault(); grade(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [practiceMode, revealed, currentWord, sessionDone, questionsAnswered]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!pool.length) {
    return <p className="empty">No words match the current filters.</p>
  }

  const wordMeta = (w: WordEntry) => {
    const pl = isGreek ? (greekPosLabel[w.pos] ?? w.pos) : (posLabel[w.pos] ?? w.pos)
    const tl = isGreek ? (greekTenseLabel[w.tense] ?? w.tense) : (tenseLabel[w.tense] ?? w.tense)
    return [`rank ${w.rank}`, pl, w.tense !== 'NA' ? tl : null, w.stem !== 'NA' ? w.stem : null]
      .filter(Boolean).join(' · ')
  }

  const cur = currentWord ? windowClause(currentWord.clauseWords, currentWord.targetIndex) : null

  return (
    <div className="trainer-wrap">

      {/* ── Result pane ───────────────────────────────────────────── */}
      <div className="result-pane">
        {prevResult ? (
          <>
            <div className="result-head">
              <span className="ref">{prevResult.word.ref}</span>
              <span className={`feedback-badge ${prevResult.correct ? 'correct' : 'wrong'}`}>
                {prevResult.correct ? '✓ Correct' : '✗ Wrong'}
              </span>
            </div>

            <div className="clause clause-sm" lang={lang} style={{ direction: dir, textAlign: align }}>
              {prevResult.clauseWords.map((w, i) => (
                <span key={i} className={i === prevResult.targetIndex ? 'target' : ''}>{w}</span>
              ))}
            </div>

            {prevResult.mode === 'reveal' ? (
              <div className="answer-line">Gloss: <strong>{prevResult.answers.join(', ')}</strong></div>
            ) : !prevResult.correct ? (
              <div className="answer-line wrong">
                Correct: <strong>{prevResult.answers.join(', ')}</strong>
                {prevResult.given && <> — you wrote: &ldquo;{prevResult.given}&rdquo;</>}
              </div>
            ) : (() => {
              const others = prevResult.answers
                .map((a) => a.replace(/\([a-z]*\)/g, '').trim())
                .filter((a) => a !== prevResult.given)
              return others.length > 0
                ? <div className="answer-line muted">Also accepted: {others.join(', ')}</div>
                : null
            })()}

            <div className="lexfact-inline">
              <span className="lex-sm" lang={lang}>{prevResult.word.lexUtf8}</span>
              <span className="meta">{wordMeta(prevResult.word)}</span>
            </div>
          </>
        ) : (
          <div className="result-placeholder">Answer the word below — results appear here</div>
        )}
      </div>

      {/* ── Progress bar + mode picker ────────────────────────────── */}
      <div className="session-progress">
        {sessionLength !== null ? (
          <>
            <span>{questionsAnswered} / {sessionLength}</span>
            <div className="progress-track">
              <div className="progress-fill"
                style={{ width: `${Math.min(questionsAnswered / sessionLength, 1) * 100}%` }} />
            </div>
            <span>{correctCount} correct</span>
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <div className="mode-picker" ref={modePickerRef}>
          <button className="mode-picker-icon" onClick={() => setModeOpen((o) => !o)}
            title={MODE_META[practiceMode].label}>
            {MODE_META[practiceMode].icon}
          </button>
          {modeOpen && (
            <div className="mode-picker-menu">
              {(['type', 'choice', 'reveal'] as PracticeMode[]).map((m) => (
                <button key={m} className={`mode-picker-option${practiceMode === m ? ' active' : ''}`}
                  onClick={() => { onPracticeMode(m); setModeOpen(false) }}>
                  <span className="mode-picker-option-icon">{MODE_META[m].icon}</span>
                  {MODE_META[m].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Input pane ────────────────────────────────────────────── */}
      <div className="input-pane">
        {sessionDone ? (
          <div className="session-summary">
            <div className="session-score">
              {correctCount} / {sessionLength} correct{' '}
              ({Math.round((correctCount / sessionLength!) * 100)}%)
            </div>
            <button className="btn" onClick={onSessionComplete}>Go again →</button>
          </div>
        ) : cur && currentWord ? (
          <>
            <div className="clause" lang={lang} style={{ direction: dir, textAlign: align }}>
              {cur.clauseWords.map((w, i) => (
                <span key={i} className={i === cur.targetIndex ? 'target' : ''}>{w}</span>
              ))}
            </div>
            <div className="ref">{currentWord.ref}</div>

            {showLex && (
              <div className="ref" style={{ direction: dir, fontSize: 22 }} lang={lang}>
                {currentWord.lexUtf8}
              </div>
            )}

            {practiceMode === 'type' ? (
              <div className="answer-row">
                <input
                  ref={inputRef}
                  placeholder="Gloss…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
                  autoFocus
                />
                <button onClick={submitTyped}>Check</button>
              </div>
            ) : practiceMode === 'choice' ? (
              <div className="choice-grid">
                {choices.map((c) => (
                  <button key={c} className="btn secondary choice-btn" onClick={() => pickChoice(c)}>
                    {c}
                  </button>
                ))}
              </div>
            ) : !revealed ? (
              <div className="answer-row">
                <button ref={revealBtnRef} className="btn block" onClick={() => setRevealed(true)}>
                  Reveal answer <span className="key-hint">space</span>
                </button>
              </div>
            ) : (
              <>
                <div className="reveal-gloss">{glossFor(currentWord)}</div>
                <div className="grade-row">
                  <button className="btn grade-wrong" onClick={() => grade(false)}>
                    ✗ Didn’t know <span className="key-hint">1</span>
                  </button>
                  <button className="btn grade-right" onClick={() => grade(true)}>
                    ✓ Knew it <span className="key-hint">2</span>
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}
      </div>

    </div>
  )
}
