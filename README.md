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

## Deploy (Netlify)

`netlify.toml` at the repo root configures everything — just connect the repo in
Netlify and deploy. It sets:

- **Base directory:** `web`  ·  **Build command:** `pnpm build`  ·  **Publish:** `web/dist`
- **Node:** 20  ·  **pnpm:** auto (from `packageManager` in `web/package.json`)
- **`VITE_API_URL`** baked in (override in *Site settings → Environment variables*)

If you wire it up through the Netlify UI instead of the toml, use those same
values (in the UI the publish directory is entered relative to the repo root, so
`web/dist`).

The API at `shoresh.up.qombi.com` sends `Access-Control-Allow-Origin: *`, so the
deployed site calls it directly — no proxy needed.

## Credits & licence

Algorithm and concept: Christian Canu Højgaard (ch-jensen/Vocab).
Underlying linguistic data: ETCBC **BHSA**, CC BY-NC-SA — keep attribution intact.
