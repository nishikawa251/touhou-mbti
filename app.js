// 東方キャラ性格診断 — 画面まわり
(function () {
  'use strict';
  const L = window.TohoLogic;
  const CHARS = window.TOHO_CHARS || [];
  const BY_ID = new Map(CHARS.map(c => [c.id, c]));
  const app = document.getElementById('app');
  const dialog = document.getElementById('detail');
  const toastEl = document.getElementById('toast');
  const STORE_KEY = 'toho-seikaku-answers-v1';

  let answers = new Array(L.QUESTIONS.length).fill(null);
  let qIndex = 0;

  // ---------- 小物 ----------
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const groupOf = mbti => L.TYPES[mbti].group;
  const portrait = (c, cls = '') => `<img class="portrait ${cls}" src="img/chars/${c.id}.png" alt="" width="200" height="250" loading="lazy">`;

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) { /* 保存できなくても診断は続けられる */ }
  }
  function load() {
    try {
      const a = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (Array.isArray(a) && a.length === L.QUESTIONS.length) return a;
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
    return L.AXES.map((a, i) => `
      <div class="axis${a.main ? '' : ' axis-sub'}">
        <span class="axis-label neg${(user ? user[i] : chara[i]) < 0 ? ' on' : ''}">${a.neg ? `<b>${a.neg}</b> ` : ''}${a.negLabel}</span>
        <span class="axis-track" role="img" aria-label="${a.negLabel}と${a.posLabel}の間。${user ? 'あなたは' + Math.round(user[i] * 100) : ''}${user && chara ? '、' : ''}${chara ? 'キャラは' + Math.round(chara[i] * 100) : ''}">
          <span class="axis-mid"></span>
          ${chara ? `<span class="axis-dot chara" style="left:${pct(chara[i])}"></span>` : ''}
          ${user ? `<span class="axis-dot user" style="left:${pct(user[i])}"></span>` : ''}
        </span>
        <span class="axis-label pos${(user ? user[i] : chara[i]) > 0 ? ' on' : ''}">${a.posLabel}${a.pos ? ` <b>${a.pos}</b>` : ''}</span>
      </div>`).join('');
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

  // ---------- トップ ----------
  function viewHome() {
    const saved = load();
    const hasResult = saved && isComplete(saved);
    const inProgress = saved && !hasResult && saved.some(v => typeof v === 'number');
    const picks = CHARS.slice().sort(() => Math.random() - 0.5).slice(0, 18);
    app.innerHTML = `
      <section class="hero">
        <p class="eyebrow">非公式ファン診断</p>
        <h1>あなたは幻想郷の<br>誰に似ている?</h1>
        <p class="lede">${L.QUESTIONS.length}問に答えると、まず16タイプの性格に分かれ、さらに4つのサブ軸で絞り込んで、<strong>${CHARS.length}人</strong>の中からいちばん近いキャラクターが見つかります。</p>
        <div class="cta">
          <button type="button" class="btn primary" data-act="start">${inProgress ? '最初からはじめる' : '診断をはじめる'}</button>
          ${inProgress ? '<button type="button" class="btn" data-act="resume">続きから</button>' : ''}
          ${hasResult ? '<a class="btn" href="#/result">前回の結果を見る</a>' : ''}
          <a class="btn ghost" href="#/zukan">キャラ図鑑を見る</a>
        </div>
        <p class="hint">所要時間は5分ほど。深く考えず、直感で答えるのがおすすめです。</p>
      </section>
      <div class="wall" aria-hidden="true">${picks.map(c => portrait(c)).join('')}</div>
      <section class="how">
        <h2>診断のしくみ</h2>
        <ol class="steps">
          <li><b>基本の4軸</b>外向/内向・直観/感覚・思考/感情・計画/気まま の向きで、16タイプのどれかに決まります。</li>
          <li><b>サブの4軸</b>泰然/繊細・策士/素直・好戦/温和・老成/無邪気 で、同じタイプの中をさらに細かく見ます。</li>
          <li><b>いちばん近い一人</b>そのタイプに属するキャラのうち、8軸の位置があなたに最も近い一人が結果になります。</li>
        </ol>
      </section>`;
  }

  // ---------- 設問 ----------
  function startQuiz(fresh) {
    if (fresh) { answers = new Array(L.QUESTIONS.length).fill(null); qIndex = 0; save(); }
    else {
      const saved = load();
      if (saved) answers = saved;
      const next = answers.findIndex(v => typeof v !== 'number');
      qIndex = next === -1 ? 0 : next;
    }
    if (location.hash !== '#/quiz') location.hash = '#/quiz'; else viewQuiz();
  }

  function viewQuiz() {
    const total = L.QUESTIONS.length;
    const q = L.QUESTIONS[qIndex];
    const done = answers.filter(v => typeof v === 'number').length;
    app.innerHTML = `
      <section class="quiz">
        <div class="progress">
          <span class="progress-num">Q <b>${qIndex + 1}</b> / ${total}</span>
          <span class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="回答済み"><span style="width:${(done / total * 100).toFixed(1)}%"></span></span>
        </div>
        <h1 class="question" id="q-text">${esc(q.text)}</h1>
        <div class="choices" role="radiogroup" aria-labelledby="q-text">
          ${L.CHOICES.map((c, i) => `
            <button type="button" class="choice${answers[qIndex] === c.value ? ' selected' : ''}" role="radio" aria-checked="${answers[qIndex] === c.value}" data-value="${c.value}">
              <span class="choice-key" aria-hidden="true">${i + 1}</span>${c.label}
            </button>`).join('')}
        </div>
        <div class="quiz-nav">
          <button type="button" class="btn ghost" data-act="prev" ${qIndex === 0 ? 'disabled' : ''}>← 前の質問</button>
          ${typeof answers[qIndex] === 'number' && qIndex < total - 1 ? '<button type="button" class="btn ghost" data-act="next">次へ →</button>' : ''}
          ${isComplete(answers) ? '<a class="btn primary" href="#/result">結果を見る</a>' : ''}
        </div>
      </section>`;
  }

  function answer(value) {
    answers[qIndex] = value;
    save();
    const total = L.QUESTIONS.length;
    if (qIndex < total - 1) { qIndex += 1; viewQuiz(); }
    else if (isComplete(answers)) { location.hash = '#/result'; }
    else { qIndex = answers.findIndex(v => typeof v !== 'number'); viewQuiz(); }
  }

  // ---------- 結果 ----------
  function viewResult() {
    const saved = load();
    if (!saved || !isComplete(saved)) { location.hash = '#/'; return; }
    answers = saved;
    const user = L.score(answers);
    const r = L.match(user, CHARS);
    const c = r.best;
    const t = L.TYPES[r.type];
    const sim = L.similarity(r.d);
    const mates = r.sameType.slice(0, 8);
    const near = r.others.slice(0, 4);
    app.innerHTML = `
      <section class="result g-${t.group}">
        <p class="eyebrow">診断結果</p>
        <div class="result-head">
          <img class="card-img" src="img/chars/${c.id}.png" alt="${esc(c.name)}のイラスト" width="200" height="250">
          <div class="result-main">
            ${typeBadge(r.type, true)}
            <p class="result-pre">あなたにいちばん近いのは</p>
            <h1>${esc(c.name)}</h1>
            <p class="catch">${esc(c.catch)}</p>
            <p class="sim"><span class="sim-num">${sim}</span><span class="sim-unit">%</span><span class="sim-label">一致度</span></p>
          </div>
        </div>
        <div class="tags">${c.traits.map(x => `<span class="tag strong">${esc(x)}</span>`).join('')}</div>
        <p class="desc">${esc(c.desc)}</p>
        <p class="type-blurb"><b>${r.type}「${t.name}」</b> ${t.blurb}</p>
        <p class="more"><a href="${c.url}" target="_blank" rel="noopener">ピクシブ百科事典で「${esc(c.name)}」を読む</a></p>
      </section>

      <section class="panel">
        <h2>あなたの8軸</h2>
        <p class="legend"><span class="axis-dot user inline"></span>あなた <span class="axis-dot chara inline"></span>${esc(c.name)}</p>
        <div class="axes">${axisRows(user, c.v)}</div>
        <p class="subtype">あなたのサブタイプ ${subTags(user) || '<span class="tag">中庸</span>'}</p>
      </section>

      ${mates.length ? `
      <section class="panel">
        <h2>同じ ${r.type} の仲間</h2>
        <p class="note">同じタイプに分類されたキャラを、あなたに近い順に並べています。</p>
        <div class="tiles">${mates.map(m => charTile(m.c, `<span class="tile-sim">${L.similarity(m.d)}%</span>`)).join('')}</div>
      </section>` : ''}

      <section class="panel">
        <h2>タイプは違うけれど近いキャラ</h2>
        <div class="tiles">${near.map(m => charTile(m.c, `<span class="tile-sim">${m.c.mbti}・${L.similarity(m.d)}%</span>`)).join('')}</div>
      </section>

      <div class="cta center">
        <button type="button" class="btn primary" data-act="copy">結果をコピー</button>
        <button type="button" class="btn" data-act="start">もう一度診断する</button>
        <a class="btn ghost" href="#/zukan">キャラ図鑑を見る</a>
      </div>`;
    app.dataset.copy = `東方キャラ性格診断の結果は「${c.name}」(${r.type}・${t.name})でした。一致度 ${sim}% ― ${c.catch}`;
  }

  // ---------- 図鑑 ----------
  function viewZukan() {
    const groups = ['NT', 'NF', 'SJ', 'SP'];
    app.innerHTML = `
      <section class="zukan-head">
        <p class="eyebrow">キャラ図鑑</p>
        <h1>16タイプと${CHARS.length}人</h1>
        <p class="lede">キャラをタップすると性格の紹介と8軸の位置が見られます。</p>
        <label class="search"><span class="sr">名前で探す</span><input type="search" id="zukan-q" placeholder="名前で探す(例: 霊夢)" autocomplete="off"></label>
      </section>
      ${groups.map(g => `
        <section class="zgroup g-${g}">
          <h2 class="zgroup-title">${L.GROUPS[g].name}<small>${L.GROUPS[g].note}</small></h2>
          ${L.TYPE_ORDER.filter(t => L.TYPES[t].group === g).map(t => {
            const list = CHARS.filter(c => c.mbti === t);
            return `
            <div class="ztype" data-type="${t}">
              <div class="ztype-head">${typeBadge(t)}<span class="count">${list.length}人</span></div>
              <p class="ztype-blurb">${L.TYPES[t].blurb}</p>
              <div class="tiles">${list.map(c => charTile(c)).join('') || '<p class="note">このタイプのキャラはいません。</p>'}</div>
            </div>`;
          }).join('')}
        </section>`).join('')}
      <p class="note center" id="zukan-empty" hidden>見つかりませんでした。</p>`;
    const input = document.getElementById('zukan-q');
    input.addEventListener('input', () => {
      const q = input.value.trim();
      let any = false;
      app.querySelectorAll('.ztype').forEach(sec => {
        let shown = 0;
        sec.querySelectorAll('.tile').forEach(tile => {
          const hit = !q || BY_ID.get(tile.dataset.char).name.includes(q);
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
      <button type="button" class="close" data-act="close" aria-label="閉じる">×</button>
      <div class="result-head">
        <img class="card-img" src="img/chars/${c.id}.png" alt="${esc(c.name)}のイラスト" width="200" height="250">
        <div class="result-main">
          ${typeBadge(c.mbti)}
          <h2>${esc(c.name)}</h2>
          <p class="catch">${esc(c.catch)}</p>
        </div>
      </div>
      <div class="tags">${c.traits.map(x => `<span class="tag strong">${esc(x)}</span>`).join('')}${subTags(c.v)}</div>
      <p class="desc">${esc(c.desc)}</p>
      <div class="axes">${axisRows(null, c.v)}</div>
      <p class="more"><a href="${c.url}" target="_blank" rel="noopener">ピクシブ百科事典で読む</a></p>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  // ---------- ルーティングとイベント ----------
  function route() {
    const h = location.hash || '#/';
    if (dialog.open) dialog.close();
    if (h === '#/quiz') viewQuiz();
    else if (h === '#/result') viewResult();
    else if (h === '#/zukan') viewZukan();
    else viewHome();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', e => {
    const choice = e.target.closest('.choice');
    if (choice) { answer(Number(choice.dataset.value)); return; }
    const tile = e.target.closest('[data-char]');
    if (tile) { openDetail(tile.dataset.char); return; }
    const act = e.target.closest('[data-act]');
    if (!act) { if (e.target === dialog) dialog.close(); return; }
    switch (act.dataset.act) {
      case 'start': startQuiz(true); break;
      case 'resume': startQuiz(false); break;
      case 'prev': if (qIndex > 0) { qIndex -= 1; viewQuiz(); } break;
      case 'next': if (qIndex < L.QUESTIONS.length - 1) { qIndex += 1; viewQuiz(); } break;
      case 'close': dialog.close(); break;
      case 'copy': {
        const text = app.dataset.copy || '';
        const ok = () => toast('結果をコピーしました');
        const ng = () => toast('コピーできませんでした');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, ng);
        else ng();
        break;
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (location.hash !== '#/quiz' || dialog.open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '5') { answer(L.CHOICES[Number(e.key) - 1].value); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' && qIndex > 0) { qIndex -= 1; viewQuiz(); }
  });

  window.addEventListener('hashchange', route);

  // 途中の回答があれば引き継ぐ(設問画面を直接開いたとき用)
  const saved = load();
  if (saved) {
    answers = saved;
    const next = answers.findIndex(v => typeof v !== 'number');
    qIndex = next === -1 ? 0 : next;
  }
  route();
})();
