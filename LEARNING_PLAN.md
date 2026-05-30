# 英語学習計画

## プロフィール
- TOEIC 750（約5年前）、その後継続学習なし
- 課題：リスニング（速度・長文理解）、スピーキング（瞬発力）
- 目標：米国・ドイツ同僚との会議・1on1、9月海外旅行

## 学習システム

### チャットの使い分け
- 英語学習コーチング及びアプリ開発: アプリ開発・環境構築・学習計画の更新
- 学習用チャット: 週次の壁打ち・スクリプト作成・Pimsleur式対話練習
  → 毎週土曜の学習はこちらで開始する

### ツール構成
- Claudeアプリ（iPad/iPhone）: 壁打ち・スクリプト作成・対話練習
- シャドーイングアプリ: https://famio-eng.github.io/English-Learning/?k=YOUR_GEM_KEY&gh=YOUR_GH_TOKEN
- 単語帳アプリ: https://famio-eng.github.io/English-Learning/vocab.html?gh=YOUR_GH_TOKEN
- Claude Code（Mac mini）: アプリ更新・GitHub管理
- GitHub: https://github.com/famio-eng/English-Learning

### GitHubファイル構成
English-Learning/
├── index.html        （シャドーイングアプリ）
├── vocab.html        （単語帳アプリ）
├── DEVLOG.md         （開発記録）
├── LEARNING_PLAN.md  （本ファイル）
├── data/
│   └── vocab.json    （単語データ・SM-2忘却曲線）
├── records/          （学習記録JSON+Markdown）
└── recordings/       （録音データ .m4a/.webm）

### トークン管理ルール（厳守）
- コード内にトークンを直接書かない
- GH_TOKENとGEM_KEYは必ずURLパラメータから読み取る
- 理由: GitHubがPublicリポジトリのトークンを検知して自動無効化するため

### 登録済みスクリプト（3本）
- short: 自己紹介 ショート版（1分）
- casual: 自己紹介 カジュアル版（2分）
- formal: 自己紹介 フォーマル版（3〜4分）

### スクリプト追加時の運用
1. 学習用チャットで壁打ち→スクリプト作成
2. 「アプリを更新して」と指示
3. Claude CodeがGitHubのindex.html（SCRIPTS配列）を更新
4. 単語はdata/vocab.jsonにも追記（難易度・詳細情報も設定）

### Pimsleur学習法の導入
- Anticipation: 水・木の対話練習を「日本語提示→3秒以内に英語で答える→確認」形式
- Core Vocabulary優先: 単語帳で中学英語・ネイティブ日常カテゴリを優先出題
- Organic Learning: 単語は必ずスクリプトの文脈と紐づけて学ぶ
- Graduated Interval Recall: SM-2で実装済み・継続

### 週次サイクル（改訂版）
- 土曜（60分）: 振り返り→スクリプト作成→初回練習→アプリ更新→単語初回学習
- 日曜（30分）: シャドーイング0.7倍速3回通し→単語復習
- 月・火（20分）: シャドーイング（速度を段階的に上げる）→録音→AI評価
- 水・木（20分）: Pimsleur式対話練習（日本語→3秒以内に英語）
- 金（15分）: SM-2に従った単語復習（Core Vocabulary優先）
- 毎日10分: 日本語を思い浮かべながら英語で独り言

## 9月までのフェーズ

### Phase 1（〜7月）: 基盤づくり
自己紹介・進捗報告・聞き返しフレーズ・遅延の説明など
→ スピーキングの瞬発力と基本ビジネス表現の定着

### Phase 2（7〜8月）: 実践強化
1on1・国際会議・反論・提案シナリオ
→ シャドーイング速度を1.2倍へ、アドリブ対応力を鍛える

### Phase 3（9月直前）: 仕上げ
旅行英語1週間集中＋過去の苦手を総復習
※English Easy Practice（@EnglishEasyPractice）スタイルの
日常会話スクリプトを追加（カフェ・道案内・ホテル・ショッピング）

## 機密情報の取り扱い
スクリプト作成時に以下を含む場合は警告・マスク：
- 製品名・プロジェクト名の具体的な記載
- 数字（売上・予算・目標値など）
- 人名・組織名
- 未公開の技術情報
