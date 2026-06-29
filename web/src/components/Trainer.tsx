import { useEffect, useRef, useState } from 'react'
import type { Language, ScoreRecord, WordEntry } from '../types'
import { getWord } from '../lib/sr'
import { checkAnswer } from '../lib/glossCheck'
import { updateScore } from '../lib/scores'
import { greekPosLabel, greekTenseLabel, posLabel, tenseLabel } from '../lib/mappings'

const WINDOW = 5

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
}

interface Props {
  pool: WordEntry[]
  scores: ScoreRecord[]
  threshold: number
  showLex: boolean
  sessionLength: number | null
  language: Language
  glossFor: (w: WordEntry) => string
  onScores: (next: ScoreRecord[]) => void
  onSessionComplete: () => void
}

const nowSec = () => Date.now() / 1000

export default function Trainer({
  pool, scores, threshold, showLex, sessionLength, language, glossFor, onScores, onSessionComplete,
}: Props) {
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null)
  const [prevResult, setPrevResult] = useState<PrevResult | null>(null)
  const [input, setInput] = useState('')
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const lastLex = useRef('')
  const questionStart = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const scoresRef = useRef(scores)
  scoresRef.current = scores

  const isGreek = language === 'Greek'
  const dir = isGreek ? 'ltr' : 'rtl'
  const align = isGreek ? 'left' : 'right'
  const lang = isGreek ? 'el' : 'he'

  function drawNext(updatedScores: ScoreRecord[]) {
    const w = getWord(pool, updatedScores, threshold, lastLex.current, nowSec())
    setCurrentWord(w)
    setInput('')
    questionStart.current = nowSec()
    if (w) lastLex.current = w.lex
    // Re-focus after state flush
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  useEffect(() => { drawNext(scoresRef.current) }, []) // mount only; key={batchId} resets on new session

  if (!pool.length) {
    return <p className="empty">No words match the current filters.</p>
  }

  const sessionDone = sessionLength !== null && questionsAnswered >= sessionLength

  const submit = () => {
    if (!currentWord || sessionDone) return
    const timeSpent = Math.max(0.001, nowSec() - questionStart.current)
    const { correct, answers } = checkAnswer(input, glossFor(currentWord))
    const timeStamp = correct ? questionStart.current : nowSec() - threshold * 200000
    const updated = updateScore(scoresRef.current, currentWord, timeSpent, timeStamp, correct)
    onScores(updated)

    const { clauseWords: cw, targetIndex: ti } = windowClause(
      currentWord.clauseWords, currentWord.targetIndex,
    )
    setPrevResult({ word: currentWord, correct, given: input, answers, clauseWords: cw, targetIndex: ti })

    const newCount = questionsAnswered + 1
    setQuestionsAnswered(newCount)
    if (correct) setCorrectCount((n) => n + 1)

    if (sessionLength !== null && newCount >= sessionLength) {
      setCurrentWord(null) // triggers session-done state in input pane
    } else {
      drawNext(updated)
    }
  }

  const wordMeta = (w: WordEntry) => {
    const pl = isGreek ? (greekPosLabel[w.pos] ?? w.pos) : (posLabel[w.pos] ?? w.pos)
    const tl = isGreek ? (greekTenseLabel[w.tense] ?? w.tense) : (tenseLabel[w.tense] ?? w.tense)
    return [
      `rank ${w.rank}`,
      pl,
      w.tense !== 'NA' ? tl : null,
      w.stem !== 'NA' ? w.stem : null,
    ].filter(Boolean).join(' · ')
  }

  // Windowed clause for current word
  const cur = currentWord
    ? windowClause(currentWord.clauseWords, currentWord.targetIndex)
    : null

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

            <div className="clause clause-sm" lang={lang}
              style={{ direction: dir, textAlign: align }}>
              {prevResult.clauseWords.map((w, i) => (
                <span key={i} className={i === prevResult.targetIndex ? 'target' : ''}>{w}</span>
              ))}
            </div>

            {!prevResult.correct && (
              <div className="answer-line wrong">
                Correct: <strong>{prevResult.answers.join(', ')}</strong>
                {prevResult.given && <> — you wrote: &ldquo;{prevResult.given}&rdquo;</>}
              </div>
            )}
            {prevResult.correct && (() => {
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

      {/* ── Progress bar ──────────────────────────────────────────── */}
      {sessionLength !== null && (
        <div className="session-progress">
          <span>{questionsAnswered} / {sessionLength}</span>
          <div className="progress-track">
            <div className="progress-fill"
              style={{ width: `${Math.min(questionsAnswered / sessionLength, 1) * 100}%` }} />
          </div>
          <span>{correctCount} correct</span>
        </div>
      )}

      {/* ── Input pane ────────────────────────────────────────────── */}
      <div className="input-pane">
        {sessionDone ? (
          <div className="session-summary">
            <div className="session-score">
              {correctCount} / {sessionLength} correct
              {' '}({Math.round((correctCount / sessionLength!) * 100)}%)
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

            <div className="answer-row">
              <input
                ref={inputRef}
                placeholder="Gloss…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
              />
              <button onClick={submit}>Check</button>
            </div>
          </>
        ) : null}
      </div>

    </div>
  )
}
