# 公開手順と本番確認 — Visual Overhaul V2

## 現在の状態

| 項目 | 値 |
| --- | --- |
| 既存公開URL | <https://himiko119.github.io/rain-shelter-station/> |
| GitHub repository | <https://github.com/himiko119/rain-shelter-station> |
| 作業／保存branch | `codex/visual-overhaul-v2` |
| workflowの自動trigger branch | `codex/rain-shelter-station-game` |
| GitHub Pages反映 | 完了 |
| 公開URLスモークテスト | 3環境すべて合格 |
| GitHub Actions run | [29304611687](https://github.com/himiko119/rain-shelter-station/actions/runs/29304611687) |
| Visual release commit | `0704a5b1416e8e2bb7f853b234e87476f74a29e2` |
| Pages deployment ID | `5434973792` |
| Deploy完了 | 2026-07-14 12:54:24（Asia/Tokyo） |
| 本番スモーク完了 | 2026-07-14 12:55:18（Asia/Tokyo） |

`codex/visual-overhaul-v2`を`codex/rain-shelter-station-game`へfast-forwardし、visual release commit `0704a5b`をGitHub Pagesへ配信した。`artifacts/playtest/11-production-desktop-1280x720.png`〜`13-production-edge-1280x720.png`は、この公開版を実URLから撮影し直した本番証跡である。

## 今回の公開結果

- `codex/visual-overhaul-v2`をremoteへ保存した。
- 公開branchを`21a9ae9`から`0704a5b`へfast-forwardし、force pushなしで更新した。
- Actions build jobは17秒、deploy jobは8秒で成功した。
- Pages deployment `5434973792`はvisual release SHAと一致した。
- HTTPS公開URLへ`npm run verify:live`を実行し、Chromium desktop、Chromium mobile touch、Edge desktopがすべて合格した。
- 3環境とも初回操作後のAudioContextは`running`、save/reloadは成功、HTTP 4xx/5xx、request failure、page error、console errorは0件だった。

## Release candidateの内容

今回のbranchは、gameplay artworkを外部画像からloadせず、Phaser GraphicsとDOM/CSSだけで生成する。

- 5 areaのprocedural background
- playable Nagi、駅員、5人の乗客、鏡側Nagi
- 6 itemのworld shapeとDOM sketch
- dialogue portrait、notebook、inventory、memory、final choice、3 ending
- rain、lamp glow、wet reflection
- desktop fixed camera、tablet／portrait follow camera
- 390×844のsafe cameraとobjective／touch controls分離

save schemaは変更しておらず、`saveVersion: 1`と`rain-shelter-station.save.v1`を継続する。

## 現行GitHub Pages workflow

workflowは`.github/workflows/deploy-pages.yml`にある。

### Trigger

- `codex/rain-shelter-station-game`へのpush
- `workflow_dispatch`による手動実行

`codex/visual-overhaul-v2`をpushしただけでは、自動trigger branchが異なるためdeployは始まらない。公開時は次のいずれかを、差分確認後に明示的に選ぶ。

1. visual overhaulを`codex/rain-shelter-station-game`へ統合してpushする。
2. 別のreviewed changeでworkflowのtrigger branchを意図したrelease branchへ変更する。
3. `workflow_dispatch`でvisual overhaulのcommit／refを明示して手動実行する。

今回は方法1を実施し、fast-forward後のpushでworkflowを開始した。

### Build / deploy job

| Step | Current configuration |
| --- | --- |
| Checkout | `actions/checkout@v7` |
| Node | `actions/setup-node@v6` / Node.js 22 / npm cache |
| Install | `npm ci` |
| Build | `npm run build` |
| Artifact | `actions/upload-pages-artifact@v5`、`dist` |
| Deploy | `actions/deploy-pages@v5` |

workflow permissionsは`contents: read`、`pages: write`、`id-token: write`。Pages environment名は`github-pages`。環境変数とproduction secretは不要である。

Viteは`base: "./"`、build targetは`es2022`、sourcemap有効。相対baseのためrepository subpathのPages URLでassetを解決する。

現行workflowが実行するのはTypeScriptを含む`npm run build`だけであり、ESLint、Vitest、Playwright、`verify:prod`はjob内にない。公開前にローカルで全検証を済ませる必要がある。

## 公開前ローカル検証

実行順:

~~~powershell
npm ci
npx playwright install chromium
npm run check
npm run test:e2e
~~~

`npm run check`は次を実行する。

~~~text
lint
typecheck
Vitest
production build
production sentinel scan
~~~

今回の最終ローカル結果:

| Check | Result |
| --- | --- |
| `npm run check` | 成功 |
| ESLint | 成功 |
| TypeScript | 成功 |
| Vitest | 7 files / 57 tests 成功 |
| Vite production build | 成功 |
| `verify:prod` | production JavaScript 1 bundle、E2E／DEV sentinelなし |
| `npm run test:e2e` | 6 files / 11 tests中11件成功 |
| visual evidence | before 15枚 / after 20枚 |

### Build output

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| HTML | 0.68 kB | 0.46 kB |
| JavaScript | 1,372.22 kB | 370.74 kB |
| JavaScript source map | 10,288.55 kB | — |
| CSS | 57.64 kB | 13.29 kB |

Vite warningは、Phaserを含むJavaScript chunkが500 kBを超えるという非失敗warningだけである。CSS、asset resolution、TypeScript、sentinel scanのerrorではない。

## Mobile release gate

390×844ではportrait cameraを全画面の裏へ敷かず、UI-safe viewportへ制限する。

| Value | Final |
| --- | ---: |
| zoom | 1.32 |
| camera viewport top | 62 px |
| camera viewport height | 478.16 px |
| camera viewport bottom | 約540.16 px |
| safe bottom inset | 303.84 px（profile request 304 px） |
| objective / controls | objective bottom ≤ controls top |
| touch target | 44×44 px以上 |

E2Eはscreen Y=670のcamera外tapでplayerが移動しないことも確認する。公開後も同じviewportで、Canvas下端、objective、direction pad、interact buttonが重ならないことを再確認する。

## Publish procedure

1. `git status`で意図したsource、docs、artifactだけが対象であることを確認する。
2. `node_modules`、`dist`、Playwright temporary outputをcommit対象にしない。
3. 意味のあるcommitを作り、選択したrelease refへpushする。
4. GitHub ActionsのPages workflowを開始する。
5. build jobの`npm ci`、`npm run build`、artifact uploadを確認する。
6. deploy jobのPages environment URLを確認する。
7. run ID、commit SHA、deploy時刻、公開URLを本書へ追記する。
8. 下記のproduction smoke testを行う。
9. 全項目が成功してからREADMEの公開状態注記を更新する。

公開前は未発行のrun ID、commit SHA、最終時刻を先に書かず、workflowと本番スモーク完了後に実値を追記した。

## Production smoke test

### Desktop 1280×720

- 公開URLがHTTP 200で開く。
- title logo、station scene、4 menuが表示される。
- 「はじめから」でCanvas、Nagi、HUD、objectiveが表示される。
- keyboard移動、interact、dialogue、notebook、inventoryが動作する。
- 最初のuser gesture後にWeb Audioが開始する。
- save後のreloadで「つづきから」が有効になる。
- JavaScript、CSS、faviconに404／request failureがない。
- page errorと重大なconsole errorがない。

### Mobile 390×844 touch

- documentとbodyに横scrollがない。
- camera viewport下端が約540pxで、objectiveとtouch controlsに重ならない。
- direction pad、interact、notebook、inventory、pauseが動作する。
- 全touch targetが44×44px以上である。
- camera外のUI領域tapがworld移動へ変換されない。
- dialogue、notebook、inventoryで本文やclose buttonが切れない。

### Save / production-only checks

- storage keyは`rain-shelter-station.save.v1`。
- 旧`saveVersion: 1` dataをそのまま復元できる。
- save削除後にreloadしても削除前stateが復活しない。
- source bundleに`__RAIN_SHELTER_E2E__`と`__RAIN_SHELTER_DEV_PANEL__`がない。
- debug panel、named scenario UI、任意state injectionが公開画面にない。

## Production evidence

公開確認後に、最低限次を記録する。

| Evidence | Current |
| --- | --- |
| GitHub Actions run URL / ID | [29304611687](https://github.com/himiko119/rain-shelter-station/actions/runs/29304611687) / success |
| deployed commit SHA | `0704a5b1416e8e2bb7f853b234e87476f74a29e2` |
| Pages deployment timestamp | 2026-07-14 12:54:24（Asia/Tokyo） |
| desktop screenshot | `artifacts/playtest/11-production-desktop-1280x720.png`、目視合格 |
| mobile screenshot | `artifacts/playtest/12-production-mobile-390x844.png`、目視合格 |
| Edge smoke result | Edge 150.0.4078.65、合格 |
| network / console summary | 3環境とも0 error |

`npm run verify:live`は、検査した最新公開版の証跡として既存`artifacts/playtest/11-*`〜`13-*`を更新する。公開前のローカルpreview結果はcommitせず、公開URLに対する3環境検査が成功した後の画像だけを記録する。

## Rollback

本番で進行不能、blank screen、asset 404、save破損が見つかった場合は、既知の正常commitを同じPages workflowで再deployする。今回save schemaは変わらないため、visual overhaulをrollbackしてもschema migrationの巻き戻しは不要である。

## Remaining non-blockers

- Firefox／WebKitはChromiumと同じ深さでは未確認。
- Phaserを含む単一JavaScript chunkは大きい。初期loadが実測で問題になった時にcode splittingを検討する。
- system font差によりworld labelとDOM textの字幅が変わる可能性がある。
- Web Audioはbrowserのautoplay policyに従い、最初のuser gesture後に開始する。
