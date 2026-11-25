# 東方キャラ性格診断

36問の質問に答えると、16タイプ分類をさらに細分化して、東方Projectのキャラクター137人の中からいちばん近い1人を出す診断です。

東方Projectの非公式ファン作品です。公式のMBTI®検査ではありません。

## 遊び方

`index.html` をブラウザで開くだけで動きます。ビルドは不要です。

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

1. `research/profiles/part*.json`(各キャラの8軸スコアと紹介文)か `tools/overrides.json`(個別の上書き)を編集する
2. `node tools/build-data.mjs` で `data.js` を作り直す
3. `node tools/test.mjs` で全キャラが結果に出うることを確認する

キャラ画像は `tools/import-art.mjs` で素材フォルダから `img/chars/<id>.png` に取り込んでいます(対応表は `tools/art-map.json`)。

## クレジット

- イラスト: 粗茶「やおよろづ」シリーズ
- 性格の参考: ピクシブ百科事典の各キャラクター記事 https://dic.pixiv.net/
- 東方Project © 上海アリス幻樂団

イラストの著作権は作者に帰属します。無断での転載・再配布はしないでください。

## ドパガキモード

36問が多い人向けに、5問だけで無理やり決めるモードです(`logic.js` の `quickPick` と `quickScore`)。5問は毎回ランダムに選びます(基本4軸から1問ずつ、サブ軸のどれかから1問)。残りの軸と「どちらでもない」だった軸はサイコロで決めるので、結果は当たりません。

## 共有(SNS・OGP)

結果ページの「結果をシェア」から、X への投稿・画像の共有/保存・リンクのコピーができます。

- `s/<id>.html`: キャラごとの共有ページ。OGP タグ(`og:image` など)を持ち、開くと `#/c/<id>` に移動します。
- `img/og/<id>.jpg`: 共有用の 1200×630 の画像。`img/og/site.jpg` はトップページ用です。
- 作り直すときは `node tools/build-share.mjs` のあと `powershell -ExecutionPolicy Bypass -File tools/og.ps1` を実行します(フォントは Zen Maru Gothic、なければ Yu Gothic UI)。
