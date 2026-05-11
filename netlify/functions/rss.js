exports.handler = async function(event) {
  const keyword    = event.queryStringParameters?.keyword  || '';
  const count      = parseInt(event.queryStringParameters?.count   || '20');
  const type       = event.queryStringParameters?.type    || 'news';
  const excludeStr = event.queryStringParameters?.exclude || '';
  const excludeList = excludeStr ? excludeStr.split(',').filter(w => w) : [];

  function normalizeTitle(title) {
    let norm = title.replace(/\s*[-|]\s*[^-|]*$/, '');
    norm = norm.replace(/[（\(［\[【][^）\)］\]】]*[）\)］\]】]/g, '');
    norm = norm.replace(/[^\p{L}\p{N}]/gu, '');
    return norm;
  }

  function isImageLink(link) {
    return link.includes('/images') || link.includes('/photo') || link.includes('/pict');
  }

  async function fetchWithTimeout(url, timeoutMs = 3800) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/110.0.0.0 Safari/537.36' }
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchAndParse(url, type, keyword, forcedCategory = null) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];

      const xml = await res.text();
      const itemRegex = /<item[\s\S]*?>([\s\S]*?)<\/item>/g;
      const parsed = [];
      let match;

      let label = keyword;
      if (type === 'major') {
        if      (url.includes('yahoo'))    label = 'Yahoo!';
        else if (url.includes('nhk'))      label = 'NHK';
        else if (url.includes('google'))   label = 'Google';
        else if (url.includes('livedoor')) label = 'ライブドア';
        else if (url.includes('asahi'))    label = '朝日新聞';
        else if (url.includes('yomiuri'))  label = '読売新聞';
        else                               label = '主要';
      } else if (type === 'social') {
        label = url.includes('hatena.ne.jp') ? 'はてな' : 'note';
      }

      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const blockLower = block.toLowerCase();

        // 絶対除外ルール
        if (blockLower.includes('komei.or.jp') || blockLower.includes('電子版プラス') ||
            blockLower.includes('vietnam') || blockLower.includes('go2senkyo.com/seijika')) {
            continue;
        }

        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || '';
        const link  = (block.match(/<link>(.*?)<\/link>/) || block.match(/<link \/>(.*?)<\//))?.[1] || block.match(/href="(https?[^"]+)"/)?.[1] || '';
        const pub   = (block.match(/<pubDate>(.*?)<\/pubDate>/) || block.match(/<dc:date>(.*?)<\/dc:date>/))?.[1] || '';

        if (!title || !link) continue;

        const isExcluded = excludeList.length > 0 && excludeList.some(w => blockLower.includes(w.toLowerCase()));
        if (isExcluded) continue;

        parsed.push({ 
          keyword: label, 
          title, 
          link, 
          published: pub, 
          category: forcedCategory // 特定カテゴリのRSSから取った場合はラベルを付与
        });
      }
      return parsed;
    } catch (e) { return []; }
  }

  try {
    let tasks = [];
    if (type === 'major') {
      // 1. 網羅性マストの総合RSS
      const generalUrls = [
        'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
        'https://www.nhk.or.jp/rss/news/cat0.xml',
        'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja',
        'https://news.livedoor.com/topics/rss/top.xml',
        'https://rss.asahi.com/rss/asahi/newsheadlines.rdf',
        'https://www.yomiuri.co.jp/rss/news/top.rdf'
      ];
      tasks = generalUrls.map(url => fetchAndParse(url, 'major', ''));

      // 2. 政治と社会の精度底上げ用RSS（追加分）
      tasks.push(fetchAndParse('https://news.yahoo.co.jp/rss/categories/domestic.xml', 'major', '', '政治'));
      tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat1.xml', 'major', '', '社会'));
      tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat4.xml', 'major', '', '政治'));
      tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/politics.rdf', 'major', '', '政治'));
      tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/society.rdf', 'major', '', '社会'));
    } else if (type === 'social') {
      const socialUrls = !keyword
        ? ['https://b.hatena.ne.jp/hotentry.rss', 'https://note.com/hashtag/話題/rss']
        : [`https://note.com/hashtag/${encodeURIComponent(keyword)}/rss`, `https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(keyword)}&mode=rss`];
      tasks = socialUrls.map(url => fetchAndParse(url, 'social', keyword));
    } else {
      const newsUrls = [
        `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`,
        `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`
      ];
      tasks = newsUrls.map(url => fetchAndParse(url, 'news', keyword));
    }

    const settled = await Promise.allSettled(tasks);
    const allItems = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    const uniqueMap = new Map();
    for (const item of allItems) {
      const normTitle = normalizeTitle(item.title);
      if (uniqueMap.has(normTitle)) {
        const existing = uniqueMap.get(normTitle);
        // 既存がノーマルで、新しい方がカテゴリ持ち（政治・社会）なら優先する
        if (!existing.category && item.category) {
          uniqueMap.set(normTitle, item);
        }
        if (isImageLink(existing.link) && !isImageLink(item.link)) {
          existing.link = item.link;
          existing.title = item.title;
        }
        continue;
      }
      uniqueMap.set(normTitle, item);
    }

    const items = Array.from(uniqueMap.values());
    items.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
    if (items.length > count) items.splice(count);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(items)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
