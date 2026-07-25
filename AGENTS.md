# AGENTS.md

## Cursor Cloud specific instructions

News-RSS ("My News Dashboard") is a **Vercel zero-config** app, not a bundled SPA:

- **Frontend**: a single static `index.html` at the repo root (all HTML/CSS/JS inline). It fetches `/api/rss?type=...&keyword=...&exclude=...&count=...`.
- **Backend**: one serverless function `api/rss.js` (CommonJS, Vercel Node `module.exports = async (req, res)` signature) that fetches live external RSS feeds (Google News, Yahoo, NHK, 読売, はてな, note), parses/dedupes/sorts them, and returns JSON. Its only dependency is `axios`.
- `type=major` aggregates fixed feeds; `type=news` needs a `keyword`; `type=social` uses はてな/note. **Outbound internet is required** for the function to return results.

There is **no `dev` script** in `package.json`. To run locally in this environment:

- Canonical: `npx vercel dev` — but that requires a Vercel login/link, so it is not usable headlessly here.
- Offline alternative (what works in the cloud VM): run a tiny Node static+function server that serves `index.html` and mounts the real `api/rss.js` handler at `/api/rss` (map `req.query` from the URL and shim `res.status()`/`res.json()`). This exercises the actual handler and real feeds end-to-end. Do **not** commit that throwaway server to the repo.

Standard commands: `npm install` (installs `axios`). No build, lint, or test scripts are defined.
