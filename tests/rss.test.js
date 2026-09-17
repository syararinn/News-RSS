const { test } = require('node:test');
const assert = require('node:assert/strict');
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
});
