# 東方キャラ性格診断

36問の質問に答えると、16タイプ分類をさらに細分化して、東方Projectのキャラクター137人の中からいちばん近い1人を出す診断です。

東方Projectの非公式ファン作品です。公式のMBTI®検査ではありません。

## 遊び方

公開物は `docs/` にまとまっています(GitHub Pages はこのフォルダを配信)。`docs/index.html` をブラウザで開くだけで動きます。ビルドは不要です。`tools/` は内部用で、公開サイトからは見えません。

ローカルサーバーで開く場合:

```bash
node tools/serve.mjs 4173
```

## 仕組み

- 基本4軸(外向/内向・直観/感覚・思考/感情・計画/気まま)で16タイプを決めます。
- サブ4軸(泰然/繊細・策士/素直・好戦/温和・老成/無邪気)を加えた8軸で、同じタイプの中からいちばん近いキャラを選びます。
- 設問と判定ロジックは `logic.js`、画面は `app.js` と `style.css` にあります。

## データの直し方

`data.js` は生成物なので直接編集しません。

1. `tools/profiles/part*.json`(各キャラの8軸スコアと紹介文)か `tools/overrides.json`(個別の上書き)を編集する
2. `node tools/build-data.mjs` で `data.js` を作り直す
3. `node tools/test.mjs` で全キャラが結果に出うることを確認する

全キャラの表示テキスト(名前・読み・タイプ・サブタイプ・キャッチ・主属性・紹介文・登場原作・8軸の値・各リンク)は `tools/review.html` で一覧できます(`node tools/serve.mjs 4173` のあと http://localhost:4173/tools/review.html 。公開サイトでも /tools/review.html で開けます)。字数や読みの抜け、リンクのない登場原作などの気になる点には自動で印が付き、検索・タイプ別・「注意があるキャラだけ」で絞り込めます。チェックの目安はファイル内の `CHECKS` で変えられます。

「編集モード」にすると、キャッチ・主属性・紹介文をその場で書き換えられます(字数や印もその場で更新)。直した内容はそのブラウザに一時保存され、「変更を書き出す」で `tools/overrides.json`(いまの中身＋直した分)をダウンロード・コピーできます。そのファイルで `tools/overrides.json` を置き換えて `node tools/build-data.mjs` を実行すると `data.js` に反映されます(中身をチャットに貼って頼んでもよい)。

結果と図鑑の詳細には、東方我楽多叢誌「週刊東方キャラクター」のキャラ記事へのボタンを出します(対応表は `tools/garakuta.json`。記事がない名無しの本読み妖怪と稗田阿求は連載の一覧へ)。

キャラ画像は `tools/import-art.mjs` で素材フォルダから `tools/art-src/<id>.png`(原本)に取り込み、`node tools/webp.mjs` で `docs/img/chars/<id>.webp`(公開用、約1/3の容量)にしています(対応表は `tools/art-map.json`。`npm install` で sharp が入ります)。

## クレジット

- イラスト: 粗茶「やおよろづ」シリーズ
- 性格の参考: ピクシブ百科事典の各キャラクター記事 https://dic.pixiv.net/
- 東方Project © 上海アリス幻樂団

イラストの著作権は作者に帰属します。無断での転載・再配布はしないでください。

## ドパガキモード

36問が多い人向けに、5問だけで無理やり決めるモードです(`logic.js` の `QUICK_COUNT`・`quickPick`・`quickScore`)。5問は毎回ランダムに選びます(基本4軸から1問ずつ、サブ4軸のうち1軸から1問)。残りの軸と「どちらでもない」だった軸はサイコロで決めるので、結果は当たりません。

## 共有(SNS・OGP)

結果ページの「結果をシェア」から、X への投稿・画像の共有/保存・リンクのコピーができます。

- `s/<id>.html`: キャラごとの共有ページ。OGP タグ(`og:image` など)を持ち、開くと `#/c/<id>` に移動します。
- `img/og/<id>.jpg`: 共有用の 1200×630 の画像(シンプル版。OGP にも使う)。`img/og/<id>-full.jpg` は紹介文入りの 1200×900 の詳細版、`img/og/site.jpg` はトップページ用です。
- 作り直すときは `node tools/build-share.mjs` のあと `powershell -ExecutionPolicy Bypass -File tools/og.ps1` を実行します(フォントは Zen Maru Gothic、なければ Yu Gothic UI)。

結果ページには「あなたと相性のいいキャラ」も出します。直観/感覚だけが同じで、ほかの7軸が反対のキャラほど上に来ます(`logic.js` の `compat`)。

`docs/index.html` が読み込む CSS/JS には `?v=日時` を付けています。GitHub Pages は10分キャッシュするので、見た目や動きを変えたときはこの値を更新してください(更新しないと、しばらく古い CSS/JS で表示されます)。

キャラ名の読みと主な登場原作は `tools/meta.json` にあります(読みは漢字を含む名前だけ。作品は初登場を先頭に2〜4件。今は手に入らない旧作(靈異伝・封魔録・幻想郷・夢時空・怪綺談)は載せない)。直したら `node tools/build-data.mjs` で `data.js` に反映されます。

登場原作のリンク先は `tools/works.json` にあります。ゲームと音楽CDは Steam(なければ東方やおよろず商店)、書籍・漫画は単行本1巻(シリーズ最初の巻)の KADOKAWA か BOOK☆WALKER の紹介ページ、どちらにもない一迅社の本(求聞史紀・求聞口授)は一迅社の書誌ページです。

姓と名で分けたふりがなは `tools/ruby.json` にあります(`[["博麗","はくれい"],["霊夢","れいむ"]]` の形。読みのない部分は `null`)。

フォント(Zen Maru Gothic)は Google Fonts に接続せず `docs/fonts/` から配信しています。内部用のテキストチェックページは `node tools/serve.mjs 4173` のあと http://localhost:4173/tools/review.html で開けます(公開サイトには含まれません)。

## 解析(GoatCounter)

`docs/index.html` の `window.GOATCOUNTER_SITE` にサイトコード(`xxxx.goatcounter.com` の `xxxx`)を入れると計測が始まります(空のままなら何も送りません。cookie は使いません)。数えているもの: ページ(`/`, `/quiz`, `/quiz-quick`, `/result`, `/result-quick`, `/zukan`, `/c/<id>`)と、イベント(`start/full|quick`、`result-char/<id>`、`result-type/<MBTI>`、`mode/full|quick`、`share/open|x|image|save|link`、`garakuta/<id>`、`work/<作品名>`)。

## ライセンス

- プログラム(HTML・CSS・JavaScript、tools/ のスクリプト)は MIT License(LICENSE を参照)。
- キャラクターイラストの著作権は粗茶さんにあり、このリポジトリのライセンスには含まれません。無断での転載・再配布はしないでください。
- キャラクターの紹介文・判定データは本サイト用に書き起こしたもので、東方Project の二次創作物です(東方Project © 上海アリス幻樂団)。
- Zen Maru Gothic は SIL Open Font License 1.1 で配布されているフォントです(docs/fonts/)。

作者: [@nishikawa_huton](https://x.com/nishikawa_huton)
