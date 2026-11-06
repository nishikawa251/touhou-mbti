// 東方キャラ性格診断 — 設問・採点・マッチングのロジック(ブラウザと Node の両方で動く)
(function (root) {
  'use strict';

  // 8軸。前半4つが MBTI の基本軸、後半4つが 16タイプを細分化するサブ軸。
  // スコアは -1〜+1。正が pos 側、負が neg 側。
  const AXES = [
    { key: 'ei', main: true, pos: 'E', neg: 'I', posLabel: '外向', negLabel: '内向', posDesc: '人の輪の中で元気になる', negDesc: '一人の時間で元気になる' },
    { key: 'sn', main: true, pos: 'N', neg: 'S', posLabel: '直観', negLabel: '感覚', posDesc: '空想やひらめきを追う', negDesc: '現実と実感を大事にする' },
    { key: 'tf', main: true, pos: 'T', neg: 'F', posLabel: '思考', negLabel: '感情', posDesc: '理屈と筋道で決める', negDesc: '気持ちと情で決める' },
    { key: 'jp', main: true, pos: 'J', neg: 'P', posLabel: '計画', negLabel: '気まま', posDesc: '段取りと規律を好む', negDesc: '流れと自由を好む' },
    { key: 'at', main: false, posLabel: '泰然', negLabel: '繊細', posDesc: '自信があり動じない', negDesc: '細やかで気にしやすい' },
    { key: 'hs', main: false, posLabel: '策士', negLabel: '素直', posDesc: '駆け引き上手で食えない', negDesc: '裏表がなくまっすぐ' },
    { key: 'ag', main: false, posLabel: '好戦', negLabel: '温和', posDesc: '勝気で受けて立つ', negDesc: '争いを好まず穏やか' },
    { key: 'mt', main: false, posLabel: '老成', negLabel: '無邪気', posDesc: '落ち着いて大人びている', negDesc: '好奇心のまま無邪気' },
  ];

  // dir: +1 なら「そう思う」が pos 側、-1 なら neg 側に加点
  const QUESTIONS = [
    { axis: 'ei', dir: +1, text: '神社で宴会があると聞いたら、誘われていなくても顔を出したくなる。' },
    { axis: 'sn', dir: +1, text: '「もしも〜だったら」という空想や仮説を考えるのが好きだ。' },
    { axis: 'tf', dir: +1, text: '誰かに相談されたら、共感するより先に解決策を考えてしまう。' },
    { axis: 'jp', dir: +1, text: '予定や段取りは、あらかじめ決めておかないと落ち着かない。' },
    { axis: 'at', dir: +1, text: '自分の力や判断には、基本的に自信がある。' },
    { axis: 'ei', dir: -1, text: '一人で静かに過ごす時間がないと、どっと疲れてしまう。' },
    { axis: 'sn', dir: -1, text: '役に立つかわからない話より、実際に使える知識のほうが好きだ。' },
    { axis: 'tf', dir: -1, text: '正論であっても、相手を傷つけそうなら言い方を変えるか飲み込む。' },
    { axis: 'jp', dir: -1, text: '締め切りや約束は、ぎりぎりになってから本気を出すタイプだ。' },
    { axis: 'hs', dir: +1, text: '目的のためなら、本音を隠したり駆け引きをしたりするのは当然だと思う。' },
    { axis: 'ei', dir: +1, text: '初対面の相手にも、自分から気軽に話しかけるほうだ。' },
    { axis: 'sn', dir: +1, text: '物事の細かい部分より、全体の意味や裏にある仕組みのほうが気になる。' },
    { axis: 'tf', dir: +1, text: '何かを決めるときは、気持ちより「筋が通っているか」を重視する。' },
    { axis: 'jp', dir: +1, text: '身の回りは、たいていきちんと片付いている。' },
    { axis: 'ag', dir: +1, text: '勝負を挑まれたら、受けて立たずにはいられない。' },
    { axis: 'ei', dir: -1, text: '大勢でわいわい騒ぐより、少人数でじっくり話すほうが落ち着く。' },
    { axis: 'sn', dir: -1, text: '新しいやり方を試すより、昔から続いてきた確かなやり方を信頼する。' },
    { axis: 'tf', dir: -1, text: '困っている相手を見ると、損得抜きで放っておけない。' },
    { axis: 'jp', dir: -1, text: 'その日の気分で予定を変えるのは、むしろ楽しい。' },
    { axis: 'mt', dir: +1, text: '周りからは「落ち着いている」「大人びている」と言われることが多い。' },
    { axis: 'ei', dir: +1, text: '考えごとは、頭の中で温めるより誰かに話しながら整理したい。' },
    { axis: 'sn', dir: +1, text: '結界の向こう側のような、まだ誰も見たことのない世界に強く惹かれる。' },
    { axis: 'tf', dir: +1, text: '議論で相手の矛盾に気づくと、つい指摘したくなる。' },
    { axis: 'jp', dir: +1, text: '決まりごとや約束は、多少面倒でもきっちり守りたい。' },
    { axis: 'at', dir: -1, text: '失敗や人からの評価を、あとあとまで引きずってしまう。' },
    { axis: 'hs', dir: -1, text: '思っていることが、すぐ顔や態度に出てしまう。' },
    { axis: 'ag', dir: -1, text: '争いになるくらいなら、自分が譲って丸く収めたい。' },
    { axis: 'mt', dir: -1, text: '面白そうなものを見つけると、後先を考えずに夢中になってしまう。' },
    { axis: 'ei', dir: -1, text: '休みの日は、自分の部屋や図書館にこもって過ごすのが理想だ。' },
    { axis: 'sn', dir: -1, text: '遠い理想を語るより、目の前のごはんやお茶、季節の景色を味わっていたい。' },
    { axis: 'tf', dir: -1, text: '場の空気やみんなの気持ちが和やかであることが、何より大事だ。' },
    { axis: 'jp', dir: -1, text: 'やるべきことがあっても、面白そうなことを見つけるとそちらに流れてしまう。' },
    { axis: 'at', dir: +1, text: '予想外のことが起きても、たいていは動じない。' },
    { axis: 'hs', dir: +1, text: '人をからかったり、うまく言いくるめたりするのは得意なほうだ。' },
    { axis: 'ag', dir: +1, text: '納得のいかないことには、相手が誰であってもはっきり言い返す。' },
    { axis: 'mt', dir: +1, text: '年下や後輩の面倒を見る役回りになることが多い。' },
  ];

  const CHOICES = [
    { value: 2, label: 'そう思う' },
    { value: 1, label: 'ややそう思う' },
    { value: 0, label: 'どちらでもない' },
    { value: -1, label: 'あまり思わない' },
    { value: -2, label: 'そう思わない' },
  ];

  // 16タイプの呼び名(本診断オリジナル)と気質グループ
  const TYPES = {
    INTJ: { name: '孤高の策謀家', group: 'NT', blurb: '遠くまで見通して一人で筋書きを描き、静かに実行へ移すタイプ。' },
    INTP: { name: '探究する書斎派', group: 'NT', blurb: '知りたいことを突き詰めるのが何よりの楽しみ。理屈と知識の世界に住むタイプ。' },
    ENTJ: { name: '堂々たる統率者', group: 'NT', blurb: '大きな目標を掲げ、人も状況も動かして形にしていくタイプ。' },
    ENTP: { name: '型破りの仕掛け人', group: 'NT', blurb: '好奇心と屁理屈で常識をひっくり返す、異変の火種になりがちなタイプ。' },
    INFJ: { name: '静かな導き手', group: 'NF', blurb: '物静かに人や世の行く末を思い、信念をもって支えるタイプ。' },
    INFP: { name: '夢見る幻想家', group: 'NF', blurb: '自分の内側の世界と気持ちを大切にする、繊細で想像力豊かなタイプ。' },
    ENFJ: { name: '慈愛の旗振り役', group: 'NF', blurb: '理想を語って人を惹きつけ、みんなを良い方向へ連れていこうとするタイプ。' },
    ENFP: { name: '天真爛漫な自由人', group: 'NF', blurb: '思いつきと好奇心で飛び回り、周りを巻き込んで楽しくしてしまうタイプ。' },
    ISTJ: { name: '実直な番人', group: 'SJ', blurb: '役目と決まりを守り、黙々と確実にこなす信頼のタイプ。' },
    ISFJ: { name: '献身的な支え手', group: 'SJ', blurb: '大切な相手や場所のために、目立たないところで細やかに尽くすタイプ。' },
    ESTJ: { name: '規律の仕切り役', group: 'SJ', blurb: '白黒をはっきりつけ、現実的に物事を取り仕切るタイプ。' },
    ESFJ: { name: '世話焼きの人気者', group: 'SJ', blurb: '人づきあいがよく面倒見もいい、輪の中心で場を温めるタイプ。' },
    ISTP: { name: '一匹狼の職人', group: 'SP', blurb: '群れずに自分の腕と感覚を頼りにする、クールで実践的なタイプ。' },
    ISFP: { name: '気ままな風流人', group: 'SP', blurb: '自分のペースと好きなものを大事にする、穏やかで感覚派のタイプ。' },
    ESTP: { name: '豪快な勝負師', group: 'SP', blurb: '考えるより先に動き、勝負と刺激を楽しむ行動派のタイプ。' },
    ESFP: { name: '宴の主役', group: 'SP', blurb: '今この瞬間を全力で楽しむ、明るく賑やかなムードメーカー。' },
  };
  const TYPE_ORDER = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
  const GROUPS = {
    NT: { name: '知略の者たち', note: '直観 × 思考' },
    NF: { name: '理想の者たち', note: '直観 × 感情' },
    SJ: { name: '秩序の者たち', note: '感覚 × 計画' },
    SP: { name: '自由の者たち', note: '感覚 × 気まま' },
  };

  // 回答(設問順に -2〜+2、未回答は null)→ 8軸スコア(-1〜+1)
  function score(answers) {
    const sum = {}, cnt = {};
    AXES.forEach(a => { sum[a.key] = 0; cnt[a.key] = 0; });
    QUESTIONS.forEach((q, i) => {
      const v = answers[i];
      cnt[q.axis] += 1;
      if (typeof v === 'number') sum[q.axis] += v * q.dir;
    });
    return AXES.map(a => sum[a.key] / (cnt[a.key] * 2));
  }

  // MBTI 4文字(E/I, S/N, T/F, J/P の順)。0 のときは neg 側の文字になるので、
  // 表示用には match() が返すキャラ側のタイプを使う。
  function typeOf(vec) {
    return (vec[0] > 0 ? 'E' : 'I') + (vec[1] > 0 ? 'N' : 'S') + (vec[2] > 0 ? 'T' : 'F') + (vec[3] > 0 ? 'J' : 'P');
  }

  function distance(u, c) {
    let d = 0;
    for (let i = 0; i < 8; i++) { const x = u[i] - c[i]; d += x * x; }
    return d;
  }
  // 距離 → 一致度(%)。8軸すべて正反対(差2)で 0%。
  function similarity(d) {
    return Math.round(100 * (1 - Math.sqrt(d / 32)));
  }

  // まず基本4軸の向きで 16タイプを決め(ちょうど 0 の軸はどちらも可)、
  // そのタイプに属するキャラの中から、8軸の距離がいちばん近いキャラを選ぶ。
  function match(userVec, chars) {
    const fits = c => {
      for (let i = 0; i < 4; i++) {
        if (userVec[i] === 0) continue;
        if ((userVec[i] > 0) !== (c.v[i] > 0)) return false;
      }
      return true;
    };
    let pool = chars.filter(fits);
    let relaxed = false;
    if (!pool.length) { pool = chars.slice(); relaxed = true; }
    const ranked = pool
      .map(c => ({ c, d: distance(userVec, c.v) }))
      .sort((a, b) => a.d - b.d || (a.c.id < b.c.id ? -1 : 1));
    const best = ranked[0].c;
    const sameType = chars
      .filter(c => c.mbti === best.mbti && c.id !== best.id)
      .map(c => ({ c, d: distance(userVec, c.v) }))
      .sort((a, b) => a.d - b.d);
    const others = chars
      .filter(c => c.mbti !== best.mbti)
      .map(c => ({ c, d: distance(userVec, c.v) }))
      .sort((a, b) => a.d - b.d);
    return { best, d: ranked[0].d, type: best.mbti, relaxed, sameType, others };
  }

  const api = { AXES, QUESTIONS, CHOICES, TYPES, TYPE_ORDER, GROUPS, score, typeOf, distance, similarity, match };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TohoLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
