<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📰</text></svg>">
  <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📰</text></svg>">
  <meta name="theme-color" content="#1a5c38">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>My News Dashboard</title>
  <style>
    :root {
      --bg: #f5f4f0; --surface: #ffffff; --border: #e2e0d8; --text: #1a1a18;
      --muted: #6b6b66; --accent: #1a5c38; --accent-light: #e8f2ec;
      --tag-bg: #eef7f2; --tag-border: #b5d9c5; --tag-text: #1a5c38; --link: #1a5c38;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); padding-bottom: max(4rem, env(safe-area-inset-bottom)); -webkit-tap-highlight-color: transparent; }
    header { background: var(--accent); color: #fff; padding: 1.5rem 1rem; text-align: center; }
    header h1 { font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 6px; }
    header h1 .version { font-size: 0.6rem; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px; font-weight: normal; }
    main { max-width: 900px; margin: 0 auto; padding: 1rem; }
    .tabs { display: flex; gap: 4px; margin-bottom: 1rem; border-bottom: 2px solid var(--border); position: sticky; top: 0; background: var(--bg); z-index: 100; }
    .tab-btn { background: none; border: none; font-size: 0.9rem; font-weight: 600; color: var(--muted); padding: 12px 5px; flex: 1; cursor: pointer; }
    .tab-btn.active { color: var(--accent); border-bottom: 3px solid var(--accent); background: var(--accent-light); }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .card-title { font-size: 0.75rem; font-weight: 700; color: var(--muted); margin-bottom: 0.8rem; display: flex; justify-content: space-between; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.8rem; }
    
    .chip { background: var(--tag-bg); color: var(--tag-text); border: 1px solid var(--tag-border); font-size: 0.75rem; padding: 4px 10px; border-radius: 16px; display: flex; align-items: center; }
    .chip-del { background: none; border: none; margin-left: 4px; cursor: pointer; font-weight: bold; color: var(--tag-text); padding: 0 4px; }
    
    .chip-ng { background: #fff0f0; color: #c0392b; border-color: #f5bbb7; }
    .chip-ng .chip-del { color: #c0392b; }
    .input-group { display: flex; gap: 8px; }
    .input-group input { flex: 1; border: 1px solid var(--border); border-radius: 8px; padding: 10px; font-size: 0.9rem; outline: none; }
    .input-group input:focus { border-color: var(--accent); }
    .btn { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 10px 15px; font-size: 0.9rem; cursor: pointer; font-weight: 600; }
    .btn-secondary { background: #6b6b66; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .controls { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; gap: 10px; }
    .controls-left { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
    .sort-select { border: 1px solid var(--border); border-radius: 8px; padding: 8px; font-size: 0.8rem; background: #fff; }
    .status-info { font-size: 0.7rem; color: var(--muted); font-weight: bold; text-align: right; white-space: nowrap; }
    .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    thead th { background: #f9f8f5; padding: 12px 10px; text-align: left; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 0.7rem; text-transform: uppercase; }
    tbody td { padding: 14px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
    
    .col-title { width: 99%; }
    .col-date { width: 1%; white-space: nowrap; padding-left: 4px !important; padding-right: 4px !important; text-align: center; }
    .col-link { width: 1%; white-space: nowrap; padding-left: 4px !important; text-align: right; }
    
    @media (max-width: 600px) {
      header { padding: 1rem; }
      header h1 { font-size: 1rem; }
      main { padding: 0.4rem; }
      .card { padding: 0.8rem; margin-bottom: 0.6rem; }
      
      .chip { font-size: 0.8rem; padding: 4px 10px; }
      .chip-del { font-size: 1.1rem; padding: 2px 4px; min-width: auto; min-height: auto; display: flex; align-items: center; justify-content: center; }
      
      .btn { padding: 12px 16px; font-size: 1rem; min-height: 44px; }
      .sort-select { font-size: 0.85rem; padding: 10px 8px; min-height: 44px; }
      .input-group input { font-size: 1rem; padding: 12px 10px; min-height: 44px; }
      .tab-btn { font-size: 0.8rem; padding: 14px 4px; min-height: 48px; }
      thead th { padding: 10px 6px; font-size: 0.65rem; }
      tbody td { padding: 12px 6px; }
      .open-link { font-size: 1.4rem; padding: 8px 10px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
      .date-day { font-size: 0.7rem; }
      .date-time { font-size: 0.7rem; }
      .kw-tag { font-size: 0.7rem; }
      .badge-new { font-size: 0.65rem; }
      .tabs { padding-top: env(safe-area-inset-top, 0px); }
    }
    
    tr.visited { opacity: 0.45; filter: grayscale(1); }
    .badge-new { display: inline-block; font-size: 0.6rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: #fff3cd; color: #7d5a00; border: 1px solid #ffe08a; margin-right: 4px; vertical-align: middle; }
    .badge-hot { display: inline-block; font-size: 0.6rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; margin-right: 4px; vertical-align: middle; }
    .date-day  { font-size: 0.65rem; color: var(--muted); display: block; white-space: nowrap; }
    .date-time { font-size: 0.65rem; color: var(--muted); display: block; white-space: nowrap; }
    
    .kw-tag { font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; background: var(--tag-bg); color: var(--tag-text); border: 1px solid var(--tag-border); white-space: nowrap; display: inline-block; margin-right: 4px; vertical-align: middle; }
    .cat-tag { background: #eef2f7; color: #34495e; border-color: #cdd9e5; }
    
    .open-link { color: var(--link); text-decoration: none; font-weight: bold; padding: 5px 8px; display: inline-block; font-size: 1.1rem; }
    #results-info { text-align: center; padding: 4rem 1rem; color: var(--muted); font-size: 0.9rem; }

    #progress-bar-wrap { width: 100%; height: 4px; background: var(--border); border-radius: 2px; margin-bottom: 1rem; overflow: hidden; display: none; }
    #progress-bar { height: 100%; background: var(--accent); border-radius: 2px; width: 0%; transition: width 0.3s ease; }
    .skeleton-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .skeleton-row { display: flex; gap: 12px; padding: 14px 10px; border-bottom: 1px solid var(--border); align-items: center; }
    .skeleton-block { background: linear-gradient(90deg, #e8e6e0 25%, #f5f4f0 50%, #e8e6e0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .sk-title { height: 14px; flex: 1; }
    .sk-date { width: 48px; height: 14px; flex-shrink: 0; }
    .sk-link { width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; }
  </style>
</head>
<body>

<header>
  <h1>📰 News Dashboard <span class="version">v8.0</span></h1>
</header>

<main>
  <div class="tabs">
    <button id="tab-news" class="tab-btn active" onclick="switchTab('news')">🔍 ニュース</button>
    <button id="tab-major" class="tab-btn" onclick="switchTab('major')">🌍 主要</button>
    <button id="tab-social" class="tab-btn" onclick="switchTab('social')">📝 ブログ</button>
  </div>

  <div id="kw-card" class="card">
    <div class="card-title">検索キーワード</div>
    <div id="chips-kw" class="chips"></div>
    <div class="input-group">
      <input type="text" id="kw-input" placeholder="追加キーワード..." inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" />
      <button class="btn btn-secondary" onclick="addItem('kw')">追加</button>
    </div>
  </div>

  <div id="mj-card" class="card" style="display:none">
    <p style="font-size:0.85rem; color:var(--muted)">Yahoo!トピックスなどから主要ニュースを取得し、自動仕分けします。</p>
  </div>

  <div id="sc-card" class="card" style="display:none">
    <div class="card-title">個別にキーワード検索 <span>※未入力なら はてな＆noteの注目記事</span></div>
    <div class="input-group">
      <input type="text" id="sc-input" placeholder="検索したいワード（例: 政治, ライフハック）" inputmode="search" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" />
      <button class="btn btn-secondary" onclick="handleFetch()">検索</button>
    </div>
  </div>

  <div id="ng-card" class="card">
    <div class="card-title">除外(NG)ワード <span>※全タブ共通で非表示にします</span></div>
    <div id="chips-ng" class="chips"></div>
    <div class="input-group">
      <input type="text" id="ng-input" placeholder="例: 公明新聞, PR TIMES" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" />
      <button class="btn btn-secondary" onclick="addItem('ng')">追加</button>
    </div>
  </div>

  <div class="controls">
    <div class="controls-left">
      <select id="count-sel" class="sort-select">
        <option value="10">10件</option>
        <option value="20">20件</option>
        <option value="30">30件</option>
        <option value="50">50件</option>
        <option value="100">100件</option>
      </select>
      <select id="sort-sel" class="sort-select" onchange="renderTable()">
        <option value="date">新しい順</option>
        <option value="hot">🔥 話題順</option>
        <option id="sort-opt-keyword" value="keyword">キーワード順</option>
      </select>
      
      <select id="news-kw-sel" class="sort-select" onchange="renderTable()">
        <option value="all">全キーワード</option>
      </select>

      <select id="major-cat-sel" class="sort-select" style="display:none;" onchange="renderTable()">
        <option value="all">全カテゴリ</option>
        <option value="政治">🏛 政治</option>
        <option value="経済">💴 経済</option>
        <option value="社会">🚨 社会</option>
        <option value="天気">🌤 天気</option>
        <option value="国際">🌍 国際</option>
        <option value="芸能">✨ 芸能</option>
        <option value="スポーツ">⚾ スポーツ</option>
        <option value="その他">📌 その他</option>
      </select>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div id="status-info" class="status-info">待機中</div>
      <button id="main-fetch-btn" class="btn" onclick="handleFetch()">取得</button>
    </div>
  </div>

  <div id="progress-bar-wrap">
    <div id="progress-bar"></div>
  </div>

  <div id="results">
    <div id="results-info">取得ボタンを押してください</div>
  </div>
</main>

<script>
function safeLoadArray(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { localStorage.removeItem(key); }
  return defaultVal;
}

let keywords     = safeLoadArray('myKeywords', ["公明党","自民党","立憲","国会","ドローン","麻生区","新百合ヶ丘"]);
let ngWords      = safeLoadArray('myNgWords', []);
let visitedLinks = safeLoadArray('myVisitedLinks', []);

let savedCount = localStorage.getItem('myFetchCount') || '20';
const countSelEl = document.getElementById('count-sel');
if (countSelEl) {
  countSelEl.value = savedCount;
  countSelEl.addEventListener('change', e => localStorage.setItem('myFetchCount', e.target.value));
}

let dataStore = { news: [], major: [], social: [] };
let currentTab = 'news';

document.getElementById('kw-input').addEventListener('keydown', e => { if (e.key === 'Enter') addItem('kw'); });
document.getElementById('ng-input').addEventListener('keydown', e => { if (e.key === 'Enter') addItem('ng'); });
function scInputEnterHandler(e) { if (e.key === 'Enter') handleFetch(); }

function setProgress(pct) {
  const wrap = document.getElementById('progress-bar-wrap');
  const bar  = document.getElementById('progress-bar');
  if (pct <= 0) { wrap.style.display = 'none'; bar.style.width = '0%'; return; }
  wrap.style.display = 'block';
  bar.style.width = Math.min(pct, 100) + '%';
}

function showSkeleton(rows = 8) {
  const skRows = Array.from({ length: rows }, () => `
    <div class="skeleton-row">
      <div class="skeleton-block sk-title"></div>
      <div class="skeleton-block sk-date"></div>
      <div class="skeleton-block sk-link"></div>
    </div>`).join('');
  document.getElementById('results').innerHTML = `<div class="skeleton-wrap">${skRows}</div>`;
}

function switchTab(t) {
  currentTab = t;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  document.getElementById('kw-card').style.display = (t === 'news')   ? 'block' : 'none';
  document.getElementById('ng-card').style.display = (t === 'news')   ? 'block' : 'none';
  document.getElementById('mj-card').style.display = (t === 'major')  ? 'block' : 'none';
  document.getElementById('sc-card').style.display = (t === 'social') ? 'block' : 'none';

  const sortOptKeyword = document.getElementById('sort-opt-keyword');
  if (sortOptKeyword) sortOptKeyword.textContent = (t === 'news') ? 'キーワード順' : '出典順';

  const newsKwSel = document.getElementById('news-kw-sel');
  if (newsKwSel) newsKwSel.style.display = (t === 'news') ? 'inline-block' : 'none';

  const majorCatSel = document.getElementById('major-cat-sel');
  if (majorCatSel) majorCatSel.style.display = (t === 'major') ? 'inline-block' : 'none';

  const scInp = document.getElementById('sc-input');
  if (scInp) {
    scInp.removeEventListener('keydown', scInputEnterHandler);
    if (t === 'social') scInp.addEventListener('keydown', scInputEnterHandler);
  }
  renderTable();
}

function updateNewsKwSelect() {
  const sel = document.getElementById('news-kw-sel');
  if (!sel) return;
  const currentVal = sel.value; 
  let html = '<option value="all">全キーワード</option>';
  keywords.forEach(kw => {
    html += `<option value="${kw}">${kw}</option>`;
  });
  sel.innerHTML = html;
  if (keywords.includes(currentVal)) {
    sel.value = currentVal;
  } else {
    sel.value = 'all';
  }
}

function renderChips() {
  document.getElementById('chips-kw').innerHTML = keywords.map((k, i) =>
    `<span class="chip">${k}<button class="chip-del" onclick="removeItem('kw',${i})">×</button></span>`).join('');
  document.getElementById('chips-ng').innerHTML = ngWords.map((k, i) =>
    `<span class="chip chip-ng">${k}<button class="chip-del" onclick="removeItem('ng',${i})">×</button></span>`).join('');
  updateNewsKwSelect();
}

function addItem(type) {
  const inp = document.getElementById(type + '-input');
  if (!inp) return;
  const v = inp.value.trim();
  if (!v) return;
  if (type === 'kw' && !keywords.includes(v)) keywords.push(v);
  if (type === 'ng' && !ngWords.includes(v)) ngWords.push(v);
  saveData();
  renderChips();
  inp.value = '';
}

function removeItem(type, i) {
  if (type === 'kw') keywords.splice(i, 1);
  if (type === 'ng') ngWords.splice(i, 1);
  saveData();
  renderChips();
}

function saveData() {
  localStorage.setItem('myKeywords', JSON.stringify(keywords));
  localStorage.setItem('myNgWords',  JSON.stringify(ngWords));
}

function markAsVisited(link) {
  if (!visitedLinks.includes(link)) {
    visitedLinks.push(link);
    if (visitedLinks.length > 500) visitedLinks.shift();
    localStorage.setItem('myVisitedLinks', JSON.stringify(visitedLinks));
    renderTable();
  }
}

function isImageLink(link) {
  return link.includes('/images') || link.includes('/photo') || link.includes('/pict');
}

function autoCategorize(title) {
  const scores = { '政治':0, '経済':0, '国際':0, 'スポーツ':0, '芸能':0, '社会':0, '天気':0 };
  // ★ ここがV8.0の新しい優先順位です！
  const PRIORITY = { '政治':7, '社会':6, '天気':5, '国際':4, '経済':3, 'スポーツ':2, '芸能':1 };

  if (/首相|総理|内閣|衆院|参院|国会|閣議|閣僚|政権|与党|野党|裏金/.test(title)) scores['政治'] += 3;
  if (/自民|立憲|公明|維新|共産|国民民主|れいわ|参政党/.test(title)) scores['政治'] += 3;
  if (/議員|大臣|知事|市長|町長|村長|都政|府政|道政|県政|政策|法案|選挙|政府/.test(title)) scores['政治'] += 2;
  if (/首相|外相|外務大臣/.test(title) && /訪米|訪中|訪韓|訪欧|会談|首脳会議|外交/.test(title)) scores['政治'] += 2;

  if (/株価|日経平均|ダウ|ナスダック|円安|円高|為替|ドル円|金利|日銀|財務省/.test(title)) scores['経済'] += 3;
  if (/GDP|物価|インフレ|賃上げ|賃金|倒産|上場|決算|赤字|黒字|増収|増益/.test(title)) scores['経済'] += 3;
  if (/経済|企業|投資|市場|ビジネス|業績|買収|M&A|補助金|関税/.test(title)) scores['経済'] += 2;
  if (/景気|雇用|失業|求人|就職|採用|リストラ|価格|値上げ|値下げ/.test(title)) scores['経済'] += 2;

  if (/ウクライナ|ロシア|ガザ|イスラエル|パレスチナ|NATO|G7|G20/.test(title)) scores['国際'] += 3;
  if (/トランプ|バイデン|プーチン|習近平|ゼレンスキー|マクロン/.test(title)) scores['国際'] += 3;
  if (/北朝鮮|台湾|香港|イラン|シリア|アフガン|ミャンマー|スーダン/.test(title)) scores['国際'] += 3;
  if (/国連|外相|外交|制裁|条約|大使|外務|海外/.test(title)) scores['国際'] += 2;
  if (/アメリカ|中国|韓国|欧州|EU|フランス|ドイツ|イギリス/.test(title)) scores['国際'] += 2;
  if (/米国|訪米|訪中|訪韓|渡航|在外|国際/.test(title)) scores['国際'] += 1;

  if (/大谷|翔平|ダルビッシュ|山本由伸|佐々木朗希/.test(title)) scores['スポーツ'] += 3;
  if (/MLB|NFL|NBA|NHL|プレミアリーグ|五輪|オリンピック|パラリンピック|W杯|ワールドカップ/.test(title)) scores['スポーツ'] += 3;
  if (/野球|サッカー|バスケ|バレー|ラグビー|テニス|ゴルフ|相撲|競馬|陸上|水泳|体操/.test(title)) scores['スポーツ'] += 3;
  if (/優勝|準優勝|決勝|監督|コーチ|選手権|リーグ|トーナメント|打者|投手|本塁打|ホームラン/.test(title)) scores['スポーツ'] += 2;
  if (/試合|対戦|勝利|敗北|引き分け|得点|連勝|連敗/.test(title)) scores['スポーツ'] += 1;

  if (/乃木坂|AKB|NMB|HKT|SKE|SMILE-UP|ジャニーズ|宝塚|ハロプロ/.test(title)) scores['芸能'] += 3;
  if (/俳優|女優|タレント|アイドル|歌手|アーティスト|ミュージシャン|声優/.test(title)) scores['芸能'] += 3;
  if (/映画|ドラマ|アニメ|音楽|ライブ|コンサート|ツアー|舞台|公演/.test(title)) scores['芸能'] += 2;
  if (/熱愛|交際|結婚|離婚|出産|妊娠|引退|復帰|デビュー/.test(title)) scores['芸能'] += 2;
  if (/主演|出演|番組|公開|受賞|ヒット|チャート/.test(title)) scores['芸能'] += 1;

  if (/天気|予報|警報|注意報|気温|湿度|高気圧|低気圧|気象|雷|寒気|雨雲|降水|台風|猛暑|大雨|tenki|晴天|酷暑|夏日|エルニーニョ|にわか雨/i.test(title)) scores['天気'] += 3;

  if (/逮捕|容疑者|起訴|送検|書類送検|不起訴|判決|有罪|無罪|実刑/.test(title)) scores['社会'] += 3;
  if (/死亡|遺体|殺人|殺害|傷害|強盗|詐欺|横領|汚職|わいせつ/.test(title)) scores['社会'] += 3;
  if (/地震|震度|津波|洪水|土砂崩れ|噴火|避難/.test(title)) scores['社会'] += 3;
  if (/火災|爆発|事故|衝突|脱線|墜落|沈没|感染|集団感染|食中毒/.test(title)) scores['社会'] += 3;
  if (/事件|裁判|警察|警視庁|検察|消防|救助|行方不明|捜索/.test(title)) scores['社会'] += 2;
  if (/被害|救急|病院|遺族|目撃|容疑|取り調べ/.test(title)) scores['社会'] += 1;

  if (/逮捕|容疑者|起訴|送検|判決|有罪|実刑|殺人|殺害|わいせつ/.test(title)) {
    ['政治','経済','国際','スポーツ','芸能','天気'].forEach(k => { if (scores['社会'] > scores[k]) scores[k] = 0; });
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1] || PRIORITY[b[0]] - PRIORITY[a[0]]);
  return best[0][1] === 0 ? 'その他' : best[0][0];
}

function getBigrams(str) {
  const bg = [];
  for(let i=0; i<str.length-1; i++) bg.push(str.slice(i, i+2));
  return bg;
}
function calcSimilarity(s1, s2) {
  if(!s1 || !s2) return 0;
  if(s1 === s2) return 1;
  const bg1 = getBigrams(s1); const bg2 = getBigrams(s2);
  if(bg1.length===0 || bg2.length===0) return 0;
  let match = 0;
  const copy = [...bg2];
  for(const b of bg1) {
    const idx = copy.indexOf(b);
    if(idx !== -1) { match++; copy.splice(idx, 1); }
  }
  return (2 * match) / (bg1.length + bg2.length);
}
function applyTopicScores(items) {
  items.forEach((it, idx) => {
    it.topicScore = 1;
    it.clusterId = idx;
    it.normForSim = it.title.replace(/[（\(［\[【][^）\)］\]】]*[）\)］\]】]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
  });
  for(let i=0; i<items.length; i++) {
     for(let j=i+1; j<items.length; j++) {
        if(calcSimilarity(items[i].normForSim, items[j].normForSim) > 0.35) {
           const targetId = items[j].clusterId;
           const newId = items[i].clusterId;
           if(targetId !== newId) {
             items.forEach(it => { if(it.clusterId === targetId) it.clusterId = newId; });
           }
        }
     }
  }
  const clusterStats = new Map();
  items.forEach(it => {
     if(!clusterStats.has(it.clusterId)) clusterStats.set(it.clusterId, { count: 0, latest: 0 });
     const stats = clusterStats.get(it.clusterId);
     stats.count++;
     if(it.dt > stats.latest) stats.latest = it.dt;
  });
  items.forEach(it => {
     const stats = clusterStats.get(it.clusterId);
     it.topicScore = stats.count;
     it.clusterLatestDt = stats.latest;
  });
}

async function handleFetch() {
  const btn = document.getElementById('main-fetch-btn');
  if (btn) btn.disabled = true;

  const excludeParam = encodeURIComponent(ngWords.join(','));
  const fetchCount   = document.getElementById('count-sel').value;

  showSkeleton();
  setProgress(5);

  try {
    if (currentTab === 'news') {
      dataStore.news = [];
      const uniqueNews = [];
      const seenTitlesMap = new Map();

      for (let i = 0; i < keywords.length; i++) {
        document.getElementById('status-info').textContent = `取得中 ${i+1}/${keywords.length}`;
        setProgress(5 + Math.round(((i) / keywords.length) * 90));

        try {
          // ★ Vercel用に /api/rss に変更しました
          const res = await fetch(`/api/rss?keyword=${encodeURIComponent(keywords[i])}&type=news&exclude=${excludeParam}&count=${fetchCount}`);
          if (res.ok) {
            const rawData = await res.json();
            const items = Array.isArray(rawData) ? rawData.map(it => ({ ...it, dt: new Date(it.published || 0) })) : [];
            for (const item of items) {
              let norm = item.title.replace(/\s*[-|]\s*[^-|]*$/, '');
              norm = norm.replace(/[（\(［\[【][^）\)］\]】]*[）\)］\]】]/g, '');
              norm = norm.replace(/[^\p{L}\p{N}]/gu, '');
              if (seenTitlesMap.has(norm)) {
                const ex = seenTitlesMap.get(norm);
                if (isImageLink(ex.link) && !isImageLink(item.link)) { ex.link = item.link; ex.title = item.title; }
              } else {
                seenTitlesMap.set(norm, item);
                uniqueNews.push(item);
              }
            }
          }
        } catch (e) {
          console.error("Fetch skipped for:", keywords[i]);
        }
        await new Promise(r => setTimeout(r, 300));
      }
      
      applyTopicScores(uniqueNews);
      dataStore.news = uniqueNews;
      setProgress(95);

    } else {
      const type = currentTab;
      const scInput = document.getElementById('sc-input');
      const kw = (type === 'social' && scInput) ? scInput.value.trim() : "";
      document.getElementById('status-info').textContent = '取得中...';
      setProgress(40);
      
      // ★ Vercel用に /api/rss に変更しました
      const res = await fetch(`/api/rss?type=${type}&keyword=${encodeURIComponent(kw)}&exclude=${excludeParam}&count=${fetchCount}`);
      if (!res.ok) throw new Error('通信エラー');
      const rawData = await res.json();
      let items = Array.isArray(rawData) ? rawData.map(it => ({ ...it, dt: new Date(it.published || 0) })) : [];
      applyTopicScores(items);
      dataStore[type] = items;
      setProgress(95);
    }

    document.getElementById('status-info').textContent = '完了';
    setProgress(100);
    setTimeout(() => setProgress(0), 600);

  } catch (error) {
    document.getElementById('status-info').textContent = '⚠️ 取得エラー';
    setProgress(0);
    document.getElementById('results').innerHTML = '<div id="results-info">通信が混み合っています。少し待って再取得してください。</div>';
  } finally {
    if (btn) btn.disabled = false;
    renderTable();
  }
}

function renderTable() {
  let displayData = dataStore[currentTab];
  if (!displayData || displayData.length === 0) {
    if (!document.getElementById('results-info') || document.getElementById('results-info').textContent !== '通信が混み合っています。少し待って再取得してください。') {
       document.getElementById('results').innerHTML = '<div id="results-info">取得ボタンを押してください</div>';
    }
    return;
  }

  if (currentTab === 'news') {
    const kwFilter = document.getElementById('news-kw-sel').value;
    if (kwFilter !== 'all') {
      displayData = displayData.filter(n => n.keyword === kwFilter);
    }
    if (displayData.length === 0 && document.getElementById('results-info').textContent !== '通信が混み合っています。少し待って再取得してください。') {
      document.getElementById('results').innerHTML = `<div id="results-info">このキーワードの記事はありません</div>`;
      return;
    }
  }

  if (currentTab === 'major') {
    displayData.forEach(item => { 
      const autoCat = autoCategorize(item.title);
      if (autoCat !== 'その他') {
        item.category = autoCat; 
      } else {
        item.category = item.category || 'その他'; 
      }
    });
    
    const catFilter = document.getElementById('major-cat-sel').value;
    if (catFilter !== 'all') displayData = displayData.filter(n => n.category === catFilter);
    if (displayData.length === 0) {
      document.getElementById('results').innerHTML = `<div id="results-info">このカテゴリの記事はありません</div>`;
      return;
    }
  }

  const sortSel = document.getElementById('sort-sel');
  const sortBy  = sortSel ? sortSel.value : 'date';
  
  const sorted  = [...displayData].sort((a, b) => {
    if (sortBy === 'hot') {
      return b.topicScore - a.topicScore || b.clusterLatestDt - a.clusterLatestDt || b.clusterId - a.clusterId || b.dt - a.dt;
    }
    if (sortBy === 'date') return b.dt - a.dt;
    return a.keyword.localeCompare(b.keyword, 'ja') || b.dt - a.dt;
  });

  const now = Date.now();
  let currentClusterId = null;

  const rows = sorted.map((n, idx) => {
    const d = n.dt;
    const hasDate = d.getFullYear() > 2000;
    const dayStr  = hasDate ? `${d.getMonth()+1}/${d.getDate()}` : '—';
    const timeStr = hasDate ? `${d.getHours()}:${(d.getMinutes()<10?'0':'')+d.getMinutes()}` : '';
    const isNew     = hasDate && (now - d.getTime()) < 3 * 3600 * 1000;
    const isVisited = visitedLinks.includes(n.link);
    const newBadge   = isNew ? '<span class="badge-new">NEW</span>' : '';
    
    let hotBadge = '';
    if (sortBy === 'hot' && n.topicScore > 1) {
       if (n.clusterId !== currentClusterId) hotBadge = `<span class="badge-hot">🔥関連${n.topicScore}件</span>`;
       currentClusterId = n.clusterId;
    }

    const tagHtml = (currentTab === 'major') 
      ? `<span class="kw-tag cat-tag">${n.category}</span>` 
      : `<span class="kw-tag">${n.keyword}</span>`;
    
    const safeLink   = encodeURI(n.link);

    return `<tr class="${isVisited ? 'visited' : ''}">
      <td class="col-title">
        <div style="line-height:1.5; font-size: 0.9rem;">
          ${newBadge}${hotBadge}${tagHtml}${n.title}
        </div>
      </td>
      <td class="col-date"><span class="date-day">${dayStr}</span>${timeStr ? `<span class="date-time">${timeStr}</span>` : ''}</td>
      <td class="col-link"><a class="open-link" href="${safeLink}" target="_blank" rel="noopener noreferrer" onclick="markAsVisited('${n.link}')">↗</a></td>
    </tr>`;
  }).join('');

  document.getElementById('results').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="col-title">タイトル</th>
          <th class="col-date">日時</th>
          <th class="col-link">リンク</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

renderChips();
switchTab(currentTab);
</script>
</body>
</html>
