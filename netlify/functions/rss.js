exports.handler = async function(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const count = parseInt(event.queryStringParameters?.count || '5');

  if (!keyword) {
    return { statusCode: 400, body: JSON.stringify({ error: 'keyword required' }) };
  }

  try {
    // 【変更点1】検索するサイト（URL）を2つ用意する
    const googleUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`;
    const bingUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`;
    
    const urls = [googleUrl, bingUrl]; // 検索先リスト
    const items = [];
    const seenLinks = new Set(); // 【変更点2】重複チェック用のメモ帳を用意

    // 【変更点3】GoogleとBing、順番に探しに行くループを追加
    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) continue; // もし片方のサイトがエラーでも、止まらずに次へ行く
      
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      let sourceCount = 0; // それぞれのサイトから `count` 件ずつ取るためのカウンター

      while ((match = itemRegex.exec(xml)) !== null && sourceCount < count) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       block.match(/<title>(.*?)<\/title>/))?.[1] || '';
        const link  = (block.match(/<link>(.*?)<\/link>/) ||
                       block.match(/<link \/>(.*?)<\//))?.[1] ||
                      block.match(/href="(https?[^"]+)"/)?.[1] || '';
        const pub   = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

        // --- 修正した除外設定（そのまま引き継ぎます） ---
        if (keyword === '公明党' && (title.includes('komei.or.jp') || title.includes('公明新聞'))) {
          continue;
        }

        // 【変更点4】タイトルとリンクがあり、かつ「まだ見ていないリンク」なら追加する
        if (title && link && !seenLinks.has(link)) {
          seenLinks.add(link); // メモ帳に記録
          items.push({ keyword, title, link, published: pub });
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
