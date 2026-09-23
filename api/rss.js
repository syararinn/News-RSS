const axios = require('axios');
const https = require('https');

const MAX_COUNT = 100;
const PER_FEED_ITEMS = 30;
const REQUEST_TIMEOUT_MS = 3800;
const NEWS_TIMEOUT_MS = 8000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 NewsDashboard/1.0';

const httpsAgent = new https.Agent({ family: 4, keepAlive: true });

const normalizeEncoding = (encoding = 'utf-8') => {
  const enc = encoding.trim().toLowerCase().replace(/_/g, '-');
  if (enc === 'shift-jis' || enc === 'windows-31j' || enc === 'cp932') return 'shift-jis';
  if (enc === 'euc-jp') return 'euc-jp';
  if (enc === 'utf8') return 'utf-8';
  return enc;
};

const decodeBuffer = (buffer, contentType = '') => {
  const head = buffer.slice(0, 512).toString('latin1');
  const xmlEnc = head.match(/encoding=["']([^"']+)["']/i)?.[1];
  const ctEnc = String(contentType).match(/charset=([^;\s]+)/i)?.[1];
  const encoding = normalizeEncoding(xmlEnc || ctEnc || 'utf-8');
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
};

const decodeCodePoint = (code) => {
  if (!Number.isFinite(code) || code < 0 || code > 0x10FFFF) return '';
  return String.fromCodePoint(code);
};

const decodeHtml = (value = '') => String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => decodeCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec) => decodeCodePoint(parseInt(dec, 10)))
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&#x27;/g, "'")
  .replace(/&#x2F;/g, '/')
  .trim();

/** Googleニュース形式「タイトル - 媒体名」から媒体名を分離 */
const splitPublisherFromTitle = (title = '', fallbackSource = '') => {
  const m = String(title).match(/^(.*?)\s+[-|–—]\s+([^-|–—]{1,40})$/);
  if (!m) return { title: title.trim(), source: fallbackSource };
  const main = m[1].trim();
  const publisher = m[2].trim();
  if (!main || !publisher) return { title: title.trim(), source: fallbackSource };
  return { title: main, source: publisher };
};

const toPublishedIso = (raw) => {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  try {
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const unwrapLink = (link = '') => {
  try {
    const u = new URL(link);
    if (u.hostname.includes('bing.com')) {
      const target = u.searchParams.get('url');
      if (target) return target;
    }
  } catch {
    /* keep original */
  }
  return link;
};

function createHandler(httpClient = axios, options = {}) {
  const newsTimeoutMs = options.newsTimeoutMs ?? NEWS_TIMEOUT_MS;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? REQUEST_TIMEOUT_MS;

  return async function handler(req, res) {
    const { keyword = '', type = '', exclude = '', count = '20' } = req.query;
    const parsedCount = parseInt(count, 10);
    const limit = Math.min(Math.max(Number.isFinite(parsedCount) ? parsedCount : 20, 1), MAX_COUNT);

    const feedErrors = [];

    const fetchAndParse = async (url, kw, typeLabel, forcedCategory = '', opts = {}) => {
      const feedSource = opts.source || '';
      const extractPublisher = !!opts.extractPublisher;
      const timeout = opts.timeout ?? defaultTimeoutMs;
      try {
        const response = await httpClient.get(url, {
          timeout,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/rss+xml, application/xml, text/xml, */*'
          },
          httpsAgent,
          maxRedirects: 5
        });
        const xml = decodeBuffer(Buffer.from(response.data || []), response.headers && response.headers['content-type']);
        const entries = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
        return entries.slice(0, PER_FEED_ITEMS).map(entry => {
          const titleMatch = entry.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
          const linkMatch = entry.match(/<link\b[^>]*>(.*?)<\/link>/i) || entry.match(/<link\b[^>]*href=["']([^"']+)["']/i);
          const pubDateMatch = entry.match(/<(pubDate|published|updated)>([\s\S]*?)<\/\1>/i);
          if (!titleMatch || !linkMatch) return null;

          let link = unwrapLink(decodeHtml(linkMatch[1] || linkMatch[2] || ''));
          let title = decodeHtml(titleMatch[1]);
          let source = feedSource || typeLabel;

          if (extractPublisher) {
            const split = splitPublisherFromTitle(title, source);
            title = split.title;
            source = split.source || source;
          }

          return {
            title,
            link,
            published: toPublishedIso(pubDateMatch ? pubDateMatch[2] : ''),
            keyword: kw || typeLabel,
            category: forcedCategory,
            source
          };
        }).filter(Boolean);
      } catch (e) {
        feedErrors.push(`${feedSource || typeLabel}:${e.code || e.message || 'fetch_failed'}`);
        return [];
      }
    };

    const tasks = [];
    if (type === 'news' && keyword) {
      tasks.push(fetchAndParse(
        `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`,
        keyword,
        'Googleニュース',
        '',
        { source: 'Googleニュース', extractPublisher: true, timeout: newsTimeoutMs }
      ));
      // Vercel 等のデータセンターIPから Google ニュース RSS がタイムアウトしても一覧が空にならないようにする
      tasks.push(fetchAndParse(
        `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss&setmkt=ja-JP&setlang=ja`,
        keyword,
        'Bingニュース',
        '',
        { source: 'Bingニュース', extractPublisher: true, timeout: newsTimeoutMs }
      ));
    } else if (type === 'major') {
      tasks.push(fetchAndParse('https://news.yahoo.co.jp/rss/topics/top-picks.xml', 'Yahoo', '主要', '', { source: 'Yahoo' }));
      tasks.push(fetchAndParse('https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', 'Google', '主要', '', { source: 'Google', extractPublisher: true }));
      tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat0.xml', 'NHK', '主要', '', { source: 'NHK' }));
      tasks.push(fetchAndParse('https://news.google.com/rss/search?q=%E5%A4%A9%E6%B0%97+%E6%B0%97%E8%B1%A1&hl=ja&gl=JP&ceid=JP:ja', 'Google', '天気', '天気', { source: 'Google', extractPublisher: true }));
      tasks.push(fetchAndParse('https://news.yahoo.co.jp/rss/categories/domestic.xml', 'Yahoo', '国内', '', { source: 'Yahoo' }));
      tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat1.xml', 'NHK', '社会', '社会', { source: 'NHK' }));
      tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat4.xml', 'NHK', '政治', '政治', { source: 'NHK' }));
      tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/politics.rdf', '読売', '政治', '政治', { source: '読売' }));
      tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/society.rdf', '読売', '社会', '社会', { source: '読売' }));
    } else if (type === 'social') {
      const hatenaQ = keyword || '注目';
      const noteQ = keyword || 'ニュース';
      tasks.push(fetchAndParse(
        `https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(hatenaQ)}&mode=rss`,
        hatenaQ,
        'ブログ',
        '',
        { source: 'はてな' }
      ));
      tasks.push(fetchAndParse(
        `https://note.com/hashtag/${encodeURIComponent(noteQ)}/rss`,
        noteQ,
        'ブログ',
        '',
        { source: 'note' }
      ));
    }

    const results = await Promise.allSettled(tasks);
    let merged = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));

    const ngWords = (exclude + ',komei.or.jp,公明新聞電子版プラス').split(',').map(w => w.trim()).filter(Boolean);
    merged = merged.filter(item => !ngWords.some(ng => item.title.includes(ng) || (item.source || '').includes(ng)));

    const seen = new Set();
    merged = merged.filter(it => !seen.has(it.link) && seen.add(it.link));

    merged.sort((a, b) => new Date(b.published) - new Date(a.published));

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // GitHub Pages は静的配信だけで /api/rss が無い。画面が syararinn.github.io からこの関数を直接呼ぶ。
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', merged.length ? 'public, max-age=60' : 'no-store');
    if (feedErrors.length) {
      res.setHeader('X-Rss-Diagnostics', feedErrors.join('; ').slice(0, 500));
      res.setHeader('Access-Control-Expose-Headers', 'X-Rss-Diagnostics');
    }
    res.status(200).json(merged.slice(0, limit));
  };
}

const handler = createHandler();
handler.config = { maxDuration: 10 };
handler.createHandler = createHandler;
module.exports = handler;
