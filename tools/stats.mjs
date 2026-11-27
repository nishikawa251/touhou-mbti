// GoatCounter の計測から「診断結果に出た回数」をキャラごとに集めて docs/stats.json に書く
// 使い方: GOATCOUNTER_TOKEN=xxxx node tools/stats.mjs  (または tools/.goatcounter-token にトークンを置く)
// トークンは GoatCounter の Settings → API tokens で「Read statistics」権限で作る。リポジトリには入れない(.gitignore 済み)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'nishikawa251';
const SINCE = '2026-11-27'; // 公開日
const tokenFile = path.join(root, 'tools/.goatcounter-token');
const token = process.env.GOATCOUNTER_TOKEN || (fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '');
if (!token) { console.error('GoatCounter の API トークンがありません(環境変数 GOATCOUNTER_TOKEN か tools/.goatcounter-token)'); process.exit(1); }

const today = new Date().toISOString().slice(0, 10);
// end は「その時刻まで」なので翌日の 0 時を渡す(当日分を含める)
const endDay = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const api = async (params) => {
  const url = `https://${SITE}.goatcounter.com/api/v0/stats/hits?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
};

// キャラごとに 1 リクエスト(include_paths は名前指定で 1 件ずつしか効かない)。レート制限 4 req/s を守る
const ids = JSON.parse(fs.readFileSync(path.join(root, 'tools/characters.json'), 'utf8')).map(c => c.id);
const counts = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const id of ids) {
  const p = new URLSearchParams({ start: SINCE, end: endDay, limit: '5', path_by_name: 'true', include_paths: `result-char/${id}` });
  const data = await api(p);
  for (const h of data.hits || []) {
    const views = (h.stats || []).reduce((n, d) => n + (Array.isArray(d.hourly) ? d.hourly.reduce((a, b) => a + b, 0) : (d.daily || 0)), 0);
    counts.set(h.path, (counts.get(h.path) || 0) + (views || h.count || 0));
  }
  await sleep(300);
}

const chars = {};
let total = 0;
for (const [p, n] of counts) {
  if (!p.startsWith('result-char/')) continue;
  chars[p.slice('result-char/'.length)] = n;
  total += n;
}
const out = { updated: today, since: SINCE, total, chars };
fs.writeFileSync(path.join(root, 'docs/stats.json'), JSON.stringify(out) + '\n');
const top = Object.entries(chars).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${id} ${n}`).join(', ');
console.log(`docs/stats.json: ${Object.keys(chars).length} キャラ / 全 ${total} 回 (${SINCE}〜${today}) 上位: ${top}`);
