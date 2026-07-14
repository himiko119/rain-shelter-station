# PLAYTEST REPORT — Visual Overhaul V2

## 判定

`codex/visual-overhaul-v2`のローカルrelease candidateは、タイトルから3種類のendingまでの既存進行を維持したまま、Phaser GraphicsとDOM/CSSによる完全オリジナルのprocedural artへ更新できている。

- `npm run check`: 成功
- Vitest: 7 files / 57 tests 成功
- Playwright: 6 files / 11 tests中11件成功
- visual comparison: before 15枚 / after 20枚
- desktop: 1280×720
- mobile: 390×844、touch context
- save schema: 変更なし、`saveVersion: 1`

進行不能、入力不能、未処理page error、重大なconsole error、同一originのHTTP errorは最終E2Eで検出されていない。GitHub Pagesへの今回branchの配信と、公開URLに対する本番スモークテストは未実施である。

## 確認環境

- 実施日: 2026-07-14（Asia/Tokyo）
- OS / shell: Windows / PowerShell
- branch: `codex/visual-overhaul-v2`
- Node.js: 24.16.0
- npm: 11.13.0
- Playwright: 1.61.1 / bundled Chromium
- Phaser: 3.90.0
- TypeScript: 6.0.3
- Vite: 8.1.4
- desktop viewport: 1280×720、device scale factor 1
- mobile viewport: 390×844、touch / mobile context

GitHub Actions run ID、Pages deployment ID、公開確認時刻はまだ存在しないため、本報告には記載しない。

## 今回のvisual変更

### World

- 5 areaを`StationView.ts`のPhaser Graphicsで再構成した。
- 待合室は木床、3つの雨窓、時計、bench、傘立て、写真機を持つ。
- 改札口はterrazzo床、案内窓口、券売機、公衆電話、5つの改札を持つ。
- 駅員室は台帳机、冷蔵庫、鏡、書類棚、椅子を持つ。
- 跨線橋は金属床、3つの雨窓、bench、手すり、階段を持つ。
- ホームは濡れたconcrete、駅名標、自販機、黄色線、線路、反射、stage 5／6の列車を持つ。
- ナギ、駅員、5人の乗客、鏡側ナギをprimitiveと固有accessoryで区別した。
- 6 itemは`ItemVisual.ts`の6つのshape rendererで個別に描く。
- window／platform rain、lamp glow、wet reflection、rippleを有限数のGraphicsで描く。

### DOM UI

- titleへ雨窓、lamp、bench、赤い傘のstation sceneを追加した。
- dialogueへ話者別のCSS portraitと返却時のglowを追加した。
- notebookへ紙、布背、tab、余白stampを追加した。
- inventoryとmemoryへ6 item ID別のCSS sketchを追加した。
- item取得、返却、clue、saveでtoast sealを変える。
- final choice、3 ending、ending recordsへ個別のstation tableauを追加した。
- touch buttonを44px以上にし、390px幅でobjective、camera、controlsを分離した。

runtimeのgame artworkに外部PNG／SVG、外部font、外部音声は使っていない。`public/favicon.svg`はgame sceneとは別のブラウザアイコンである。

## Functional play routes

### 通常入力の最初の返却

1. titleで「はじめから」を選ぶ。
2. 導入会話と操作説明を通常のEnter／button入力で進める。
3. 矢印キーで待合室を移動し、Eで赤い傘を取得する。
4. Iでinventory、Nでnotebookを開閉する。
5. 足跡を調べ、赤い長靴の子まで通常移動する。
6. 実UIの返却buttonで赤い傘を返す。
7. 返却後会話と3拍のmemoryを進める。
8. clockが00:18へ進むことを確認する。
9. reload後に「つづきから」を選び、返却済みitemとmemoryが復元されることを確認する。

このrouteはteleportや任意state注入を使わない。

### E2E補助route

- pause／settingsから音量、mute、text speed、一括表示、演出軽減を変更する。
- save削除の確認を経てreloadし、進行、設定、ending recordが初期化されることを確認する。
- named scenarioから実UIの最終選択へ接続し、A「終電」、B「始発」、C「雨宿り」を確認する。
- 390×844でtouch方向入力、notebook、inventory、interact、pauseを確認する。
- desktopとmobileのvisual stateを固定してscreenshotを取得する。

named scenarioはE2E modeに限定され、本番bundleから`verify:prod`で開発sentinelが除外されていることを確認する。

## Playwright 11 tests

| File | Count | Coverage |
| --- | ---: | --- |
| `endings.spec.ts` | 3 | A／B／Cをfinal choiceの実buttonから到達 |
| `gameplay.spec.ts` | 1 | 最初の忘れものを通常keyboard routeで返却し、saveを復元 |
| `menus-and-save.spec.ts` | 2 | pause、accessibility settings、save削除 |
| `mobile.spec.ts` | 1 | 390×844 bounds、touch移動、menu、camera外tap |
| `visual-overhaul.spec.ts` | 2 | overhaulのdesktop 13 state、mobile 2 state |
| `visual.spec.ts` | 2 | 従来の指定desktop 9画面、mobile 1画面 |
| 合計 | 11 | 11 / 11成功 |

`npm run check`にはPlaywrightを含めていないため、release判定では`npm run check`と`npm run test:e2e`の両方を別々に成功させている。

## Screenshot evidence

### Counts

| Set | Desktop | Mobile | Total | Purpose |
| --- | ---: | ---: | ---: | --- |
| `artifacts/visual-overhaul/before/` | 13 | 2 | 15 | 改修前baseline |
| `artifacts/visual-overhaul/after/` core | 13 | 2 | 15 | beforeと同一stateの比較 |
| `artifacts/visual-overhaul/after/` supplemental | 3 | 2 | 5 | settings、A／C、mobile inventory／dialogue |
| after total | 16 | 4 | 20 | 最終visual evidence |

### After desktop — 1280×720

| File | State | 目視結果 |
| --- | --- | --- |
| `01-title-1280x720.png` | title | logo、menu、雨窓、bench、傘の焦点が分離 |
| `02-waiting-room-1280x720.png` | 待合室 | 木床、時計、傘立て、人物、HUDを識別可能 |
| `03-ticket-gate-1280x720.png` | 改札口 | 窓口、券売機、改札、出口が識別可能 |
| `04-station-office-1280x720.png` | 駅員室 | 台帳、冷蔵庫、鏡、棚が識別可能 |
| `05-footbridge-1280x720.png` | 跨線橋 | 金属床、雨窓、手すり、階段が識別可能 |
| `06-rain-platform-1280x720.png` | 雨のホーム | yellow line、線路、反射、駅名標が識別可能 |
| `07-dialogue-1280x720.png` | dialogue | portrait、speaker、本文、送りUIが重ならない |
| `08-note-1280x720.png` | notebook | tab、stamp、本文のcontrastとscroll領域が明確 |
| `09-inventory-1280x720.png` | inventory | item sketch、名前、説明、state labelが明確 |
| `10-item-acquired-1280x720.png` | item取得 | acquisition dialogueとreward toastを確認 |
| `11-memory-1280x720.png` | memory | item写真、caption、本文、progressを確認 |
| `12-final-choice-1280x720.png` | 最終選択 | platform sceneとroute別buttonを確認 |
| `13-ending-b-1280x720.png` | B「始発」 | 夜明けpalette、本文、クレジット導線を確認 |
| `16-settings-1280x720.png` | settings | form control、focus、danger zoneを確認 |
| `17-ending-a-1280x720.png` | A「終電」 | 夜の列車と離脱のtableauを確認 |
| `18-ending-c-1280x720.png` | C「雨宿り」 | stationに残る灯りのtableauを確認 |

### After mobile — 390×844

| File | State | 目視結果 |
| --- | --- | --- |
| `14-mobile-exploration-390x844.png` | 探索 | camera、objective、touch controlsの上下分離を確認 |
| `15-mobile-note-390x844.png` | notebook | 横overflowなし、tabと本文scrollを確認 |
| `19-mobile-inventory-390x844.png` | inventory | 1 column、item visual、close buttonを確認 |
| `20-mobile-dialogue-390x844.png` | dialogue | portrait非表示時の本文幅と送り操作を確認 |

## 390×844 safe camera

portrait cameraはworldとtouch UIを同じfull-height viewportへ重ねない。

| Value | Final |
| --- | ---: |
| world coordinate | 1120×630 |
| zoom | 1.32 |
| safe inset top / right / bottom / left | 62 / 12 / 303.84 / 12 px |
| profile bottom request | 304 px |
| safe width / height | 366 / 478.16 px |
| camera viewport Y | 62 px |
| camera viewport bottom | 約540.16 px |
| safe visible world | 約277.273×362.242 world px |

bottom request 304pxは`min(304, 844 × 0.36)`により303.84pxとなる。`ExplorationScene`はportrait時にcamera viewportをY=62、高さ478.16へ切り、follow offsetを0にする。objective chipはcamera下端より下、touch controlsより上に置く。

E2Eは次を検証する。

- document／body widthが390px以下
- world、objective、controlsがviewport内
- objective bottomがcontrols top以下
- 全touch targetが44×44px以上
- screen Y=670のcamera外tapでplayer位置が変わらない
- direction buttonのpointerdown／pointerupでplayerが移動する

## Save compatibility

今回の変更はrenderer、camera、DOM/CSS、visual metadata、visual testに閉じている。`CURRENT_SAVE_VERSION`、storage key、serialized field、known ID validationは変更していない。

- schema: `saveVersion: 1`
- storage key: `rain-shelter-station.save.v1`
- version 0 migration: 継続
- visual設定: 既存`reducedMotion`を使用

既存saveのmigrationを要求するvisual-only fieldは追加していない。

## Final local build

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| HTML | 0.68 kB | 0.46 kB |
| JavaScript | 1,372.22 kB | 370.74 kB |
| JavaScript source map | 10,288.55 kB | — |
| CSS | 57.64 kB | 13.29 kB |

Viteの非失敗warningは、Phaserを含むJavaScript chunkが500 kBを超えるという1種類だけである。TypeScript、Vite build、production sentinel scanは成功している。

## Remaining release checks

- `codex/visual-overhaul-v2`をremoteへpushする。
- 現行Pages workflowのtrigger branchとの差を解消するか、manual dispatchする。
- GitHub Actionsのbuild／deploy成功とPages environment URLを確認する。
- 公開URLでdesktop 1280×720とmobile 390×844を再確認する。
- 公開assetの404、request failure、page error、console errorを再監視する。
- save、reload、favicon、Web Audio開始を公開originで確認する。
- 必要ならEdgeで短いsmoke、Firefox／WebKitで差分確認を行う。

公開確認が終わるまで、`artifacts/playtest/11-production-*`〜`13-production-*`は以前の公開版の参考画像であり、今回のvisual overhaulの本番証跡として扱わない。
