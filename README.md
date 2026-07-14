# 雨宿り駅の忘れもの

名前を忘れた主人公ナギが、終電の来ない無人駅で6つの忘れものを持ち主へ返していく、見下ろし型の2D探索アドベンチャーです。5つのエリアを歩き、手がかりをノートで照合し、よみがえる記憶をたどって3種類の結末へ進みます。Phaser 3、TypeScript、Viteで実装した、ブラウザだけで遊べる静的サイトです。

**[公開版をブラウザでプレイ](https://himiko119.github.io/rain-shelter-station/)**

> ビジュアル全面改修はGitHub Pagesへ公開済みです。visual release commit `0704a5b` を2026-07-14 12:54（JST）に配信し、公開URLをChromium desktop、390×844 touch、Microsoft Edgeで再検証しました。

![全面改修後のタイトル画面](artifacts/visual-overhaul/after/desktop/01-title-1280x720.png)

![全面改修後の雨のホーム](artifacts/visual-overhaul/after/desktop/06-rain-platform-1280x720.png)

![全面改修後のB「始発」](artifacts/visual-overhaul/after/desktop/13-ending-b-1280x720.png)

## ゲームの特徴

- 待合室、改札広間、駅員室、跨線橋、雨のホームからなる5エリア
- 6つの忘れもの、12の手がかり、持ち主ごとの会話と記憶演出
- 間違った相手へ返してもアイテムを失わず、停滞や誤返却に応じて3段階のヒントを解放
- A「終電」、B「始発」、C「雨宿り」の3エンディングと閲覧記録
- Phaser GraphicsとDOM/CSSだけで描く、完全オリジナルの雨夜の絵本／古い地方駅アート
- 5エリア固有の背景、人物別silhouette／会話portrait、6品別のworld／所持品／記憶visual
- 自動セーブ、音量・ミュート・文字速度・一括表示・演出軽減設定
- キーボード、マウス／ポインター、390px級のタッチ画面とUI-safeな追従cameraに対応

## 操作

| 操作 | キーボード | ポインター／タッチ |
| --- | --- | --- |
| 移動 | `WASD` / 矢印キー | 行き先をクリック / 方向パッド |
| 調べる・決定・会話送り | `E` / `Enter` / `Space` | 光る対象をクリック / 「調べる」ボタン |
| キャンセル・ポーズ | `Esc` | 「Ⅱ」ボタンまたは画面内の閉じるボタン |
| ノート | `N` | 「N」ボタン |
| 所持品 | `I`（`B`でも開けます） | 「持」ボタン |
| 早足 | 左右の `Shift` を押しながら移動 | 方向パッドでは通常速度 |

対象をクリックした時に距離がある場合、ナギは対象のそばまで自動で歩きます。近くでもう一度クリックすると調べます。

## 必要環境

- Node.js 20.19以上、または22.12以上（Node.js 24でも確認可能）
- npm
- Chrome / Chromium。E2E用ChromiumはPlaywrightから導入できます

```powershell
npm install
npx playwright install chromium
```

## 開発と実行

開発サーバーを起動します。

```powershell
npm run dev
```

本番ビルドを作成し、ローカルで確認します。

```powershell
npm run build
npm run preview
```

## テストと検証

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run test:e2e
npm run build
npm run verify:prod
npm run verify:live
npm run check
```

`npm run check` はlint、型検査、単体テスト、本番ビルド、本番bundleの開発用sentinel検査を順番に実行します。ブラウザE2Eは別に `npm run test:e2e` を実行してください。`npm run verify:live` は公開URLをChromium desktop、390×844 touch、Microsoft Edgeで検査し、本番証跡3枚を更新します。E2Eサーバーだけを起動する場合は `npm run dev:e2e` を使います。

`codex/visual-overhaul-v2` の最終ローカル結果は、Vitest 57件、Playwright E2E 11件中11件成功、`npm run check` 成功です。ビジュアル比較用に `artifacts/visual-overhaul/before/` へ15枚、`after/` へ20枚を保存しています。390×844ではcamera下端を約540pxに収め、目的chipをtouch操作域の上へ分離することもE2Eと画面確認で検証しています。

## ディレクトリ構成

```text
src/
  app.ts                 # Store、Phaser、DOM UI、セーブ、音の統合
  game/
    assets/              # procedural visualのstable keyとlicense metadata
    content/             # エリア、忘れもの、手がかり、会話、記憶、結末
    core/                # シリアライズ可能な状態、reducer、selector、store
    input/               # キー／タッチを論理アクションへ変換
    save/                # localStorage adapter、検証、version移行
    systems/             # Web Audioによる環境音と効果音
    debug/               # 開発パネルとnamed E2E scenario bridge
  phaser/
    scenes/              # 探索を担当する単一のExplorationScene
    view/                # 駅、人物、6品、雨、responsive cameraのprocedural view
  ui/                    # 会話、ノート、所持品、設定、記録、タッチUI
  styles/                # テーマとレスポンシブCSS
tests/
  unit/                  # 状態遷移、入力、コンテンツ、セーブのVitest
  e2e/                   # 通常ルート、セーブ、設定、結末、モバイルのPlaywright
scripts/                 # 本番bundle検査
docs/                    # 企画、設計、実装計画、テスト計画、プレイテスト記録
artifacts/playtest/      # 目視確認用スクリーンショット
artifacts/visual-overhaul/ # 全面改修のbefore / after比較
```

## セーブデータ

進行、位置、所持品、手がかり、記憶、結末記録、設定は `localStorage` の `rain-shelter-station.save.v1` に自動保存します。データは `saveVersion: 1` のschemaで読み書きし、既知のversion 0は移行後に現行validatorへ通します。JSON破損、未知ID、範囲外の値、整合しない進行、将来versionは採用せず、安全な初期状態へフォールバックします。

タイトルまたはポーズ画面の設定から「セーブデータを削除」を選び、確認画面で削除できます。削除するとこのキーが消去され、現在の進行は初期状態へ戻ります。

今回のビジュアル全面改修ではsave schemaを変更しておらず、引き続き`saveVersion: 1`です。

## 素材と利用条件

駅、人物、6つの忘れもの、雨などのworld要素はPhaser Graphics、会話portrait、ノート、所持品、記憶、エンディングなどはDOM/CSS、音はWeb Audioで生成しています。ゲーム内アートと音に外部の画像・音声素材を使っていません。`public/favicon.svg`だけはproject内で制作したブラウザアイコンです。依存パッケージには各パッケージ固有のライセンスが適用されます。

このリポジトリにはコードの利用許諾を定める `LICENSE` がなく、`package.json` にもlicenseフィールドはありません。そのため、プロジェクトのコードをMITライセンスとして扱うことはできません。再利用・改変・再配布を行う場合は、権利者から別途許諾を得てください。

## 既知の制約

- Web Audioはブラウザの自動再生制限に従い、最初のクリックまたはキー操作の後に開始します。音声デバイスが使えない場合もゲーム進行は継続します。
- 全面改修後の本番buildはHTML 0.68 kB（gzip 0.46 kB）、JavaScript 1,372.22 kB（gzip 370.74 kB、source map 10,288.55 kB）、CSS 57.64 kB（gzip 13.29 kB）です。Phaserを含むJavaScriptだけがViteの500 kB chunk警告対象になりますが、ビルド失敗ではありません。
- 全面改修はローカルE2Eに加え、GitHub Pages公開後のChromium desktop／390×844 touch／Microsoft Edgeでも確認済みです。Firefox／WebKitは同じ深さでは未確認です。

公開前後の確認手順と現在の状態は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)、画面・E2Eの記録は [docs/PLAYTEST_REPORT.md](docs/PLAYTEST_REPORT.md) を参照してください。
