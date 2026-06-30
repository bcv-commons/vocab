import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Filters, PracticeMode, ScoreRecord, WordEntry } from './types'
import { BatchResponse, fetchBatch, fetchGlossLanguages } from './lib/api'
import { loadScores, saveScores } from './lib/scores'
import { mapPOS, mapTense, stemLabel } from './lib/mappings'
import FilterPanel from './components/FilterPanel'
import Trainer from './components/Trainer'
import Stats from './components/Stats'
import DifficultTables from './components/DifficultTables'

const THRESHOLD = 5
type Mode = 'Train' | 'Stats' | 'Difficult'
const SESSION_OPTIONS: Array<number | null> = [10, 20, 30, 50, null] // null = continuous

// Gloss languages whose script can't reasonably be typed → default to reveal.
const REVEAL_DEFAULT_LANGS = new Set(['Chinese-Simplified', 'Chinese-Traditional', 'Amharic'])
const defaultPracticeMode = (glossLanguage: string): PracticeMode =>
  REVEAL_DEFAULT_LANGS.has(glossLanguage) ? 'reveal' : 'type'

const DEFAULT_FILTERS: Filters = {
  language: 'Hebrew',
  startLevel: 0,
  endLevel: 100,
  pos: Object.keys(mapPOS),
  stems: Object.keys(stemLabel),
  tenses: Object.keys(mapTense),
  glossLanguage: 'English',
  includeSuffix: true,
  showLex: false,
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [batch, setBatch] = useState<BatchResponse | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // batchId increments on each new fetch; used as Trainer key to reset session state
  const [batchId, setBatchId] = useState(0)

  const [mode, setMode] = useState<Mode>('Train')
  const [sessionLength, setSessionLength] = useState<number | null>(20)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('type')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [scores, setScores] = useState<ScoreRecord[]>([])

  // Gloss languages available for the current source language (from the API).
  const [glossLangs, setGlossLangs] = useState<string[]>(['English'])
  useEffect(() => {
    let cancelled = false
    fetchGlossLanguages(filters.language).then((langs) => {
      if (cancelled) return
      setGlossLangs(langs)
      // If the selected gloss language isn't offered for this source language,
      // fall back to English.
      if (!langs.includes(filters.glossLanguage)) {
        setFilters((f) => ({ ...f, glossLanguage: 'English' }))
      }
    })
    return () => { cancelled = true }
  }, [filters.language]) // eslint-disable-line react-hooks/exhaustive-deps

  // Score history is per gloss language.
  useEffect(() => {
    setScores(loadScores(filters.glossLanguage))
  }, [filters.glossLanguage])

  // Pick the sensible answer mode for the chosen gloss language (reveal for
  // non-typable scripts). The user can still override it afterwards.
  useEffect(() => {
    setPracticeMode(defaultPracticeMode(filters.glossLanguage))
  }, [filters.glossLanguage])

  // Debounced fetch whenever filters change. Stale fetches are discarded.
  const fetchRef = useRef(0)
  useEffect(() => {
    const id = ++fetchRef.current
    setFetchError(null)
    const timer = setTimeout(async () => {
      setFetching(true)
      try {
        const res = await fetchBatch(filters)
        if (fetchRef.current !== id) return // stale
        setBatch(res)
        setBatchId((n) => n + 1)
      } catch (e) {
        if (fetchRef.current !== id) return
        setFetchError(String(e))
      } finally {
        if (fetchRef.current === id) setFetching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const doNewSession = useCallback(async () => {
    const id = ++fetchRef.current
    setFetching(true)
    setFetchError(null)
    try {
      const res = await fetchBatch(filters)
      if (fetchRef.current !== id) return
      setBatch(res)
      setBatchId((n) => n + 1)
    } catch (e) {
      if (fetchRef.current !== id) return
      setFetchError(String(e))
    } finally {
      if (fetchRef.current === id) setFetching(false)
    }
  }, [filters])

  const updateScores = (next: ScoreRecord[]) => {
    setScores(next)
    saveScores(filters.glossLanguage, next)
  }

  // The API already resolves the gloss (per gloss_lang) and filters the pool to
  // lexemes that have one. We only drop placeholder glosses and empty clauses.
  const pool: WordEntry[] = useMemo(() => {
    if (!batch) return []
    return batch.words.filter(
      (w) => w.gloss && w.gloss.trim() !== '-' && w.clauseWords.some((t) => t.trim()),
    )
  }, [batch])

  // Gloss arrives pre-resolved in the active language; just read it.
  const glossFor = useCallback((w: WordEntry) => w.gloss, [])

  const poolInfo = batch
    ? { count: batch.words.length, total: batch.total_pool }
    : null

  const resetProgress = () => {
    if (!confirm(`Erase all ${filters.glossLanguage} practice history?`)) return
    updateScores([])
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vocab — Biblical Hebrew, Aramaic &amp; Greek</h1>
        <p>
          Web port of{' '}
          <a href="https://github.com/ch-jensen/Vocab" target="_blank" rel="noreferrer">
            ch-jensen/Vocab
          </a>{' '}
          by Christian Canu Højgaard · data © ETCBC (CC BY-NC-SA)
        </p>
      </header>

      {fetchError && (
        <div className="panel" style={{ color: 'var(--red)', marginBottom: 16 }}>
          {fetchError}
          <button className="btn secondary" style={{ marginLeft: 12, fontSize: 12 }} onClick={doNewSession}>
            Retry
          </button>
        </div>
      )}

      <div className="layout">
        <div className={`filters-host ${filtersOpen ? 'open' : ''}`}>
          <FilterPanel
            filters={filters}
            glossLanguages={glossLangs}
            poolInfo={poolInfo}
            sessionLength={sessionLength}
            sessionOptions={SESSION_OPTIONS}
            practiceMode={practiceMode}
            onChange={setFilters}
            onSessionLength={setSessionLength}
            onPracticeMode={setPracticeMode}
            onReset={resetProgress}
            onClose={() => setFiltersOpen(false)}
          />
        </div>
        <div className={`backdrop ${filtersOpen ? 'show' : ''}`} onClick={() => setFiltersOpen(false)} />

        <main>
          <div className="toolbar">
            <div className="seg mode-seg">
              {(['Train', 'Stats', 'Difficult'] as Mode[]).map((m) => (
                <button key={m} className={m === mode ? 'active' : ''} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
            <div className="toolbar-actions">
              {fetching && <span className="fetching-tag">Fetching…</span>}
              <button className="btn secondary" onClick={doNewSession} disabled={fetching}
                title="Fetch a new random set with the current filters">
                New words
              </button>
              <button className="btn secondary filters-toggle" onClick={() => setFiltersOpen(true)}>
                ⚙ Filters
              </button>
            </div>
          </div>

          <section className="panel content-panel">
            {!batch && fetching ? (
              <p className="empty">Fetching words…</p>
            ) : !batch ? (
              <p className="empty">No words loaded yet.</p>
            ) : mode === 'Train' ? (
              <Trainer
                key={batchId}
                pool={pool}
                scores={scores}
                threshold={THRESHOLD}
                showLex={filters.showLex}
                sessionLength={sessionLength}
                language={filters.language}
                practiceMode={practiceMode}
                glossFor={glossFor}
                onScores={updateScores}
                onSessionComplete={doNewSession}
              />
            ) : mode === 'Stats' ? (
              <Stats pool={pool} scores={scores} threshold={THRESHOLD} filters={filters} />
            ) : (
              <DifficultTables scores={scores} words={batch.words} />
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
