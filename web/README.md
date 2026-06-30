# Vocab (web)

A browser port of [ch-jensen/Vocab](https://github.com/ch-jensen/Vocab) — a
Biblical Hebrew, Aramaic & Greek vocabulary trainer — by Christian Canu
Højgaard. Vite + React + TypeScript. The original ran inside a Jupyter notebook
on top of `text-fabric`/BHSA; this re-implements the UI and the spaced-repetition
algorithm as a single-page app that pulls words from a word API just-in-time.
No backend of its own — scores and gloss customisation live in the browser.

## Run it

```bash
cd web
pnpm install
pnpm dev         # http://localhost:5173
pnpm build       # static bundle in dist/  (deploy anywhere)
```

Set the word-service URL in `.env` (copy from `.env.example`):

```
VITE_API_URL=https://shoresh.up.qombi.com
```

Each session fetches a candidate batch from `GET /words` (filtered by language,
POS, stem, tense, rank band…), the spaced-repetition picker chooses words to
test from it, and progress is saved in `localStorage` (one track per gloss
language).

## What's ported

| Original (Vocab.py / notebook)        | Here                                              |
| ------------------------------------- | ------------------------------------------------- |
| `getLevel()` / `GetWord()` algorithm  | `src/lib/sr.ts` (verbatim)                         |
| ipywidgets filter tabs                | `src/components/FilterPanel.tsx`                   |
| `A.plain()` clause + gold highlight   | `src/components/Trainer.tsx`                       |
| Gloss matching (`Test()`)             | `src/lib/glossCheck.ts`                            |
| `<Language>_score.csv` persistence    | `src/lib/scores.ts` (localStorage)                |
| matplotlib pie / stats                | `src/components/Stats.tsx` (SVG)                   |
| "most difficult / repeated" tables    | `src/components/DifficultTables.tsx`              |
| (new) word data source                | `src/lib/api.ts` → `GET /words`                   |

## Data source — the word API

`src/lib/api.ts` is the only thing that talks to the network for word data. It
maps the filter UI to query params and calls `GET /words`, expecting a response
of `{ language, total_pool, count, words: WordEntry[] }`. The per-word shape is
in `src/types.ts`. Point it at a different host via `VITE_API_URL`.

The Python extractor in `../tools/export_bhsa.py` documents how the BHSA word
records were produced from `text-fabric` (used to build the API's data); the
frontend no longer reads any static word file.

## Gloss languages

Glosses are served by the API. `GET /gloss-languages?language=<lang>` lists the
options (always includes English), and `GET /words?...&gloss_lang=<lang>` returns
each word's `gloss` already resolved in that language (verb→stem column with
fallback, others→default) and filters the pool to lexemes that have one. The
client just sends `gloss_lang` and reads `word.gloss` — no gloss data ships in
the frontend. To add a language, load its data on the server.

## Hebrew font

`@fontsource/noto-serif-hebrew` is bundled and self-hosted (niqqud +
cantillation, works offline). To use Ezra SIL / SBL Hebrew instead, drop a woff2
in `public/fonts/`, `@font-face` it, and put it first in the `--hebrew` stack in
`styles.css`.

## Not yet ported (next steps)

- **Verb stem-attestation facts** — the original `lexFact()` shows how often each
  stem of a verb occurs, with parsed examples; would need extra API fields.
- **Greek gloss customisation** — the custom-gloss CSV format is Hebrew/Aramaic
  (stem columns); Greek currently uses the API's English gloss only.

## Credits & licence

Algorithm and concept: Christian Canu Højgaard (ch-jensen/Vocab).
Underlying data: ETCBC **BHSA**, CC BY-NC-SA. Keep attribution intact.
