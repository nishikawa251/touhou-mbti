// 診断ロジックの検証: (1) 全キャラが結果として出うるか (2) ランダム回答での分布
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const L = require(path.join(root, 'docs/logic.js'));
const win = {};
new Function('window', fs.readFileSync(path.join(root, 'docs/data.js'), 'utf8'))(win);
const chars = win.TOHO_CHARS;

// 目標ベクトルにぴったり一致する回答を組み立てる
function answersFor(vec) {
  const ans = new Array(L.QUESTIONS.length).fill(0);
  L.AXES.forEach((a, ai) => {
    const idx = L.QUESTIONS.map((q, i) => (q.axis === a.key ? i : -1)).filter(i => i >= 0);
    let need = Math.round(vec[ai] * idx.length * 2); // 合計で必要な点
    for (const i of idx) {
      const step = Math.max(-2, Math.min(2, need));
      ans[i] = step * L.QUESTIONS[i].dir;
      need -= step;
    }
    if (need !== 0) throw new Error('組み立て不能: ' + a.key);
  });
  return ans;
}

let fail = 0;
for (const c of chars) {
  const u = L.score(answersFor(c.v));
  const r = L.match(u, chars);
  if (r.best.id !== c.id) { fail++; console.log(`到達不能: ${c.name} → ${r.best.name} になる (d=${r.d.toFixed(3)})`); }
}
console.log(`(1) 自分のベクトルで自分に到達: ${chars.length - fail}/${chars.length}`);

// 軸ごとの設問数と向きのバランス
for (const a of L.AXES) {
  const qs = L.QUESTIONS.filter(q => q.axis === a.key);
  console.log(`   ${a.key}: ${qs.length}問 (正 ${qs.filter(q => q.dir > 0).length} / 逆 ${qs.filter(q => q.dir < 0).length})`);
}

// ランダム回答(人間らしく軸ごとに傾向を持たせる)での分布
function rnd() { let s = 0; for (let i = 0; i < 4; i++) s += Math.random(); return s / 2 - 1; } // 概ね -1〜1 の山型
const N = 200000;
const hit = new Map(chars.map(c => [c.id, 0]));
const typeHit = {};
let relaxed = 0;
for (let n = 0; n < N; n++) {
  const lean = {}; L.AXES.forEach(a => { lean[a.key] = rnd() * 1.6; });
  const ans = L.QUESTIONS.map(q => Math.max(-2, Math.min(2, Math.round(lean[q.axis] * 2 * q.dir + rnd() * 1.5))));
  const r = L.match(L.score(ans), chars);
  hit.set(r.best.id, hit.get(r.best.id) + 1);
  typeHit[r.type] = (typeHit[r.type] || 0) + 1;
  if (r.relaxed) relaxed++;
}
const sorted = [...hit.entries()].sort((a, b) => b[1] - a[1]);
const name = id => chars.find(c => c.id === id).name;
console.log(`(2) ランダム ${N} 回: 出現キャラ ${sorted.filter(x => x[1] > 0).length}/${chars.length}, タイプ不在で緩和 ${relaxed} 回`);
console.log('   多い順:', sorted.slice(0, 8).map(([id, n]) => `${name(id)} ${(n / N * 100).toFixed(1)}%`).join(' / '));
console.log('   少ない順:', sorted.slice(-8).map(([id, n]) => `${name(id)} ${(n / N * 100).toFixed(2)}%`).join(' / '));
console.log('   タイプ別:', L.TYPE_ORDER.map(t => `${t} ${((typeHit[t] || 0) / N * 100).toFixed(1)}%`).join(' '));
if (fail) process.exitCode = 1;
