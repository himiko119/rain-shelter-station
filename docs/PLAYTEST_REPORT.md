# PLAYTEST REPORT — 雨宿り駅の忘れもの

## 最終判定

タイトルから最初の返却、記憶、再読込までを通常入力で通し、残る長い進行はE2E専用のnamed scenarioから実UI操作へ接続してA／B／Cの3結末まで確認した。進行不能、セーブ再生成、入力不能、ページ例外、重大なconsole error、HTTPエラーは最終実行で発生していない。指定10画面を実画像で確認し、修正後に再撮影した。

## 確認環境

- 実施日: 2026-07-14（Asia/Tokyo）
- OS / shell: Windows / PowerShell
- Node.js: 24.16.0
- npm: 11.13.0
- Playwright: 1.61.1 / bundled Chromium
- デスクトップviewport: 1280 × 720、device scale factor 1
- モバイルviewport: 390 × 844、touch / mobile context
- ゲームruntime: Phaser 3.90.0、TypeScript 6.0.3、Vite 8.1.4

## 確認ルート

### 通常入力ルート

1. タイトルで「はじめから」を選択
2. 導入会話をEnterで送り、操作説明を閉じる
3. 矢印キーで待合室を移動し、Eで赤い傘を取得
4. Iで所持品、Nでノートを開閉
5. 足跡を調べ、赤い長靴の子まで通常移動
6. 会話を進め、返却ボタン内の文字を直接クリックして赤い傘を返却
7. 返却後会話をEnterで送り、3拍の記憶を閲覧
8. 時計が00:18へ進むことを確認
9. reload後に「つづきから」を選び、返却済みアイテムと閲覧済み記憶を確認

### 補助ルート

- ポーズから設定を開き、音量、ミュート、文字速度、一括表示、演出軽減を変更
- セーブ削除の確認画面を経てreloadし、進行・設定・結末記録が初期化されることを確認
- `ending-a-ready`、`ending-b-ready` から最終選択を実UIで操作し、A「終電」、B「始発」、C「雨宿り」を確認
- 390 × 844で方向パッドを押し続けて移動し、ノート、所持品、調べる、ポーズを確認
- 全テストでpage error、console error、request failure、同一originのHTTP 4xx/5xxを監視

長い全6品ルートは、仕様で許可されたE2E mode限定のnamed scenarioを通常action列から構築して短縮した。最初の1品はteleportや状態注入を使わず、プレイヤーと同じ入力だけで確認している。

## 撮影画面と目視結果

| ファイル | 寸法 | 確認内容 | 結果 |
| --- | ---: | --- | --- |
| `01-title-1280x720.png` | 1280 × 720 | タイトル、コピー、4メニュー、背景の駅 | 文字切れ・不要HUDなし |
| `02-waiting-room-1280x720.png` | 1280 × 720 | ナギ、傘立て、乗客、雨、HUD、目的 | 対象と進行表示を判別可能 |
| `03-dialogue-1280x720.png` | 1280 × 720 | 立ち絵、話者、本文、送り表示 | 本文と重要対象の重なりなし |
| `04-note-1280x720.png` | 1280 × 720 | 手がかりtab、2つの照合情報 | 文字切れ・横はみ出しなし |
| `05-item-return-1280x720.png` | 1280 × 720 | 正返却後の会話 | 話者・返却内容が明確 |
| `06-memory-1280x720.png` | 1280 × 720 | 記憶タイトル、本文、進行dot | コントラストとfocus表示良好 |
| `07-rain-platform-1280x720.png` | 1280 × 720 | 雨、線路、水たまり、髪留め | 暗すぎず対象を判別可能 |
| `08-final-choice-1280x720.png` | 1280 × 720 | 始発／残留の選択、列車 | 選択条件が読め、列車は線路上に表示 |
| `09-ending-b-1280x720.png` | 1280 × 720 | B「始発」の全文とクレジット導線 | 長文の切れ・はみ出しなし |
| `10-mobile-exploration-390x844.png` | 390 × 844 | letterbox、HUD、目的、方向／行動ボタン | 横スクロール・ボタン重なりなし |

画像はすべて `artifacts/playtest/` に保存した。Playwright側でもviewport幅とdocument scroll幅を比較し、モバイルの横方向はみ出しがないことを検証した。デバッグパネルやE2E sentinelは画像に残っていない。

## 発見した問題と修正

| 重要度 | 発見内容 | 修正 |
| --- | --- | --- |
| 高 | 鍵付き出口で押し戻し位置が出口内となり、会話が再発して離脱できない | 出口境界から室内側へ安全距離を取って移動し、位置を即時同期 |
| 高 | 会話中にHUDをクリックすると返却後callbackを失い、pending memoryが残る | HUD handler guard、背景の`inert`、会話layerのpointer captureを追加 |
| 高 | 返却ボタン内の`span`クリックが旧会話へbubbleし、新会話のEnter送りを壊す | `closest("button")` でボタン子要素も会話送りから除外し、E2E回帰ケースを追加 |
| 高 | エリア遷移フレームで旧Scene位置が新エリアspawnを上書きする | 出口処理フレームでは周期位置同期を行わない |
| 高 | セーブ削除後の`beforeunload`が削除前stateを再保存する | 永続化抑止flagとpending timer解除を追加 |
| 中 | future versionを拒否した直後の終了で初期stateを上書きする | state変更後だけ保存するdirty flagを追加 |
| 中 | 同じstage・areaから「はじめから」を選ぶと旧hotspotが残る | `start-new-game`時はSceneをちょうど1回、強制再構築 |
| 中 | 未来段階の手がかりで進行toastと停滞resetが誤発火する | 現在対象itemだけを進行扱いにし、dispatch後のstateを確認してtoast |
| 中 | item／clue取得後にmarkerが残り、Scene restartで位置が後方へ跳ぶ | 取得前にlive位置を同期し、所持品／手がかり変更時にSceneを再構築 |
| 中 | 駅員や乗客が不自然な初回／返却後台詞を繰り返す | 初回、再訪、ヒント、返却後を人物種別ごとに分岐 |
| 低 | 列車がホーム床上に見え、歩行領域と一致しない | 車体を衝突済みの線路領域へ移し、ホーム側から選択できる構図へ変更 |
| 低 | タイトルや会話の背後に目的chipが残り、立ち絵と重なる | 世界入力を止めるlayer表示中は目的chipも隠し、再撮影 |
| 低 | ノート撮影が目的1件だけで余白が大きい | 2つの手がかりを表示したtabへ撮影状態を変更 |

そのほか、エリア内の装飾と衝突座標、タッチ用ノート／所持品、雨上がり、時計針、駅灯の微弱な明滅、演出軽減時のCSS／Phaser motionを整合させた。

## 最終テスト結果

- `npm run check`: 成功
  - ESLint: 成功
  - TypeScript: 成功
  - Vitest: 5 files / 33 tests 成功
  - Vite production build: 成功
  - E2E／DEV sentinel production scan: 成功
- `npm run test:e2e -- --reporter=line`: 9 tests 成功（約1分40秒）
  - 通常プレイ、設定、削除、A／B／C、モバイル、デスクトップ9画面、モバイル1画面
- 最終目視: 指定10画像を確認し、重なり修正後に撮影テスト2件を再実行

## 残る制約

- 実ブラウザ自動確認はChromium中心で、FirefoxとWebKitは同じ深さでは確認していない。
- Web Audioは自動再生制限に従い、最初のユーザー操作後に開始する。音声デバイスが使えなくても進行は継続する。
- Phaserを含む単一JavaScript bundleはViteの500 kB chunk警告対象だが、buildと実行は成功している。
- 390 × 844では16:9 Canvasを崩さず、上下のletterbox領域をHUD、目的、タッチ操作に使う。

未解決の進行不能、未完成UI、重大なconsole errorは確認されていない。
