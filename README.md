# Vocab

A web reimplementation of [ch-jensen/Vocab](https://github.com/ch-jensen/Vocab),
Christian Canu Højgaard's spaced-repetition trainer for Biblical **Hebrew,
Aramaic & Greek** vocabulary. Words are pulled just-in-time from a word API; the
spaced-repetition logic, scoring, and gloss customisation run in the browser.

## Layout

| Path        | What                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `web/`      | The app — Vite + React + TypeScript SPA. **Start here** (`web/README.md`).  |
| `tools/`    | `export_bhsa.py` — extracts BHSA word records from `text-fabric` (data-pipeline reference for the API). |
| `example/`  | Upstream original Python/Jupyter app, kept locally as reference (git-ignored). |

## Quick start

```bash
cd web
pnpm install
cp .env.example .env      # set VITE_API_URL to the word service
pnpm dev                  # http://localhost:5173
```

## Credits & licence

Algorithm and concept: Christian Canu Højgaard (ch-jensen/Vocab).
Underlying linguistic data: ETCBC **BHSA**, CC BY-NC-SA — keep attribution intact.
