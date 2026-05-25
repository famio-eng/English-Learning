# 英語学習アプリ開発記録

## 2026-05-25 環境構築・初回セッション

### 構築した環境
- GitHub Pages（Publicリポジトリ）でホスティング
- 対象デバイス: iPad Chrome（マイク録音のため）
- トークン管理: URLパラメータ方式（GitHubの自動無効化を回避）
- シャドーイングアプリURL: https://famio-eng.github.io/English-Learning/?k=GEMINI_KEY&gh=GH_TOKEN
- 単語帳アプリURL: https://famio-eng.github.io/English-Learning/vocab.html?gh=GH_TOKEN

### 試行錯誤の経緯
- Claudeアプリ内Artifact → マイクNG
- Artifact公開リンク → マイクNG
- SafariでローカルHTML → iOS制限で開けない
- GitHub Publicリポジトリにトークン直書き → GitHubが自動無効化
- 解決策: URLパラメータでトークンを渡す方式に落ち着く

### APIキー問題の経緯
- NotionAPI → セキュリティリスクで廃止・GitHub一本化
- Claude API → 要課金（Proサブスクとは別請求）
- Gemini API → 無料枠あり・採用
  - gemini-1.5-flash → 廃止済みでエラー
  - gemini-2.0-flash → 無料枠0でエラー
  - gemini-2.5-flash → 動作確認済み ✅
  - APIキーはURLパラメータ?kで渡す

### 作成したファイル
- index.html: シャドーイングアプリ
  - 3スクリプト内蔵（short/casual/formal: 自己紹介3バージョン）
  - 録音→Gemini 2.5 Flash AI評価→具体的フィードバック
  - 息継ぎガイド（/マーカー、toggleBreath()）
  - onboundaryイベントによる単語ハイライト
  - 録音完了後に再生プレイヤー表示
  - 評価後も録音再生可能（lastRecDataUrl変数）
  - 503エラー時は「再評価する」ボタン表示（録音保持）
  - 記録タブ（評価詳細・録音再生・タップで展開）
  - GitHub APIで学習記録保存（records/YYYY-MM-DD-HH-MM.md）
- vocab.html: 単語帳アプリ
  - data/vocab.jsonからGitHub rawで単語データ読み込み
  - SM-2忘却曲線アルゴリズム（もう一度/難しい/OK/完璧）
  - カードフリップ式（表:英語、裏:意味+例文+発音）
  - スクリプト別グループ表示（一覧タブ）
  - 進捗保存はGitHub APIで（?ghパラメータからGH_TOKEN読み取り要）
- data/vocab.json: 単語データ21語（3スクリプト分）

### 既知の問題・未実装
- 録音ファイルがrecordings/に保存されるがファイル名にスクリプトIDが入っていない
  - 現在: recordings/YYYY-MM-DD-HH-MM-mode.m4a
  - 修正が必要: recordings/YYYY-MM-DD-HH-MM-{scriptId}-{mode}.m4a
- 記録タブで過去の録音（GitHub保存分）を再生する機能が未実装
- vocab.htmlのGH_TOKENがURLパラメータ対応未済

### 技術仕様・注意事項
- JS変数名: historyはwindow.historyと衝突するためpracticeHistoryを使用
- 録音: MediaRecorder（audio/mp4 or audio/webm、デバイスで自動選択）
- ハイライト: SpeechSynthesisUtterance.onboundaryイベント
- 記録保存: GitHub Contents API（PUT）
- 忘却曲線: SM-2アルゴリズム
- 必ずNode.jsで構文チェック後にコミット

---

## 2026-05-25 セッション2: タスク1〜4完了

### ✅ タスク1: vocab.html + data/vocab.json 追加
- vocab.html をリポジトリに追加
- data/vocab.json（21語）をリポジトリに追加
- recordings/ フォルダも作成済み（3件の録音あり）

### ✅ タスク2: vocab.html GH_TOKEN URLパラメータ対応
- `var GH_TOKEN = new URLSearchParams(...).get('gh') || ''` を追加
- `saveToGitHub()` 関数を新規実装（SHA取得→PUT で data/vocab.json に進捗保存）
- ヘッダーに 💾 ボタン追加（GH_TOKEN有り時のみ表示）
- 復習完了画面: GH_TOKEN有り→「💾 GitHubに保存」/ なし→「📤 バックアップ」
- 既存バグ修正: speakWord呼び出しの文字列結合ミス（Node.js --check で検出）
- アクセスURL: https://famio-eng.github.io/English-Learning/vocab.html?gh=GH_TOKEN

### ✅ タスク3: 録音ファイル名にscriptId追加（セッション1末に実装済み）
- `autoSaveRecording(mode)` に `current.id` を組み込み
- 新形式: `recordings/YYYY-MM-DD-HH-MM-{scriptId}-{mode}.ext`
  例: `recordings/2026-05-25-21-30-short-reading.m4a`
- 旧形式（3件: scriptIdなし）は `loadPastRecordings()` で後方互換表示

### ✅ タスク4: 記録タブで過去の録音を再生（セッション1末に実装済み）
- `renderProgress()` に「🎙 過去の録音」セクションを追加
- `loadPastRecordings()`: GitHub API で recordings/ 一覧取得（最新20件）
- ファイル名パース: `scriptTitleMap` でスクリプト名解決
  表示例: `🎧 シャドーイング · 自己紹介 ショート版 · 2026/05/25 16:35`
- audio タグで raw.githubusercontent.com から直接再生

### 現在のファイル構成
```
English-Learning/
├── index.html        ✅ シャドーイングアプリ（録音→AI評価→GitHub保存）
├── vocab.html        ✅ 単語帳アプリ（SM-2・GitHub進捗保存）
├── DEVLOG.md         ✅ 開発記録（本ファイル）
├── data/
│   └── vocab.json    ✅ 21語（3スクリプト分）
├── records/          ✅ 学習記録Markdown（2件）
└── recordings/       ✅ 録音データ（3件: 旧形式.m4a）
```

### 残タスク
- [ ] タスク5: claude-external-brain の context.md に英語学習プロジェクト情報を追記

---

## 次にやること（優先順）

### 1. vocab.htmlとdata/vocab.jsonをGitHubに追加
現在リポジトリにはindex.htmlのみ存在する。

### 2. vocab.htmlのGH_TOKENをURLパラメータ対応に修正
- 現在: GH_TOKENがハードコード
- 修正後: var GH_TOKEN = new URLSearchParams(window.location.search).get('gh') || '';
- アクセスURL: https://famio-eng.github.io/English-Learning/vocab.html?gh=GH_TOKEN

### 3. 録音ファイル名にスクリプトIDを追加
- 現在: recordings/YYYY-MM-DD-HH-MM-mode.m4a
- 修正後: recordings/YYYY-MM-DD-HH-MM-{scriptId}-{mode}.webm
  例: recordings/2026-05-25-21-30-short-reading.webm
  scriptIdはSCRIPTS配列のid（short/casual/formal）

### 4. 記録タブで過去の録音を再生
- GitHub APIでrecordings/フォルダのファイル一覧取得
- ファイル名からスクリプト名・モード・日時を表示
- audioタグで再生

### 5. claude-external-brainのプロジェクト指示を更新
famio-eng/claude-external-brain の Claude/context.md に以下を追記：

```
# 英語学習プロジェクト

## ツール構成
- Claudeアプリ（iPad/iPhone）: 壁打ち・スクリプト作成・対話練習
- シャドーイングアプリ: https://famio-eng.github.io/English-Learning/?k=GEMINI_KEY&gh=GH_TOKEN
- 単語帳アプリ: https://famio-eng.github.io/English-Learning/vocab.html?gh=GH_TOKEN
- Claude Code（Mac mini）: アプリ更新・GitHub管理
- GitHub: https://github.com/famio-eng/English-Learning

## GitHubファイル構成
English-Learning/
├── index.html        （シャドーイングアプリ）
├── vocab.html        （単語帳アプリ）
├── DEVLOG.md         （開発記録）
├── data/
│   └── vocab.json    （単語データ・SM-2忘却曲線）
├── records/          （学習記録Markdown）
└── recordings/       （録音データ .m4a/.webm）

## トークン管理ルール（厳守）
- コード内にトークンを直接書かない
- GH_TOKENとGEM_KEYは必ずURLパラメータから読み取る
- 理由: GitHubがPublicリポジトリのトークンを検知して自動無効化するため

## 登録済みスクリプト（3本）
- short: 自己紹介 ショート版（1分）
- casual: 自己紹介 カジュアル版（2分）
- formal: 自己紹介 フォーマル版（3〜4分）

## スクリプト追加時の運用
1. Claudeアプリで壁打ち→スクリプト作成
2. 「アプリを更新して」と指示
3. Claude CodeがGitHubのindex.html（SCRIPTS配列）を更新
4. 単語はdata/vocab.jsonにも追記

## 9月までのフェーズ
- Phase 1（〜7月）: 基盤づくり（自己紹介・進捗報告・聞き返しフレーズ）
- Phase 2（7〜8月）: 実践強化（1on1・会議・提案シナリオ）
- Phase 3（9月直前）: 旅行英語1週間集中＋総復習
```
