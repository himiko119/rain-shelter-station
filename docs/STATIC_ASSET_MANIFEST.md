# Static Asset Manifest Contract

## Purpose

背景、人物、ポートレート、アイテム、記憶、エンディング、UI一枚絵をstable keyで一元管理し、PhaserとDOMが同じファイルを参照する。ゲームロジックへパスを直書きしない。

## Runtime shape

```ts
type StaticVisualAsset = {
  key: string;
  path: `assets/art-v3/${string}`;
  category:
    | "background"
    | "foreground"
    | "character"
    | "portrait"
    | "item"
    | "memory"
    | "ending"
    | "ui";
  width: number;
  height: number;
  anchor?: { x: number; y: number };
  frame?: {
    width: number;
    height: number;
    count: number;
    fps: number;
    repeat: number;
  };
  license: "project-original";
  consumer: "phaser" | "dom" | "both";
  fallback: "procedural-area" | "procedural-character" | "procedural-item" | "css-ui" | "none";
};
```

## Path rules

- `public/assets/art-v3` がランタイムroot。
- manifest pathは先頭スラッシュなし、ASCII、`..`なし、URL schemeなし。
- URLは `import.meta.env.BASE_URL` と `document.baseURI` から一箇所で解決する。
- `/assets/...`、`new URL(path, import.meta.url)`、CSSのroot-relative URLは禁止。
- 画像の実寸とmanifest寸法を単体テストおよびブラウザdecodeで照合する。

## Required key families

### Backgrounds

- `area.waiting-room.background`
- `area.concourse.background`
- `area.station-office.background`
- `area.footbridge.background`
- `area.rain-platform.night`
- `area.rain-platform.last-train`
- `area.rain-platform.dawn`

### Foregrounds

- 待合室の傘立て前縁、改札機前縁、駅員室の机前面、跨線橋の左右手すり、ホームの屋根・駅名標を必要時だけ分割する。
- 全画面foregroundは禁止。`sortY`を接地物の衝突下端へ合わせる。

### Characters

- `character.nagi.*` — sprite specificationに従う。
- `character.station-attendant.idle`
- `character.red-boots-child.idle`
- `character.navy-bag-commuter.idle`
- `character.old-listener.idle`
- `character.ginkgo-student.idle`
- `character.crescent-youth.idle`

### Portraits

- ナギ5表情、駅員2表情、乗客5人×通常/解放後。
- 安定したspeaker IDから明示的に解決し、表示名から推測しない。

### Shared lost items

- `item.red-umbrella`
- `item.star-bento`
- `item.cassette-player`
- `item.silver-hairclip`
- `item.faded-photo-sticker`
- `item.blank-ticket`

同じ基準画像をworld、取得、所持品、記憶へスケール違いで使う。PhaserとDOMのkey-to-path対応は同一でなければならない。

### Story stills

- `memory.*` 6件。
- `ui.title.key-visual`、`ui.final-choice.key-visual`。
- `ending.last-train`、`ending.first-train`、`ending.rain-shelter`。

## Loading and fallback

1. Art preload sceneが `phaser|both` を登録する。
2. `loaderror` はキー単位で記録し、ゲーム起動は止めない。
3. 背景欠落時は対象エリア全体を既存手続き背景へ戻す。
4. 人物・アイテム欠落時は対象だけ既存Phaser Graphicsへ戻す。
5. DOM画像はload成功後だけCSS fallbackを隠し、error時は壊れた画像アイコンを見せない。
6. Scene再起動時は既存texture/animationを再登録せず、listenerとtweenを破棄する。

## Budgets

- ランタイム静的画像合計: 12MB以下を必須目標。
- 各背景: 原則1MB未満。
- 各portrait: 原則400KB未満。
- 1120×630の不透明背景: WebP。
- 透過人物・アイテム: 最適化WebPまたはPNG。
- 大型候補、ムードボード、編集元は `public` へ入れない。

## Provenance

- 全ランタイム画像は本プロジェクト向けに生成・編集したオリジナル。
- license値は `project-original`。
- 画像生成の視覚資料は本作の既存画面と本作向け生成物のみ。外部権利物を取り込まない。

## Verification

- 必須キー、一意性、全content ID網羅、ファイル存在、寸法、frame割り切り、budgetを単体テスト。
- `./` と `/rain-shelter-station/` のURL解決をテスト。
- E2Eで全画像を `Image.decode()` し、404、requestfailed、console error、page errorを失敗扱い。
- 1素材を意図的に404へしたrouteで、fallback後も移動・衝突・保存が継続することを確認。
