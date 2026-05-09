exports.handler = async function(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const count = parseInt(event.queryStringParameters?.count || '10');
  const type = event.queryStringParameters?.type || 'news';

  try {
    let urls = [];
    
    if (type === 'major') {
      urls = [
        'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
        'https://www.nhk.or.jp/rss/news/cat0.xml'
      ];
    } else if (type === 'social') {
      if (!keyword) {
        // 【追加】はてなホットエントリーに加えて、noteの「話題」「おすすめ」タグの人気記事を追加
        urls = [
          'https://b.hatena.ne.jp/hotentry.rss',
          'https://note.com/hashtag/話題/rss',
          'https://note.com/hashtag/おすすめ/rss'
        ];
      } else {
        urls = [
          `https://note.com/hashtag/${encodeURIComponent(keyword)}/rss`,
          `https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(keyword)}&mode=rss`
        ];
      }
    } else {
      if (!keyword) return { statusCode: 200, body: JSON.stringify([]) };
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
      
      // 総合ニュース・注目記事は各サイトから15件ずつ多めに取得
      const targetLimit = (type === 'major' || (type === 'social' && !keyword)) ? 15 : count;

      while ((match = itemRegex.exec(xml)) !== null && sourceCount < targetLimit) {
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
          
          // 【追加】どのサイトから来た記事か分かるようにラベル（出典）を自動判定
          let label = keyword;
          if (type === 'major') label = url.includes('yahoo') ? 'Yahoo!' : 'NHK';
          if (type === 'social' && !keyword) {
             label = url.includes('hatena.ne.jp') ? 'はてな注目' : 'note注目';
          }
          if (type === 'social' && keyword) label = url.includes('note') ? 'note' : 'はてな';

          items.push({ keyword: label, title, link, published: pub });
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
