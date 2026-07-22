// Minimal local dev server for cloud/local development.
// Serves the static index.html and routes /api/rss to the Vercel-style
// serverless handler in api/rss.js, adapting req.query and res.status().json().
// This mirrors what `vercel dev` provides, without requiring the Vercel CLI/auth.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const rssHandler = require('./api/rss.js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/rss') {
    req.query = Object.fromEntries(url.searchParams.entries());
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(body));
      return res;
    };
    try {
      await rssHandler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: String(err && err.message || err) }));
    }
    return;
  }

  // Static file serving (index.html by default)
  const filePath = url.pathname === '/'
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, url.pathname);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Dev server running at http://${HOST}:${PORT} (serving index.html + /api/rss)`);
});
