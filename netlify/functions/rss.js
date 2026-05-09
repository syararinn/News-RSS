exports.handler = async function(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const count = parseInt(event.queryStringParameters?.count || '10');
  const type = event.queryStringParameters?.type || 'news';
  const excludeStr = event.queryStringParameters?.exclude || '';
  const excludeList = excludeStr ? excludeStr.split(',').filter(w => w) : [];

  // 【新機能】タイトルの揺れ（全角半角、新聞社名）をなくして比較用の純粋な文字列を作る関数
  function normalizeTitle(title) {
    // 1. タイトル末尾の「 - 〇〇新聞」や「 | 〇〇」などを削除
    let norm = title.replace(/\s*[-|]\s*[^-|]*$/, '');
    // 2. 全角の英数字を半角に変換（１１ → 11）
    norm = norm.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    // 3. 空白や細かい記号をすべて消し去る
    norm = norm.replace(/[\s　、。！？!?,.\-]/g, '');
    return norm;
  }

  try {
    let urls = [];
    if (type === 'major') {
      urls = ['https://news.yahoo.co.jp/rss/topics/top-picks.xml', 'https://www.nhk.or.jp/rss/news/cat0.xml'];
    } else if (type === 'social') {
      urls = !keyword ? ['https://b.hatena.ne.jp/hotentry.rss', 'https://note.com/hashtag/話題/rss', 'https://note.com/hashtag/おすすめ/rss']
                      : [`https://note.com/hashtag/${encodeURIComponent(keyword)}/rss`, `https://b.hatena.ne.jp/search/tag?q=${encodeURIComponent(keyword)}&mode=rss`];
    } else {
      if (!keyword) return { statusCode: 200, body: JSON.stringify([]) };
      urls = [`https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`, `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`];
    }
    
    const items = [];
    const seenLinks = new Set();
    const seenTitles = new Set(); // 【新機能】確認済みのタイトルを保存するリスト

    for (const url of urls) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/110.0.0.0 Safari/537.36' } });
      if (!res.ok) continue;
      const xml = await res.text();
      const itemRegex = /<item[\s\S]*?>([\s\S]*?)<\/item>/g;
      let match;
      let sourceCount = 0;
      const targetLimit = (type === 'major' || (type === 'social' && !keyword)) ? 15 : count;

      while ((match = itemRegex.exec(xml)) !== null && sourceCount < targetLimit) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || '';
        const link = (block.match(/<link>(.*?)<\/link>/) || block.match(/<link \/>(.*?)<\//))?.[1] || block.match(/href="(https?[^"]+)"/)?.[1] || '';
        const pub = (block.match(/<pubDate>(.*?)<\/pubDate>/) || block.match(/<dc:date>(.*?)<\/dc:date>/))?.[1] || '';

        // 【ルール1：絶対除外】
        if (title.includes('komei.or.jp') || link.includes('komei.or.jp') || title.includes('電子版プラス') || link.includes('電子版プラス')) {
          continue;
        }

        // 【ルール2：画面からの除外】
        const isExcluded = excludeList.length > 0 && excludeList.some(word => title.includes(word) || link.includes(word));
        if (isExcluded) continue;

        if (title && link && !seenLinks.has(link)) {
          // 【新機能】タイトルの重複チェック
          const normTitle = normalizeTitle(title);
          if (seenTitles.has(normTitle)) {
             continue; // すでに同じ内容の記事があればスキップ
          }
          seenTitles.add(normTitle);
          seenLinks.add(link);

          let label = keyword;
          if (type === 'major') label = url.includes('yahoo') ? 'Yahoo!' : 'NHK';
          if (type === 'social' && !keyword) label = url.includes('hatena.ne.jp') ? 'はてな注目' : 'note注目';
          if (type === 'social' && keyword) label = url.includes('note') ? 'note' : 'はてな';
          items.push({ keyword: label, title, link, published: pub });
          sourceCount++;
        }
      }
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(items) };
  } catch (e) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: e.message }) };
  }
};
