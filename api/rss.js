const axios = require('axios');

module.exports = async (req, res) => {
  // パラメータ取得
  const { keyword = '', type = '', exclude = '', count = '20' } = req.query;
  const limit = parseInt(count) || 20;

  const fetchAndParse = async (url, kw, typeLabel, forcedCategory = '') => {
    try {
      const response = await axios.get(url, {
        timeout: 3800,
        headers: { 'User-Agent': 'Mozilla/5.0 NewsDashboard/1.0' }
      });
      const xml = String(response.data || '');
      const entries = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
      return entries.map(entry => {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = entry.match(/<link\b[^>]*>(.*?)<\/link>/i) || entry.match(/<link\b[^>]*href=["']([^"']+)["']/i);
        const pubDateMatch = entry.match(/<(pubDate|published|updated)>([\s\S]*?)<\/\1>/i);
        if (!titleMatch || !linkMatch) return null;
        
        let link = linkMatch[1] || linkMatch[2] || '';
        link = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
        let title = titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();

        return {
          title: title,
          link: link,
          published: pubDateMatch ? new Date(pubDateMatch[2]).toISOString() : new Date().toISOString(),
          keyword: kw || typeLabel,
          category: forcedCategory
        };
      }).filter(Boolean);
    } catch (e) { return []; }
  };

  const tasks = [];
  if (type === 'news' && keyword) {
    tasks.push(fetchAndParse(`https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`, keyword, 'Googleニュース'));
  } else if (type === 'major') {
    tasks.push(fetchAndParse('https://news.yahoo.co.jp/rss/topics/top-picks.xml', 'Yahoo', '主要'));
    tasks.push(fetchAndParse('https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', 'Google', '主要'));
    tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat0.xml', 'NHK', '主要'));
    tasks.push(fetchAndParse('https://news.google.com/rss/search?q=%E5%A4%A9%E6%B0%97+%E6%B0%97%E8%B1%A1&hl=ja&gl=JP&ceid=JP:ja', 'Google', '天気', '天気'));
    tasks.push(fetchAndParse('https://news.yahoo.co.jp/rss/categories/domestic.xml', 'Yahoo', '国内', ''));
    tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat1.xml', 'NHK', '社会', '社会'));
    tasks.push(fetchAndParse('https://www.nhk.or.jp/rss/news/cat4.xml', 'NHK', '政治', '政治'));
    tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/politics.rdf', '読売', '政治', '政治'));
    tasks.push(fetchAndParse('https://www.yomiuri.co.jp/rss/news/society.rdf', '読売', '社会', '社会'));
  }

  const results = await Promise.allSettled(tasks);
  let merged = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));

  // NG除外
  const systemNg = ['komei.or.jp', '公明新聞電子版プラス'];
  const userNg = exclude.split(',').map(w => w.trim()).filter(Boolean);
  const allNg = [...systemNg, ...userNg];
  merged = merged.filter(item => !allNg.some(ng => item.title.includes(ng)));

  // 重複除去
  const seen = new Set();
  merged = merged.filter(it => !seen.has(it.link) && seen.add(it.link));

  // ソート
  merged.sort((a, b) => new Date(b.published) - new Date(a.published));

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json(merged.slice(0, limit));
};
