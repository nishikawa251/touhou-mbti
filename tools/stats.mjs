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
const api = async (params) => {
  const url = `https://${SITE}.goatcounter.com/api/v0/stats/hits?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
};

// パスごとの合計を、ページング(after = 最後の path_id)で全部集める
const counts = new Map();
let after = '';
for (let page = 0; page < 50; page++) {
  const data = await api({ start: SINCE, end: today, limit: '100', ...(after ? { after } : {}) });
  const hits = data.hits || [];
  for (const h of hits) {
    const total = typeof h.count === 'number' ? h.count : (h.stats || []).reduce((n, d) => n + (d.daily || 0), 0);
    counts.set(h.path, (counts.get(h.path) || 0) + total);
  }
  if (!data.more || !hits.length) break;
  after = String(hits[hits.length - 1].path_id);
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
