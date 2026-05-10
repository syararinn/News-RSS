exports.handler = async function(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const count = parseInt(event.queryStringParameters?.count || '10');
  const type = event.queryStringParameters?.type || 'news';
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

  try {
    let urls = [];
    if (type === 'major') {
      // 【大増強】YahooとNHKに加え、Googleトップ、ライブドア、朝日新聞、読売新聞を助っ人として追加！
      urls = [
        'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
        'https://www.nhk.or.jp/rss/news/cat0.xml',
        'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja',
        'https://news.livedoor.com/topics/rss/top.xml',
        'https://rss.asahi.com/rss/asahi/newsheadlines.rdf',
        'https://www.yomiuri.co.jp/rss/news/top.rdf'
      ];
    } else if (type === 'social') {
      urls = !keyword ? ['https://b.hatena.ne.jp/hotentry.rss', 'https://note.com/hashtag/話題/rss', 'https://note.com/hashtag/おすすめ/rss']
                      : [`https://note.com/hashtag/${encodeURIComponent(keyword)}/rss`, `https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(keyword)}&mode=rss`];
    } else {
      if (!keyword) return { statusCode: 200, body: JSON.stringify([]) };
      urls = [`https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`, `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`];
    }
    
    const items = [];
    const uniqueItemsMap = new Map(); 

    for (const url of urls) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/110.0.0.0 Safari/537.36' } });
      if (!res.ok) continue;
      const xml = await res.text();
      const itemRegex = /<item[\s\S]*?>([\s\S]*?)<\/item>/g;
      let match;
      let sourceCount = 0;
      const targetLimit = count;

      while ((match = itemRegex.exec(xml)) !== null && sourceCount < targetLimit) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || '';
        const link = (block.match(/<link>(.*?)<\/link>/) || block.match(/<link \/>(.*?)<\//))?.[1] || block.match(/href="(https?[^"]+)"/)?.[1] || '';
        const pub = (block.match(/<pubDate>(.*?)<\/pubDate>/) || block.match(/<dc:date>(.*?)<\/dc:date>/))?.[1] || '';

        if (title.includes('komei.or.jp') || link.includes('komei.or.jp') || title.includes('電子版プラス') || link.includes('電子版プラス')) {
          continue;
        }

        const isExcluded = excludeList.length > 0 && excludeList.some(word => title.includes(word) || link.includes(word));
        if (isExcluded) continue;

        if (title && link) {
          const normTitle = normalizeTitle(title);
          
          let label = keyword;
          if (type === 'major') {
            // 【変更】取得したサイトに合わせて、画面に表示する「出典タグ」の名前を切り替える
            if (url.includes('yahoo')) label = 'Yahoo!';
            else if (url.includes('nhk')) label = 'NHK';
            else if (url.includes('google')) label = 'Google';
            else if (url.includes('livedoor')) label = 'ライブドア';
            else if (url.includes('asahi')) label = '朝日新聞';
            else if (url.includes('yomiuri')) label = '読売新聞';
            else label = '主要';
          } else if (type === 'social' && !keyword) {
            label = url.includes('hatena.ne.jp') ? 'はてな注目' : 'note注目';
          } else if (type === 'social' && keyword) {
            label = url.includes('note') ? 'note' : 'はてな';
          }

          if (uniqueItemsMap.has(normTitle)) {
            const existingItem = uniqueItemsMap.get(normTitle);
            if (isImageLink(existingItem.link) && !isImageLink(link)) {
              existingItem.link = link;
              existingItem.title = title;
            }
            continue;
          }

          const newItem = { keyword: label, title, link, published: pub };
          uniqueItemsMap.set(normTitle, newItem);
          items.push(newItem);
          sourceCount++;
        }
      }
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(items) };
  } catch (e) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: e.message }) };
  }
};
