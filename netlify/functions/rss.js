const axios = require('axios');

const MAX_COUNT = 100;
const PER_FEED_ITEMS = 30;
const REQUEST_TIMEOUT_MS = 3800;

const decodeHtml = (value = '') => String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&#x27;/g, "'")
  .replace(/&#x2F;/g, '/')
  .trim();

const normalizeCount = (count) => {
  const parsed = Number.parseInt(count, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 20;
  return Math.min(parsed, MAX_COUNT);
};

const getTagValue = (entry, tagNames) => {
  for (const tagName of tagNames) {
    const match = entry.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    if (match && match[1]) return decodeHtml(match[1]);
  }
  return '';
};

const getLink = (entry) => {
  const linkText = getTagValue(entry, ['link']);
  if (linkText) return linkText;

  const guidText = getTagValue(entry, ['guid']);
  if (guidText && /^https?:\/\//i.test(guidText)) return guidText;

  const hrefMatch = entry.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return hrefMatch ? decodeHtml(hrefMatch[1]) : '';
};

const getPublishedIso = (entry) => {
  const rawDate = getTagValue(entry, ['pubDate', 'published', 'updated', 'dc:date']);
  const date = rawDate ? new Date(rawDate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const fetchAndParse = async (url, keyword, typeLabel, forcedCategory = '') => {
  try {
    const res = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 NewsDashboard/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    });

    const xml = String(res.data || '');
    const entries = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];

    return entries.slice(0, PER_FEED_ITEMS).map((entry) => {
      const title = getTagValue(entry, ['title']);
      const link = getLink(entry);
      if (!title || !link) return null;

      return {
        title,
        link,
        published: getPublishedIso(entry),
        keyword: keyword || typeLabel,
        category: forcedCategory
      };
    }).filter(Boolean);
  } catch (error) {
    console.error(`RSS fetch failed: ${url}`, error.message);
    return [];
  }
};

const buildTasks = ({ keyword, type }) => {
  const tasks = [];

  if (type === 'news' && keyword) {
    tasks.push(fetchAndParse(
      `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`,
      keyword,
      'Googleニュース',
    ));
  } else if (type === 'major') {
    tasks.push(fetchAndParse('https://news.yahoo.co.jp/rss/topics/top-picks.xml', 'Yahoo', '主要'));
    tasks.push(fetchAndParse('https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', 'Google', '主要'));
    tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat0.xml', 'NHK', '主要'));
    tasks.push(fetchAndParse('https://news.google.com/rss/search?q=%E5%A4%A9%E6%B0%97+%E6%B0%97%E8%B1%A1&hl=ja&gl=JP&ceid=JP:ja', 'Google', '天気', '天気'));
    tasks.push(fetchAndParse('https://news.yahoo.co.jp/rss/categories/domestic.xml', 'Yahoo', '政治', '政治'));
    tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat1.xml', 'NHK', '社会', '社会'));
    tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat4.xml', 'NHK', '政治', '政治'));
    tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/politics.rdf', '読売', '政治', '政治'));
    tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/society.rdf', '読売', '社会', '社会'));
  } else if (type === 'social') {
    const socialKeyword = keyword || '注目';
    tasks.push(fetchAndParse(`https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(socialKeyword)}&mode=rss`, 'はてな', 'ブログ'));
    tasks.push(fetchAndParse(`https://note.com/hashtag/${encodeURIComponent(keyword || 'ニュース')}/rss`, 'note', 'ブログ'));
  }

  return tasks;
};

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const { keyword = '', type = '', exclude = '' } = params;
  const limit = normalizeCount(params.count);

  const results = await Promise.allSettled(buildTasks({ keyword, type }));
  let merged = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

// 1. 画面（アプリ）から送られてきたNGワードの除外
  if (exclude) {
    const ngWords = exclude.split(',').map((word) => word.trim()).filter(Boolean);
    merged = merged.filter((item) => !ngWords.some((ng) => item.title.includes(ng)));
  }

  // 2. 裏側で強制的に除外する固定NGワード（★ここを追加）
  const systemNgWords = ['komei.or.jp', '公明新聞電子版プラス', 'PR TIMES']; // ← 除外したい言葉をここに追加
  merged = merged.filter((item) => !systemNgWords.some((ng) => item.title.includes(ng)));

  const seenLinks = new Set();
  merged = merged.filter((item) => {
    if (seenLinks.has(item.link)) return false;
    seenLinks.add(item.link);
    return true;
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
    body: JSON.stringify(merged.slice(0, limit)),
  };
};
