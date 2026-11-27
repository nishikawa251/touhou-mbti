// tools/profiles/part*.json + tools/characters.json (+ tools/overrides.json) → data.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^﻿/, ''));

const chars = read('tools/characters.json');
const profiles = new Map();
for (const f of fs.readdirSync(path.join(root, 'tools/profiles')).filter(f => /^part\d+\.json$/.test(f)).sort()) {
  for (const p of read('tools/profiles/' + f)) profiles.set(p.id, p);
}
const garakuta = read('tools/garakuta.json');
// 名前の読みと主な登場原作(tools/meta.json。なければ空)
const meta = fs.existsSync(path.join(root, 'tools/meta.json')) ? read('tools/meta.json') : {};
// 名前のふりがな(姓・名ごとの区切り。tools/ruby.json)
const rubyMap = fs.existsSync(path.join(root, 'tools/ruby.json')) ? read('tools/ruby.json') : {};
const ovPath = path.join(root, 'tools/overrides.json');
const overrides = fs.existsSync(ovPath) ? read('tools/overrides.json') : {};

const KEYS = ['ei', 'sn', 'tf', 'jp', 'at', 'hs', 'ag', 'mt'];
const problems = [];
const out = chars.map(c => {
  const p = { ...(profiles.get(c.id) || {}), ...(overrides[c.id] || {}) };
  if (!profiles.has(c.id)) problems.push(`${c.id}: プロファイルなし`);
  for (const k of KEYS) {
    if (!Number.isInteger(p[k]) || p[k] < -3 || p[k] > 3) problems.push(`${c.id}: ${k}=${p[k]}`);
  }
  for (const k of KEYS.slice(0, 4)) if (p[k] === 0) problems.push(`${c.id}: 基本軸 ${k} が 0`);
  const mbti = (p.ei > 0 ? 'E' : 'I') + (p.sn > 0 ? 'N' : 'S') + (p.tf > 0 ? 'T' : 'F') + (p.jp > 0 ? 'J' : 'P');
  for (const k of ['catch', 'desc']) if (!p[k]) problems.push(`${c.id}: ${k} なし`);
  return {
    id: c.id,
    name: c.name,
    mbti,
    v: KEYS.map(k => +(p[k] / 3).toFixed(4)),
    catch: p.catch || '',
    traits: p.traits || [],
    desc: p.desc || '',
    url: 'https://dic.pixiv.net/a/' + encodeURIComponent(c.article || c.name),
    // 東方我楽多叢誌「週刊東方キャラクター」のキャラ記事(記事がないキャラは空)
    g: garakuta[c.id] || '',
    kana: (meta[c.id] && meta[c.id].kana) || '',
    ruby: rubyMap[c.id] || null,
    works: (meta[c.id] && meta[c.id].works) || [],
  };
});

// 同じタイプ内で 8軸がまったく同じキャラがいると片方に到達できない
const seen = new Map();
for (const c of out) {
  const key = c.v.join(',');
  if (seen.has(key)) problems.push(`${c.id}: ${seen.get(key)} と 8軸が同一`);
  else seen.set(key, c.id);
}

fs.writeFileSync(path.join(root, 'data.js'),
  '// tools/build-data.mjs が生成。手で編集せず、tools/profiles か tools/overrides.json を直して再生成する。\n' +
  'window.TOHO_CHARS = ' + JSON.stringify(out, null, 1) + ';\n' +
  // 登場原作 → 販売・紹介ページ(Steam / 東方やおよろず商店 / KADOKAWA / BOOK☆WALKER / 一迅社)。tools/works.json
  'window.TOHO_WORK_URLS = ' + JSON.stringify(Object.fromEntries(Object.entries(read('tools/works.json')).filter(([k]) => !k.startsWith('_')))) + ';\n', 'utf8');

const byType = {};
for (const c of out) (byType[c.mbti] ||= []).push(c.name);
for (const t of Object.keys(byType).sort()) console.log(t, byType[t].length, byType[t].join('、'));
console.log('計', out.length, 'キャラ /', Object.keys(byType).length, 'タイプ');
if (problems.length) { console.log('\n問題:\n' + problems.join('\n')); process.exitCode = 1; }
