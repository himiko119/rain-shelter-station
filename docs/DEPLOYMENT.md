# 公開・本番確認記録

実施日: 2026-07-14（Asia/Tokyo）

## 公開先

- 公開URL: <https://himiko119.github.io/rain-shelter-station/>
- GitHub: <https://github.com/himiko119/rain-shelter-station>
- 公開ブランチ: `codex/rain-shelter-station-game`
- 配信方式: GitHub Pages / GitHub Actions

リポジトリへのPushを起点に、Node.js 22で `npm ci` と `npm run build` を実行し、`dist` をGitHub Pagesへ配信する。Pages対応のためリポジトリは公開設定とした。ワークフローは `actions/checkout@v7`、`actions/setup-node@v6`、`actions/upload-pages-artifact@v5`、`actions/deploy-pages@v5` を使用する。

VercelはGitHub OAuthの本人ログインが必要だったため、自律実行できる代替としてGitHub Pagesを選択した。Vercelへ移す場合も、リポジトリをImportし、Build commandを `npm run build`、Output directoryを `dist`、Install commandを `npm install` とすればよい。環境変数は不要。

## 本番スモークテスト

公開URLに対して、通常の画面操作とネットワーク監視を行った。開発専用E2E bridgeは本番bundleに含めていない。

| 環境 | 確認内容 | 結果 |
| --- | --- | --- |
| Playwright Chromium 149.0.7827.55 / 1280×720 | タイトル表示、開始、CanvasとDOM HUD、初回クリック後のWeb Audio、localStorage保存、再読込後の続行 | 合格 |
| Playwright Chromium 149.0.7827.55 / 390×844 touch | 導入会話、操作説明、タッチ方向入力、ノート開閉、CanvasとタッチUIの表示範囲、横スクロール | 合格 |
| Microsoft Edge 150.0.4078.65 / 1280×720 | タイトル表示、開始、CanvasとDOM HUD、保存、再読込後の続行、favicon | 合格 |

- Web Audioは最初のポインター操作後にAudioContextが `suspended` から `running` へ遷移した。
- 390px幅ではdocument幅が390pxに収まり、Canvasは左右0〜390px、タッチ操作部は左右14〜376pxの範囲に収まった。
- JavaScript、CSS、faviconを含む配信ファイルの404、request failure、page error、console errorは最終確認で0件だった。
- favicon未指定によるEdgeの `/favicon.ico` 404を検出し、`public/favicon.svg` と相対URLのlinkを追加して解消した。

## 本番スクリーンショット

| ファイル | 環境 | 目視結果 |
| --- | --- | --- |
| `artifacts/playtest/11-production-desktop-1280x720.png` | Chromium desktop | Canvas、HUD、導入会話が描画され、文字欠けや重なりなし |
| `artifacts/playtest/12-production-mobile-390x844.png` | Chromium mobile touch | letterbox、目的、操作UIが分離され、横はみ出しなし |
| `artifacts/playtest/13-production-edge-1280x720.png` | Microsoft Edge | Chromium版と同等にCanvas、HUD、導入会話を描画 |

## 残る非ブロッカー

- Firefox / WebKitはChromium・Edgeと同じ深さでは確認していない。
- Phaserを含む単一bundleはViteの500 kB警告対象だが、ビルド、配信、初期表示は成功している。読み込み時間が問題になった場合に遅延読み込みを検討する。
