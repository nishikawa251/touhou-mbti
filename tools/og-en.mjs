// 英語版の共有画像を描く(日本語版の tools/og.ps1 と同じレイアウトを、ブラウザで再現して撮る)
//   img/og/en/<id>.jpg       1200x630  シンプル版(OGP にも使う)
//   img/og/en/<id>-full.jpg  1200x900  紹介文入りの詳細版
//   img/og/en/site.jpg       1200x630  トップページ用
// 使い方: node tools/build-share.mjs のあと node tools/og-en.mjs
// Playwright が必要(npm i -D playwright && npx playwright install chromium)。
// フォントは tools/fonts の Zen Maru Gothic(ラテン文字だけのサブセット、SIL OFL)。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const outDir = path.join(root, 'img/og/en');
const data = JSON.parse(fs.readFileSync(path.join(outDir, 'og-data.json'), 'utf8'));
const b64 = p => fs.readFileSync(path.join(root, p)).toString('base64');
const font = w => `@font-face { font-family: 'Zen Maru Gothic'; font-weight: ${w}; src: url(data:font/woff2;base64,${b64(`tools/fonts/zen-maru-gothic-latin-${w}-normal.woff2`)}) format('woff2'); }`;
const imgCache = new Map();
const charImg = id => {
  if (!imgCache.has(id)) imgCache.set(id, `data:image/png;base64,${b64(`img/chars/${id}.png`)}`);
  return imgCache.get(id);
};
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const siteLabel = 'https://nishikawa251.github.io/touhou-mbti/en/';

const CSS = `
${font(500)}
${font(700)}
* { box-sizing: border-box; margin: 0; }
body { font-family: 'Zen Maru Gothic', sans-serif; color: #2a3050; }
.card { position: relative; width: 1200px; overflow: hidden; background: var(--soft); }
.bar { position: absolute; left: 0; top: 0; width: 1200px; height: 14px; background: var(--main); }
.panel { position: absolute; left: 56px; top: 50px; width: 440px; height: 530px; background: #fff; border: 4px solid var(--main); border-radius: 28px; }
.panel img { position: absolute; left: 16px; top: 11px; width: 400px; height: 500px; }
.right { position: absolute; left: 540px; top: 54px; width: 604px; }
.title { font-weight: 700; font-size: 26px; line-height: 34px; color: var(--main); }
.pre { font-weight: 500; font-size: 28px; line-height: 38px; color: #5d6482; margin-top: 6px; }
.name { font-weight: 700; font-size: 72px; line-height: 1.12; margin: 8px 0 0 -4px; white-space: nowrap; }
.type { display: flex; align-items: center; gap: 14px; margin-top: 14px; height: 50px; }
.code { height: 50px; padding: 0 18px; border-radius: 25px; background: var(--main); color: #fff; font-weight: 700; font-size: 30px; display: flex; align-items: center; }
.tname { color: var(--main); font-weight: 700; font-size: 30px; white-space: nowrap; }
.catch { color: var(--main); font-weight: 700; font-size: 38px; line-height: 1.25; margin: 20px 0 0 -2px; white-space: nowrap; }
.traits { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.trait { height: 42px; padding: 0 15px; border: 2px solid var(--main); border-radius: 21px; background: #fff; color: var(--main); font-weight: 700; font-size: 24px; display: flex; align-items: center; white-space: nowrap; }
.descbox { position: absolute; left: 56px; top: 612px; width: 1088px; height: 230px; background: #fff; border: 2px solid var(--main); border-radius: 22px; padding: 14px 22px 0; }
.desc { font-weight: 500; font-size: 25px; line-height: 1.36; height: 150px; overflow: hidden; }
.blurb { font-weight: 500; font-size: 21px; line-height: 1.3; color: #5d6482; margin-top: 8px; }
.url { position: absolute; left: 0; width: 1200px; text-align: center; font-weight: 500; font-size: 22px; color: #5d6482; }
.credit { position: absolute; left: 56px; font-weight: 500; font-size: 20px; color: #5d6482; }
.site { background: #fbf6ee; height: 630px; }
.site .bar { background: #cf2f6b; }
.center { position: absolute; left: 0; width: 1200px; text-align: center; }
.s-eyebrow { top: 50px; font-weight: 700; font-size: 30px; color: #cf2f6b; }
.s-title { top: 100px; font-weight: 700; font-size: 72px; line-height: 1.2; white-space: nowrap; }
.s-sub { top: 210px; font-weight: 500; font-size: 30px; color: #5d6482; }
.row { position: absolute; top: 290px; left: 0; width: 1200px; display: flex; justify-content: center; gap: 10px; }
.mini { width: 128px; height: 160px; background: #fff; border: 2px solid #e4d9c6; border-radius: 16px; position: relative; }
.mini img { position: absolute; left: 2px; top: 3px; width: 120px; height: 150px; }
`;

function cardHtml(c, full) {
  const H = full ? 900 : 630;
  return `
  <div class="card" id="shot" style="height:${H}px; --main:${c.color}; --soft:${c.soft}">
    <div class="bar"></div>
    <div class="panel"><img src="${charImg(c.id)}" alt=""></div>
    <div class="right">
      <p class="title">${esc(data.labels.title)}</p>
      <p class="pre">${esc(data.labels.pre)}</p>
      <p class="name fit" data-max="72" data-min="40">${esc(c.name)}</p>
      <div class="type"><span class="code">${c.mbti}</span><span class="tname fit" data-max="30" data-min="22">${esc(c.typeName)}</span></div>
      <p class="catch fit" data-max="38" data-min="26">${esc(c.catch)}</p>
      <div class="traits">${c.traits.map(t => `<span class="trait">${esc(t)}</span>`).join('')}</div>
    </div>
    ${full ? `
    <div class="descbox">
      <p class="desc shrink" data-max="25" data-min="19">${esc(c.desc)}</p>
      <p class="blurb">${esc(`${c.mbti} ${c.typeName}: ${c.typeBlurb}`)}</p>
    </div>` : ''}
    <p class="url" style="top:${H - 44}px">${esc(siteLabel)}</p>
    <p class="credit" style="top:${H - 40}px">${esc(data.labels.credit)}</p>
  </div>`;
}

function siteHtml() {
  const ids = ['reimu', 'marisa', 'sakuya', 'youmu', 'sanae', 'koishi', 'nue', 'junko'];
  return `
  <div class="card site" id="shot">
    <div class="bar"></div>
    <p class="center s-eyebrow">${esc(data.labels.siteEyebrow)}</p>
    <p class="center s-title fit" data-max="72" data-min="44" data-width="1120">${esc(data.labels.siteTitle)}</p>
    <p class="center s-sub">${esc(data.labels.siteSub)}</p>
    <div class="row">${ids.map(id => `<div class="mini"><img src="${charImg(id)}" alt=""></div>`).join('')}</div>
    <p class="center url" style="top:500px; font-size:24px">${esc(siteLabel)}</p>
    <p class="center credit" style="top:560px; left:0">${esc(data.labels.credit)}</p>
  </div>`;
}

// 1行に収まるまで文字を小さくする(.fit)。最小でも入らなければ折り返す。
// 紹介文(.shrink)は枠の高さに収まるまで小さくする
async function layout(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    // 文字そのものの幅(要素の幅ではなく)
    const textW = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    for (const el of document.querySelectorAll('.fit')) {
      const maxW = Number(el.dataset.width) || el.parentElement.getBoundingClientRect().right - el.getBoundingClientRect().left;
      let size = Number(el.dataset.max);
      el.style.fontSize = size + 'px';
      while (textW(el) > maxW && size > Number(el.dataset.min)) { size -= 2; el.style.fontSize = size + 'px'; }
      if (textW(el) > maxW) el.style.whiteSpace = 'normal';
    }
    for (const el of document.querySelectorAll('.shrink')) {
      let size = Number(el.dataset.max);
      el.style.fontSize = size + 'px';
      while (el.scrollHeight > el.clientHeight && size > Number(el.dataset.min)) { size -= 1; el.style.fontSize = size + 'px'; }
    }
  });
}

async function shoot(page, html, file) {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`);
  await layout(page);
  const el = await page.$('#shot');
  await el.screenshot({ path: path.join(outDir, file), type: 'jpeg', quality: 86 });
}

const only = process.argv.slice(2); // 例: node tools/og-en.mjs reimu marisa(指定がなければ全員)
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
let n = 0;
for (const c of data.chars) {
  if (only.length && !only.includes(c.id)) continue;
  await shoot(page, cardHtml(c, false), `${c.id}.jpg`);
  await shoot(page, cardHtml(c, true), `${c.id}-full.jpg`);
  n++;
}
if (!only.length || only.includes('site')) await shoot(page, siteHtml(), 'site.jpg');
await browser.close();
console.log(`英語版の共有画像 ${n} キャラ分(シンプル版・詳細版)と site.jpg を img/og/en/ に描きました`);
