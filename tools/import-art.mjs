// 粗茶「やおよろづ」素材(200x250 PNG)を img/chars/<id>.png として取り込む
// 使い方: node tools/import-art.mjs "<素材フォルダ>"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error('素材フォルダを指定してください'); process.exit(1); }
const chars = JSON.parse(fs.readFileSync(path.join(root, 'tools/characters.json'), 'utf8'));

// characters.json の名前と素材ファイル名が食い違うもの
const ALIAS = {
  tokiko: '朱鷺子', ringo: '鈴湖', momoyo: '姫虫百々代', ichirin: '雲居一輪＆雲山',
  keine: '上白沢慧音A', nitori: '河城にとりpng', mamizou: '二ツ岩マミゾウ',
};
// 同名ファイルが複数あるとき、通常は番号が大きい方を使う。例外はここで指定
const FORCE = { remilia: '00108レミリア・スカーレット.png' }; // 00109レミリア は中身がフラン

const norm = s => s.replace(/[・･]/g, '');
const files = fs.readdirSync(src).filter(f => /\.png$/i.test(f));
const parsed = files.map(f => {
  const m = f.match(/^(\d+)(-2)?(b)?(.*?)\.png$/i);
  if (!m) return null;
  const body = m[4];
  // 裏向き(b)、別バージョン(-2, 2, B)は除外
  const variant = !!m[2] || !!m[3] || /(b|B|2)$/.test(body);
  return { f, num: Number(m[1]), body: norm(body), variant };
}).filter(Boolean);

const out = path.join(root, 'tools/art-src');
fs.mkdirSync(out, { recursive: true });
const missing = [];
const picked = {};
for (const c of chars) {
  let file = FORCE[c.id];
  if (!file) {
    const want = norm(ALIAS[c.id] || c.name);
    const cands = parsed.filter(p => !p.variant && p.body === want).sort((a, b) => b.num - a.num);
    file = cands[0]?.f;
  }
  if (!file) { missing.push(`${c.id}:${c.name}`); continue; }
  picked[c.id] = file;
  fs.copyFileSync(path.join(src, file), path.join(out, `${c.id}.png`));
}
fs.writeFileSync(path.join(root, 'tools/art-map.json'), JSON.stringify(picked, null, 2) + '\n');
console.log(`取り込み ${Object.keys(picked).length}/${chars.length}`);
if (missing.length) { console.log('見つからない:', missing.join(', ')); process.exit(2); }
