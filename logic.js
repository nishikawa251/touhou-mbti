// 東方キャラ性格診断 — 設問・採点・マッチングのロジック(ブラウザと Node の両方で動く)
(function (root) {
  'use strict';

  // 8軸。前半4つが MBTI の基本軸、後半4つが 16タイプを細分化するサブ軸。
  // スコアは -1〜+1。正が pos 側、負が neg 側。
  // 各項目の en は英語版(en/index.html)で使う文。設問・選択肢・タイプ・グループも同じ。
  const AXES = [
    { key: 'ei', main: true, pos: 'E', neg: 'I', posLabel: '外向', negLabel: '内向', posDesc: '人の輪の中で元気になる', negDesc: '一人の時間で元気になる', en: { posLabel: "Extraverted", negLabel: "Introverted", posDesc: "Recharges among people", negDesc: "Recharges with time alone" } },
    { key: 'sn', main: true, pos: 'N', neg: 'S', posLabel: '直観', negLabel: '感覚', posDesc: '空想やひらめきを追う', negDesc: '現実と実感を大事にする', en: { posLabel: "Intuitive", negLabel: "Sensing", posDesc: "Chases daydreams and inspiration", negDesc: "Values what is real and tangible" } },
    { key: 'tf', main: true, pos: 'T', neg: 'F', posLabel: '思考', negLabel: '感情', posDesc: '理屈と筋道で決める', negDesc: '気持ちと情で決める', en: { posLabel: "Thinking", negLabel: "Feeling", posDesc: "Decides by logic and reason", negDesc: "Decides by heart and sympathy" } },
    { key: 'jp', main: true, pos: 'J', neg: 'P', posLabel: '計画', negLabel: '気まま', posDesc: '段取りと規律を好む', negDesc: '流れと自由を好む', en: { posLabel: "Planned", negLabel: "Spontaneous", posDesc: "Likes schedules and order", negDesc: "Likes going with the flow" } },
    { key: 'at', main: false, posLabel: '泰然', negLabel: '繊細', posDesc: '自信があり動じない', negDesc: '細やかで気にしやすい', en: { posLabel: "Unflappable", negLabel: "Sensitive", posDesc: "Confident and hard to rattle", negDesc: "Attentive and easily worried" } },
    { key: 'hs', main: false, posLabel: '策士', negLabel: '素直', posDesc: '駆け引き上手で食えない', negDesc: '裏表がなくまっすぐ', en: { posLabel: "Scheming", negLabel: "Candid", posDesc: "Plays mind games, hard to read", negDesc: "No hidden side, straightforward" } },
    { key: 'ag', main: false, posLabel: '好戦', negLabel: '温和', posDesc: '勝気で受けて立つ', negDesc: '争いを好まず穏やか', en: { posLabel: "Combative", negLabel: "Gentle", posDesc: "Competitive, accepts any challenge", negDesc: "Avoids fights, easygoing" } },
    { key: 'mt', main: false, posLabel: '老成', negLabel: '無邪気', posDesc: '落ち着いて大人びている', negDesc: '好奇心のまま無邪気', en: { posLabel: "Mature", negLabel: "Innocent", posDesc: "Calm and grown-up", negDesc: "Follows curiosity like a child" } },
  ];

  // dir: +1 なら「そう思う」が pos 側、-1 なら neg 側に加点
  // 文は小学生でも読めるように、漢字には {漢字|よみ} の形でふりがなを付けてある(画面側で <ruby> にする)
  const QUESTIONS = [
    { axis: 'ei', dir: +1, text: '{神社|じんじゃ}で{宴会|えんかい}があると{聞|き}いたら、{誘|さそ}われていなくても{行|い}きたくなる。', en: "If I hear there's a party at the shrine, I want to go even if nobody invited me." },
    { axis: 'sn', dir: +1, text: '「もしも〜だったら」と{想像|そうぞう}するのが{好|す}きだ。', en: "I love imagining \"what if...?\" scenarios." },
    { axis: 'tf', dir: +1, text: '{友|とも}だちに{悩|なや}みを{相談|そうだん}されたら、「わかるよ」と{言|い}うより{先|さき}に、どうすればいいかを{考|かんが}えてしまう。', en: "When a friend tells me about a problem, I start working out what they should do before I even say \"I get it.\"" },
    { axis: 'jp', dir: +1, text: '{予定|よてい}は{先|さき}に{決|き}めておかないと、{落|お}ち{着|つ}かない。', en: "I can't relax unless my plans are settled in advance." },
    { axis: 'at', dir: +1, text: '{自分|じぶん}の{力|ちから}や{考|かんが}えには、だいたい{自信|じしん}がある。', en: "I'm generally confident in my own abilities and ideas." },
    { axis: 'ei', dir: -1, text: '{一人|ひとり}で{静|しず}かに{過|す}ごす{時間|じかん}がないと、どっと{疲|つか}れてしまう。', en: "If I don't get quiet time alone, I end up completely drained." },
    { axis: 'sn', dir: -1, text: '{役|やく}に{立|た}つかわからない{話|はなし}より、すぐに{使|つか}える{知識|ちしき}のほうが{好|す}きだ。', en: "I prefer knowledge I can use right away over talk that may never be useful." },
    { axis: 'tf', dir: -1, text: '{正|ただ}しいことでも、{相手|あいて}が{傷|きず}つきそうなら、{言|い}い{方|かた}を{変|か}えるか{言|い}わないでおく。', en: "Even if something is true, I'll put it gently or keep it to myself if it might hurt someone." },
    { axis: 'jp', dir: -1, text: '{宿題|しゅくだい}や{約束|やくそく}は、ぎりぎりになってから{本気|ほんき}を{出|だ}すタイプだ。', en: "With homework and promises, I only get serious at the last minute." },
    { axis: 'hs', dir: +1, text: '{目的|もくてき}のためなら、{本当|ほんとう}の{気持|きも}ちをかくしたり{駆|か}け{引|ひ}きをしたりするのは、{当|あ}たり{前|まえ}だと{思|おも}う。', en: "Hiding my true feelings or playing mind games to get what I want is only natural." },
    { axis: 'ei', dir: +1, text: '{初|はじ}めて{会|あ}った{人|ひと}にも、{自分|じぶん}から{気軽|きがる}に{話|はな}しかけるほうだ。', en: "I'm happy to start a conversation with someone I've just met." },
    { axis: 'sn', dir: +1, text: '{細|こま}かいところより、{全体|ぜんたい}の{意味|いみ}や「どうしてそうなるのか」のほうが{気|き}になる。', en: "I care more about the big picture and why things are the way they are than about the details." },
    { axis: 'tf', dir: +1, text: '{何|なに}かを{決|き}めるときは、{気持|きも}ちより「{理屈|りくつ}に{合|あ}っているか」を{大事|だいじ}にする。', en: "When I make a decision, whether it makes logical sense matters more than how I feel." },
    { axis: 'jp', dir: +1, text: '{机|つくえ}のまわりや{部屋|へや}は、たいていきちんと{片付|かたづ}いている。', en: "My desk and room are usually neat and tidy." },
    { axis: 'ag', dir: +1, text: '{勝負|しょうぶ}をしかけられたら、{受|う}けて{立|た}たずにはいられない。', en: "If someone challenges me, I can't help but take them on." },
    { axis: 'ei', dir: -1, text: '{大勢|おおぜい}でわいわい{騒|さわ}ぐより、{少|すく}ない{人数|にんずう}でじっくり{話|はな}すほうが{落|お}ち{着|つ}く。', en: "I'm more at ease having a long talk with a few people than partying with a big crowd." },
    { axis: 'sn', dir: -1, text: '{新|あたら}しいやり{方|かた}を{試|ため}すより、{昔|むかし}からあるたしかなやり{方|かた}を{信|しん}じる。', en: "I trust tried-and-true methods more than trying new ways of doing things." },
    { axis: 'tf', dir: -1, text: '{困|こま}っている{人|ひと}を{見|み}ると、{得|とく}かどうかに{関係|かんけい}なく{放|ほう}っておけない。', en: "When I see someone in trouble, I can't leave them be, whether or not there's anything in it for me." },
    { axis: 'jp', dir: -1, text: 'その{日|ひ}の{気分|きぶん}で{予定|よてい}を{変|か}えるのは、むしろ{楽|たの}しい。', en: "Changing my plans to suit my mood that day is actually fun." },
    { axis: 'mt', dir: +1, text: 'まわりから「{落|お}ち{着|つ}いているね」「{大人|おとな}っぽいね」と{言|い}われることが{多|おお}い。', en: "People often tell me I seem calm or grown-up." },
    { axis: 'ei', dir: +1, text: '{考|かんが}えごとは、{頭|あたま}の{中|なか}だけでするより、{誰|だれ}かに{話|はな}しながらまとめたい。', en: "I'd rather sort out my thoughts by talking them through with someone than just in my head." },
    { axis: 'sn', dir: +1, text: '{結界|けっかい}の{向|む}こう{側|がわ}のような、まだ{誰|だれ}も{見|み}たことのない{世界|せかい}にすごくひかれる。', en: "I'm strongly drawn to worlds nobody has seen yet, like whatever lies beyond the barrier." },
    { axis: 'tf', dir: +1, text: '{話|はな}し{合|あ}いで{相手|あいて}の{言|い}っていることがおかしいと{気|き}づくと、つい{言|い}いたくなる。', en: "In a discussion, if I notice someone's point doesn't add up, I can't help saying so." },
    { axis: 'jp', dir: +1, text: '{決|き}まりや{約束|やくそく}は、{少|すこ}し{面倒|めんどう}でもきちんと{守|まも}りたい。', en: "I want to follow rules and keep promises properly, even when it's a bit of a hassle." },
    { axis: 'at', dir: -1, text: '{失敗|しっぱい}したことや{人|ひと}に{言|い}われたことを、あとあとまで{引|ひ}きずってしまう。', en: "I keep dwelling on my mistakes and on things people said to me long afterward." },
    { axis: 'hs', dir: -1, text: '{思|おも}っていることが、すぐ{顔|かお}や{態度|たいど}に{出|で}てしまう。', en: "Whatever I'm thinking shows on my face and in my attitude right away." },
    { axis: 'ag', dir: -1, text: 'けんかになるくらいなら、{自分|じぶん}がゆずって{丸|まる}くおさめたい。', en: "Rather than let it turn into a fight, I'd give way and smooth things over." },
    { axis: 'mt', dir: -1, text: '{面白|おもしろ}そうなものを{見|み}つけると、あとのことを{考|かんが}えずに{夢中|むちゅう}になってしまう。', en: "When I find something interesting, I get completely absorbed without thinking about what comes next." },
    { axis: 'ei', dir: -1, text: '{休|やす}みの{日|ひ}は、{自分|じぶん}の{部屋|へや}や{図書館|としょかん}にこもって{過|す}ごすのがいちばんだ。', en: "On my days off, holing up in my room or a library is the best." },
    { axis: 'sn', dir: -1, text: '{遠|とお}い{夢|ゆめ}を{語|かた}るより、{目|め}の{前|まえ}のごはんやお{茶|ちゃ}、{季節|きせつ}の{景色|けしき}を{楽|たの}しんでいたい。', en: "I'd rather enjoy the food and tea in front of me and the seasonal scenery than talk about distant dreams." },
    { axis: 'tf', dir: -1, text: 'その{場|ば}の{空気|くうき}やみんなの{気持|きも}ちがなごやかなことが、{何|なに}より{大事|だいじ}だ。', en: "Keeping the mood friendly and everyone happy matters more than anything." },
    { axis: 'jp', dir: -1, text: 'やることがあっても、{面白|おもしろ}そうなことを{見|み}つけるとそっちに{流|なが}れてしまう。', en: "Even when I have things to do, I drift off toward anything that looks fun." },
    { axis: 'at', dir: +1, text: '{思|おも}いがけないことが{起|お}きても、たいていはあわてない。', en: "Even when something unexpected happens, I usually stay calm." },
    { axis: 'hs', dir: +1, text: '{人|ひと}をからかったり、うまく{言|い}いくるめたりするのは{得意|とくい}なほうだ。', en: "I'm pretty good at teasing people and talking them into things." },
    { axis: 'ag', dir: +1, text: '{納得|なっとく}できないことには、{相手|あいて}が{誰|だれ}でもはっきり{言|い}い{返|かえ}す。', en: "If something doesn't sit right with me, I'll push back clearly, no matter who it is." },
    { axis: 'mt', dir: +1, text: '{年下|としした}の{子|こ}の{面倒|めんどう}を{見|み}る{役|やく}になることが{多|おお}い。', en: "I often end up being the one who looks after younger kids." },
  ];
  // {漢字|よみ} を外した素の文(コピー用や読み上げ用)
  const plainText = s => String(s).replace(/\{([^|{}]+)\|[^}]*\}/g, '$1');

  const CHOICES = [
    { value: 2, label: 'そう思う', en: "Agree" },
    { value: 1, label: 'ややそう思う', en: "Somewhat agree" },
    { value: 0, label: 'どちらでもない', en: "Neutral" },
    { value: -1, label: 'あまり思わない', en: "Somewhat disagree" },
    { value: -2, label: 'そう思わない', en: "Disagree" },
  ];

  // 16タイプの呼び名(本診断オリジナル)と気質グループ
  const TYPES = {
    INTJ: { name: '孤高の策謀家', group: 'NT', blurb: '遠くまで見通して一人で筋書きを描き、静かに実行へ移すタイプ。', en: { name: "Lone Mastermind", blurb: "Sees far ahead, drafts the whole plot alone, and quietly puts it into motion." } },
    INTP: { name: '探究する書斎派', group: 'NT', blurb: '知りたいことを突き詰めるのが何よりの楽しみ。理屈と知識の世界に住むタイプ。', en: { name: "Inquisitive Scholar", blurb: "Nothing beats digging into whatever they want to know. Lives in a world of logic and knowledge." } },
    ENTJ: { name: '堂々たる統率者', group: 'NT', blurb: '大きな目標を掲げ、人も状況も動かして形にしていくタイプ。', en: { name: "Commanding Leader", blurb: "Sets a big goal and moves people and circumstances alike to make it happen." } },
    ENTP: { name: '型破りの仕掛け人', group: 'NT', blurb: '好奇心と屁理屈で常識をひっくり返す、異変の火種になりがちなタイプ。', en: { name: "Maverick Instigator", blurb: "Turns common sense on its head with curiosity and clever arguments, and tends to spark incidents." } },
    INFJ: { name: '静かな導き手', group: 'NF', blurb: '物静かに人や世の行く末を思い、信念をもって支えるタイプ。', en: { name: "Quiet Guide", blurb: "Quietly thinks about where people and the world are headed, and supports them with conviction." } },
    INFP: { name: '夢見る幻想家', group: 'NF', blurb: '自分の内側の世界と気持ちを大切にする、繊細で想像力豊かなタイプ。', en: { name: "Daydreaming Fantasist", blurb: "Treasures their own inner world and feelings. Sensitive and full of imagination." } },
    ENFJ: { name: '慈愛の旗振り役', group: 'NF', blurb: '理想を語って人を惹きつけ、みんなを良い方向へ連れていこうとするタイプ。', en: { name: "Kindhearted Standard-Bearer", blurb: "Wins people over by talking about ideals and tries to lead everyone somewhere better." } },
    ENFP: { name: '天真爛漫な自由人', group: 'NF', blurb: '思いつきと好奇心で飛び回り、周りを巻き込んで楽しくしてしまうタイプ。', en: { name: "Bubbly Wanderer", blurb: "Flits around on whims and curiosity, pulling everyone along and making things fun." } },
    ISTJ: { name: '実直な番人', group: 'SJ', blurb: '役目と決まりを守り、黙々と確実にこなす信頼のタイプ。', en: { name: "Steadfast Sentinel", blurb: "Sticks to duty and the rules, getting things done quietly and reliably." } },
    ISFJ: { name: '献身的な支え手', group: 'SJ', blurb: '大切な相手や場所のために、目立たないところで細やかに尽くすタイプ。', en: { name: "Devoted Supporter", blurb: "Works hard behind the scenes, in small thoughtful ways, for the people and places they cherish." } },
    ESTJ: { name: '規律の仕切り役', group: 'SJ', blurb: '白黒をはっきりつけ、現実的に物事を取り仕切るタイプ。', en: { name: "Strict Organizer", blurb: "Draws clear lines between right and wrong and runs things in a practical way." } },
    ESFJ: { name: '世話焼きの人気者', group: 'SJ', blurb: '人づきあいがよく面倒見もいい、輪の中心で場を温めるタイプ。', en: { name: "Popular Caretaker", blurb: "Friendly and caring, and warms up the room from the middle of the circle." } },
    ISTP: { name: '一匹狼の職人', group: 'SP', blurb: '群れずに自分の腕と感覚を頼りにする、クールで実践的なタイプ。', en: { name: "Lone-Wolf Artisan", blurb: "Doesn't run with the pack. Cool and practical, trusting their own skill and senses." } },
    ISFP: { name: '気ままな風流人', group: 'SP', blurb: '自分のペースと好きなものを大事にする、穏やかで感覚派のタイプ。', en: { name: "Easygoing Aesthete", blurb: "Values their own pace and the things they love. Gentle and guided by the senses." } },
    ESTP: { name: '豪快な勝負師', group: 'SP', blurb: '考えるより先に動き、勝負と刺激を楽しむ行動派のタイプ。', en: { name: "Bold Gambler", blurb: "Acts before thinking and loves a good contest and a thrill." } },
    ESFP: { name: '宴の主役', group: 'SP', blurb: '今この瞬間を全力で楽しむ、明るく賑やかなムードメーカー。', en: { name: "Star of the Banquet", blurb: "Enjoys the here and now to the fullest. A bright, lively mood-maker." } },
  };
  const TYPE_ORDER = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
  const GROUPS = {
    NT: { name: '知略の者たち', note: '直観 × 思考', en: { name: "The Strategists", note: "Intuitive × Thinking", sign: "Strategy Sign" } },
    NF: { name: '理想の者たち', note: '直観 × 感情', en: { name: "The Idealists", note: "Intuitive × Feeling", sign: "Ideal Sign" } },
    SJ: { name: '秩序の者たち', note: '感覚 × 計画', en: { name: "The Keepers of Order", note: "Sensing × Planned", sign: "Order Sign" } },
    SP: { name: '自由の者たち', note: '感覚 × 気まま', en: { name: "The Free Spirits", note: "Sensing × Spontaneous", sign: "Freedom Sign" } },
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

  // ---------- ドパガキモード ----------
  // 36問は多いという人向けに、6問だけで無理やり決める。基本4軸は1問ずつ、サブ軸は4つのうち2つを1問ずつ。
  // どの6問にするかは seed から毎回ランダムに選ぶ。答えなかった軸と「どちらでもない」だった軸は
  // サイコロで決めるので、当たらなくても文句は言えない。
  const QUICK_COUNT = 6;

  // seed から決まる疑似乱数(同じ seed なら同じ列を返す。結果ページを開き直しても同じ結果になるように)
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // seed → 今回の6問(QUESTIONS の添字)。基本4軸から1問ずつ、サブ4軸のうち2軸から1問ずつ
  function quickPick(seed) {
    const r = rng(seed ^ 0x5bd1e995);
    const pickFrom = axis => {
      const idx = QUESTIONS.map((q, i) => (q.axis === axis ? i : -1)).filter(i => i >= 0);
      return idx[Math.floor(r() * idx.length)];
    };
    const picks = AXES.filter(a => a.main).map(a => pickFrom(a.key));
    const subs = AXES.filter(a => !a.main);
    const first = Math.floor(r() * subs.length);
    let second = Math.floor(r() * (subs.length - 1));
    if (second >= first) second += 1;
    picks.push(pickFrom(subs[first].key), pickFrom(subs[second].key));
    return picks;
  }

  // 6問の回答(quickPick(seed) の順に -2〜+2)と seed → { vec: 8軸スコア, dice: サイコロで決めた軸の番号 }
  function quickScore(answers5, seed) {
    const r = rng(seed);
    const vec = AXES.map(() => 0);
    quickPick(seed).forEach((qi, k) => {
      const q = QUESTIONS[qi];
      const v = answers5[k];
      const i = AXES.findIndex(a => a.key === q.axis);
      vec[i] = (typeof v === 'number' ? v * q.dir : 0) / 2;
    });
    const dice = [];
    AXES.forEach((a, i) => {
      if (vec[i] !== 0) return;
      vec[i] = (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)) / 3;
      dice.push(i);
    });
    return { vec, dice };
  }

  // ---------- 相性 ----------
  // 直観/感覚だけ同じで、ほかの7軸は反対の相手を「足りないところを補い合う相性」とみなす
  function partnerVec(u) { return u.map((v, i) => (i === 1 ? v : -v)); }
  // 相性のいい順に並べたキャラ(exclude は結果に出たキャラなど外したい id)
  function compat(userVec, chars, exclude) {
    const p = partnerVec(userVec);
    return chars
      .filter(c => c.id !== exclude)
      .map(c => ({ c, d: distance(p, c.v) }))
      .sort((a, b) => a.d - b.d || (a.c.id < b.c.id ? -1 : 1));
  }

  const api = { AXES, QUESTIONS, CHOICES, TYPES, TYPE_ORDER, GROUPS, QUICK_COUNT, quickPick, plainText, score, quickScore, typeOf, distance, similarity, match, partnerVec, compat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TohoLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
