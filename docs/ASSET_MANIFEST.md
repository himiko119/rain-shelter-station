# ASSET MANIFEST — Visual Overhaul

## Scope

この文書は、visual overhaulで使う描画資産のstable key、実体、用途、表示寸法、collisionとの境界、権利区分、未使用時の扱いを定義する。ゲーム進行はasset pathを参照せず、描画側だけがmanifest keyを解決する。

現状のruntime asset fileは `public/favicon.svg` だけである。駅、人物、雨は `StationView.ts` のPhaser Graphics、忘れものはcontentの色とglyph、UIは `main.css` の色・gradient・borderで描いている。外部画像、外部音声、web fontは読み込んでいない。`artifacts/playtest/` のPNGは検証記録であり、runtime assetではない。

`AreaDefinition.decorations` には配置用のstable IDがあるが、現状の `StationView` はこの配列を消費せず、同じ設備をhard-coded座標で描いている。改修後はdecorationsを配置sourceとして接続し、rendererと二重管理になる定義を残さない。

## Statusと権利区分

| 表記 | 意味 |
| --- | --- |
| 継続 | 現在の実体または手法をそのまま使用する |
| 改修 | 現在の役割とkeyを保ち、見た目または実装形式を置き換える |
| 新規 | 現在対応する実体がなく、visual overhaulで追加する |
| 記録 | 検証用artifact。runtimeからは参照しない |

| License | 意味 |
| --- | --- |
| `P` | このproject用にcode、SVG、PNGとして制作するoriginal asset。第三者素材を含めない |
| `S` | OS / browserのsystem font。fileをrepositoryへ同梱しない |
| `A` | project自身の画面から生成した検証artifact。runtime配布対象外 |

repositoryには明示的な `LICENSE` がないため、`P` はMIT等の再配布許諾を意味しない。第三者が再利用・改変・再配布する場合は権利者の許諾が必要である。画像生成を使う場合も特定作品、商標、製品designを参照せず、tool、生成日、prompt要旨、加工内容を `artifacts/visual-overhaul/` に記録する。

## Stable key規約

- keyはlowercaseのdot区切りとkebab-caseを使う。例: `item.red-umbrella`。
- keyは用途ではなく対象のidentityを表し、file形式や解像度が変わっても変更しない。
- runtime fileは `public/assets/<category>/`、key mappingとprocedural factoryは `src/game/assets/` に集約する。
- Phaser、DOM UI、contentからasset file pathを直接参照しない。
- 1つのSVGをworld、inventory、memoryで共有する場合、keyも1つにし、render profileでsizeとdetailを変える。
- 重要な文字は画像へ焼き込まず、DOM textまたはPhaser textを重ねる。
- load失敗時はgameを停止せず、manifestに定義したprocedural fallbackまたはcontentのglyphへ戻す。

## 現行asset inventory

以下のkeyはvisual overhaul開始時点で割り当てるlogical keyである。現行codeには中央manifestがなく、関数、CSS class、content IDから直接生成している。

| Status | Stable key | 現状実体 / 形式 | 使用場所 | 表示サイズ目安 | Collisionとの関係 | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 継続 | `brand.favicon` | `public/favicon.svg` / SVG | browser tab、bookmark | source 64×64、表示16〜64px | なし | P | 継続。paletteだけthemeへ同期 |
| 継続 | `font.ui.system` | system font stack / CSS | 全DOM text、Phaser label | 12〜56 CSS px | なし | S | bundleへfont fileを追加しない |
| 改修 | `environment.waiting-room.base` | `paintWaitingRoom` / Phaser Graphics | 待合室、title背景 | 1120×630 world | wall、bench、rack等は既存obstacleがsource | P | 新renderer移行後に旧paint分岐を削除 |
| 改修 | `environment.concourse.base` | `paintConcourse` / Phaser Graphics | 改札広間 | 1120×630 world | counter、machine、gate等は既存obstacleがsource | P | 同上 |
| 改修 | `environment.station-office.base` | `paintStationOffice` / Phaser Graphics | 駅員室 | 1120×630 world | desk、shelf等は既存obstacleがsource | P | 同上 |
| 改修 | `environment.footbridge.base` | `paintFootbridge` / Phaser Graphics | 跨線橋 | 1120×630 world | bench、railing等は既存obstacleがsource | P | 同上 |
| 改修 | `environment.rain-platform.base` | `paintPlatform` / Phaser Graphics | 雨のホーム、final choice | 1120×630 world | track、bench、vending、signは既存obstacleがsource | P | 同上 |
| 改修 | `environment.shared.bench` | `drawBench` / Phaser Graphics | 4エリアの長椅子 | 194〜270×58〜62 world px | 対応するbench obstacleへvisualを合わせる | P | SVG化後に旧helperを削除 |
| 改修 | `environment.shared.window` | `drawWindow` / Phaser Graphics | 待合室、跨線橋 | 236〜776×94〜132 world px | 壁面装飾。単独collisionなし | P | 新しい窓雨rendererへ統合 |
| 改修 | `environment.shared.station-lamp` | `drawLamp` / Phaser Graphics | 全エリア | 灯具56×20px + glow | なし。glowはcharacterより低depth | P | 新factoryへ統合 |
| 改修 | `character.nagi` | `createNagi` / Phaser primitive container | playable character | 約35×55 world px | 25×23のArcade body | P | sprite完成後にprimitive本体をfallback化 |
| 改修 | `character.owner.*` | `createPassenger` / Phaser primitive container | 駅員、5乗客、鏡像 | 約36×60 world px | NPC collisionなし。hotspot positionへanchor | P | 個別asset完成後にgeneric bodyをfallback化 |
| 改修 | `item.*` | `visual.primaryColor` + `glyph` / Phaser Text | world、inventory symbol | world約30px、UI glyph約34px | item hotspot positionとradiusがsource | P | glyphはload失敗時fallbackとして残す |
| 改修 | `interaction.marker` | circle + diamond / Phaser Graphics | 全hotspot上 | 約28×28px | 判定なし。hotspotへ追従 | P | 新近接feedback後に常時markerを削除 |
| 改修 | `fx.rain.world` | line群 / Phaser Graphics | 全エリア | 屋外92本、屋内34本 | なし | P | 3層rendererへ置換 |
| 改修 | `fx.puddle.ripple` | ellipse / Phaser Graphics | 待合室、跨線橋、ホーム | 2〜5 ring | なし | P | seed付きrippleへ統合 |
| 継続・改修 | `fx.lamp.glow` | circle / Phaser Graphics | 点灯中の駅灯 | 半径68px | なし | P | keyを継続し、形とalphaだけ改修 |
| 改修 | `ui.frame.*` | CSS gradient、border、shadow | title、dialogue、modal、note、inventory、records | responsive | DOMのみ | P | 新theme classへ移行後に重複ruleを削除 |
| 改修 | `ui.memory.scene` | CSS radial / linear gradient | 6 memory | viewport全体 | なし | P | item close-upとphoto frameを追加 |
| 改修 | `ui.ending.last-train` | CSS gradient | Ending A | viewport全体 | なし | P | scene motif追加後に旧gradientを整理 |
| 改修 | `ui.ending.first-train` | CSS gradient | Ending B | viewport全体 | なし | P | 同上 |
| 改修 | `ui.ending.rain-shelter` | CSS gradient | Ending C | viewport全体 | なし | P | 同上 |
| 記録 | `artifact.playtest.*` | `artifacts/playtest/*.png` / PNG | visual regressionと目視 | 1280×720、390×844 | なし | A | runtime manifestへ登録しない |

## 改修後のEnvironment manifest

### Area base

Area baseは1枚の巨大rasterにせず、procedural floor / wallと再利用可能なSVG propを合成する。表示は常に1120×630 world coordinateで行い、cameraやviewportに合わせて別画像を生成しない。

| Status | Stable key | 形式 / 実体 | 使用場所 | 表示サイズ目安 | Collisionとの関係 | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 改修 | `environment.waiting-room.base` | Phaser Graphics + decoration data | 待合室、title | 1120×630 | `waiting_*` obstaclesを唯一のcollision sourceにする | P | 旧hard-coded baseを削除 |
| 改修 | `environment.concourse.base` | Phaser Graphics + decoration data | 改札広間 | 1120×630 | `concourse_*` obstaclesへ一致 | P | 同上 |
| 改修 | `environment.station-office.base` | Phaser Graphics + decoration data | 駅員室 | 1120×630 | `office_*` obstaclesへ一致 | P | 同上 |
| 改修 | `environment.footbridge.base` | Phaser Graphics + decoration data | 跨線橋 | 1120×630 | `footbridge_*` obstaclesへ一致 | P | 同上 |
| 改修 | `environment.rain-platform.base` | Phaser Graphics + decoration data | ホーム、final choice | 1120×630 | `platform_*` obstaclesへ一致 | P | 同上 |
| 新規 | `environment.shared.floor-wet` | procedural pattern / Graphics | 全屋内床、ホーム床 | tile 112×112相当 | 見た目のみ | P | factory未参照なら削除 |
| 新規 | `environment.shared.wall-wainscot` | procedural pattern / Graphics | 待合室、改札、駅員室 | 高さ96〜150px | wall obstacle内側へ描画 | P | factory未参照なら削除 |
| 新規 | `environment.shared.sky-rain-night` | procedural gradient / Graphics | 窓外、ホーム遠景 | 1120×175まで | なし | P | dawn rendererと統合可能なら統合 |
| 新規 | `environment.shared.sky-dawn` | procedural gradient / Graphics | stage 5〜6、Ending B | 1120×175 / viewport | なし | P | stage未使用ならtestで検出 |

### Reusable props

| Status | Stable key | 形式 / target file | 使用場所 | 表示サイズ目安 | Collisionとの関係 | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 改修 | `prop.bench.old-wood` | SVG / `public/assets/environment/bench-old-wood.svg` | 待合室、改札、跨線橋、ホーム | 幅194〜270、高58〜62 world px | 各bench obstacleへfit。影はbounds外へ可 | P | 旧`drawBench`削除、1 keyへ統合 |
| 改修 | `prop.window.rain-clouded` | SVG frame + procedural rain | 待合室、跨線橋 | 幅236〜776、高94〜132px | 壁面、collisionなし | P | static frameは共有、雨のみ動的 |
| 改修 | `prop.lamp.station-enamel` | SVG + Graphics glow | 全エリア | 灯具56×22px、glow半径60〜90px | なし | P | 旧`drawLamp`削除 |
| 新規 | `prop.clock.station-round` | SVG + Phaser hand Graphics | 待合室、改札、駅員室 | 62〜84px | 壁面、collisionなし | P | 針を画像へ焼かない |
| 新規 | `prop.sign.enamel` | SVG plate + runtime text | 駅名標、路線案内、出口 | 120〜260×48〜100px | sign postだけ既存obstacleへ一致 | P | labelなしplateも共有 |
| 新規 | `prop.poster.paper-aged` | SVG / CSS-like paper plate | 各エリアの掲示 | 72〜140×90〜120px | 壁面、collisionなし | P | poster textはruntime text |
| 改修 | `prop.machine.ticket-old` | SVG | 改札広間 | 118×162px | `concourse_ticket_machine`へ一致 | P | 旧矩形machine削除 |
| 改修 | `prop.machine.vending-old` | SVG | 待合室、ホーム | 90〜118×160〜184px | 対応machine obstacleへ一致 | P | 共有できない差分はaccent variant化 |
| 改修 | `prop.rack.umbrella-wet` | SVG | 待合室 | 116×106px | `waiting_umbrella_rack`へ一致 | P | 旧rack Graphics削除 |
| 改修 | `prop.booth.photo-old` | SVG | 待合室 | 130×194px | `waiting_photo_booth`へ一致 | P | 稼働lampはruntime state |
| 新規 | `prop.gate.manned-old` | SVG segments + runtime gate state | 改札広間 | 全体460×54px | `concourse_gate_bank`へ一致 | P | 開閉差分を別fileへ増殖させない |
| 新規 | `prop.office.desk-ledger` | SVG set | 駅員室 | 326×124px | `office_desk`へ一致 | P | 小物はdesk内のvariant data |
| 新規 | `prop.office.shelf-keys` | SVG set | 駅員室 | 142×218px | `office_shelf`へ一致 | P | 未参照小物はsourceから除去 |
| 改修 | `prop.bridge.railing-rusted` | SVG / Graphics repeat | 跨線橋 | 幅82〜760、高28px | railing obstaclesへ一致 | P | repeat patternを1 assetへ統合 |
| 改修 | `prop.platform.track-drain` | procedural Graphics | ホーム | track 1056×144、drain166×24px | `platform_track`が進入禁止source | P | decorationとcollisionの二重bounds禁止 |
| 新規 | `prop.signal.distant` | SVG + runtime lamp color | 跨線橋遠景、ホーム | 24×70px | 遠景、collisionなし | P | stage 2〜6で使用 |

## Character manifest

Nagiのsheetは64×96px frame、4列×4方向の256×384px PNGを基準にする。各rowはdown / left / right / up、各rowはidleを含む4frameで、全frameを底面中央anchorへ揃える。表示時は44×68 world pxを基準にする。

| Status | Stable key | 形式 / target file | 使用場所 | 表示サイズ目安 | Collisionとの関係 | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 改修 | `character.nagi.walk` | PNG sheet / `public/assets/characters/nagi-walk.png` | player idle / walk 4方向 | source 256×384、表示44×68px | 現行25×23 body、底面中央anchor | P | primitive Nagiはload fallbackのみ |
| 新規 | `character.nagi.interact` | PNG strip / `public/assets/characters/nagi-interact.png` | 調査時2〜3frame | frame64×96、表示44×68px | body不変、animation中も位置不変 | P | 未接続ならsheetへ統合 |
| 新規 | `character.nagi.acquire` | PNG strip / `public/assets/characters/nagi-acquire.png` | 取得時2〜3frame | frame64×96、表示44×68px | body不変 | P | 未接続ならinteractへ統合 |
| 改修 | `character.attendant` | SVG / `public/assets/characters/attendant.svg` | 駅員 | 46×72px | NPC collisionなし、hotspot anchor | P | generic passenger fallbackを共有 |
| 改修 | `character.child-red-boots` | SVG | 赤い長靴の子 | 34×52px | NPC collisionなし | P | 未参照fileは削除 |
| 改修 | `character.commuter-navy-bag` | SVG | 紺鞄の通勤客 | 42×68px | NPC collisionなし | P | 同上 |
| 改修 | `character.old-listener` | SVG | 古いlistener | 44×66px | NPC collisionなし | P | 同上 |
| 改修 | `character.student-ginkgo` | SVG | 銀杏の学生 | 40×66px | NPC collisionなし | P | 同上 |
| 改修 | `character.youth-crescent` | SVG | 三日月の青年 | 42×68px | NPC collisionなし | P | 同上 |
| 新規 | `character.nagi-reflection` | Nagi sheet + tint / runtime profile | 駅員室の鏡像 | 44×68px | `owner_nagi` hotspotのみ | P | 専用bitmapを作らずNagiを再利用 |
| 継続・改修 | `character.shadow.contact` | Phaser ellipse / Graphics | 全人物 | 幅28〜40、高8〜14px | collisionなし | P | character factoryへ一本化 |

### Portrait

| Status | Stable key | 形式 / target | 使用場所 | 表示サイズ目安 | Collision | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 新規 | `portrait.nagi.neutral` | SVG | 通常会話 | PC96×120 / Mobile56×72px | なし | P | 最低限のdefault portrait |
| 新規 | `portrait.nagi.anxious` | SVG variant | 不安な会話 | 同上 | なし | P | 対応dialogueなしならneutralへ統合 |
| 新規 | `portrait.nagi.remembering` | SVG variant | 記憶直前 | 同上 | なし | P | 同上 |
| 新規 | `portrait.nagi.relieved` | SVG variant | 終盤 | 同上 | なし | P | 同上 |
| 新規 | `portrait.attendant` | SVG | 駅員会話 | PC96×120 / Mobile icon | なし | P | character silhouette fallback可 |
| 新規 | `portrait.child-red-boots` | SVG silhouette | 子どもの会話 | 同上 | なし | P | world asset cropをfallbackにする |
| 新規 | `portrait.commuter-navy-bag` | SVG silhouette | 通勤客会話 | 同上 | なし | P | 同上 |
| 新規 | `portrait.old-listener` | SVG silhouette | listener会話 | 同上 | なし | P | 同上 |
| 新規 | `portrait.student-ginkgo` | SVG silhouette | 学生会話 | 同上 | なし | P | 同上 |
| 新規 | `portrait.youth-crescent` | SVG silhouette | 青年会話 | 同上 | なし | P | 同上 |

## Lost item manifest

各SVGは透明なviewBoxへitemだけを描き、重要文字を埋め込まない。同じkeyとfileをPhaser world、DOM inventory、memory close-upで再利用する。Worldではdetail groupを省略できるrender profileを使う。

| Status | Stable key | 形式 / target file | 使用場所 | 表示サイズ目安 | Collisionとの関係 | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 改修 | `item.red-umbrella` | SVG / `public/assets/items/red-umbrella.svg` | 待合室、inventory、memory | 32×40 / 112×112 / 220×180px | `waiting_umbrella_stand` position、radius不変 | P | `☆` glyphはfallback |
| 改修 | `item.star-bento` | SVG / `public/assets/items/star-bento.svg` | 駅員室、inventory、memory | 38×30 / 112×112 / 220×180px | item hotspotへ底面中央anchor | P | `✦` glyphはfallback |
| 改修 | `item.cassette-player` | SVG / `public/assets/items/cassette-player.svg` | 跨線橋、inventory、memory | 36×32 / 112×112 / 220×180px | item hotspot position不変 | P | `▶` glyphはfallback |
| 改修 | `item.silver-hairclip` | SVG / `public/assets/items/silver-hairclip.svg` | ホーム、inventory、memory | 34×24 / 112×112 / 220×180px | item hotspot position不変 | P | `K` glyphはfallback |
| 改修 | `item.faded-photo` | SVG / `public/assets/items/faded-photo.svg` | 待合室photo booth、inventory、memory | 34×30 / 112×112 / 220×180px | item hotspot position不変 | P | `☾` glyphはfallback |
| 改修 | `item.blank-ticket` | SVG / `public/assets/items/blank-ticket.svg` | 改札、inventory、memory | 40×24 / 112×112 / 240×160px | item hotspot position不変 | P | `→` glyphはfallback |

## UI manifest

UI assetは文字を含まないframe、mask、textureだけをfile化する。layout、文字、focus、stateはDOMとCSSで実装する。

| Status | Stable key | 形式 / 実体 | 使用場所 | 表示サイズ目安 | Collision | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 新規 | `ui.texture.enamel-night` | CSS gradient + border tokens | title menu、dialogue、HUD | responsive | なし | P | 重複gradientをthemeへ統合 |
| 改修 | `ui.texture.paper-note` | CSS repeating gradient | notebook、ticket | responsive | なし | P | 現行note罫線をkey配下へ移行 |
| 新規 | `ui.texture.cloth-spine` | small SVG / CSS mask | notebook spine、tab | 幅24〜42px | なし | P | unused maskは削除 |
| 新規 | `ui.texture.ticket-edge` | SVG mask | menu、records、ending choice | 高44〜84px | なし | P | textはDOM、maskのみ共有 |
| 新規 | `ui.stamp.returned` | SVG icon | inventory、notebook | 28〜56px | なし | P | label「返却済み」も必ず表示 |
| 新規 | `ui.stamp.locked` | SVG icon | records、未解放tab | 24〜48px | なし | P | colorだけのlockにしない |
| 改修 | `ui.frame.title-menu` | CSS + ticket-edge mask | title | PC336px幅 / Mobile全幅 | なし | P | generic menu ruleを統合 |
| 改修 | `ui.frame.dialogue` | CSS + enamel tokens | dialogue | PC最大760×170 / Mobile最大38vh | なし | P | 旧panel styleを削除 |
| 改修 | `ui.frame.notebook` | CSS + paper / cloth tokens | notebook | PC900×576 / Mobileほぼ全画面 | なし | P | 旧paper colorsをthemeへ統合 |
| 改修 | `ui.frame.inventory` | CSS + luggage / ticket motif | inventory | PC2column / Mobile1column | なし | P | glyph-only cardを削除 |
| 改修 | `ui.frame.settings` | CSS + station-control motif | pause、settings | PC最大760px / Mobile全幅 | なし | P | native form semanticsは維持 |
| 改修 | `ui.frame.records` | CSS + ticket / stamp motif | ending records | PC3枚 / Mobile1column | なし | P | 旧generic cardを削除 |
| 改修 | `ui.hud.location` | CSS station-sign motif | 左上location | 最大180×64px | なし | P | mobileでは簡略化 |
| 改修 | `ui.hud.clock` | CSS enamel clock plate | 上中央 | 126×64px | なし | P | 時刻textはDOM |
| 改修 | `ui.hud.objective` | CSS ticket tab | 左下 / mobile下部 | 最大360×70px | なし | P | 長文はnotebookへ送る |
| 改修 | `ui.touch.controls` | CSS + inline SVG icon | Mobile操作 | 各48×48px以上 | なし | P | keyboard環境ではDOMごとhidden |
| 改修 | `ui.memory.photo-frame` | CSS + SVG edge | memory scene | PC520×360 / Mobile全幅内 | なし | P | old vignetteは背景として再利用 |
| 改修 | `ui.ending.last-train` | CSS + platform motif | Ending A | viewport | なし | P | 旧gradientをreplacement後削除 |
| 改修 | `ui.ending.first-train` | CSS + dawn / ticket motif | Ending B | viewport | なし | P | 同上 |
| 改修 | `ui.ending.rain-shelter` | CSS + lamp / bench motif | Ending C | viewport | なし | P | 同上 |

## FX manifest

| Status | Stable key | 形式 / 実体 | 使用場所 | 表示サイズ / 上限 | Collision | License | 未使用時の扱い |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 改修 | `fx.rain.far` | seeded Phaser Graphics | 遠景、窓外 | PC24 / Mobile14 line | なし | P | `fx.rain.world`から分離 |
| 改修 | `fx.rain.mid` | seeded Phaser Graphics | world中景 | PC36 / Mobile20 line | なし | P | 同上 |
| 新規 | `fx.rain.near` | seeded Phaser Graphics | 屋外前景 | PC12 / Mobile6 line | なし | P | reduced motionでは生成しない |
| 新規 | `fx.rain.window-stream` | Graphics / mask | 待合室、跨線橋の窓 | 窓ごと8〜14筋 | なし | P | reduced motionではstatic化 |
| 新規 | `fx.rain.roof-drip` | Graphics | ホーム屋根、出入口 | 同時8滴以下 | なし | P | 屋内では生成しない |
| 改修 | `fx.puddle.ripple` | seeded Graphics | puddle | PC3〜5 / reduced1〜2 | なし | P | old ripple loopを置換 |
| 継続・改修 | `fx.lamp.glow` | additive Graphics | station lamp | 半径60〜90px | なし | P | shared factoryのみ残す |
| 新規 | `fx.floor.reflection` | Graphics gradient strips | 濡れた床 | 灯りごと1〜3 strip | なし | P | mirror renderingは作らない |
| 新規 | `fx.memory.coral-wash` | CSS / Graphics overlay | memory、返却直後 | viewport、alpha0.04〜0.22 | なし | P | text layerには重ねない |
| 新規 | `fx.memory.film-grain` | tiny procedural canvas texture | memory背景 | alpha0.04以下 | なし | P | reduced motionでもstatic、未使用なら削除 |
| 新規 | `fx.dawn.color-wash` | Graphics / CSS gradient | stage5〜6、Ending B | viewport | なし | P | visual stage selectorからだけ使用 |
| 改修 | `interaction.nearby-outline` | Phaser Graphics / tint | 近接hotspot | 対象bounds + 2〜4px | 判定はhotspot radiusのまま | P | old diamond markerを削除 |

## Collision mapping rules

assetの表示boundsはcollisionを作らない。collisionのsource of truthは `AreaDefinition.obstacles`、調査のsource of truthは `HotspotDefinition.position` と `radius`、出口は `AreaExitDefinition.bounds` である。

| Visual family | 対応する既存collision / 判定 | 守ること |
| --- | --- | --- |
| 待合室のrack、bench、photo booth | `waiting_umbrella_rack`、`waiting_center_bench`、`waiting_window_bench`、`waiting_photo_booth` | SVGの接地面をbounds内へ収め、影と背もたれだけ外へ出す |
| 改札のcounter、machine、phone、gate | `concourse_counter`、`concourse_ticket_machine`、`concourse_phone`、`concourse_gate_bank` | 通路幅と解放時期を変えない |
| 駅員室のdesk、refrigerator、shelf、chair | `office_desk`、`office_refrigerator_body`、`office_shelf`、`office_chair` | 小物は机上へ描き、床の新collisionを作らない |
| 跨線橋のbench、railing | `footbridge_cassette_bench_body`、`footbridge_student_bench`、`footbridge_railing_left/right` | 階段の入口とclick経路を塞がない |
| ホームのtrack、bench、vending、sign | `platform_track`、`platform_bench`、`platform_vending_body`、`platform_sign_post` | 黄色線は視覚境界、track obstacleが物理境界 |
| 忘れもの | 各item hotspotのposition / radius | asset底面中央をpositionへ置き、拾得後はassetとoutlineを同時に除去 |
| 乗客 | 各owner hotspotのposition / radius | visualだけを置き、NPC用の新collisionを追加しない |
| 前景柱・手すり | 既存obstacleまたは装飾のみ | playerを隠す時はalphaを下げ、collisionを見えない場所へ置かない |

asset改修後はF2 panelとcollision debugを使い、表示boundsと判定位置を各エリアで確認する。Mobileのpointer座標はPhaser camera変換を維持し、visual scaleのためにhotspot positionを補正しない。

## Loadingとfallback

1. Titleと待合室に必要なNagi、待合室props、最初のitem、共通UIを最優先でloadする。
2. 残りのarea、owner、itemはgame開始後またはarea解放前にloadする。
3. SVG / PNG load失敗時はmanifestのfallback factoryを使う。itemは既存glyph、人物は改修したprimitive silhouette、propはprocedural shapeへ戻す。
4. asset 404、decode failure、missing manifest keyは開発・E2Eでerrorにし、本番ではgameを継続してconsoleへkeyを1回だけ記録する。
5. Mobileへdesktop専用の高解像度rasterを強制しない。SVGと同じNagi sheetを使い、particle数とdetail groupを減らす。

## 未使用assetの扱い

- `src/game/assets/manifest.ts` に登録されたfileは、存在確認と重複key検査をunit testする。
- content、Scene、UI、preload graphのどこからも参照されないmanifest keyはtest failureにする。
- `public/assets/` にあるがmanifestへ登録されていないfileは本番不要とみなし、削除する。archive目的で残さない。
- 旧Phaser Graphics helperはreplacementのvisual regressionとcollision確認後に削除する。fallbackとして残すものだけmanifestから明示的に参照する。
- `item.visual.glyph` はasset load failure用fallbackとして使う限り継続する。fallbackを廃止した時点でfieldとtestを同じcommitで削除する。
- `AreaDefinition.decorations` はrendererが消費するものだけ残す。hard-coded rendererと同じobjectを二重定義しない。
- 生成途中、失敗、重複、巨大source画像は `public/` へ置かない。検討記録が必要な場合は縮小previewと生成情報だけを `artifacts/visual-overhaul/` に保存する。
- `artifacts/playtest/` と `artifacts/visual-overhaul/` はasset preload対象へ含めない。
- file名変更はmanifest mappingだけで吸収し、stable keyとcontent IDを変更しない。

## Manifest completion check

- 全runtime画像、procedural factory、UI textureがstable keyから解決される。
- 6 item、Nagi、駅員、5乗客、10 portrait、5 area、共通prop、FX、UI frameに欠落keyがない。
- 5 areaの主要propと既存obstacleの対応が目視・E2Eで一致する。
- load失敗fallback、asset 404検出、productionでの未使用file除外が検証される。
- third-party素材、権利不明素材、画像内の重要文字、runtimeからの直接path参照がない。
