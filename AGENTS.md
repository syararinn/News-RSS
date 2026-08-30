# AGENTS.md

## Cursor Cloud specific instructions

A static single-page news dashboard (`index.html`) plus a Vercel serverless function that proxies/merges Japanese RSS feeds. Built for Vercel deployment. Node deps (`axios`) are installed by the startup update script (`npm install`).

- The serverless handler is `api/rss.js`, exported Vercel-style as `module.exports = async (req, res) => {...}` and read via `req.query` (the `main: index.js` field in `package.json` is misleading — there is no `index.js`).
- Run with the Vercel CLI: `npx vercel dev` serves the static page and the `/api/rss` route together. If the Vercel CLI is unavailable, a tiny Node HTTP wrapper that `require`s `api/rss.js` and adapts `req.query` / `res.status().json()` is enough to test the endpoint locally.
- The `/api/rss` endpoint needs outbound internet to the upstream RSS sources (Yahoo, Google News, NHK, Yomiuri, Hatena, note). No API keys or DB required. Query params: `type` (`major`/`news`/`social`), `keyword`, `exclude`, `count`.
