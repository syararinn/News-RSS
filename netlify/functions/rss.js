exports.handler = async function(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const count = parseInt(event.queryStringParameters?.count || '5');

  if (!keyword) {
    return { statusCode: 400, body: JSON.stringify({ error: 'keyword required' }) };
  }

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`;
    const res = await fetch(url);
    const xml = await res.text();

    // XMLをパースして記事を抽出
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
      const block = match[1];
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                     block.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const link  = (block.match(/<link>(.*?)<\/link>/) ||
                     block.match(/<link \/>(.*?)<\//))?.[1] ||
                    block.match(/href="(https?[^"]+)"/)?.[1] || '';
      const pub   = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      if (title) items.push({ keyword, title, link, published: pub });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
