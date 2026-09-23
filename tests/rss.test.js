const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createHandler } = require('../api/rss.js');

function mockRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(obj) { this.body = obj; return this; }
  };
}

const bingXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
<item>
  <title>ドローン規制の議論 - 某新聞</title>
  <link>https://www.bing.com/news/apiclick.aspx?url=${encodeURIComponent('https://example.com/drone')}</link>
  <pubDate>Thu, 17 Sep 2026 01:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const googleXmlBadDate = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<item>
  <title>正常な記事 - 紙A</title>
  <link>https://news.google.com/articles/ok</link>
  <pubDate>Thu, 17 Sep 2026 01:00:00 GMT</pubDate>
</item>
<item>
  <title>日付不正の記事 - 紙B</title>
  <link>https://news.google.com/articles/bad</link>
  <pubDate>not-a-date</pubDate>
</item>
</channel></rss>`;

test('Google がタイムアウトしても Bing の記事を返す', async () => {
  const client = {
    async get(url, opts) {
      if (String(url).includes('news.google.com')) {
        const err = new Error('timeout');
        err.code = 'ECONNABORTED';
        await new Promise((_, reject) => setTimeout(() => reject(err), (opts.timeout || 50) + 5));
      }
      if (String(url).includes('bing.com')) {
        return { data: Buffer.from(bingXml), headers: { 'content-type': 'application/xml' } };
      }
      throw new Error('unexpected url ' + url);
    }
  };
  const handler = createHandler(client, { newsTimeoutMs: 40, defaultTimeoutMs: 40 });
  const res = mockRes();
  await handler({ query: { type: 'news', keyword: 'ドローン', count: '5' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].link, 'https://example.com/drone');
  assert.match(res.headers['X-Rss-Diagnostics'] || '', /Google/);
  assert.equal(res.headers['Cache-Control'], 'public, max-age=60');
});

test('不正な pubDate があっても同じフィードの他記事を落とさない', async () => {
  const client = {
    async get(url) {
      if (String(url).includes('news.google.com')) {
        return { data: Buffer.from(googleXmlBadDate), headers: { 'content-type': 'application/xml' } };
      }
      if (String(url).includes('bing.com')) {
        return { data: Buffer.from('<rss><channel></channel></rss>'), headers: { 'content-type': 'application/xml' } };
      }
      throw new Error('unexpected url ' + url);
    }
  };
  const handler = createHandler(client, { newsTimeoutMs: 40 });
  const res = mockRes();
  await handler({ query: { type: 'news', keyword: '国会', count: '10' } }, res);
  assert.equal(res.body.length, 2);
  assert.ok(res.body.every(it => typeof it.published === 'string' && !Number.isNaN(Date.parse(it.published))));
});

test('1件も取れないときは no-store（空結果をCDNに残さない）', async () => {
  const client = {
    async get() {
      const err = new Error('timeout');
      err.code = 'ECONNABORTED';
      throw err;
    }
  };
  const handler = createHandler(client, { newsTimeoutMs: 20, defaultTimeoutMs: 20 });
  const res = mockRes();
  await handler({ query: { type: 'news', keyword: '熊本', count: '5' } }, res);
  assert.deepEqual(res.body, []);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

test('主要タブ：同一ホストへの同時取得（NHK3本）でも全件返る', async () => {
  const xmlFor = (label) => `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
<item>
  <title>${label}の記事</title>
  <link>https://example.com/${label}</link>
  <pubDate>Thu, 17 Sep 2026 01:00:00 GMT</pubDate>
</item>
</channel></rss>`;
  const client = {
    async get(url) {
      const label = String(url).replace(/[^a-z0-9]/gi, '');
      return { data: Buffer.from(xmlFor(label)), headers: { 'content-type': 'application/xml' } };
    }
  };
  const handler = createHandler(client, { defaultTimeoutMs: 40 });
  const res = mockRes();
  await handler({ query: { type: 'major', count: '20' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 9);
});

test('ブログタブ：はてな・noteを同時取得できる', async () => {
  const client = {
    async get(url) {
      const source = String(url).includes('hatena') ? 'はてな' : 'note';
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
<item><title>${source}の記事</title><link>https://example.com/${source}</link><pubDate>Thu, 17 Sep 2026 01:00:00 GMT</pubDate></item>
</channel></rss>`;
      return { data: Buffer.from(xml), headers: { 'content-type': 'application/xml' } };
    }
  };
  const handler = createHandler(client, { defaultTimeoutMs: 40 });
  const res = mockRes();
  await handler({ query: { type: 'social', count: '20' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
});

test('日本語のフィード名が失敗しても診断ヘッダーはASCIIだけになる', async () => {
  // 非ASCIIのヘッダー値は Node が ERR_INVALID_CHAR を投げ、関数ごと落ちて本番が500になっていた
  const client = {
    async get() {
      const err = new Error('forbidden');
      err.code = 'ERR_BAD_REQUEST';
      throw err;
    }
  };
  const handler = createHandler(client, { defaultTimeoutMs: 40 });
  const res = mockRes();
  await handler({ query: { type: 'major', count: '5' } }, res);
  assert.equal(res.statusCode, 200);
  const diag = res.headers['X-Rss-Diagnostics'];
  assert.ok(diag, '診断ヘッダーが出ること');
  assert.doesNotMatch(diag, /[^\t\x20-\x7e]/, '非ASCIIを含まないこと');
  assert.match(diag, /ERR_BAD_REQUEST/);
  // 実際の http.ServerResponse でも ERR_INVALID_CHAR にならないことを確認する
  const realRes = new http.ServerResponse({ method: 'GET' });
  assert.doesNotThrow(() => realRes.setHeader('X-Rss-Diagnostics', diag));
});

test('想定外の例外が起きても500にせず空配列を返す', async () => {
  const client = {
    async get() {
      return { data: null, headers: null };
    }
  };
  const handler = createHandler(client, { defaultTimeoutMs: 40 });
  const res = mockRes();
  // ngWords フィルタで item.title.includes を呼ぶ前提が崩れるケースを模して
  // handler 内の後処理が例外を投げても catch されることを確認する
  const originalSort = Array.prototype.sort;
  Array.prototype.sort = function () { throw new Error('boom'); };
  try {
    await handler({ query: { type: 'major', count: '20' } }, res);
  } finally {
    Array.prototype.sort = originalSort;
  }
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, []);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.match(res.headers['X-Rss-Diagnostics'] || '', /handler:boom/);
});

test('github.io の画面は本番 API を呼び、それ以外は同一オリジン', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /function rssApiOrigin\(hostname\)/);
  assert.equal((html.match(/fetch\(rssApiUrl\(/g) || []).length, 2);
  const origin = new Function(`${html.match(/function rssApiOrigin\(hostname\) \{[\s\S]*?\n\}/)[0]}; return rssApiOrigin;`)();
  assert.equal(origin('syararinn.github.io'), 'https://news-rss-brown.vercel.app');
  assert.equal(origin('news-rss-brown.vercel.app'), '');
  assert.equal(origin('localhost'), '');
});
