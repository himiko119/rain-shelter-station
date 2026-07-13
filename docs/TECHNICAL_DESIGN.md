# TECHNICAL DESIGN

## スタックと出荷形態

- Phaser 3.90: 2D世界、Arcade Physics、カメラ、図形描画
- TypeScript 6 + Vite 8: 型検査、開発サーバー、静的サイトbuild
- DOM + CSS: タイトル、会話、ノート、所持品、ポーズ、設定、記録、タッチ操作
- Web Audio: 雨と駅の環境音、UI・取得・記憶・結末の効果音
- Vitest: 状態遷移、コンテンツ、入力、セーブの単体テスト
- Playwright: 通常操作、セーブ、設定、3結末、モバイル、console/page errorのE2E
- ESLint: TypeScriptを含む静的検査

React、バックエンド、外部API、認証、課金、広告、解析は使用しない。本番成果物は `dist/` の静的ファイルだけで動作する。

## 実装構成

```text
src/
  main.ts                # DOMContentLoaded後にGameApplicationを生成
  app.ts                 # Store、UI、Scene、入力、音、セーブのオーケストレーション
  game/
    content/             # stable ID付きのarea、owner、item、clue、dialog、memory、ending
    core/                # GameState、pure reducer、selector、GameStore
    input/               # 物理入力からInputActionへの変換
    save/                # version付きvalidation、version 0 migration、localStorage adapter
    systems/audio.ts     # Web Audioの生成と破棄
    debug/               # F2 DEV panel、named scenario E2E bridge
  phaser/
    scenes/ExplorationScene.ts
    view/StationView.ts
  ui/                    # AppUiと表示用view model
  styles/main.css        # テーマ、レスポンシブ、タッチUI
```

Phaser Sceneは `ExplorationScene` の1つだけである。起動用SceneやScene専用adapterは置かず、`GameApplication` が作るbridgeを通して `GameStore` と接続する。`StationView` は外部画像を読み込まず、駅の5エリア、ナギ、乗客、雨、照明をPhaserの図形としてproceduralに生成する。

## 実行時のデータフロー

```text
Keyboard / Pointer / Touch
          ↓
      ActionInput ─────────────→ ExplorationScene（移動・近接調査）
          ↓                               ↓ bridge callback
     GameApplication ─────────────→ GameStore.dispatch(GameAction)
          ↓                               ↓ pure reducer
 DOM UI / Audio / Save ←──────────── GameState
          ↓
 ExplorationScene.syncFromState
```

`GameState` が進行の唯一の真実源であり、Scene、Sprite、Camera、Tween、DOM、AudioNodeを含まない。状態変更は `GameStore.dispatch(GameAction)` または、正誤を判定して通常actionをdispatchする `GameStore.tryReturn` を通す。Storeはdispatch中に生じたactionをqueueに積み、listenerの再入から状態順序を守る。

## 状態と進行

永続化する主なフィールドは次の通り。

- `saveVersion`、`revision`、`started`
- `areaId`、`playerPosition`
- `inventoryItemIds`、`foundClueIds`、`inspectedHotspotIds`
- `returnedItemIds`、`viewedMemoryIds`、`pendingMemoryId`
- `hintTierByItem`、`wrongAttemptsByItem`、停滞時間と調査回数
- 導入・操作説明の閲覧状態、進行中／閲覧済み結末
- 音量、ミュート、文字速度、一括表示、演出軽減の設定

章、駅時計、天候、開放エリア、現在の目的、選択可能な結末はselectorが返却順と記憶状態から導出する。6つの忘れものは固定順で進み、現在対象以外の取得・返却や、未解放エリアへの状態遷移をreducerとsave validatorの両方で拒否する。誤返却では所持品を残し、誤返却回数、同じ場所の反復調査、進行のない操作、経過時間から段階ヒントを解放する。

## Phaser Sceneと描画更新

`ExplorationScene` は次の責務だけを持つ。

- `StationView.paintArea` による現在エリアの描画
- obstacleとプレイヤーのArcade衝突
- キーボード／タッチ移動、Shift早足、クリック移動
- hotspotの近接判定、クリック対象判定、出口判定
- カメラ追従、雨・水面の軽量更新
- 500ms間隔のプレイヤー位置同期

Sceneは `areaId`、進行stage、所持品数、発見済み手がかり数、`reducedMotion`、`started` のいずれかが変化した時にrestartする。これによりitem／clueのhotspot、乗客、出口、天候を現在stateから作り直す。shutdownではpointer listener、area visual、hotspot参照、player参照を破棄する。Scene内の表示オブジェクトはセーブ対象にしない。

雨粒は屋内／屋外と演出軽減設定に応じた固定数で生成する。E2Eの画面安定化時はSceneのvisual updateだけを停止し、状態遷移には触れない。

## 入力

`ActionInput` はキー、DOMボタン、ポインターを `move`、`dash`、`interact`、`confirm`、`cancel`、`open-note`、`open-inventory`、`pause` に変換する。キー割り当てはWASD／矢印、E／Enter／Space、Escape、N、I、左右Shiftである。タッチ方向パッドも同じheld stateを使うため、キーボードとゲームロジックを分岐させない。

クリックした地点はScene座標に変換して移動先とする。hotspot付近のクリックは、遠ければ対象の手前へ移動し、近ければ調査callbackを発火する。モーダルや会話の表示中は `ActionInput` をmodal stateにし、世界移動と近接調査を受け付けない。

## DOM UIとアクセシビリティ

`AppUi` はDOM APIと `textContent` で要素を構築し、任意HTMLを挿入しない。タイトル、HUD、会話、ノート、所持品、ポーズ、設定、記録、記憶、結末、クレジット、確認画面、タッチ操作をlayerとして管理する。

会話またはモーダルを開くと、背後のtitle screenへ `inert` を設定する。世界入力を止める必要がある時はCanvas、HUD、touch layerにも `inert` を設定し、表示中のUIへ初期focusを移す。Escapeは会話送り／閉じる／ポーズへ文脈別に変換する。CSSはfocus-visible、safe-area、横スクロール抑止、1280×720と390×844のレイアウトを持つ。

## セーブ境界

- localStorage key: `rain-shelter-station.save.v1`
- 現行schema: `saveVersion: 1`
- 既知のversion 0: 現行形へmigrationした後、version 1 validatorで再検証
- 保存前: state全体をvalidatorへ通し、不正stateのserializeを拒否
- 読み込み時: JSON、primitive型、stable ID、配列の重複、数値範囲、進行順、エリア解放、記憶／結末整合性を検証
- JSON破損、未知ID、不整合state、未来version、Storage API例外: 初期stateへfallback
- future／破損データからfallbackしただけでは保存をdirtyにせず、明示的な状態変更がない終了時に元データを上書きしない
- 削除: DOM確認画面を経てlocalStorage keyを削除し、page reloadで初期stateを生成

移動、調査、ヒント時間は900msのdebounceで保存し、取得、返却、記憶、エリア移動、設定変更、結末などの重要actionは即時保存する。閲覧済み結末と設定はrun reset後も明示的な状態遷移に従って扱う。

## コンテンツ

エリア、所有者、忘れもの、手がかり、会話、記憶、結末は `src/game/content/` のstable ID付きデータで定義する。Sceneには長文会話や返却順を埋め込まない。hotspotのavailability条件もデータとして持ち、Sceneは現在stateに対して表示可否を評価する。

外部画像・音声は読み込まないため、実行時asset pathは存在しない。描画は `StationView`、音は `AudioManager` のWeb Audio synthesisに集約する。

## 音

`AudioManager` は最初のユーザーgesture後に `AudioContext` をlazy生成し、雨noise、駅の低いhum、決定、取得、時計、記憶、結末の音を合成する。ambient/effect volumeとmuteを個別に適用する。自動再生拒否や音声デバイス不在は無音fallbackとして扱う。

同時効果音source数には上限を設ける。終了時はambient/effect sourceを停止し、Gain、Filter、Oscillator、BufferSourceを切断して `AudioContext` を閉じる。

## 開発機能と本番分離

通常のVite開発modeでは `src/game/debug/devPanel.ts` を動的importする。F2で開閉し、現在revision、stage、area、位置、対象item、所持品、手がかり、返却、pending memory、endingを表示する。開放済みエリアへのwarp、ヒント時間+90秒、run初期化だけを提供する。

`MODE === "e2e"` ではDEV panelの代わりに `src/game/debug/e2eBridge.ts` を動的importする。bridgeは `fresh-game`、`umbrella-return-ready`、`ending-a-ready`、`ending-b-ready` などのnamed scenarioだけを受け付け、任意partial state注入は提供しない。scenarioは通常action列から構築し、snapshot、idle待機、visual安定化をPlaywrightへ公開する。

本番buildではどちらも到達不能になる。`scripts/verify-production-build.mjs` は `dist/assets/*.js` を走査し、E2E用 `__RAIN_SHELTER_E2E__` とDEV panel用 `__RAIN_SHELTER_DEV_PANEL__` の両sentinelが残っていれば失敗する。`npm run check` はbuild後にこの検査を実行する。

## 検証境界

Vitestはreducerの順序制約、誤返却とヒント、3結末、content参照整合性、入力のheld state、saveのround-trip・migration・破損fallbackを検証する。Playwrightは通常キー入力だけの最初の返却ルート、セーブ復元、設定、データ削除、3結末、390×844タッチUIをChromiumで検証し、page errorと重大なconsole errorを失敗として扱う。

本番検証は `lint → typecheck → unit test → build → sentinel scan` の順で行う。ブラウザE2Eは専用e2e modeで別途実行し、本番bundleへbridgeを混入させない。
