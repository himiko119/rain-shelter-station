# VISUAL PLAYTEST REPORT — 全面ビジュアル改修

記録日: 2026-07-14  
対象: 「雨宿り駅の忘れもの」全面ビジュアル改修  
比較解像度: desktop 1280×720 / mobile 390×844  
比較元: 公開済み基準コミット `21a9ae9` から採取した `before` 15枚  
比較先: 記録時点の作業ツリーから採取した `after` 20枚

## 結論

全面改修は、ローカルの実ブラウザ画面確認と自動検証の範囲では出荷可能な品質に達した。35枚のPNGを実ファイルとして確認し、その全数を目視した。afterではタイトル、5エリア、会話、ノート、所持品、入手、記憶、最終選択、設定、3エンディングが同じ駅の物語としてつながり、PCと390px級タッチ画面の双方で主要情報と操作が画面内に収まっている。

ただし、**今回の全面改修をデプロイした公開URLでの検証は未完了**である。既存の公開版があることと、今回のafter版が公開済みであることは同義ではない。本書の判定はローカル成果物とローカルテストに対するものであり、公開完了を示すものではない。

内部品質スコアは **92 / 100** とする。これはユーザー調査や端末横断ベンチマークではなく、以下のローカルQA証拠に基づく内部出荷判定である。

| 評価軸 | 得点 | 根拠 |
| --- | ---: | --- |
| 最初から最後までの遊べる状態 | 25 / 25 | Vitest 57件、Playwright 11/11、3エンディング到達を含む |
| 視覚的な場所性と物語の一貫性 | 24 / 25 | before/after 35枚を目視。5エリア、アイテム、3エンディングを識別可能 |
| レスポンシブ・操作・アクセシビリティ | 19 / 20 | 1280×720、390×844、44px以上のタッチ対象、会話ARIAを確認 |
| セーブと技術的信頼性 | 19 / 20 | saveVersion 1を維持し、往復・v0移行・破損・未知ID・未来版拒否をテスト |
| 公開準備の証拠 | 5 / 10 | `npm run check` は成功。今回版の公開URL検証は未完了、JSは単一大chunk |
| **合計** | **92 / 100** | 公開検証完了までは最終リリース判定を保留 |

## 証拠の取り方

- `tests/e2e/visual-overhaul.spec.ts` は実ブラウザで各シナリオを開き、viewportが指定値と一致すること、対象UIと状態が存在すること、PNGが10,000 byteを超えることを確認してから撮影する。
- `before` は13枚のdesktopと2枚のmobile、`after` は16枚のdesktopと4枚のmobileで構成される。
- 設定と3エンディングの追加desktop画面、所持品と会話の追加mobile画面はafterだけにあるため、総数は15対20である。
- スクリーンショットはゲーム自身から生成した検証記録であり、runtime assetではない。
- afterは記録時点の作業ツリーを表す。単一の既存コミットだけを指すものではなく、最終のsafe area等の修正を含む。

## 実在確認済みファイル一覧

以下の35ファイルはすべて記録時点で存在した。ファイル名の解像度表記とE2Eのviewport指定も一致する。

### before — 15 / 15

Desktop 1280×720:

1. `artifacts/visual-overhaul/before/desktop/01-title-1280x720.png`
2. `artifacts/visual-overhaul/before/desktop/02-waiting-room-1280x720.png`
3. `artifacts/visual-overhaul/before/desktop/03-ticket-gate-1280x720.png`
4. `artifacts/visual-overhaul/before/desktop/04-station-office-1280x720.png`
5. `artifacts/visual-overhaul/before/desktop/05-footbridge-1280x720.png`
6. `artifacts/visual-overhaul/before/desktop/06-rain-platform-1280x720.png`
7. `artifacts/visual-overhaul/before/desktop/07-dialogue-1280x720.png`
8. `artifacts/visual-overhaul/before/desktop/08-note-1280x720.png`
9. `artifacts/visual-overhaul/before/desktop/09-inventory-1280x720.png`
10. `artifacts/visual-overhaul/before/desktop/10-item-acquired-1280x720.png`
11. `artifacts/visual-overhaul/before/desktop/11-memory-1280x720.png`
12. `artifacts/visual-overhaul/before/desktop/12-final-choice-1280x720.png`
13. `artifacts/visual-overhaul/before/desktop/13-ending-b-1280x720.png`

Mobile 390×844:

14. `artifacts/visual-overhaul/before/mobile/14-mobile-exploration-390x844.png`
15. `artifacts/visual-overhaul/before/mobile/15-mobile-note-390x844.png`

### after — 20 / 20

Desktop 1280×720:

1. `artifacts/visual-overhaul/after/desktop/01-title-1280x720.png`
2. `artifacts/visual-overhaul/after/desktop/02-waiting-room-1280x720.png`
3. `artifacts/visual-overhaul/after/desktop/03-ticket-gate-1280x720.png`
4. `artifacts/visual-overhaul/after/desktop/04-station-office-1280x720.png`
5. `artifacts/visual-overhaul/after/desktop/05-footbridge-1280x720.png`
6. `artifacts/visual-overhaul/after/desktop/06-rain-platform-1280x720.png`
7. `artifacts/visual-overhaul/after/desktop/07-dialogue-1280x720.png`
8. `artifacts/visual-overhaul/after/desktop/08-note-1280x720.png`
9. `artifacts/visual-overhaul/after/desktop/09-inventory-1280x720.png`
10. `artifacts/visual-overhaul/after/desktop/10-item-acquired-1280x720.png`
11. `artifacts/visual-overhaul/after/desktop/11-memory-1280x720.png`
12. `artifacts/visual-overhaul/after/desktop/12-final-choice-1280x720.png`
13. `artifacts/visual-overhaul/after/desktop/13-ending-b-1280x720.png`
14. `artifacts/visual-overhaul/after/desktop/16-settings-1280x720.png`
15. `artifacts/visual-overhaul/after/desktop/17-ending-a-1280x720.png`
16. `artifacts/visual-overhaul/after/desktop/18-ending-c-1280x720.png`

Mobile 390×844:

17. `artifacts/visual-overhaul/after/mobile/14-mobile-exploration-390x844.png`
18. `artifacts/visual-overhaul/after/mobile/15-mobile-note-390x844.png`
19. `artifacts/visual-overhaul/after/mobile/19-mobile-inventory-390x844.png`
20. `artifacts/visual-overhaul/after/mobile/20-mobile-dialogue-390x844.png`

## 代表画面の目視評価

| 画面 | before | afterの評価 |
| --- | --- | --- |
| タイトル | 青緑の均一な面と模式的な駅の印象が強い | 雨の窓、木の床、ベンチ、人物、赤い傘が物語の焦点を作る。暗い外周と暖色のメニューで主従も明確 |
| 待合室 | 矩形、グリッド、記号的な人物・アイテムが中心 | 木床、3枚の雨窓、時計、照明、水たまり、足跡、傘立てで「古い駅の待合室」と読める |
| 改札口 | 床と設備が同じ青緑の抽象面に見えやすい | 灰色の改札機、通路、設備の輪郭が分離し、待合室と異なる場所として判別できる |
| 駅員室 | 家具が単純な矩形に留まる | 棚、机、冷蔵庫、鏡、備品が接地し、狭い業務空間として識別できる |
| 跨線橋 | 均等な背景グリッドが中心 | 大きな窓、金属の手すり、階段、雨景色を軸に、上下移動を感じる空間になった |
| 雨のホーム | 線路・設備の具体性が弱い | 線路、駅名標、自販機、雨、照明が別レイヤーで見え、終盤の舞台として視線を集める |
| 会話 | 本文は読めるが人物と背景が記号的 | 背景を残した下部パネル、話者別portrait、話者名、本文、送り案内の階層が明確。人物も隠れ切らない |
| ノート | 読めるが汎用的な平面パネル | 布背、紙面、罫線、チェック、照合印、tabで「調査ノート」としての意味が視覚化された |
| 所持品・入手 | 星等の汎用記号と取得物の対応が弱い | 赤い傘などの実形状がworld、入手表示、所持品、記憶で対応する。状態の意味を絵から追える |
| 記憶 | 抽象的な中央図形が中心 | 赤い傘の写真を大きく置く二列構成となり、回想本文との対応が一目で分かる |
| 最後の選択 | 文字選択の比重が大きい | 列車・ホームのプレビューと2枚のroute cardが加わり、選択後の方向性を想像しやすい |
| エンディング | Bだけを基準記録 | Aは青い終電、Bは朝焼け、Cは黒い雨夜という色調と場面差を確認。Cの暗さと余白は結末の意図に沿う |
| 設定 | before比較なし | 音量、ミュート、文字速度、一括表示、演出軽減、データ削除が一画面に収まり、危険操作は赤枠で分離 |

### PC 1280×720

- 16枚のafter desktopを目視し、タイトル、5エリア、主要overlay、最終選択、設定、3エンディングで文字切れ、横スクロール、重要UIの重なりは見当たらなかった。
- HUDは画面端に残り、ゲーム世界の中央にある人物・アイテム・移動経路を妨げない。
- 会話、ノート、所持品、記憶、最終選択は、それぞれpanelの素材と形が異なりながら、夜色、雨色、灯色、紙色を共有している。

### Mobile 390×844

- 探索画面は上からworld、目的、操作群の順に分かれた。afterのworld下端は約540pxで、目的chipとタッチ操作用の暗いsafe bandを確保している。
- `.touch-controls button` はE2Eで幅・高さとも44px以上を検査する。方向は48px、主操作は76px、補助操作は44pxである。
- ノートはtab直下から本文が始まり、修正前に見つかった大きな空白はない。2件の本文と閉じる操作を確認した。
- 所持品は一列cardとして収まり、会話はworldの人物を残しつつ下部panelに本文を置く。4枚とも横切れ、横スクロール、読めない文字欠けは見当たらなかった。
- 会話の送り案内は表示されるが、390px画面では相対的に小さい。操作不能ではないため非重大の視覚改善余地とした。

## 目視・実ブラウザ確認で発見し、修正した問題

| 問題 | 発見根拠 | 修正 | 回帰確認 |
| --- | --- | --- | --- |
| mobile safe areaがworldと目的・操作を十分に分離しない | portrait zoom 1.32に対し全画面camera viewportのままだと可視world高がworld boundsを上回り、followのY調整が効きにくかった | `CameraLayout.ts` のportrait bottom insetを304px、viewport高の36%上限とし、390×844では303.84pxに解決。`ExplorationScene.applyCameraLayout()` がportraitだけcamera viewportをY=62、高さ478.16へ切る | unitでsafe areaとzoomを固定。after mobile探索でworld下端約540px、目的と操作を下側に分離 |
| camera外側タップでclick-to-moveが発火する | cropped viewport導入後もsafe bandのpointerが`positionToCamera()`へ渡っていた | `handlePointerDown()` 冒頭でpointer座標がcameraのx/y/width/height外ならreturn | mobile E2Eで `(195, 670)` をタップし、350ms後も`playerPosition`が不変であることを検査 |
| mobileノートのtabと本文の間に大きな空白が出る | 修正前の390×844 screenshotで空白を目視 | mobileの`.notebook`を`auto minmax(0, 1fr)`、`align-content: start`とし、tabsを上揃え、pagesの`min-height`を0にした | `after/mobile/15-mobile-note-390x844.png`でtab直下から本文が続くことを再確認 |
| item描画拡大後、見た目に近づいてもinteractionが成立しにくい | procedural itemとmarkerの視認範囲に対し、共通距離88pxがやや狭かった | `INTERACTION_DISTANCE`を88から96へ変更。hotspot固有radiusとの`Math.max`は維持 | 通常入力の最初の忘れもの返却E2E、全11 E2Eが成功。stable ID、position、radius、collisionは変更していない |
| camera fadeが安定撮影やscene再表示へ残る | `fadeIn`中にfreeze/captureすると暗いframeを得る可能性があった | `setVisualsFrozen(true)`で`camera.resetFX()`し、明示的な`resetCameraFx()`も追加。通常のreduced motion時は従来通りfade自体を行わない | after再撮影と全E2E成功。安定化後のPNGを目視 |
| 会話dialogの名前とtypewriter状態が支援技術へ十分伝わらない | dialog自体の安定したaccessible name、更新本文のbusy状態が不足 | 話者headingへ固定IDを付けdialogを`aria-labelledby`で参照。本文へ`aria-live="polite"`、`aria-atomic="true"`、typewriter中の`aria-busy="true"`と完了時`false`を追加 | 実ブラウザでdialog名が話者名になり、typewriter開始から完了までbusyが遷移することを確認 |
| camera deadzoneの単位がzoom後に過大になる | layoutはscreen-pixelsを返すがPhaser cameraはworld単位として受け取る | `setDeadzone()`へ渡す幅・高さをzoomで除算 | camera layout unit testとdesktop/mobile E2Eが成功 |
| 補助タッチ対象が44px未満 | before監査で38pxの補助buttonを確認 | mobile CSSで補助操作を44×44px以上にした | mobile E2Eが全タッチ対象の幅・高さを44px以上と検査 |

## セーブ互換性

今回の全面改修は描画、カメラ、DOM UI、演出を対象とし、シリアライズされる`GameState`の形、stable ID、storage keyを変更していない。

- 現行は `CURRENT_SAVE_VERSION = 1`、storage keyは `rain-shelter-station.save.v1` のままである。
- `serializeSave()` → `parseSave()` の進行済みstate完全往復をunit testで検査している。
- version 0の旧aliasをversion 1へ移すmigrationを維持し、未知IDを含む旧データは拒否する。
- 壊れたJSON、未知のitem/area ID、未来のversion 2は安全に`null`扱いとなり、storage adapterはfallbackを返せる。
- E2Eでは通常キーボード入力で最初の忘れものを返した後のセーブ復元と、UIからのデータ削除を検査している。

したがってコード上・自動テスト上の後方互換性は維持されている。ただし、今回版を公開した実URL上で既存利用者のlocalStorageを引き継ぐ確認はまだ行っていないため、公開互換の最終確認は未完了である。

## テスト結果

記録時点の全面改修作業で得た最終結果を以下に示す。公開サイトを対象にした結果ではなく、ローカルworkspaceでの結果である。

| 検証 | 結果 | 対象 |
| --- | --- | --- |
| `npm run test` | **成功 — Vitest 57件** | state遷移、save、content、camera layout、visual manifest等 |
| `npm run test:e2e` | **成功 — Playwright 11/11、約5.5分** | 通常返却と復元、設定・削除、mobile、3 ending、代表画面capture |
| mobile修正後の対象再実行 | **成功 — 2/2** | safe area、外側タップ、ノートを含むmobile/visual対象 |
| `npm run check` | **成功** | lint → typecheck → Vitest → build → production sentinel scan |
| `npm run build` | **成功、警告あり** | Vite production build。Phaserを含む単一JS chunkが500KiB警告閾値超過 |

`npm run check` は `package.json` 上で `lint`、`typecheck`、`test`、`build`、`verify:prod` を直列実行する。Playwrightは別コマンドなので、11/11の結果を別行に記録した。

## bundle計測

最終`npm run build`のVite出力と`dist`実ファイルを照合した。gzip値はViteのローカルbuild表示であり、公開サーバーの転送設定を実測した値ではない。

| ファイル | raw | Vite gzip表示 | 備考 |
| --- | ---: | ---: | --- |
| `dist/assets/index-BWiU_mYA.js` | 1,372.22 kB | 370.74 kB | Phaserを含むruntime単一chunk |
| `dist/assets/index-DTG5hzJE.css` | 57.64 kB | 13.29 kB | DOM artworkとresponsive UIを含む |
| `dist/assets/index-BWiU_mYA.js.map` | 10,288.55 kB | — | source map。通常のruntime実行payloadではない |
| `dist/index.html` | 0.68 kB | 0.46 kB | production entry HTML |
| `dist`全体 | 11,719.88 kB | — | source map、HTML、faviconを含む実ファイル合計 |

buildは成功しているが、JS raw 1,372.22kBはViteの500KiB chunk警告を発生させる。現状はPhaserを同じentry chunkへ含める構成であり、機能不全ではない。初回ロード最適化を次フェーズで行う場合は、Phaserとアプリコードのchunk分離、source mapの配布方針、実配信時の圧縮・cacheを公開環境で測る。

## assetと権利上の制約

- runtimeの画面はPhaser GraphicsとDOM/CSSによるoriginal procedural artworkで構成する。外部画像、icon pack、texture、web fontへのruntime依存はない。
- `VISUAL_MANIFEST`の28 entryはすべて `procedural: true`、`externalRights: false`、license ID `original-procedural` である。
- `public/favicon.svg`だけがproject-localの静的SVGで、外部権利物ではない。
- `artifacts/playtest/`と`artifacts/visual-overhaul/`のPNGは検証成果物であり、ゲームから読み込まない。
- 外部画像を使わない制約のため、写真素材や高精細textureではなく、形、色、照明、前後レイヤーで場所性を作っている。これは今回の意図した表現上の制約である。

## 未完了事項と公開時の受け入れ条件

今回の全面改修について、デプロイ、公開URLの200応答、公開asset path、公開localStorage継承、公開端末での音、PC/mobileの再撮影はまだ検証していない。したがって公開ステータスは **未完了** である。

公開完了と判断するには、少なくとも次を行う。

1. 現在の全面改修を含むcommitを公開環境へdeployする。
2. 公開URLでタイトルから最初の返却まで通常入力で操作する。
3. 1280×720と390×844で公開版のタイトル、探索、ノート、会話、所持品を目視する。
4. 公開前版のversion 1 saveを残したbrowserで復元し、未知・破損dataのfallbackも再確認する。
5. 公開Network/consoleに404、未処理例外、重大errorがないことを確認する。
6. 公開配信のJS/CSS圧縮、cache、source map公開方針を実測して記録する。

この公開検証が完了するまでは、「ローカル全面改修完了・公開検証待ち」が正確な最終状態である。
