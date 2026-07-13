# TECHNICAL DESIGN

## スタック

- Phaser 3: 2D世界、カメラ、衝突、図形、軽量エフェクト
- TypeScript + Vite: 静的サイトとしての開発・ビルド
- DOM + CSS: 会話、ノート、所持品、ポーズ、設定、記録、タッチ操作
- Vitest: 純粋な進行ロジックとセーブ検証
- Playwright: ブラウザ操作、Canvas込みスクリーンショット、console監視
- ESLint: TypeScriptの静的検査

React、バックエンド、外部API、認証、課金、広告、解析は使用しない。

## 責務分割

```text
src/
  game/
    core/        # GameState、純粋なaction/reducer、導出selector
    content/     # エリア、対象、忘れもの、会話、記憶、結末
    input/       # 物理入力からInputActionへの変換
    save/        # version、検証、移行、localStorage adapter
    systems/     # ヒント、衝突用world query、audio
    assets/      # manifestと安定キー
    debug/       # e2e mode限定のnamed scenario bridge
  phaser/
    scenes/      # BootScene、ExplorationScene
    view/        # マップ、人物、雨、照明、カメラ
    adapters/    # state/storeとsceneの接続
  ui/            # DOM shell、dialog、notebook、menus、touch controls
  styles/        # themeとresponsive layout
```

`GameState` が唯一の進行ソースであり、Sprite、Scene、Camera、Tween、DOMを含めない。Phaserは状態スナップショットを描画し、入力アクションをstoreへ渡す。UIも同じstoreを購読する。

## 状態

主な永続フィールド:

- `saveVersion`、`revision`
- `areaId`、`playerPosition`
- `inventoryItemIds`、`foundClueIds`、`returnedItemIds`
- `viewedMemoryIds`、`pendingMemoryId`
- `hintTierByItem`、誤返却・停滞カウンター
- `settings`、`viewedEndingIds`

現在章、時計、開放エリア、天候、選択肢は返却済みIDからselectorで導出する。冗長なフラグを真実源にせず、破損しにくくする。

状態更新は `dispatch(GameAction)` だけで行う。主なactionは移動、エリア移動、調査、アイテム取得、手がかり取得、返却試行、会話／記憶完了、ヒント進行、結末選択、設定変更、初期化である。

## Scene

- `BootScene`: プログラムテクスチャ作成、初期化
- `ExplorationScene`: 現在エリアの部屋を描画、Arcade衝突、カメラ、雨・照明、interaction hotspot

部屋遷移時に表示オブジェクト、Collider、Tween、Timer、イベント購読を破棄する。状態はScene再作成から独立する。

## 入力

`InputAction` は `move`、`interact`、`confirm`、`cancel`、`open-note`、`pause`、`dash`。Keyboard adapterはWASD／矢印、E／Enter／Space、Escape、N、Shiftを割り当てる。PointerとTouch adapterも同じactionを発火する。モーダル表示中は移動入力を止め、DOM側のフォーカスへ制御を渡す。

## DOM UI

UIはtext nodeと安全なDOM APIで生成し、不要な `innerHTML` を使わない。モーダルはフォーカストラップ、Escape、初期フォーカス、戻りフォーカスを持つ。通常時は目的チップ、時計、調査プロンプトだけを表示し、中央と下中央のプレイ空間を保護する。

390px級ではCanvasを16:9のまま収め、下部へ方向パッドとアクションボタンを置く。横スクロールを禁止し、safe-areaを考慮する。

## セーブ

- キー: `rain-shelter-station.save.v1`
- 閲覧済み結末と設定も同じ検証済みdocumentに保存
- 取得・返却・記憶完了・エリア移動・設定変更・結末で自動保存
- 読み込みはJSON、型、配列ID、数値範囲、versionを検証
- 破損JSONと未来versionは初期状態へ安全に戻す
- 既知の旧versionはmigration後に現行validatorを通す
- 削除はDOM確認画面を経由する

## コンテンツとアセット

全会話と調査文は安定ID付きデータに置く。`LostItemDef` は出現条件、場所、所有者、手がかり、誤返却、ヒント、記憶、返却段階を持つ。図形中心のため必須外部画像はなく、manifestはプログラムテクスチャ、音、将来の静的SVGを同一キーで扱う。

## 音

Web Audioは初回ユーザー操作後にlazy初期化する。Audio managerは雨のloop、決定、取得、時計、記憶、結末を合成し、ambient/effect volumeとmuteを適用する。破棄時にOscillator、BufferSource、Gain、Timerを停止する。自動再生拒否は正常系として静かに処理する。

## 開発・E2E分離

通常開発では状態を表示・操作できるdebug panelを `import.meta.env.DEV` のみで提供する。E2E bridgeは `DEV && MODE === "e2e"` の動的importだけで読み込み、任意partial stateではなく `umbrella-return-ready`、`ending-a-ready`、`ending-b-ready` 等のnamed scenarioだけを受け付ける。シナリオは通常action列で構築しvalidatorを通す。本番bundleにsentinelが残らないことを検査する。

## パフォーマンス・安全

- 雨粒を固定上限にし、狭い画面／演出軽減で減らす
- 状態通知はrevision単位、部屋再描画はarea／stage変更時に限定
- 文字列はtextContent相当で挿入
- localStorageを信頼しない
- APIキーを作らない
- エラー境界で破損セーブをクラッシュへ波及させない
