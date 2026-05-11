exports.handler = async function(event) {
  const keyword    = event.queryStringParameters?.keyword  || '';
  const count      = parseInt(event.queryStringParameters?.count   || '10');
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

  // タイムアウトを安全な3.5秒に設定
  async function fetchWithTimeout(url, timeoutMs = 3500) {
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

  async function fetchAndParse(url, type, keyword) {
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
      } else if (type === 'social' && !keyword) {
        label = url.includes('hatena.ne.jp') ? 'はてな注目' : 'note注目';
      } else if (type === 'social' && keyword) {
        label = url.includes('note') ? 'note' : 'はてな';
      }

      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || '';
        const link  = (block.match(/<link>(.*?)<\/link>/) || block.match(/<link \/>(.*?)<\//))?.[1] || block.match(/href="(https?[^"]+)"/)?.[1] || '';
        const pub   = (block.match(/<pubDate>(.*?)<\/pubDate>/) || block.match(/<dc:date>(.*?)<\/dc:date>/))?.[1] || '';

        if (!title || !link) continue;

        if (title.includes('komei.or.jp') || link.includes('komei.or.jp') ||
            title.includes('電子版プラス') || link.includes('電子版プラス')) continue;

        const isExcluded = excludeList.length > 0 && excludeList.some(w => title.includes(w) || link.includes(w));
        if (isExcluded) continue;

        parsed.push({ keyword: label, title, link, published: pub });
      }

      return parsed;
    } catch (e) {
      return []; // エラーが起きてもシステムを止めない
    }
  }

  try {
    let urls = [];
    if (type === 'major') {
      urls = [
        'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
        'https://www.nhk.or.jp/rss/news/cat0.xml',
        'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja',
        'https://news.livedoor.com/topics/rss/top.xml',
        'https://rss.asahi.com/rss/asahi/newsheadlines.rdf',
        'https://www.yomiuri.co.jp/rss/news/top.rdf'
      ];
    } else if (type === 'social') {
      urls = !keyword
        ? ['https://b.hatena.ne.jp/hotentry.rss', 'https://note.com/hashtag/話題/rss', 'https://note.com/hashtag/おすすめ/rss']
        : [`https://note.com/hashtag/${encodeURIComponent(keyword)}/rss`, `https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(keyword)}&mode=rss`];
    } else {
      if (!keyword) return { statusCode: 200, body: JSON.stringify([]) };
      urls = [
        `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`,
        `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`
      ];
    }

    const settledResults = await Promise.allSettled(
      urls.map(url => fetchAndParse(url, type, keyword))
    );

    const allItems = settledResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    const uniqueItemsMap = new Map();
    const items = [];

    for (const item of allItems) {
      const normTitle = normalizeTitle(item.title);
      if (uniqueItemsMap.has(normTitle)) {
        const existing = uniqueItemsMap.get(normTitle);
        if (isImageLink(existing.link) && !isImageLink(item.link)) {
          existing.link  = item.link;
          existing.title = item.title;
        }
        continue;
      }
      uniqueItemsMap.set(normTitle, item);
      items.push(item);
    }

    // 全ての記事を最新の日付順に並び替え
    items.sort((a, b) => {
      const dateA = new Date(a.published || 0).getTime();
      const dateB = new Date(b.published || 0).getTime();
      return dateB - dateA;
    });

    // 件数を絞る
    if (items.length > count) items.splice(count);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' 
      },
      body: JSON.stringify(items)
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
