# ASSET MANIFEST — 現行procedural visual

## 文書の位置づけ

この文書は、2026-07-14時点でブラウザから実際に使われる視覚資産と、その登録状態を記録する実装スナップショットである。将来制作するPNG、SVG、spritesheetの仕様書ではない。

ゲーム画面は次の2系統で構成される。

- Phaser世界: `src/phaser/view/StationView.ts` と `src/phaser/view/ItemVisual.ts` が、Phaser Graphics、primitive、Phaser Textを実行時に生成する。
- DOM UI: `src/ui/AppUi.ts` が意味を持つDOMを作り、`src/styles/main.css` がgradient、border、pseudo-element、shapeで装飾する。

駅、人物、忘れもの、雨、記憶、エンディングに外部PNG／SVGは使っていない。`public/favicon.svg` はブラウザアイコン専用であり、ゲーム内visual manifestには含まれない。外部web fontも読み込まない。

## 実装上のsource of truth

| ファイル | 現在の責務 | 注意点 |
| --- | --- | --- |
| `src/game/assets/visualManifest.ts` | 5 area、6 character、6 item、6 UI、5 FX、合計28 keyのmetadata、license、重複・欠落検証 | file path loaderではない。現行rendererは`getVisualAsset`で描画をdispatchしていない |
| `src/phaser/view/StationView.ts` | 5 area、ナギ、駅員と乗客、hotspot marker、雨、灯り、水面反射の描画 | area layoutと色の大半は関数内の座標・`PALETTE`で定義される |
| `src/phaser/view/ItemVisual.ts` | 6 shapeのworld item描画、影、halo | `LostItemDefinition.visual`を直接受け取り、manifest keyは受け取らない |
| `src/phaser/view/CameraLayout.ts` | 1120×630 worldを維持したdesktop／tablet／portrait camera policy | 視覚資産ではないが、表示寸法とDOM安全域を決める |
| `src/game/content/areas.ts` | area ID、obstacle、hotspot、exit、palette、decorations | obstacleはphysicsで使用。decorationsは現行`StationView`から未参照 |
| `src/game/content/owners.ts` | owner ID、silhouette色、accent色、accessory | `createPassenger`が直接参照する |
| `src/game/content/items.ts` | item ID、shape、2色、glyph | Phaser itemとDOM itemの対応ID |
| `src/ui/AppUi.ts` / `src/styles/main.css` | title、dialogue、notebook、inventory、memory、final choice、ending、records、touch UI | CSS artworkはmanifest keyでdispatchせず、class、data属性、item IDを使う |

`VISUAL_MANIFEST`は登録表とテスト契約である。`REQUIRED_VISUAL_KEYS`、`validateRequiredVisualKeys`、`getVisualAsset`は`tests/unit/visual-assets.test.ts`で検証されるが、`ExplorationScene`はarea ID、owner ID、item shapeを直接rendererへ渡す。このため「keyが登録済み」と「runtimeがkeyをlookupしている」は同義ではない。

## Status表記

| Status | 意味 |
| --- | --- |
| 描画済 | 現行runtimeでvisualが生成される |
| 登録済 | `VISUAL_MANIFEST`にkeyとmetadataがある |
| 個別keyなし | 描画済だが専用manifest keyはない |
| 未接続 | 定義は存在するが現行rendererが消費しない |
| 検証専用 | testまたはscreenshot。runtime assetではない |

## Manifest inventory

### Area: 5

全entryの`source`は`phaser-graphics`。manifestの色は`AREA_DEFINITIONS[].palette`から作られる。一方、実描画は`StationView.ts`の`PALETTE`と各draw関数の色を使うため、metadata色がrendererへ注入されるわけではない。

| Stable key | Content ID | 現行描画 | Status |
| --- | --- | --- | --- |
| `area.waiting-room` | `area_waiting_room` | 木床、3枚の雨窓、時計、2灯、ベンチ、傘立て、写真機、足跡 | 描画済・登録済 |
| `area.concourse` | `area_concourse` | terrazzo床、駅名板、案内窓口、券売機、公衆電話、ベンチ、5基の改札 | 描画済・登録済 |
| `area.station-office` | `area_station_office` | 台帳机、冷蔵庫、鏡、書類棚、椅子、卓上側の灯り | 描画済・登録済 |
| `area.footbridge` | `area_footbridge` | 金属床、3枚の雨窓、2脚のベンチ、手すり、階段、段階点灯 | 描画済・登録済 |
| `area.rain-platform` | `area_rain_platform` | 濡れたホーム、屋根と柱、駅名標、自販機、黄色線、線路、列車、夜明け | 描画済・登録済 |

world sizeは全areaで1120×630。collisionは`AreaDefinition.obstacles`から透明なArcade bodyを作る。背景Graphicsはobstacle boundsから自動生成されず、現行では同じ座標を別途描いている。

### Character: 6 registered

全entryの`source`は`phaser-graphics`。manifestは`owner_station_attendant`を意図的に除外し、ナギと5人の影の乗客を登録する。

| Stable key | Owner ID | 現行visual | Status |
| --- | --- | --- | --- |
| `character.nagi` | `owner_nagi` | playable Nagiのprimitive bodyと、鏡側ownerの白い切符accessory | 描画済・登録済 |
| `character.red-boots-child` | `owner_red_boots_child` | 小柄な体格、赤い長靴、星patch | 描画済・登録済 |
| `character.navy-bag-commuter` | `owner_navy_bag_commuter` | 成人silhouette、紺の大型鞄 | 描画済・登録済 |
| `character.old-listener` | `owner_old_listener` | headphone、青いcode | 描画済・登録済 |
| `character.ginkgo-student` | `owner_ginkgo_student` | 本、銀杏色の栞 | 描画済・登録済 |
| `character.crescent-youth` | `owner_crescent_youth` | 三日月pin、写真袋 | 描画済・登録済 |

`owner_station_attendant`は`createPassenger`の専用switch分岐で制帽、金縁、白い手袋を描くが、`CHARACTER_VISUAL_KEYS`にはない。これは描画漏れではなく「描画済・個別keyなし」の状態である。

playable Nagiはspritesheetではない。rectangle、ellipse、circle、triangle、arcをContainerへまとめ、左右移動はhorizontal flip、歩行は脚・靴・scarfの小さな変位で表す。physics bodyは25×23。返却済みownerには暖色haloと小さな星を追加する。

### Lost item: 6

manifest item entryの`source`は`phaser-graphics`。world visualは`ItemVisual.ts`、inventoryとmemoryの拡大図は`main.css`が同じitem IDに対して別々に描く。

| Stable key | Item ID | Shape | Primary / secondary | Worldの固有detail | Status |
| --- | --- | --- | --- | --- | --- |
| `item.red-umbrella` | `item_red_umbrella` | `umbrella` | `#c94f55` / `#f1e6bf` | 傘布、骨、曲がり柄、白い星 | 描画済・登録済 |
| `item.star-bento` | `item_star_bento` | `bento` | `#465f83` / `#e5c66b` | 二段箱、留め具、複数の星 | 描画済・登録済 |
| `item.cassette-player` | `item_cassette_player` | `cassette` | `#596474` / `#4d9ac4` | cassette窓、2 reel、button、code | 描画済・登録済 |
| `item.silver-hairclip` | `item_silver_hairclip` | `hairclip` | `#d5dbe2` / `#d2a84b` | 細いclip、K形状、銀杏detail | 描画済・登録済 |
| `item.faded-photo-sticker` | `item_faded_photo_sticker` | `photo` | `#d6bfa8` / `#65749b` | 二人の影、三日月、余白線 | 描画済・登録済 |
| `item.blank-ticket` | `item_blank_ticket` | `ticket` | `#f0eee4` / `#7aa9c4` | 切欠き、破線、行き先矢印 | 描画済・登録済 |

`createWorldItemVisual`はshape本体に38×12の影と、通常は半径25のhaloを付ける。hairclipだけ呼び出し側で1.08倍にする。shape dispatchは`ITEM_SHAPE_RENDERERS`で行い、6 shapeはunit testでcontentと一致することを確認する。

DOM側の`item-sketch__fallback`にはcontent glyphを保持するが、現在は視覚的に隠している。UIの実用fallbackは隣接するitem名、説明、所持／返却labelであり、glyphへ自動切替する画像load処理ではない。

### UI: 6 registered

| Stable key | Manifest source | 現行実装 | Status |
| --- | --- | --- | --- |
| `ui.dialogue.portrait` | `dom-css` | Nagi、駅員、子ども、通勤客、老人、学生、青年、汎用stationのCSS portrait | 描画済・登録済 |
| `ui.notebook.evidence` | `dom-css` | 紙、布背、tab、section別余白stamp、entry marker | 描画済・登録済 |
| `ui.inventory.item` | `phaser-graphics+dom-css` | world item shapeと、所持品／memoryのitem ID別CSS sketch | 描画済・登録済 |
| `ui.hotspot.marker` | `phaser-graphics` | stem、halo、diamond core、glint。ownerと未取得hotspotへ表示 | 描画済・登録済 |
| `ui.touch.action` | `dom-css` | 方向、調査、note、inventory、pause button | 描画済・登録済 |
| `ui.final-choice.route` | `dom-css` | 空、灯り、列車、platform、railの分岐sceneと選択buttonのroute色 | 描画済・登録済 |

portraitは画像ではなくDOMの4部品`body`、`head`、`hair`、`accessory`をCSSで変形する。話者判定はtoneとspeaker名から行い、特定できないpassengerはcommuter、それ以外はstation silhouetteへfallbackする。

titleの窓・lamp・bench・umbrella、toast seal、3 endingのtableau、ending recordの小景色には、現時点で個別manifest keyがない。いずれも`AppUi.ts`／`main.css`に実装済みであり、「未実装」ではなく「描画済・個別keyなし」である。

### FX: 5

| Stable key | Manifest source | 現行実装 | Status |
| --- | --- | --- | --- |
| `fx.rain.window` | `phaser-graphics` | 屋内は各window regionだけに細い雨筋を描く | 描画済・登録済 |
| `fx.rain.platform` | `phaser-graphics` | ホーム全域のfar rainと、5本に1本のnear rain | 描画済・登録済 |
| `fx.lamp.glow` | `phaser-graphics` | 灯具下の楕円poolと床の横長反射。stageで灯数が増える | 描画済・登録済 |
| `fx.wet-reflection` | `phaser-graphics` | 固定の濡れ面、縦反射、時間で広がるpuddle ripple | 描画済・登録済 |
| `fx.memory.bloom` | `phaser-graphics+dom-css` | memory画面のradial／linear背景とitem写真枠 | 登録済。実質のbloom描画はDOM/CSS側のみで、専用Phaser effectとkey lookupはない |

stage 0〜5の雨粒数は通常時に屋外94／屋内30、演出軽減時に屋外38／屋内14。stage 6は0。rippleはbandごとに通常3、演出軽減時1。lamp alphaの呼吸、Nagiの歩行揺れ、hotspot markerの上下Tweenは演出軽減時に停止または固定される。

## Cameraと表示profile

`CameraLayout.ts`は描画assetを増やさず、同じ1120×630 worldの見せ方を変える。

| Mode | 判定 | Camera | Zoom / safe area |
| --- | --- | --- | --- |
| desktop | aspect 1.6以上かつwidth 1180以上 | world中央に固定 | viewportへ全worldが収まる値。上72、右20、下84、左20を基準 |
| tablet | portrait以外でdesktop条件未満 | player follow、lerp 0.09 | preferred 1.02、下132を含むsafe inset |
| portrait | aspect 0.9以下 | player follow、lerp x 0.12 / y 0.10 | 1.25〜1.4。390×844では1.32、safe inset 62 / 12 / 303.84 / 12（profile下端304を36% cap）、safe height 478.16 |

全modeでround pixels、world bounds clampを使う。Phaser初期configは960×540だが`Phaser.Scale.RESIZE`のため、実際のlayoutは現在のCSS viewport寸法から毎回解決する。390×844のportraitでは`ExplorationScene`がcamera viewportをY=62、高さ478.16へ切り、下端を約540.16pxにする。`CameraLayout`が算出する`screenFocusOffset.y`は-120.92だが、このcropped portrait viewportではfollow offsetを0として適用する。

## Licenseとprovenance

- `VISUAL_MANIFEST`の28 entryはすべて`procedural: true`、license ID `original-procedural`、attribution `Original procedural artwork for 雨宿り駅の忘れもの`、`externalRights: false`である。
- ゲーム内visualにthird-party画像、icon pack、texture、音声、web font、外部URLはない。
- `public/favicon.svg`はproject-localの静的SVGだが、`VISUAL_MANIFEST`には登録していない。
- fontはOS／browserのsystem font stackを使い、repositoryへfont fileを同梱しない。
- `artifacts/playtest/`、`artifacts/visual-overhaul/`、Playwright screenshotはこのgame自身から生成した検証記録であり、runtimeから参照しない。
- repository rootに`LICENSE`はない。manifestのlicense metadataは制作由来を示すもので、第三者へMIT等の再配布権を付与する文書ではない。

## Fallback、未接続、未使用

| 対象 | 現在の扱い |
| --- | --- |
| 外部画像load失敗 | game内に外部画像load自体がないため該当しない |
| 未知item shape | TypeScriptのunionとunit testで防ぐ。runtimeの`drawItemShape`にcatch-all rendererはない |
| 未知owner ID | `ownerDefinition`がthrowする。generic unknown-owner fallbackはない |
| 不正なmanifest色 | `requireHexColor`がthrowする |
| 不正なitem色 | `parseHexColor`がthrowする |
| 未知manifest key | `getVisualAsset`がthrowする |
| 未知portrait話者 | passengerはcommuter、その他はstation portraitへfallback |
| memory item特定 | title対応表、`visual`／本文keywordの順に推定し、最後はblank ticketを使う |
| `AreaDefinition.decorations` | 全5 areaに定義済みだが`StationView`未接続 |
| area palette metadata | manifestへ登録されるが`StationView`の実描画色には未接続 |
| visual manifest lookup | unit testでは使用。runtime rendererからは未使用 |
| 未参照manifest key／asset file検出 | 現行testの対象外。required keyの欠落・重複と既知shapeは検証するが、unused、404、decode fallbackは検証しない |
| station attendant key | character artworkは描画済みだがmanifest keyなし |
| screenshot PNG | 検証専用。runtime未使用 |
| `dist/` | build生成物。source assetではない |

## 変更時の同期条件

実装を変更した場合だけ、この文書も同じ差分で更新する。

- area、owner、item IDを追加・削除したら`visualManifest.ts`とvisual asset unit testを同期する。
- item shapeを追加したらcontent type、`SUPPORTED_ITEM_VISUAL_SHAPES`、`ITEM_SHAPE_RENDERERS`、DOMの`data-item-id` styleをそろえる。
- manifest keyをruntime lookupへ接続した場合は、「登録表のみ」という記述を更新する。
- `AreaDefinition.decorations`をrendererへ接続した場合は、hard-coded座標との二重管理が残っていないことを確認する。
- PNG／SVG／fontをゲーム内へ追加した場合は、実path、読み込み箇所、license、fallback、未使用時の扱いを追記する。
