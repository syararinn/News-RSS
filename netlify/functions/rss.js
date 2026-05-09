exports.handler = async function(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const count = parseInt(event.queryStringParameters?.count || '5');
  const type = event.queryStringParameters?.type || 'news'; // タブの種類を受け取る

  if (!keyword && type !== 'major') {
    return { statusCode: 400, body: JSON.stringify({ error: 'keyword required' }) };
  }

  try {
    let urls = [];
    
    if (type === 'major') {
      // 【主要ニュース】
      urls = [
        'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
        'https://www.nhk.or.jp/rss/news/cat0.xml'
      ];
    } else if (type === 'social') {
      // 【ブログ・コラム】note ＋ はてなブックマーク
      urls = [
        `https://note.com/hashtag/${encodeURIComponent(keyword)}/rss`,
        `https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(keyword)}&mode=rss`
      ];
    } else {
      // 【ニュース検索】Google ＋ Bing
      urls = [
        `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`,
        `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`
      ];
    }
    
    const items = [];
    const seenLinks = new Set();

    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      let sourceCount = 0;
      
      const targetCount = (type === 'major') ? count * 3 : count;

      while ((match = itemRegex.exec(xml)) !== null && sourceCount < targetCount) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       block.match(/<title>(.*?)<\/title>/))?.[1] || '';
        const link  = (block.match(/<link>(.*?)<\/link>/) ||
                       block.match(/<link \/>(.*?)<\//))?.[1] ||
                      block.match(/href="(https?[^"]+)"/)?.[1] || '';
        const pub   = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

        // 除外設定
        if (keyword === '公明党' && (title.includes('komei.or.jp') || title.includes('公明新聞'))) {
          continue;
        }

        if (title && link && !seenLinks.has(link)) {
          seenLinks.add(link);
          
          let displayKeyword = keyword;
          if (type === 'major') {
            displayKeyword = url.includes('yahoo') ? 'Yahoo!' : 'NHK';
          } else if (type === 'social') {
            displayKeyword = url.includes('note.com') ? 'note' : 'はてな';
          }

          items.push({ keyword: displayKeyword, title, link, published: pub });
          sourceCount++;
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(items)
    };
  } catch (e) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: e.message }) };
  }
};
