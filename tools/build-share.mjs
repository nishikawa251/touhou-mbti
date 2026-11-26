// 共有用の静的ページ(s/<id>.html)と、OGP 画像を描くための og-data.json を作る
// 使い方: node tools/build-share.mjs  →  そのあと powershell -File tools/og.ps1 で画像を描く(英語版の画像は node tools/og-en.mjs)
// 英語版の共有ページ en/s/<id>.html と img/og/en/og-data.json もここで作る
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const L = require(path.join(root, 'logic.js'));
const SITE = 'https://nishikawa251.github.io/touhou-mbti/';

const data = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const chars = JSON.parse(data.match(/window\.TOHO_CHARS\s*=\s*(\[[\s\S]*?\]);/)[1]);

// style.css のグループ色(ライトテーマ)
const COLORS = {
  NT: { main: '#5a48b5', soft: '#ebe7fa' },
  NF: { main: '#c22f6c', soft: '#fbe3ec' },
  SJ: { main: '#2c6aa6', soft: '#e1eef9' },
  SP: { main: '#b96a0c', soft: '#fbecd2' },
};

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const outDir = path.join(root, 's');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(root, 'img/og'), { recursive: true });

const og = [];
for (const c of chars) {
  const t = L.TYPES[c.mbti];
  const title = `診断結果は「${c.name}」(${c.mbti}・${t.name})`;
  const desc = `${c.catch}。東方キャラ性格診断 ― 36問で16タイプ × ${chars.length}キャラの中から、あなたにいちばん近い東方キャラを見つける非公式ファン診断。`;
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.name)} ― 東方キャラ性格診断</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="東方キャラ性格診断">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}img/og/${c.id}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${SITE}s/${c.id}.html">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}img/og/${c.id}.jpg">
<link rel="canonical" href="${SITE}#/c/${c.id}">
<script>location.replace('../#/c/${c.id}');</script>
<style>body{font-family:sans-serif;padding:24px;text-align:center}img{max-width:100%;height:auto}</style>
</head>
<body>
<p><a href="../#/c/${c.id}">診断結果「${esc(c.name)}」のページへ</a></p>
<img src="../img/og/${c.id}.jpg" alt="${esc(title)}" width="1200" height="630">
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, `${c.id}.html`), html);
  og.push({ id: c.id, name: c.name, mbti: c.mbti, typeName: t.name, catch: c.catch, traits: c.traits, desc: c.desc, typeBlurb: t.blurb, color: COLORS[t.group].main, soft: COLORS[t.group].soft });
}
// og.ps1 は ASCII だけで書いてあるので、画像に描く日本語はここから渡す
const labels = {
  title: '東方キャラ性格診断',
  pre: 'あなたにいちばん近いのは',
  siteEyebrow: '非公式ファン診断',
  siteTitle: 'あなたは幻想郷の誰に似ている?',
  siteSub: `36問で16タイプ × ${chars.length}キャラ。東方キャラ性格診断`,
  credit: 'イラスト: 粗茶',
};
fs.writeFileSync(path.join(root, 'img/og/og-data.json'), JSON.stringify({ site: SITE, labels, chars: og }, null, 2) + '\n');
console.log(`共有ページ ${og.length} 件を s/ に、og-data.json を img/og/ に書き出しました`);

// ---------- 英語版: en/s/<id>.html と img/og/en/og-data.json(画像は node tools/og-en.mjs で描く) ----------
const enWin = {};
new Function('window', fs.readFileSync(path.join(root, 'en/data.js'), 'utf8'))(enWin);
const EN = enWin.TOHO_CHARS_EN;
const enOutDir = path.join(root, 'en/s');
fs.rmSync(enOutDir, { recursive: true, force: true });
fs.mkdirSync(enOutDir, { recursive: true });
fs.mkdirSync(path.join(root, 'img/og/en'), { recursive: true });
const enOg = [];
for (const c of chars) {
  const e = EN[c.id];
  const t = L.TYPES[c.mbti].en;
  const title = `My result: ${e.name} (${c.mbti}, ${t.name})`;
  const desc = `${e.catch}. Touhou Character Personality Quiz: 36 questions, 16 types and ${chars.length} characters. An unofficial fan quiz that finds the Touhou character most like you.`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(e.name)} - Touhou Character Personality Quiz</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Touhou Character Personality Quiz">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}img/og/en/${c.id}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${SITE}en/s/${c.id}.html">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}img/og/en/${c.id}.jpg">
<link rel="canonical" href="${SITE}en/#/c/${c.id}">
<script>location.replace('../#/c/${c.id}');</script>
<style>body{font-family:sans-serif;padding:24px;text-align:center}img{max-width:100%;height:auto}</style>
</head>
<body>
<p><a href="../#/c/${c.id}">See the result page for ${esc(e.name)}</a></p>
<img src="../../img/og/en/${c.id}.jpg" alt="${esc(title)}" width="1200" height="630">
</body>
</html>
`;
  fs.writeFileSync(path.join(enOutDir, `${c.id}.html`), html);
  const tt = L.TYPES[c.mbti];
  enOg.push({ id: c.id, name: e.name, mbti: c.mbti, typeName: t.name, catch: e.catch, traits: e.traits, desc: e.desc, typeBlurb: t.blurb, color: COLORS[tt.group].main, soft: COLORS[tt.group].soft });
}
const enLabels = {
  title: 'Touhou Character Personality Quiz',
  pre: 'Your closest match is',
  siteEyebrow: 'Unofficial fan quiz',
  siteTitle: 'Who in Gensokyo are you most like?',
  siteSub: `36 questions, 16 types, ${chars.length} characters. Touhou Character Personality Quiz`,
  credit: 'Illustrations: Socha',
};
fs.writeFileSync(path.join(root, 'img/og/en/og-data.json'), JSON.stringify({ site: SITE + 'en/', labels: enLabels, chars: enOg }, null, 2) + '\n');
console.log(`英語版の共有ページ ${enOg.length} 件を en/s/ に、og-data.json を img/og/en/ に書き出しました`);
