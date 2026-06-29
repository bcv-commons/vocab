import { useState } from 'react'
import type { Filters, Language } from '../types'
import {
  GREEK_VOICES,
  greekVoiceLabel,
  mapGreekPOS,
  mapGreekTense,
  mapPOS,
  mapTense,
  stemLabel,
} from '../lib/mappings'

const LANGUAGES: Language[] = ['Hebrew', 'Aramaic', 'Greek']

type Tab = 'Frequency' | 'Part of Speech' | 'Stem / Voice' | 'Tense' | 'Gloss language'
const TABS_HEB: Tab[] = ['Frequency', 'Part of Speech', 'Stem / Voice', 'Tense', 'Gloss language']
const TABS_GRK: Tab[] = ['Frequency', 'Part of Speech', 'Tense', 'Gloss language']

interface Props {
  filters: Filters
  glossLanguages: string[]
  poolInfo: { count: number; total: number } | null
  sessionLength: number | null
  sessionOptions: Array<number | null>
  onChange: (f: Filters) => void
  onSessionLength: (n: number | null) => void
  onReset: () => void
  onClose: () => void // closes the mobile drawer
}

function CheckList<T extends string>(props: {
  options: T[]
  selected: T[]
  label: (o: T) => string
  onChange: (next: T[]) => void
}) {
  const toggle = (o: T) =>
    props.selected.includes(o)
      ? props.onChange(props.selected.filter((x) => x !== o))
      : props.onChange([...props.selected, o])
  const all = props.options.length === props.selected.length
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button className="btn secondary small" onClick={() => props.onChange(all ? [] : [...props.options])}>
          {all ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div className="checklist">
        {props.options.map((o) => (
          <label key={o}>
            <input type="checkbox" checked={props.selected.includes(o)} onChange={() => toggle(o)} />
            {props.label(o)}
          </label>
        ))}
      </div>
    </div>
  )
}

function defaultsForLanguage(lang: Language): Pick<Filters, 'pos' | 'stems' | 'tenses' | 'includeSuffix'> {
  if (lang === 'Greek') {
    return {
      pos: Object.keys(mapGreekPOS),
      stems: [...GREEK_VOICES],
      tenses: Object.keys(mapGreekTense),
      includeSuffix: false,
    }
  }
  return {
    pos: Object.keys(mapPOS),
    stems: Object.keys(stemLabel),
    tenses: Object.keys(mapTense),
    includeSuffix: true,
  }
}

export default function FilterPanel({
  filters, glossLanguages, poolInfo, sessionLength, sessionOptions,
  onChange, onSessionLength, onReset, onClose,
}: Props) {
  const isGreek = filters.language === 'Greek'
  const TABS = isGreek ? TABS_GRK : TABS_HEB
  const [tab, setTab] = useState<Tab>('Frequency')

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const handleLanguage = (lang: Language) => {
    onChange({ ...filters, language: lang, ...defaultsForLanguage(lang) })
    setTab('Frequency')
  }

  const posLabels = isGreek ? Object.keys(mapGreekPOS) : Object.keys(mapPOS)
  const tenseLabels = isGreek ? Object.keys(mapGreekTense) : Object.keys(mapTense)
  const stemOptions = isGreek ? GREEK_VOICES : Object.keys(stemLabel)
  const stemLabelFn = isGreek
    ? (s: string) => greekVoiceLabel[s] ?? s
    : (s: string) => stemLabel[s] ?? s

  return (
    <section className="panel filter-panel">
      <div className="sheet-handle" aria-hidden />

      <div className="filter-head">
        <h2>Filters</h2>
        <button className="btn done-btn" onClick={onClose}>Done</button>
      </div>

      {/* Language */}
      <div className="filter-section">
        <div className="filter-label">Language</div>
        <div className="seg">
          {LANGUAGES.map((l) => (
            <button key={l} className={filters.language === l ? 'active' : ''} onClick={() => handleLanguage(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Frequency' && (
        <div className="row">
          <label className="field">
            <span>Start level</span>
            <input type="number" min={0} max={9999} value={filters.startLevel}
              onChange={(e) => set({ startLevel: Math.max(0, Number(e.target.value)) })} />
          </label>
          <label className="field">
            <span>End level</span>
            <input type="number" min={0} max={9999} value={filters.endLevel}
              onChange={(e) => set({ endLevel: Math.max(0, Number(e.target.value)) })} />
          </label>
        </div>
      )}

      {tab === 'Part of Speech' && (
        <CheckList options={posLabels} selected={filters.pos} label={(o) => o}
          onChange={(pos) => set({ pos })} />
      )}

      {tab === 'Stem / Voice' && !isGreek && (
        <>
          <CheckList options={stemOptions} selected={filters.stems} label={stemLabelFn}
            onChange={(stems) => set({ stems })} />
          <div className="toggles" style={{ marginTop: 12 }}>
            <label>
              <input type="checkbox" checked={filters.includeSuffix}
                onChange={(e) => set({ includeSuffix: e.target.checked })} />
              Include pronominal suffix
            </label>
          </div>
        </>
      )}

      {tab === 'Tense' && (
        <CheckList options={tenseLabels} selected={filters.tenses} label={(o) => o}
          onChange={(tenses) => set({ tenses })} />
      )}

      {tab === 'Gloss language' && (
        <label className="field">
          <span>Gloss language</span>
          <select value={filters.glossLanguage} onChange={(e) => set({ glossLanguage: e.target.value })}>
            {glossLanguages.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
      )}

      <div className="toggles" style={{ marginTop: 12 }}>
        <label>
          <input type="checkbox" checked={filters.showLex}
            onChange={(e) => set({ showLex: e.target.checked })} />
          Show lexeme
        </label>
      </div>

      <div className="pool-count">
        {poolInfo
          ? `${poolInfo.count.toLocaleString()} fetched from ${poolInfo.total.toLocaleString()} matching words`
          : 'Fetching…'}
      </div>

      {/* Session + reset live here so the toolbar stays clean on mobile */}
      <div className="filter-divider" />
      <div className="filter-section">
        <div className="filter-label">Session length</div>
        <div className="seg">
          {sessionOptions.map((n) => (
            <button key={n ?? 'inf'} className={sessionLength === n ? 'active' : ''}
              onClick={() => onSessionLength(n)}>
              {n ?? '∞'}
            </button>
          ))}
        </div>
      </div>

      <button className="btn secondary block danger" onClick={onReset}>Reset progress</button>
    </section>
  )
}
