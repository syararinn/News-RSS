# AGENTS.md

## Cursor Cloud specific instructions

A static single-page news dashboard (`index.html`) plus a Vercel-style serverless function (`api/rss.js`) that proxies/merges Japanese RSS feeds (Yahoo, Google News, NHK, Yomiuri, Hatena, note). No database, auth, or other backing services — all user state lives in browser `localStorage`. Node deps (`axios`) are installed by the startup update script (`npm install`).

- The serverless handler is `api/rss.js`, exported Vercel-style as `module.exports = async (req, res) => {...}` and read via `req.query` (the `main: index.js` field in `package.json` is misleading — there is no `index.js`). `package.json` has no `scripts`, and there is no build/lint/test tooling configured.
- Run locally with `node dev-server.js` (defaults to `http://0.0.0.0:3000`). This tiny HTTP wrapper serves `index.html` and routes `/api/rss` to `api/rss.js`, adapting `req.query`/`res.status().json()` — it replicates what `vercel dev` provides without needing the Vercel CLI or auth (`vercel dev` requires a Vercel login and will not work unattended here). If `dev-server.js` is absent, a few-line Node HTTP shim around `api/rss.js` is enough.
- The `/api/rss` endpoint needs outbound internet to the upstream RSS sources. No API keys or DB required. Query params: `type` (`major`/`news`/`social`), `keyword`, `exclude`, `count`. Individual feed failures are swallowed and return `[]`, so a single upstream being down does not break the response.
