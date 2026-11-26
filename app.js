// 東方キャラ性格診断 — 画面まわり
// 日本語版(index.html)と英語版(en/index.html)で共通。英語版は window.TOHO_LANG = 'en' にしてから読み込む
(function () {
  'use strict';
  const L = window.TohoLogic;
  const CHARS = window.TOHO_CHARS || [];
  // 表示言語。T(日本語, 英語) で、いまの言語の文を選ぶ
  const EN = window.TOHO_LANG === 'en';
  const T = (ja, en) => (EN ? en : ja);
  // 画像の置き場所(英語版は en/ から一つ上)
  const ROOT = EN ? '../' : '';
  if (EN) useEnglish();
  const BY_ID = new Map(CHARS.map(c => [c.id, c]));
  const app = document.getElementById('app');
  const dialog = document.getElementById('detail');
  const toastEl = document.getElementById('toast');
  // 共有用の絶対 URL(ローカルで開いたときも公開サイトの URL を共有する)
  const SITE = 'https://nishikawa251.github.io/touhou-mbti/';

  // 英語版: logic.js の en と en/data.js の英訳で、表示する文を差し替える(8軸の数値やタイプはそのまま)
  function useEnglish() {
    L.AXES.forEach(a => Object.assign(a, a.en));
    L.QUESTIONS.forEach(q => { q.text = q.en; });
    L.CHOICES.forEach(c => { c.label = c.en; });
    Object.values(L.TYPES).forEach(t => Object.assign(t, t.en));
    Object.values(L.GROUPS).forEach(g => Object.assign(g, g.en));
    const E = window.TOHO_CHARS_EN || {};
    CHARS.forEach(c => {
      const e = E[c.id];
      if (!e) return;
      c.nameJa = c.name;
      Object.assign(c, { name: e.name, catch: e.catch, traits: e.traits, desc: e.desc, url: e.wiki, kana: '', ruby: null });
    });
  }

  // 診断モード。full = 36問、quick = ドパガキモード(6問)
  const MODES = {
    full: { key: 'toho-seikaku-answers-v1', count: L.QUESTIONS.length, quiz: '#/quiz', result: '#/result', label: T('36問', '36 questions') },
    quick: { key: 'toho-seikaku-quick-v1', count: L.QUICK_COUNT, quiz: '#/quiz-quick', result: '#/result-quick', label: T('ドパガキモード(6問)', 'Brainrot Mode (6 questions)') },
  };
  let mode = 'full';
  let answers = new Array(L.QUESTIONS.length).fill(null);
  let seed = 0;
  let qIndex = 0;
  // 最後の質問に答えた直後だけ、結果の前に「あなたのキャラクターは……？」の演出を入れる
  let pendingReveal = false;
  const M = () => MODES[mode];
  // いま出す設問。ドパガキモードは seed から選んだ6問(seed が同じなら同じ6問)
  const qsOf = () => (mode === 'quick' ? L.quickPick(seed).map(i => L.QUESTIONS[i]) : L.QUESTIONS);

  // ---------- 小物 ----------
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const charImg = id => `${ROOT}img/chars/${id}.png`;
  const portrait = (c, cls = '') => `<img class="portrait ${cls}" src="${charImg(c.id)}" alt="" width="200" height="250" loading="lazy">`;
  const newSeed = () => Math.floor(Math.random() * 0x7fffffff);
  // タイプ名などのかぎかっこ。日本語「…」、英語 “…”
  const quoted = s => T(`「${s}」`, ` “${s}”`);
  const illustAlt = c => T(`${c.name}のイラスト`, `Illustration of ${c.name}`);
  // {漢字|よみ} → <ruby>漢字<rt>よみ</rt></ruby>(エスケープ済みの文字列に対して行う)
  const ruby = s => esc(s).replace(/\{([^|{}]+)\|([^}]+)\}/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>');
  // キャラ名(読みがあればふりがな付き)
  // 姓・名ごとに読みを乗せる(c.ruby = [[文字, 読み|null], ...])。区切りがなければ全体に1つ
  const nameRuby = c => {
    if (c.ruby) return c.ruby.map(([s, r]) => (r ? `<ruby>${esc(s)}<rp>(</rp><rt>${esc(r)}</rt><rp>)</rp></ruby>` : esc(s))).join('');
    return c.kana ? `<ruby>${esc(c.name)}<rp>(</rp><rt>${esc(c.kana)}</rt><rp>)</rp></ruby>` : esc(c.name);
  };
  // 主な登場原作。英語版は英題で、英語版の作品ページがあればそちらへ
  const WORK_URLS = window.TOHO_WORK_URLS || {};
  const WORKS_EN = window.TOHO_WORKS_EN || {};
  const workTitle = w => (EN && WORKS_EN[w] ? WORKS_EN[w].title : w);
  const workUrl = w => (EN && WORKS_EN[w] && WORKS_EN[w].url) || WORK_URLS[w];
  // リンク先ごとのツールチップ
  const workLinkTitle = u => (/steampowered/.test(u) ? T('Steam のページへ', 'On Steam')
    : /kadokawa\.co\.jp/.test(u) ? T('KADOKAWA の紹介ページへ', 'KADOKAWA (Japanese)')
    : /global\.bookwalker\.jp/.test(u) ? 'BOOK☆WALKER (English edition)'
    : /bookwalker\.jp/.test(u) ? T('BOOK☆WALKER のページへ', 'BOOK☆WALKER (Japanese)')
    : /hakurei-sukeikai/.test(u) ? T('東方やおよろず商店のページへ', 'Touhou Yaoyorozu Shop (Japanese)')
    : /ichijinsha\.co\.jp/.test(u) ? T('一迅社の紹介ページへ', 'Ichijinsha (Japanese)')
    : T('販売ページへ', 'Store page'));
  const workChip = w => {
    const u = workUrl(w);
    return u
      ? `<a class="work link" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(workLinkTitle(u))}">${esc(workTitle(w))}</a>`
      : `<span class="work">${esc(workTitle(w))}</span>`;
  };
  const worksLine = c => (c.works && c.works.length
    ? `<p class="works"><span class="works-label">${T('主な登場原作', 'Appears in')}</span>${c.works.map(workChip).join('')}</p>`
    : '');
  // 百科事典(日本語版はピクシブ百科事典、英語版は Touhou Wiki)
  const wikiLink = (c, withName = true) => `<a href="${esc(c.url)}" target="_blank" rel="noopener">${withName
    ? T(`ピクシブ百科事典で「${esc(c.name)}」を読む`, `Read about ${esc(c.name)} on Touhou Wiki`)
    : T('ピクシブ百科事典で読む', 'Read on Touhou Wiki')}</a>`;

  function save() {
    try { localStorage.setItem(M().key, JSON.stringify({ a: answers, seed })); } catch (e) { /* 保存できなくても診断は続けられる */ }
  }
  // 保存した回答。古い形式(配列だけ)も読める
  function load(m = mode) {
    try {
      const raw = JSON.parse(localStorage.getItem(MODES[m].key) || 'null');
      const a = Array.isArray(raw) ? raw : raw && raw.a;
      if (Array.isArray(a) && a.length === MODES[m].count) return { a, seed: (raw && raw.seed) || 0 };
    } catch (e) { /* 無視 */ }
    return null;
  }
  const isComplete = a => a.every(v => typeof v === 'number');

  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // 軸バー。user / chara は -1〜+1(どちらか片方だけでもよい)
  function axisRows(user, chara) {
    const pct = v => (50 + v * 50).toFixed(1) + '%';
    const label = (a, i) => {
      const you = user ? Math.round(user[i] * 100) : null;
      const her = chara ? Math.round(chara[i] * 100) : null;
      return T(
        `${a.negLabel}と${a.posLabel}の間。${user ? 'あなたは' + you : ''}${user && chara ? '、' : ''}${chara ? 'キャラは' + her : ''}`,
        `Between ${a.negLabel} and ${a.posLabel}.${user ? ' You: ' + you + '.' : ''}${chara ? ' Character: ' + her + '.' : ''}`);
    };
    return L.AXES.map((a, i) => `
      <div class="axis${a.main ? '' : ' axis-sub'}">
        <span class="axis-label neg${(user ? user[i] : chara[i]) < 0 ? ' on' : ''}">${a.neg ? `<b>${a.neg}</b> ` : ''}${a.negLabel}</span>
        <span class="axis-track" role="img" aria-label="${esc(label(a, i))}">
          <span class="axis-mid"></span>
          ${chara ? `<span class="axis-dot chara" style="left:${pct(chara[i])}"></span>` : ''}
          ${user ? `<span class="axis-dot user" style="left:${pct(user[i])}"></span>` : ''}
        </span>
        <span class="axis-label pos${(user ? user[i] : chara[i]) > 0 ? ' on' : ''}">${a.posLabel}${a.pos ? ` <b>${a.pos}</b>` : ''}</span>
      </div>`).join('');
  }

  // サブ軸の向きを「泰然・策士・…」の文字列で
  function subLabels(vec) {
    return L.AXES.slice(4).map((a, k) => { const v = vec[4 + k]; return v === 0 ? '' : (v > 0 ? a.posLabel : a.negLabel); }).filter(Boolean).join(T('・', ' · '));
  }
  function subTags(vec) {
    return L.AXES.slice(4).map((a, k) => {
      const v = vec[4 + k];
      if (v === 0) return '';
      return `<span class="tag">${v > 0 ? a.posLabel : a.negLabel}</span>`;
    }).join('');
  }

  function typeBadge(mbti, big) {
    const t = L.TYPES[mbti];
    return `<span class="type-badge g-${t.group}${big ? ' big' : ''}"><b>${mbti}</b><span>${t.name}</span></span>`;
  }

  function charTile(c, extra = '') {
    return `<button type="button" class="tile" data-char="${c.id}">
      ${portrait(c)}
      <span class="tile-name">${esc(c.name)}</span>${extra}
    </button>`;
  }

  // スペルカード風のタイプ名。グループ名(知略の者たち → 知略)を冠にして 知略「型破りの仕掛け人」
  // 英語版は Strategy Sign “Maverick Instigator” の形
  function spellName(mbti) {
    const t = L.TYPES[mbti];
    const g = L.GROUPS[t.group];
    return EN ? `${esc(g.sign)} “${esc(t.name)}”` : `${esc(g.name.replace(/の者たち$/, ''))}「${esc(t.name)}」`;
  }
  // 一致度を10発の弾で。満タン=100%
  function matchBullets(sim, quick) {
    const full = Math.floor(sim / 10);
    const half = sim % 10 >= 5 ? 1 : 0;
    const dots = Array.from({ length: 10 }, (_, i) => `<i class="${i < full ? 'on' : (i === full && half ? 'half' : '')}"></i>`).join('');
    return `<p class="match" aria-label="${T(`一致度 ${sim}%`, `${sim}% match`)}"><span class="bullets" aria-hidden="true">${dots}</span><b>${sim}%</b><span>${T('一致', 'match')}${quick ? T('(たぶん)', ' (probably)') : ''}</span></p>`;
  }

  // 折りたたみ(見出しボタン + 開閉アニメーションする中身)
  function accordion(id, title, sub, body, cls = '', open = false) {
    return `
      <section class="acc ${cls}">
        <button type="button" class="acc-head${open ? ' is-open' : ''}" data-toggle="${id}" aria-expanded="${open}" aria-controls="${id}">${esc(title)}<span class="acc-sub">${esc(sub)}</span><span class="acc-arrow" aria-hidden="true">▾</span></button>
        <div class="collapse${open ? ' open' : ''}" id="${id}"><div class="collapse-inner acc-body">${body}</div></div>
      </section>`;
  }
  function toggleCollapse(btn) {
    const box = document.getElementById(btn.dataset.toggle);
    if (!box) return;
    const open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  }

  // ---------- 結果発表の演出 ----------
  // 暗い画面でスポットライトが回るなか、黒いかたまりがむにょむにょ動いて、だんだん結果のキャラの形に
  // 固まっていき、最後に照らし出される。SVG の feTurbulence + feDisplacementMap で絵をゆがめ、
  // ゆがみの強さを 16fps のコマ送りで弱めていく。
  const REVEAL_FPS = 16;
  function morphFrame(turb, disp, frame, p) {
    // p: 0(かたまり) → 1(本人の形)。種を毎コマ変えてむにょむにょさせる
    const ease = (1 - p) ** 1.6;
    disp.setAttribute('scale', String(Math.round(150 * ease + 8 * (1 - p))));
    turb.setAttribute('seed', String(frame));
    turb.setAttribute('baseFrequency', (0.006 + 0.016 * (1 - p)).toFixed(4) + ' ' + (0.010 + 0.018 * (1 - p)).toFixed(4));
  }
  function playReveal(c) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const el = document.createElement('div');
    el.className = 'reveal';
    el.innerHTML = `
      <svg class="reveal-defs" width="0" height="0" aria-hidden="true">
        <filter id="munyo" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="1" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="150" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>
      <div class="spot a"></div><div class="spot b"></div>
      <div class="reveal-stage">
        <img class="reveal-img morph" src="${charImg(c.id)}" alt="" width="200" height="250">
        <p class="reveal-text">${T('あなたのキャラクターは', 'Your character is')}<span class="dots"><i>.</i><i>.</i><i>.</i></span>${T('？', '?')}</p>
        <p class="reveal-name"></p>
      </div>
      <button type="button" class="reveal-skip">${T('スキップ', 'Skip')}</button>`;
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');
    const turb = el.querySelector('feTurbulence');
    const disp = el.querySelector('feDisplacementMap');
    const timers = [];
    let raf = 0, done = false;
    const finish = () => {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      clearInterval(raf);
      el.classList.add('out');
      document.body.classList.remove('no-scroll');
      setTimeout(() => el.remove(), 450);
    };
    // 0〜2.4秒: むにょむにょ → 本人の形へ(16fps)
    const MORPH_MS = 2400;
    const t0 = performance.now();
    let frame = 0;
    morphFrame(turb, disp, frame, 0);
    raf = setInterval(() => {
      frame += 1;
      const p = Math.min(1, (performance.now() - t0) / MORPH_MS);
      morphFrame(turb, disp, frame, p);
      if (p >= 1) { clearInterval(raf); el.classList.add('lock'); el.querySelector('.reveal-img').classList.remove('morph'); }
    }, 1000 / REVEAL_FPS);
    // 3.0秒: 照らし出す → 4.6秒: 閉じる
    timers.push(setTimeout(() => {
      el.classList.add('shine');
      el.querySelector('.reveal-name').textContent = c.name;
      el.querySelector('.reveal-text').textContent = T('あなたのキャラクターは', 'Your character is');
    }, 3000));
    timers.push(setTimeout(finish, 4600));
    el.querySelector('.reveal-skip').addEventListener('click', finish);
  }

  // キャラのカード(結果・共有ページ・詳細で共通)
  function charHead(c, mbti, extra = '', big = false) {
    return `
      <div class="result-head">
        <img class="card-img" src="${charImg(c.id)}" alt="${esc(illustAlt(c))}" width="200" height="250">
        <div class="result-main">
          ${typeBadge(mbti, big)}
          ${extra}
        </div>
      </div>`;
  }

  // 東方我楽多叢誌「週刊東方キャラクター」へのボタン。記事がないキャラは連載の一覧へ(英語版でも日本語の記事へ)
  const GARAKUTA_INDEX = 'https://touhougarakuta.com/index_interview/weekly_tohochara/';
  function garakutaLink(c) {
    const has = !!c.g;
    return `
      <a class="btn garakuta" href="${has ? c.g : GARAKUTA_INDEX}" target="_blank" rel="noopener">
        <span class="garakuta-eyebrow">${T('このキャラが登場する創作を見てみよう！', 'See creations featuring this character!')}</span>
        <span class="garakuta-title">${has
          ? T(`東方我楽多叢誌「週刊東方キャラクター」の${esc(c.name)}のページへ`, `${esc(c.name)} on Touhou Garakuta's “Weekly Touhou Character” (Japanese)`)
          : T('東方我楽多叢誌「週刊東方キャラクター」の一覧へ', 'Touhou Garakuta\'s “Weekly Touhou Character” series (Japanese)')}</span>
      </a>`;
  }

  // ---------- 共有 ----------
  const shareUrl = id => `${SITE}${EN ? 'en/' : ''}s/${id}.html`;
  function shareText(c, mbti, sim, quick) {
    const t = L.TYPES[mbti];
    return T(
      `東方キャラ性格診断の結果は「${c.name}」(${mbti}・${t.name})でした。一致度 ${sim}%${quick ? '(ドパガキモード・6問で無理やり判定)' : ''} ― ${c.catch}`,
      `My Touhou personality quiz result: ${c.name} (${mbti}, ${t.name}). ${sim}% match${quick ? ' (Brainrot Mode: forced from 6 questions)' : ''} - ${c.catch}`);
  }
  // 画像の種類。'' = シンプル(1200x630)、'-full' = 説明文つきの詳細版(1200x900)。英語版は img/og/en/
  const shareKind = () => app.dataset.shareKind || '';
  const shareImageSrc = (id, kind) => `${ROOT}img/og/${EN ? 'en/' : ''}${id}${kind}.jpg`;
  function sharePanel(c, text) {
    const url = shareUrl(c.id);
    const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(T('東方キャラ性格診断', 'TouhouPersonalityQuiz'))}`;
    const canFiles = !!(navigator.canShare && navigator.share);
    return `
      <button type="button" class="btn primary share-toggle" data-toggle="share-body" aria-expanded="false" aria-controls="share-body">${T('結果をシェア', 'Share your result')} <span class="dd-arrow" aria-hidden="true">▾</span></button>
      <div class="collapse share" id="share-body">
        <div class="collapse-inner share-body">
          <div class="share-kind" role="radiogroup" aria-label="${T('画像の種類', 'Image type')}">
            <button type="button" class="kind selected" data-kind="" aria-pressed="true">${T('シンプル', 'Simple')}</button>
            <button type="button" class="kind" data-kind="-full" aria-pressed="false">${T('詳細(説明文つき)', 'Detailed (with description)')}</button>
          </div>
          <div class="share-row">
            <a class="btn primary" href="${x}" target="_blank" rel="noopener">${T('Xに投稿', 'Post to X')}</a>
            ${canFiles ? `<button type="button" class="btn" data-act="share-image">${T('画像を共有', 'Share image')}</button>` : ''}
            <a class="btn" id="share-dl" href="${shareImageSrc(c.id, '')}" download="toho-${c.id}.jpg">${T('画像を保存', 'Save image')}</a>
            <button type="button" class="btn" data-act="copy-link">${T('リンクをコピー', 'Copy link')}</button>
            <button type="button" class="btn ghost" data-act="copy">${T('文章をコピー', 'Copy text')}</button>
          </div>
          <img class="share-preview" id="share-preview" src="${shareImageSrc(c.id, '')}" alt="${T('共有用の画像', 'Image for sharing')}" loading="lazy">
          <p class="note">${T(
            'リンクを貼ると、X・Discord・LINE などではシンプル版の画像つきカードが表示されます。詳細版は「画像を共有」か「画像を保存」で投稿に添えてください。',
            'When you paste the link, X, Discord and similar apps show a card with the simple image. To post the detailed one, attach it using "Share image" or "Save image".')}${isQuickShare() ? T(
            'ドパガキモードの結果なので、共有・保存する画像には「ドパガキモード判定」のスタンプが入ります(リンクのカード画像には入りません)。',
            ' Since this is a Brainrot Mode result, images you share or save get a "Brainrot Mode verdict" stamp (the link card image doesn\'t).') : ''}</p>
        </div>
      </div>`;
  }
  // ドパガキモードの結果は、共有画像に「ドパガキモード判定」のスタンプを押す(ブラウザ上で合成)
  const isQuickShare = () => app.dataset.shareQuick === '1';
  const stampCache = new Map(); // `${id}${kind}` → { blob, url }
  function drawStamp(ctx, W) {
    // 右カラムの下の空き(タグの下、URL の上)に、右端を軸に少し傾けて置く
    const lines = [[T('ドパガキモード判定', 'Brainrot Mode verdict'), 30], [T('6問で無理やり決めた。絶対間違うぞ！', 'Forced out of 6 questions. Totally wrong!'), 17]];
    const pad = 14, gap = 6;
    const boxW = 420, boxH = pad * 2 + lines[0][1] + gap + lines[1][1];
    ctx.save();
    ctx.translate(W - 56, 498);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#c1121f';
    ctx.beginPath(); ctx.roundRect(-boxW, 0, boxW, boxH, 14); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; ctx.setLineDash([10, 7]);
    ctx.beginPath(); ctx.roundRect(-boxW + 7, 7, boxW - 14, boxH - 14, 9); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    let y = pad;
    for (const [t, size] of lines) {
      ctx.font = `700 ${size}px "Zen Maru Gothic", "Yu Gothic UI", "Meiryo", sans-serif`;
      ctx.fillText(t, -boxW / 2, y);
      y += size + gap;
    }
    ctx.restore();
  }
  async function stampedImage(id, kind) {
    const key = `${id}${kind}`;
    if (stampCache.has(key)) return stampCache.get(key);
    const img = new Image();
    img.src = shareImageSrc(id, kind);
    await img.decode();
    try { await document.fonts.load('700 30px "Zen Maru Gothic"'); } catch (e) { /* フォントが来なくても描く */ }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    drawStamp(ctx, canvas.width);
    const blob = await new Promise((ok, ng) => canvas.toBlob(b => (b ? ok(b) : ng(new Error('toBlob'))), 'image/jpeg', 0.9));
    const entry = { blob, url: URL.createObjectURL(blob) };
    stampCache.set(key, entry);
    return entry;
  }
  // 共有・保存に使う画像。ドパガキならスタンプ入り(合成できない環境では素の画像)
  async function shareBlobAndUrl(id, kind) {
    if (isQuickShare()) {
      try { return await stampedImage(id, kind); } catch (e) { /* file:// などで合成できないときは素の画像 */ }
    }
    const blob = await (await fetch(shareImageSrc(id, kind))).blob();
    return { blob, url: shareImageSrc(id, kind) };
  }
  const shareFileName = (id, kind) => `toho-${id}${kind}${isQuickShare() ? '-dopa' : ''}.jpg`;
  async function refreshShareImage() {
    const id = app.dataset.shareId;
    const kind = shareKind();
    const img = document.getElementById('share-preview');
    const dl = document.getElementById('share-dl');
    if (img) img.src = shareImageSrc(id, kind);
    if (dl) { dl.href = shareImageSrc(id, kind); dl.download = shareFileName(id, kind); }
    if (!isQuickShare()) return;
    try {
      const { url } = await stampedImage(id, kind);
      // 合成中に別のキャラ・種類へ切り替わっていたら捨てる
      if (app.dataset.shareId !== id || shareKind() !== kind) return;
      if (img) img.src = url;
      if (dl) dl.href = url;
    } catch (e) { /* 素の画像のまま */ }
  }
  function setShareKind(kind) {
    app.dataset.shareKind = kind;
    app.querySelectorAll('.share-kind .kind').forEach(b => { const on = b.dataset.kind === kind; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); });
    refreshShareImage();
  }
  async function shareImage() {
    const id = app.dataset.shareId;
    const kind = shareKind();
    const text = app.dataset.copy || '';
    try {
      const { blob } = await shareBlobAndUrl(id, kind);
      const file = new File([blob], shareFileName(id, kind), { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, url: shareUrl(id) });
        return;
      }
      await navigator.share({ text, url: shareUrl(id) });
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast(T('この環境では共有できないので、画像を保存してください', 'Sharing isn\'t available here, so please save the image instead'));
    }
  }
  function copy(text, okMsg) {
    const ok = () => toast(okMsg);
    const ng = () => toast(T('コピーできませんでした', 'Couldn\'t copy'));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, ng);
    else ng();
  }

  // ---------- トップ ----------
  function viewHome() {
    const saved = load('full');
    const hasResult = saved && isComplete(saved.a);
    const inProgress = saved && !hasResult && saved.a.some(v => typeof v === 'number');
    const quickSaved = load('quick');
    const hasQuick = quickSaved && isComplete(quickSaved.a);
    const picks = CHARS.slice().sort(() => Math.random() - 0.5).slice(0, 18);
    const n = L.QUESTIONS.length;
    app.innerHTML = `
      <section class="hero">
        <p class="eyebrow">${T('非公式ファン診断', 'Unofficial fan quiz')}</p>
        <h1>${T('あなたは幻想郷の<br>誰に似ている?', 'Who in Gensokyo<br>are you most like?')}</h1>
        <p class="lede">${T(
          `${n}問に答えると、まず16タイプの性格に分かれ、さらに4つのサブ軸で絞り込んで、<strong>${CHARS.length}人</strong>の中からいちばん近いキャラクターが見つかります。`,
          `Answer ${n} questions to land on one of 16 personality types, then four sub-axes narrow it down to your closest match among <strong>${CHARS.length} characters</strong>.`)}</p>
        <div class="cta">
          <button type="button" class="btn primary" data-act="start">${inProgress ? T('最初からはじめる', 'Start over') : T('診断をはじめる', 'Start the quiz')}</button>
          ${inProgress ? `<button type="button" class="btn" data-act="resume">${T('続きから', 'Continue')}</button>` : ''}
          ${hasResult ? `<a class="btn" href="#/result">${T('前回の結果を見る', 'See your last result')}</a>` : ''}
          <a class="btn ghost" href="#/zukan">${T('キャラ図鑑を見る', 'Browse the characters')}</a>
        </div>
        <p class="hint">${T('所要時間は5分ほど。深く考えず、直感で答えるのがおすすめです。', 'Takes about 5 minutes. Go with your gut instead of overthinking it.')}</p>
        <div class="dopa">
          <div class="dopa-text">
            <b>${T('ドパガキモード', 'Brainrot Mode')}</b>
            <span>${T(
              '36問は多い? ならランダムな6問で無理やり決める。足りない分はサイコロ。<strong>絶対間違うぞ！</strong>',
              '36 questions too many? Then we force a verdict out of 6 random ones and roll dice for the rest. <strong>It will absolutely be wrong!</strong>')}</span>
          </div>
          <div class="cta">
            <button type="button" class="btn dopa-btn" data-act="start-quick">${T('6問で決める', 'Decide in 6')}</button>
            ${hasQuick ? `<a class="btn ghost" href="#/result-quick">${T('前回のドパガキ結果', 'Last Brainrot result')}</a>` : ''}
          </div>
        </div>
      </section>
      <div class="wall" aria-hidden="true">${picks.map(c => portrait(c)).join('')}</div>
      <section class="how">
        <h2>${T('診断のしくみ', 'How it works')}</h2>
        <ol class="steps">
          <li>${T(
            '<b>基本の4軸</b>外向/内向・直観/感覚・思考/感情・計画/気まま の向きで、16タイプのどれかに決まります。',
            '<b>Four core axes</b>Where you lean on Extraverted/Introverted, Intuitive/Sensing, Thinking/Feeling and Planned/Spontaneous puts you in one of 16 types.')}</li>
          <li>${T(
            '<b>サブの4軸</b>泰然/繊細・策士/素直・好戦/温和・老成/無邪気 で、同じタイプの中をさらに細かく見ます。',
            '<b>Four sub-axes</b>Unflappable/Sensitive, Scheming/Candid, Combative/Gentle and Mature/Innocent take a closer look within that type.')}</li>
          <li>${T(
            '<b>いちばん近い一人</b>そのタイプに属するキャラのうち、8軸の位置があなたに最も近い一人が結果になります。',
            '<b>Your closest match</b>Of the characters in that type, the one whose position on all eight axes is nearest to yours is your result.')}</li>
        </ol>
      </section>`;
  }

  // ---------- 設問 ----------
  function startQuiz(fresh, m = 'full') {
    mode = m;
    if (fresh) { answers = new Array(M().count).fill(null); seed = newSeed(); qIndex = 0; save(); }
    else {
      const saved = load();
      if (saved) { answers = saved.a; seed = saved.seed; }
      const next = answers.findIndex(v => typeof v !== 'number');
      qIndex = next === -1 ? 0 : next;
    }
    if (location.hash !== M().quiz) location.hash = M().quiz; else viewQuiz();
  }

  function viewQuiz() {
    const qs = qsOf();
    const total = qs.length;
    if (answers.length !== total) { answers = new Array(total).fill(null); qIndex = 0; }
    const q = qs[qIndex];
    const done = answers.filter(v => typeof v === 'number').length;
    const quick = mode === 'quick';
    app.innerHTML = `
      <section class="quiz">
        ${quick ? `<p class="dopa-banner">${T('<b>ドパガキモード</b>ランダムな6問で無理やり決めます。絶対間違うぞ！', '<b>Brainrot Mode</b>Six random questions, one forced verdict. It will absolutely be wrong!')}</p>` : ''}
        <div class="progress">
          <span class="progress-num">Q <b>${qIndex + 1}</b> / ${total}</span>
          <span class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="${T('回答済み', 'Answered')}"><span style="width:${(done / total * 100).toFixed(1)}%"></span></span>
        </div>
        <h1 class="question" id="q-text"${EN ? '' : ' lang="ja"'}>${ruby(q.text)}</h1>
        <div class="choices" role="radiogroup" aria-labelledby="q-text">
          ${L.CHOICES.map((c, i) => `
            <button type="button" class="choice${answers[qIndex] === c.value ? ' selected' : ''}" role="radio" aria-checked="${answers[qIndex] === c.value}" data-value="${c.value}">
              <span class="choice-key" aria-hidden="true">${i + 1}</span>${c.label}
            </button>`).join('')}
        </div>
        <div class="quiz-nav">
          <button type="button" class="btn ghost" data-act="prev" ${qIndex === 0 ? 'disabled' : ''}>${T('← 前の質問', '← Previous')}</button>
          ${typeof answers[qIndex] === 'number' && qIndex < total - 1 ? `<button type="button" class="btn ghost" data-act="next">${T('次へ →', 'Next →')}</button>` : ''}
          ${isComplete(answers) ? `<a class="btn primary" href="${M().result}">${T('結果を見る', 'See your result')}</a>` : ''}
        </div>
      </section>`;
  }

  function answer(value) {
    answers[qIndex] = value;
    save();
    const total = M().count;
    if (qIndex < total - 1) { qIndex += 1; viewQuiz(); }
    else if (isComplete(answers)) { pendingReveal = true; location.hash = M().result; }
    else { qIndex = answers.findIndex(v => typeof v !== 'number'); viewQuiz(); }
  }

  // ---------- 結果 ----------
  function viewResult(m) {
    mode = m;
    const saved = load();
    if (!saved || !isComplete(saved.a)) { location.hash = '#/'; return; }
    answers = saved.a; seed = saved.seed;
    const quick = mode === 'quick';
    let user, dice = [];
    if (quick) { const qs = L.quickScore(answers, seed); user = qs.vec; dice = qs.dice; }
    else user = L.score(answers);
    const r = L.match(user, CHARS);
    const c = r.best;
    const t = L.TYPES[r.type];
    const sim = L.similarity(r.d);
    const mates = r.sameType.slice(0, 4);
    const near = r.others.slice(0, 4);
    const good = L.compat(user, CHARS, c.id).slice(0, 4);
    const text = shareText(c, r.type, sim, quick);
    app.dataset.shareQuick = quick ? '1' : '';
    const diceLabels = dice.map(i => `${L.AXES[i].negLabel}/${L.AXES[i].posLabel}`);
    app.innerHTML = `
      ${quick ? `<p class="dopa-banner">${T('<b>ドパガキモード判定</b>ランダムな6問で無理やり決めました。絶対間違うぞ！', '<b>Brainrot Mode verdict</b>Forced out of six random questions. It will absolutely be wrong!')}${diceLabels.length ? `<small>${T('サイコロで決めた軸: ', 'Axes decided by dice: ')}${diceLabels.join(T('、', ', '))}</small>` : ''}</p>` : ''}
      <section class="result spell-card g-${t.group}" data-type="${r.type}">
        <p class="spell">${spellName(r.type)}<small>${r.type}</small></p>
        <div class="result-head">
          <img class="card-img" src="${charImg(c.id)}" alt="${esc(illustAlt(c))}" width="200" height="250">
          <div class="result-main">
            <p class="result-pre">${T('あなたにいちばん近いのは', 'Your closest match is')}</p>
            <h1>${nameRuby(c)}</h1>
            <p class="catch">${esc(c.catch)}</p>
            ${matchBullets(sim, quick)}
          </div>
        </div>
        <div class="tags">${c.traits.map(x => `<span class="tag strong">${esc(x)}</span>`).join('')}</div>
        <p class="desc">${esc(c.desc)}</p>
        <div class="hero-actions">
          ${sharePanel(c, text)}
        </div>
        ${accordion('acc-more', T('このキャラをもっと知る', 'Learn more about this character'), T('登場原作・タイプの説明・百科事典・週刊東方キャラクター', 'Appearances, type, Touhou Wiki, Weekly Touhou Character'), `
          ${worksLine(c)}
          <p class="type-blurb"><b>${r.type}${quoted(t.name)}</b> ${t.blurb}</p>
          <p class="more">${wikiLink(c)}</p>
          ${garakutaLink(c)}`, '', true)}
      </section>

      <section class="panel plain">
        <h2>${T('あなたの8軸', 'Your eight axes')}</h2>
        <p class="legend"><span class="axis-dot user inline"></span>${T('あなた', 'You')} <span class="axis-dot chara inline"></span>${esc(c.name)}</p>
        <div class="axes">${axisRows(user, c.v)}</div>
        <p class="subtype">${T('あなたのサブタイプ', 'Your sub-type')} ${subTags(user) || `<span class="tag">${T('中庸', 'Balanced')}</span>`}</p>
        ${quick ? `<p class="note">${T(
          'ドパガキモードでは、6問を毎回ランダムに選び、答えていない軸と「どちらでもない」と答えた軸をサイコロで決めています。',
          'In Brainrot Mode, the six questions are picked at random every time, and any axis you weren\'t asked about or answered "Neutral" on is decided by dice.')}</p>` : ''}
      </section>

      <section class="panel plain compat">
        <h2>${T('あなたと相性のいいキャラ', 'Characters who click with you')}</h2>
        <div class="pair">
          <button type="button" class="pair-side" data-char="${c.id}">
            ${portrait(c)}
            <span class="pair-name">${esc(c.name)}</span>
            <span class="pair-role">${T('あなた', 'You')}</span>
          </button>
          <div class="pair-link" aria-label="${T(`相性 ${L.similarity(good[0].d)}%`, `${L.similarity(good[0].d)}% compatible`)}">
            <svg viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true"><path class="thread" d="M0,42 C30,10 50,72 80,44 S120,10 140,40 S175,70 200,38"/></svg>
            <span class="pair-heart" aria-hidden="true">♥</span>
            <span class="pair-score">${T(`相性 ${L.similarity(good[0].d)}%`, `${L.similarity(good[0].d)}% compatible`)}</span>
          </div>
          <button type="button" class="pair-side" data-char="${good[0].c.id}">
            ${portrait(good[0].c)}
            <span class="pair-name">${esc(good[0].c.name)}</span>
            <span class="pair-role">${good[0].c.mbti}${T('・', ' · ')}${esc(L.TYPES[good[0].c.mbti].name)}</span>
          </button>
        </div>
        <p class="note">${T(
          '直観/感覚だけが同じで、外向/内向・思考/感情・計画/気ままとサブ4軸が反対のキャラほど相性が高くなります。似ている相手ではなく、足りないところを補い合う相手です。',
          'The more a character shares only your Intuitive/Sensing side and is your opposite on Extraverted/Introverted, Thinking/Feeling, Planned/Spontaneous and all four sub-axes, the better you click. Not someone just like you, but someone who makes up for what you lack.')}</p>
        <p class="sub-head">${T('ほかに相性のいいキャラ', 'More characters who click with you')}</p>
        <div class="tiles small">${good.slice(1).map(mm => charTile(mm.c, `<span class="tile-sim">${mm.c.mbti}${T(`・相性${L.similarity(mm.d)}%`, ` · ${L.similarity(mm.d)}%`)}</span>`)).join('')}</div>
      </section>

      ${accordion('acc-near', T('ほかの近いキャラ', 'Other close characters'), T(`同じタイプ(${r.type})の仲間・タイプ違いで近い人`, `Others of your type (${r.type}) and close matches of other types`), `
          ${mates.length ? `
          <h3>${T(`同じタイプ(${r.type})の仲間`, `Others of your type (${r.type})`)}</h3>
          <div class="tiles small">${mates.map(mm => charTile(mm.c, `<span class="tile-sim">${L.similarity(mm.d)}%</span>`)).join('')}</div>` : ''}
          <h3>${T('タイプは違うけれど近いキャラ', 'Different type, but close')}</h3>
          <div class="tiles small">${near.map(mm => charTile(mm.c, `<span class="tile-sim">${mm.c.mbti}${T('・', ' · ')}${L.similarity(mm.d)}%</span>`)).join('')}</div>`, 'plain-acc')}

      <div class="cta center">
        ${quick
          ? `<button type="button" class="btn primary" data-act="start">${T('ちゃんと診断する(36問)', 'Take the real quiz (36 questions)')}</button><button type="button" class="btn" data-act="start-quick">${T('もう一回(質問も変わる)', 'Again (new questions)')}</button>`
          : `<button type="button" class="btn" data-act="start">${T('もう一度診断する', 'Take the quiz again')}</button><button type="button" class="btn" data-act="start-quick">${T('ドパガキモードで遊ぶ', 'Try Brainrot Mode')}</button>`}
        <a class="btn ghost" href="#/zukan">${T('キャラ図鑑を見る', 'Browse the characters')}</a>
      </div>`;
    app.dataset.copy = text;
    app.dataset.shareId = c.id;
    app.dataset.shareKind = '';
    refreshShareImage();
    if (pendingReveal) { pendingReveal = false; playReveal(c); }
  }

  // ---------- 共有されたキャラのページ(#/c/<id>) ----------
  function viewShared(id) {
    const c = BY_ID.get(id);
    if (!c) { location.hash = '#/'; return; }
    const t = L.TYPES[c.mbti];
    const mates = CHARS.filter(x => x.mbti === c.mbti && x.id !== c.id).slice(0, 8);
    app.innerHTML = `
      <section class="result g-${t.group}">
        <p class="eyebrow">${T('シェアされた診断結果', 'A shared result')}</p>
        ${charHead(c, c.mbti, `
            <p class="result-pre">${T('診断した人にいちばん近いのは', 'Their closest match is')}</p>
            <h1>${nameRuby(c)}</h1>
            <p class="catch">${esc(c.catch)}</p>`, true)}
        <div class="tags">${c.traits.map(x => `<span class="tag strong">${esc(x)}</span>`).join('')}${subTags(c.v)}</div>
        ${worksLine(c)}
        <p class="desc">${esc(c.desc)}</p>
        <p class="type-blurb"><b>${c.mbti}${quoted(t.name)}</b> ${t.blurb}</p>
        <div class="axes">${axisRows(null, c.v)}</div>
        <p class="more">${wikiLink(c)}</p>
        ${garakutaLink(c)}
      </section>
      ${mates.length ? `
      <section class="panel">
        <h2>${T(`同じタイプ(${c.mbti})の仲間`, `Others of the same type (${c.mbti})`)}</h2>
        <div class="tiles">${mates.map(x => charTile(x)).join('')}</div>
      </section>` : ''}
      <div class="cta center">
        <button type="button" class="btn primary" data-act="start">${T('自分も診断してみる(36問)', 'Take the quiz yourself (36 questions)')}</button>
        <button type="button" class="btn" data-act="start-quick">${T('ドパガキモード(6問)', 'Brainrot Mode (6 questions)')}</button>
        <a class="btn ghost" href="#/zukan">${T('キャラ図鑑を見る', 'Browse the characters')}</a>
      </div>`;
  }

  // ---------- 図鑑 ----------
  // 名前で探す。英語版は英語名(大文字小文字は区別しない)と日本語名のどちらでも当たる
  const nameHit = (c, q) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.nameJa || '').includes(q);
  function viewZukan() {
    const groups = ['NT', 'NF', 'SJ', 'SP'];
    app.innerHTML = `
      <section class="zukan-head">
        <p class="eyebrow">${T('キャラ図鑑', 'Character gallery')}</p>
        <h1>${T(`16タイプと${CHARS.length}人`, `16 types, ${CHARS.length} characters`)}</h1>
        <p class="lede">${T('キャラをタップすると性格の紹介と8軸の位置が見られます。', 'Tap a character to see their personality and where they sit on the eight axes.')}</p>
        <label class="search"><span class="sr">${T('名前で探す', 'Search by name')}</span><input type="search" id="zukan-q" placeholder="${T('名前で探す(例: 霊夢)', 'Search by name (e.g. Reimu)')}" autocomplete="off"></label>
      </section>
      ${groups.map(g => `
        <section class="zgroup g-${g}">
          <h2 class="zgroup-title">${L.GROUPS[g].name}<small>${L.GROUPS[g].note}</small></h2>
          ${L.TYPE_ORDER.filter(t => L.TYPES[t].group === g).map(t => {
            const list = CHARS.filter(c => c.mbti === t);
            return `
            <div class="ztype" data-type="${t}">
              <div class="ztype-head">${typeBadge(t)}<span class="count">${T(`${list.length}人`, `${list.length} ${list.length === 1 ? 'character' : 'characters'}`)}</span></div>
              <p class="ztype-blurb">${L.TYPES[t].blurb}</p>
              <div class="tiles">${list.map(c => charTile(c)).join('') || `<p class="note">${T('このタイプのキャラはいません。', 'No characters of this type.')}</p>`}</div>
            </div>`;
          }).join('')}
        </section>`).join('')}
      <p class="note center" id="zukan-empty" hidden>${T('見つかりませんでした。', 'No matches.')}</p>`;
    const input = document.getElementById('zukan-q');
    input.addEventListener('input', () => {
      const q = input.value.trim();
      let any = false;
      app.querySelectorAll('.ztype').forEach(sec => {
        let shown = 0;
        sec.querySelectorAll('.tile').forEach(tile => {
          const hit = !q || nameHit(BY_ID.get(tile.dataset.char), q);
          tile.hidden = !hit;
          if (hit) shown += 1;
        });
        sec.hidden = q !== '' && shown === 0;
        if (shown) any = true;
      });
      app.querySelectorAll('.zgroup').forEach(g => { g.hidden = !g.querySelector('.ztype:not([hidden])'); });
      document.getElementById('zukan-empty').hidden = any;
    });
  }

  // ---------- 詳細ダイアログ ----------
  function openDetail(id) {
    const c = BY_ID.get(id);
    if (!c) return;
    const t = L.TYPES[c.mbti];
    dialog.className = `detail g-${t.group}`;
    dialog.innerHTML = `
      <button type="button" class="close" data-act="close" aria-label="${T('閉じる', 'Close')}">×</button>
      ${charHead(c, c.mbti, `
          <h2>${nameRuby(c)}</h2>
          <p class="catch">${esc(c.catch)}</p>`)}
      <div class="tags">${c.traits.map(x => `<span class="tag strong">${esc(x)}</span>`).join('')}${subTags(c.v)}</div>
      ${worksLine(c)}
      <p class="desc">${esc(c.desc)}</p>
      <div class="axes">${axisRows(null, c.v)}</div>
      <p class="more">${wikiLink(c, false)} ／ <a href="#/c/${c.id}">${T('このキャラのページ', 'This character\'s page')}</a></p>
      ${garakutaLink(c)}`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  // ---------- ルーティングとイベント ----------
  // 言語切り替えリンク(ヘッダー)は、いま見ている画面のまま相手の言語へ移るように # を引き継ぐ
  const langLink = document.getElementById('lang-switch');
  function updateLangLink() {
    if (langLink) langLink.href = (EN ? '../' : 'en/') + (location.hash || '');
  }

  function route() {
    const h = location.hash || '#/';
    if (dialog.open) dialog.close();
    updateLangLink();
    if (h === '#/quiz' || h === '#/quiz-quick') {
      const m = h === '#/quiz' ? 'full' : 'quick';
      if (mode !== m) { mode = m; const saved = load(); answers = saved ? saved.a : new Array(M().count).fill(null); seed = saved ? saved.seed : newSeed(); const next = answers.findIndex(v => typeof v !== 'number'); qIndex = next === -1 ? 0 : next; }
      viewQuiz();
    }
    else if (h === '#/result') viewResult('full');
    else if (h === '#/result-quick') viewResult('quick');
    else if (h === '#/zukan') viewZukan();
    else if (h.startsWith('#/c/')) viewShared(decodeURIComponent(h.slice(4)));
    else viewHome();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', e => {
    const choice = e.target.closest('.choice');
    if (choice) { answer(Number(choice.dataset.value)); return; }
    const tile = e.target.closest('[data-char]');
    if (tile) { openDetail(tile.dataset.char); return; }
    const kind = e.target.closest('.share-kind .kind');
    if (kind) { setShareKind(kind.dataset.kind); return; }
    const tog = e.target.closest('[data-toggle]');
    if (tog) { toggleCollapse(tog); return; }
    const act = e.target.closest('[data-act]');
    if (!act) { if (e.target === dialog) dialog.close(); return; }
    switch (act.dataset.act) {
      case 'start': startQuiz(true, 'full'); break;
      case 'start-quick': startQuiz(true, 'quick'); break;
      case 'resume': startQuiz(false, 'full'); break;
      case 'prev': if (qIndex > 0) { qIndex -= 1; viewQuiz(); } break;
      case 'next': if (qIndex < M().count - 1) { qIndex += 1; viewQuiz(); } break;
      case 'close': dialog.close(); break;
      case 'copy': copy(app.dataset.copy || '', T('文章をコピーしました', 'Copied the text')); break;
      case 'copy-link': copy(shareUrl(app.dataset.shareId), T('リンクをコピーしました', 'Copied the link')); break;
      case 'share-image': shareImage(); break;
    }
  });

  document.addEventListener('keydown', e => {
    if ((location.hash !== '#/quiz' && location.hash !== '#/quiz-quick') || dialog.open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '5') { answer(L.CHOICES[Number(e.key) - 1].value); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' && qIndex > 0) { qIndex -= 1; viewQuiz(); }
  });

  window.addEventListener('hashchange', route);

  // 途中の回答があれば引き継ぐ(設問画面を直接開いたとき用)
  mode = location.hash === '#/quiz-quick' || location.hash === '#/result-quick' ? 'quick' : 'full';
  const saved = load();
  if (saved) {
    answers = saved.a; seed = saved.seed;
    const next = answers.findIndex(v => typeof v !== 'number');
    qIndex = next === -1 ? 0 : next;
  } else { answers = new Array(M().count).fill(null); seed = newSeed(); }
  route();
})();
