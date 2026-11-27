// tools/art-src/<id>.png (原本) → docs/img/chars/<id>.webp (公開用)。node tools/webp.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'tools/art-src');
const out = path.join(root, 'docs/img/chars');
fs.mkdirSync(out, { recursive: true });
let n = 0, before = 0, after = 0;
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.png'))) {
  const o = path.join(out, f.replace(/\.png$/, '.webp'));
  await sharp(path.join(src, f)).webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(o);
  before += fs.statSync(path.join(src, f)).size; after += fs.statSync(o).size; n += 1;
}
console.log(`${n} 枚を WebP にしました: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
