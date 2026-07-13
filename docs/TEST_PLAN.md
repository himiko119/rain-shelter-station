# TEST PLAN

## 方針

進行ロジックは純粋なTypeScriptとしてVitestで高速・決定論的に検証し、Phaser Canvas、DOM、入力、保存統合、レスポンシブ表示はPlaywrightで検証する。固定sleepを避け、状態revision、DOM可視性、Phaser render完了を待つ。

## npm scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run check`: lint → typecheck → unit → build → 本番bridge検査

## 単体テスト

- 初期状態と導出された章・時計・エリア
- 各アイテム／手がかりの取得と重複操作の冪等性
- 全6件の正しい返却
- 誤返却で所持品を失わず、試行とヒントだけが進むこと
- 返却数によるエリア開放、時計、天候、写真機、切符
- 時間、非進行回数、同一対象、誤返却による段階ヒント
- A/B/Cの表示条件、到達条件、境界条件
- 6件すべてに手がかりが2つ以上あること
- 全出現地点が直前段階で到達可能なこと
- セーブ保存・復元、設定・結末記録
- 不正JSON、型不正、未知ID、future version、旧version migration
- 初期化とセーブ削除

テストはNode environmentを基本とし、storage adapterにはin-memory実装を注入する。

## E2E

共通fixtureで `pageerror`、console error、同一originの4xx/5xx、必須JS/CSS失敗を収集し、1件でもあれば失敗させる。Chromium、1280x720、workers 1を基本にする。

### 通常入力ルート

1. タイトルから「はじめから」
2. 矢印キーで傘立てへ移動
3. Eで赤い傘を取得
4. 足跡と星印を移動・調査
5. Nでノートを開閉
6. 赤い長靴の子へ通常移動し、返却UIを操作
7. 記憶、時計進行、自動保存
8. reload後に「つづきから」で返却済みを確認

このルートではteleportや状態注入を使わない。

### そのほか

- タイトル、開始、移動、調査、取得、ノート
- ポーズ、設定保存、ミュート、文字速度、演出軽減
- 誤返却からの復旧
- named scenarioから最後の画面操作を行うA/B/C
- セーブ削除確認と新規開始
- 390x844のtouch表示、横スクロールなし、主要要素viewport内

E2E bridgeはe2e mode限定で、任意stateの注入を許さず、通常actionで組み立てるnamed scenarioだけを提供する。

## スクリーンショット

`artifacts/playtest` へ保存し、Canvasを含む画像を目視する。

1. `01-title-1280x720.png`
2. `02-waiting-room-1280x720.png`
3. `03-dialogue-1280x720.png`
4. `04-note-1280x720.png`
5. `05-item-return-1280x720.png`
6. `06-memory-1280x720.png`
7. `07-rain-platform-1280x720.png`
8. `08-final-choice-1280x720.png`
9. `09-ending-b-1280x720.png`
10. `10-mobile-exploration-390x844.png`

確認点: UI重なり、文字切れ、はみ出し、暗さ、対象物の判別、会話の遮蔽、タッチボタン、空白、debug残存。

## 実プレイ

- 起動直後の次行動が分かる
- 移動、調査、会話送りに明確な反応がある
- ノートだけで次の目的と照合軸を推測できる
- 誤答を責めず、次の観察へ戻れる
- 停滞時のヒントが機能する
- 保存後に安心して終了・再開できる
- 結末条件が物語と一致する
- クレジット後にタイトルへ戻り、再プレイできる

所見、修正、再テスト結果、環境制限は `docs/PLAYTEST_REPORT.md` へ記録する。
