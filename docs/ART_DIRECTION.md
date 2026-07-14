# ART DIRECTION — 雨宿り駅の忘れもの

## この文書が示すもの

本作の現行visualは「雨夜の絵本」と「古い地方駅」を、外部画像ではなくPhaser GraphicsとDOM/CSSで組み立てた2D procedural artである。この文書は2026-07-14時点の実装基準を説明し、未制作のspritesheet、SVG prop、textureを完成済みとして扱わない。

ゲーム進行、collision、hotspot、saveは描画から分離されている。world座標は1120×630で固定し、Phaserは探索空間、DOMは会話、ノート、所持品、設定、記録、記憶、エンディングを担当する。

## 現行のvisual architecture

| Layer | 実装 | 描画内容 |
| --- | --- | --- |
| World base | `StationView.ts`のdepth 0 Graphics | floor、wall、window、設備、線路、列車、固定反射 |
| Far weather | depth 1 Graphics | window／platformの雨筋 |
| Light | depth 2 Graphics | 駅灯のglowと床面pool |
| Wet FX | depth 3 Graphics | 水たまりのripple |
| World label | Phaser Text、主にdepth 40 | 駅名、案内、設備label |
| Item | `ItemVisual.ts`、おおむね`position.y + 21` | 6つの忘れもの、影、halo |
| People | primitive Container、`position.y + 35〜40` | ナギ、駅員、乗客、鏡像 |
| Marker | primitive Container、`position.y + 80` | hotspotのstem、halo、diamond、glint |
| Near weather | depth 900 Graphics | 屋外の手前雨 |
| Text-heavy UI | `AppUi.ts` + `main.css` | HUD、dialogue、modal、memory、ending、touch |

世界のGraphicsは1枚の背景画像をloadしているのではなく、Scene開始時に毎回生成する。DOM artworkも画像maskではなく、通常要素、pseudo-element、gradient、border、shadowで描く。

## Visual concept

判断軸は次の4つである。

1. 濃紺の夜と青緑の雨を基調にする。
2. 琥珀の駅灯と生成りの紙を、進路・記憶・操作の焦点にする。
3. 古い駅らしさは木床、terrazzo、金属床、標識、改札、台帳、線路など具体物で示す。
4. 怖さより静けさを優先し、返却と夜明けでは暖色と明度を少し増やす。

写真texture、外部illustration、強いneon、実写調、過度なglass morphismは使っていない。絵本らしさは丸角、少数色の面、太めの輪郭、固定配置の摩耗や雨で出している。

## 現在のpalette

PhaserとDOMは同じ役割の色を持つが、1つの生成済みtoken sourceへ統合されてはいない。Phaserは`StationView.ts`の数値`PALETTE`、DOMは`main.css`のCSS custom properties、manifest metadataはcontent paletteを使う。

### Phaser world

| Role | Color | 主用途 |
| --- | --- | --- |
| night | `#06111F` | 外枠、最暗部 |
| night soft | `#10283C` | 夜空、窓外 |
| wall | `#1A3448` | 駅の壁 |
| wall light | `#294A5D` | ナギの上着、構造の明部 |
| rain | `#8BCDD0` | 雨、波紋 |
| lamp | `#F0D58D` | 灯具、返却の光 |
| lamp dim | `#D0AD65` | 金属縁、弱い灯り |
| ink | `#E8EFDF` | world label |
| shadow | `#07101B` | 接地影、深い輪郭 |
| memory | `#EEA07E` | 記憶、写真機、帳簿のaccent |
| wood / wood light | `#5C493D` / `#7D624B` | bench、木部 |
| silver | `#91A4AA` | 金属detail |

### DOM UI

| Role | Color | 主用途 |
| --- | --- | --- |
| deep night | `#101B2D` | page、panel背面 |
| mid night | `#18283A` | panel、station sign |
| wet floor | `#263A49` | UI内の駅景 |
| rain | `#4F8790` / `#A8C4CF` | 線、window、focus補助 |
| lamp | `#DFB36A` / `#F0D8A3` | button、focus、stamp |
| memory | `#D68F7C` | reward、memory |
| paper | `#E7DFCE` | notebook、ticket、caption |
| paper ink | `#18212C` | paper上の本文 |
| shadow violet | `#4C485D` | 記憶と影 |
| dawn | `#A8C4CF` | Ending B、補助色 |

重要文字は`--ink`または`--paper-ink`を使う。rain色やmemory色だけで状態を伝えず、label、stamp、枠、形を併用する。

## 5 areaの実装

### 待合室

- 木床と腰壁、3枚の雨窓が横方向の基準線を作る。
- 0時から進む丸時計、2つの吊り灯、中央と窓側のbenchが主anchor。
- 左に傘立て、右上に写真機、右端に改札案内を置く。
- 写真機はstage 4から珊瑚色の稼働表示へ変わる。
- 床の青緑反射、小さな足跡、rippleが「濡れている室内」を示す。

### 改札口と券売機

- 灰色のterrazzo床に固定seed相当の小粒を散らす。
- 上部中央の駅名板、案内窓口、券売機、公衆電話、5基の改札で駅の中心を示す。
- 駅員室、跨線橋、待合室への出口はPhaser Textと暗いplateで示す。
- stageに応じて券売機、改札lamp、跨線橋側の灯りが変わる。

### 駅員室

- 鈍い灰緑の床と壁、暖かい木の机で他areaより室内感を強くする。
- 忘れもの台帳、冷蔵庫、古い鏡、書類棚、椅子が主要設備。
- 鏡はstage 5で縁と面が明るくなり、ナギ自身の忘れものへ焦点を移す。
- 主灯は常時点灯し、机周辺に暖色poolを作る。

### 跨線橋

- 金属床の縦panel、3枚の長い雨窓、手すりが奥行きと進路を作る。
- 2脚のbench、段階点灯する3つのlamp、ホームへ下る階段が主anchor。
- window region内の雨と床の長い青緑反射で、屋内でも雨の強さを残す。

### 雨のホーム

- 濡れたconcrete、屋根と4本の柱、黄色線、暗い線路と枕木で歩行域を分ける。
- 駅名標、bench、自動販売機、跨線橋階段を固定anchorにする。
- city silhouette、青緑と琥珀の水面反射、屋外雨を重ねる。
- stage 5で行き先のない終電、stage 6で明るい始発と夜明け色へ切り替える。

`AreaDefinition.decorations`にも設備のboundsと色があるが、現行背景はこれを読まない。physicsは`obstacles`、visualは`StationView`内の座標がsourceであり、両者は別管理である。

## People

### World Nagi

playable Nagiは画像spriteではない。rectangle、ellipse、circle、triangle、arcで、濃紺の髪、青いcoat、生成りの襟、珊瑚色scarf、髪留めを組み立てる。

- physics bodyは25×23、visualの接地位置と分離する。
- left時だけContainerを水平反転し、right／up／downは同じ基本silhouetteを使う。
- 移動中は脚rotation、靴の上下、1.8px以内のbody bob、scarfの小さな揺れを加える。
- 演出軽減時はstride、bob、scarf swayを止める。
- 現在は4方向spritesheetやinteract／acquire専用frameを実装していない。

### Station attendant and passengers

`createPassenger`は共通bodyへowner固有accessoryを足す。

| Role | 識別detail |
| --- | --- |
| 顔の見えない駅員 | 制帽、金縁、白い手袋 |
| 赤い長靴の子 | 小柄な体格、赤いboots、白い星 |
| 紺の鞄の通勤客 | 右側の大きな紺鞄とhandle |
| 耳を澄ます老人 | headphone、青いear padとcode |
| 本を抱く学生 | 茶色い本、生成りの頁、銀杏色の栞 |
| 月のpinの青年 | 長いcoat、三日月pin、写真袋 |
| 鏡側のナギ | 白い切符と青い罫線 |

返却後は暖色halo、明るいoutline、小さな4-point starを追加する。顔の描き込みは抑えつつ、体格とaccessoryで区別する。

### Dialogue portrait

会話portraitも画像ではない。DOMのbody、head、hair、accessoryをCSSで組み、`nagi`、`attendant`、`child`、`commuter`、`listener`、`student`、`youth`、`station`の8種類を持つ。toneとspeaker名から種類を決め、返却を示す台詞ではglowを強める。620px以下ではportraitを非表示にし、本文領域を優先する。

## 6つの忘れもの

worldでは`ItemVisual.ts`が約40px基準のshapeを描き、DOMでは同じitem IDを使って約70pxのCSS sketchを別実装する。1つのSVGをscale共有しているわけではなく、DOM側の色もcontent色から自動生成されないため一部に差がある。

| Item | World silhouette | DOM／memoryのdetail |
| --- | --- | --- |
| 赤い傘 | 広がった傘布、骨、曲がり柄 | 赤いgradient、木柄、星patch |
| 星柄の弁当箱 | 丸角の二段箱 | 蓋、留め具、星 |
| 古いカセットプレーヤー | 丸角body、cassette窓、code | 2 reel、button、外へ伸びるcode |
| 銀色の髪留め | 細いclip | 銀のgradient、内側line、銀杏detail |
| 色あせた写真シール | 縦長の紙、二人の影 | 褪色面、三日月、重なる人物 |
| 行き先のない白紙の切符 | 横長硬券、切欠き | perforation、空欄line、青い印 |

world itemには接地影と薄いhaloがあり、hotspot位置へ置かれる。inventoryではitem名、説明、「所持中／返却済み」を必ず併記し、返却済みは「返」stampを追加する。memoryでは同じCSS sketchを写真枠内で拡大し、captionと本文をDOM textで表示する。

## DOM UIの実装motif

| Surface | 現行motifと構成 |
| --- | --- |
| Title | 雨窓、吊りlamp、bench、赤い傘、床反射をCSS sceneにし、駅名標／ticket調のmenuを重ねる |
| HUD | locationを小型駅名標、objectiveをticket、操作群を古い駅のplateとして画面端へ置く |
| Toast | item、clue、return、saveでsealの形と色を変える |
| Dialogue | 濃紺の窓panel、真鍮色のspeaker札、話者別portrait、送りbutton |
| Notebook | 生成りの紙、布背、横tab、section別の余白stamp、罫線 |
| Inventory | 旅行鞄色のcard grid、item ID別sketch、返却stamp |
| Settings / controls | 古い案内板の枠を使い、native input semanticsは維持する |
| Records | 3枚のticket cardとending別の小景色。locked時は暗くする |
| Memory | 珊瑚色を含む暗い背景、古い写真枠、item close-up、progress dot |
| Final choice | platform、lamp、列車、railの小sceneと、終電／始発／残る選択別のbutton accent |
| Ending | narrativeと駅景を2columnにし、Aは終電、Bは夜明け、Cは灯りを守るstation tableauへ変える |
| Touch | 方向pad、76pxの調査button、44px以上のnote／inventory／pause |

文字はtitle、world signを含めてruntime textであり、背景画像へ焼き込まない。focus outlineは装飾枠より優先する。

## Stage、雨、光

時計表示はstageごとに次の値を使う。

| Stage | Time | 主なvisual change |
| ---: | --- | --- |
| 0 | 00:00 | 待合室の灯りは1つ。強い夜色 |
| 1 | 00:18 | 待合室と駅員室側の灯り、冷蔵庫が明るくなる |
| 2 | 00:47 | 跨線橋の中央灯と出口が有効になる |
| 3 | 01:35 | ホームへ進める。夜明け補間はまだ0 |
| 4 | 02:31 | 写真機が稼働し、ホーム中央灯が増える |
| 5 | 03:56 | 券売機、終電、ホーム右灯、鏡が明るくなる |
| 6 | 04:58 | 雨粒を0にし、空と列車を夜明け色へする |

夜明け量は`clamp((stage - 3) / 3, 0, 1)`。stage 4、5、6で段階的に空と一部のsurfaceを補間する。

通常時のrain countは屋外94、屋内30。屋外では5本ごとに1本をnear layerにも描く。演出軽減時は屋外38、屋内14へ減らし、near rainのalphaを下げる。stage 6は雨を生成しない。

rippleはbandごとに通常3、演出軽減時1。lampは通常時だけ小さく呼吸し、演出軽減時は固定alpha。hotspot markerは通常時に1250msで上下し、演出軽減時は静止する。

DOMはOSの`prefers-reduced-motion`とgame設定`data-reduced-motion="true"`の両方で、animationとtransitionを0.01ms、1 iterationへ抑える。

## Responsive camera and mobile

Phaser configの初期値は960×540だが、scale modeは`RESIZE`。`CameraLayout.ts`が実viewportからcameraを決め、simulation world 1120×630は変えない。

| Mode | 実際の挙動 |
| --- | --- |
| Desktop | width 1180以上かつaspect 1.6以上。world中央へfixed、全worldを表示 |
| Tablet | player follow、lerp 0.09、safe areaを考慮したdeadzone |
| Portrait | aspect 0.9以下。zoom 1.25〜1.4、player follow、UI-safe centerへ上寄せ |

390×844ではzoom 1.32、safe areaはx 12、y 62、width 366、height 478.16。profileのbottom inset 304pxはviewport比36%で303.84pxとなり、`ExplorationScene`のcamera viewportはY=62〜約540.16pxに収まる。目的chipとtouch操作はこのcamera下端より下へ分離し、portrait followはcropped viewport内でoffset 0を使う。`CameraLayout`自体が返す`screenFocusOffset.y`は-120.92である。

CSSは620px以下で次を行う。

- HUDを圧縮し、objectiveをtouch controlsの上へ置く。
- touch padを144×144、方向buttonを48×48にする。
- 調査buttonを76×76、note／inventory／pauseを44×44にする。
- notebook、inventory、ending、final choiceを一列へ組み替える。
- memory写真枠、portrait、ending sceneを専用寸法へ縮める。
- 横overflowを作らず、world背面の余白にも低contrastのstation motifを残す。

## Accessibility and semantics

- dialogueとmodalは`role="dialog"`、適切な`aria-modal`とlabelを持つ。
- notebookはtablist／tab／tabpanel、`aria-controls`、`aria-labelledby`を使う。
- decorative portrait、stamp、scene、item sketchは`aria-hidden`。item名と説明は通常textで残す。
- touch buttonはsymbolとは別に`aria-label`を持つ。
- すべての主要buttonは44×44 CSS px以上を目標にし、現行mobile secondary actionは44px、directionは48px。
- 返却、locked、active、ending差分は色だけでなくstamp、label、形、文言を併用する。
- system font stackだけを使い、font load失敗で本文が消える構成にしない。

## 現時点で実装していないもの

次は過去の構想に含まれていたが、現在のruntimeには存在しない。完成済みとして記載しない。

- `public/assets/`配下のgame用PNG、SVG、texture
- Nagiの4方向walk spritesheet、interact／acquire animation strip
- 駅設備、人物、portrait、忘れもののSVG file
- 1つのitem artworkをworld、inventory、memoryでscale共有するasset pipeline
- `AreaDefinition.decorations`から背景を自動配置するrenderer
- `VISUAL_MANIFEST` keyによるruntime asset lookup
- Phaser、DOM、content paletteを1つの生成tokenへ同期する仕組み
- 駅員専用の`CHARACTER_VISUAL_KEYS` entry
- hotspot markerの完全廃止。現行では小型diamondが常時表示される対象がある
- 3枚の独立した遠景／中景／前景rain system。現行はfarとnearの2 Graphics

これらを将来追加する場合は、実装とtestが入った時点で初めて本節から移し、`ASSET_MANIFEST.md`へpath、key、license、fallbackを記録する。

## 現行visualの確認点

- 5 areaが床材と大型設備で見分けられる。
- playable Nagi、駅員、5人の乗客、鏡側Nagiがaccessoryで区別できる。
- 6 itemがworld、inventory、memoryの各scaleで名前と結びつく。
- stage 5の終電とstage 6の始発／夜明けが明確に異なる。
- 1280×720では全world、390×844ではplayer followとtouch安全域が機能する。
- 演出軽減で雨、marker、歩行、DOM motionが抑えられても、promptと状態textは残る。
- obstacle、hotspot、visualの座標が目視で一致している。現状は自動同期ではないため、area改修時に必ず再検証する。
