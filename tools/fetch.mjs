// pixiv百科事典から各キャラの「概要」「性格」節を取得して research/pages/*.txt に保存する
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'research', 'pages');
fs.mkdirSync(outDir, { recursive: true });

const chars = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'characters.json'), 'utf8'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<(br|\/p|\/li|\/tr|\/div|\/h\d)[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function sections(html) {
  // 記事本文の h2/h3 (id="h2_N" / "h3_N") で分割
  const re = /<h([23])[^>]*id="h[23]_\d+"[^>]*>([\s\S]*?)<\/h\1>/g;
  const heads = [];
  let m;
  while ((m = re.exec(html))) heads.push({ level: +m[1], title: strip(m[2]), start: m.index, end: re.lastIndex });
  const out = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    // h2 は次の h2 まで(配下の h3 を含む)、h3 は次の見出しまで
    let j = i + 1;
    if (h.level === 2) while (j < heads.length && heads[j].level !== 2) j++;
    const stop = j < heads.length ? heads[j].start : Math.min(html.length, h.end + 60000);
    out.push({ level: h.level, title: h.title, text: strip(html.slice(h.end, stop)) });
  }
  return out;
}

const WANT = /性格|人物|人柄|キャラクター性|人となり|内面/;
const log = [];
for (const c of chars) {
  const file = path.join(outDir, c.id + '.txt');
  if (fs.existsSync(file) && fs.statSync(file).size > 200) { continue; }
  const article = c.article || c.name;
  const url = 'https://dic.pixiv.net/a/' + encodeURIComponent(article);
  let html = '';
  try {
    html = execFileSync('curl', ['-sS', '-L', '--fail', '-A', UA, '-H', 'Accept-Language: ja', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { log.push(`${c.name}: ${e.message}`); console.log(log.at(-1)); continue; }
  const secs = sections(html);
  const parts = [];
  const gaiyo = secs.find(s => s.level === 2 && /概要/.test(s.title));
  if (gaiyo) parts.push('【概要】\n' + gaiyo.text.slice(0, 900));
  const pers = secs.filter(s => WANT.test(s.title));
  const seen = new Set();
  for (const s of pers) {
    if (seen.has(s.text.slice(0, 80))) continue;
    seen.add(s.text.slice(0, 80));
    parts.push(`【${s.title}】\n` + s.text.slice(0, 3000));
  }
  if (!pers.length) {
    // 性格節が無い記事: 概要を長めに + 来歴・活躍などの節 + 性格に触れた行を拾う
    if (gaiyo) parts[0] = '【概要】\n' + gaiyo.text.slice(0, 2500);
    const SKIP = /概要|容姿|スペル|アビリティ|元ネタ|二次創作|関連|名前|弾幕|能力|言語|イラスト|タグ|余談|アンソロジー/;
    let budget = 5000;
    for (const sec of secs.filter(x => x.level === 2 && x.title && !SKIP.test(x.title))) {
      if (budget <= 0) break;
      const t = sec.text.slice(0, Math.min(2200, budget));
      budget -= t.length;
      parts.push('【' + sec.title + '】\n' + t);
    }
    const all = secs.filter(x => x.level === 2 && !/関連|イラスト|タグ|スペル/.test(x.title)).map(x => x.text).join('\n');
    const lines = all.split('\n').filter(l => /性格|気質|態度|口調|温厚|好戦|冷静|明る|真面目|優し|陽気|臆病|傲慢|高慢|自信|マイペース|無邪気|狡猾|穏やか|社交|内気/.test(l));
    if (lines.length) parts.push('【性格に触れた記述】\n' + [...new Set(lines)].join('\n').slice(0, 2500));
  }
  const body = `# ${c.name}\n出典: ${url}\n見出し: ${secs.filter(s => s.level === 2).map(s => s.title).join(' / ')}\n\n` + parts.join('\n\n');
  fs.writeFileSync(file, body, 'utf8');
  log.push(`${c.name}: ${body.length}字 性格節=${pers.length}`);
  console.log(log.at(-1));
  await sleep(700);
}
fs.writeFileSync(path.join(root, 'research', 'fetch-log.txt'), log.join('\n'), 'utf8');
