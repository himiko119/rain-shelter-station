# ビジュアル実装計画 — visual overhaul v2

## 非交渉条件

- ゲーム状態と描画状態を分離する。
- 既存の衝突、hotspot、進行、セーブ形式、3エンディングを維持する。
- 外部素材、CDN、新規ランタイム依存を追加しない。
- Canvasは世界・人物・雨・光、DOMは文字量の多いUIを担当する。
- 安定したasset keyと集中管理したpaletteを描画APIの境界にする。

## Phase V1 — 監査と基盤

成果物:

- 変更前15画面
- `VISUAL_AUDIT.md`、`ART_DIRECTION.md`、`ASSET_MANIFEST.md`
- palette、visual stage selector、procedural asset manifest
- 変更前 `npm run check` とPlaywrightの結果

完了条件: 公開済みHEADから専用ブランチを作り、基準テストが33 Vitest / 9 Playwrightを下回らず、同じscenarioを変更後撮影へ再利用できる。

## Phase V2 — 駅環境

`StationView`を、遠景、床、構造物、設備、前景、雨・光の順に描く。5エリアごとに固有の床パターン、壁材、案内設備、出口の視覚言語を持たせる。既存obstacle座標に外形を合わせ、装飾だけで通路を塞がない。

完了条件: ラベルを隠しても主要5画面を区別でき、各エリアの必須設備が画面内に存在する。

## Phase V3 — 忘れものとinteractable

6品を共通APIで描き、worldは32〜46px、inventoryは72〜96px、memoryは120〜160px相当へ拡大できる構造にする。文字glyphは補助情報へ下げ、輪郭だけでも品目を区別する。近接markerは小さな反射リングへ変更する。

完了条件: 各アイテムが文字なしで識別でき、hotspot中心と表示中心が一致する。

## Phase V4 — 人物

ナギは4方向と歩行位相を持つベクターパーツ構成にする。駅員と5人の乗客は体格、姿勢、頭部、服、小物を個別化する。全actorは底面中央アンカーと接地影を共有する。

完了条件: 移動中も体格と接地点が変わらず、ナギ、駅員、各乗客を小画面で識別できる。

## Phase V5 — DOM UI

CSS tokenを指定paletteへ整理し、タイトルを駅名標＋切符、会話を駅窓、ノートを綴じ帳、所持品を切符入れ、記録を改札印のモチーフへ統一する。item illustrationとspeaker portrait keyをDOMへ渡す。

完了条件: キーボードfocus、aria、Escape、スクロール、タッチ操作を維持し、通常HUDがプレイ領域を覆わない。

## Phase V6 — 雨、光、時間、記憶

雨は上限数つきの3層、屋内は窓雨中心、ホームは前景雨と波紋を追加する。stageに応じて空、灯数、反射色、雨量、信号、列車を変える。記憶は対応item closeupと紙縁を使う。`reducedMotion`では雨数、pulse、transitionを抑える。

完了条件: stage 0、3、6の色温度と雨量差が静止画でも分かり、演出軽減で非本質motionが止まる。

## Phase V7 — 検証と修正

- lint、typecheck、Vitest、build、production sentinel
- Playwright全件、通常入力、3 ending、save reload、mobile touch
- 変更後20画面と6軸自己評価
- 404、console/page/request error、debug分離
- actor anchor、衝突、hotspot、UI overflow、44px touch target
- bundle、asset総量、雨オブジェクト数、Scene再生成後の重複

完了条件: 既存テストを削除・skipせず全件成功し、主要画面の自己評価平均4以上、2以下なし。

## Phase V8 — 公開

README、PLAYTEST、DEPLOYMENT、visual reportを更新し、意味のある単位でコミットする。作業ブランチをPush後、公開ブランチへfast-forward可能な形で統合し、既存Pages workflowを成功させる。公開URLでデスクトップ、Edge、390×844、音声開始、保存再読込、faviconと全assetの200、debug非露出を確認する。

