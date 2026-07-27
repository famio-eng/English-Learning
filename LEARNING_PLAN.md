# 英語学習計画

> 更新: 2026-07-26（6-7月の実績不足を踏まえて全面見直し）

## プロフィール
- TOEIC 750（約5年前）、その後継続学習なし
- 課題：リスニング（速度・長文理解）、スピーキング（瞬発力）
- 目標：米国・ドイツ同僚との会議・1on1、9月第3週の海外旅行

## 学習システム

### ツールの役割分担
- **ChatGPT（アプリ、無料プラン）**: 「英語学習」プロジェクト内でAdvanced Voice Modeを使い、教材の元になる内容を日本語で壁打ち。英語表現は考えさせず、内容の聞き出し・整理に専念させる（詳細はプロジェクトの「指示」欄を参照）
- **GitHub Issue**: ChatGPTが出力した下書きをそのまま貼り付ける受け渡し場所
- **Claude Code（Mac mini、Remote Control経由）**: Issueを読み、英語スクリプト・発音記号・和訳・ブレスグループ分割・単語帳追加まで仕上げてリポジトリに反映
- **シャドーイングアプリ / 単語帳アプリ**: 完成した教材で実際に練習

すべてスマホ/タブレットで完結する前提（ChatGPTアプリ・GitHubアプリ・Claude CodeへのDispatch/Remote Controlのみで完結）。

### ツール構成
- ChatGPTアプリ「英語学習」プロジェクト: 教材の壁打ち・対話練習
- シャドーイングアプリ: https://famio-eng.github.io/English-Learning/shadowing.html?k=YOUR_GEM_KEY&gh=YOUR_GH_TOKEN
- 単語帳アプリ: https://famio-eng.github.io/English-Learning/vocab.html?gh=YOUR_GH_TOKEN
- ダッシュボード: https://famio-eng.github.io/English-Learning/dashboard.html
- Claude Code（Mac mini）: 教材の仕上げ・アプリ更新・GitHub管理
- GitHub: https://github.com/famio-eng/English-Learning

### GitHubファイル構成
English-Learning/
├── shadowing.html    （シャドーイングアプリ・本体。SCRIPTS配列はここを更新する）
├── index.html        （旧シャドーイングアプリ。dashboard.htmlからは参照されていない。更新不要）
├── vocab.html        （単語帳アプリ）
├── dashboard.html     （進捗ダッシュボード）
├── DEVLOG.md         （開発記録）
├── LEARNING_PLAN.md  （本ファイル）
├── data/
│   ├── vocab.json    （単語データ・SM-2忘却曲線）
│   └── progress.json （スクリプトごとの進捗・シャドーイング設定）
├── records/          （学習記録JSON+Markdown）
└── recordings/       （録音データ .m4a/.webm）

### トークン管理ルール（厳守）
- コード内にトークンを直接書かない
- GH_TOKENとGEM_KEYは必ずURLパラメータから読み取る
- 理由: GitHubがPublicリポジトリのトークンを検知して自動無効化するため

### 登録済みスクリプト（shadowing.html、7本）
- short / casual / formal: 自己紹介（ショート・カジュアル・フォーマル）
- sop-status-report: SOPステータス報告
- pentest-alignment: ペネトレーションテスト方針の確認
- 510k-readiness: 510k申請に向けた準備状況の確認
- launch-status-update: 海外向け週次進捗報告（EU/US launch）

### 教材追加時の運用
1. ChatGPT「英語学習」プロジェクトで壁打ち（「今週の教材を準備したい」で開始）
2. まとまったらChatGPTが出力するテンプレート下書きをコピーし、GitHubのIssueとして投稿
3. Claude Codeセッションで「Issueのやつ処理して」と伝える
4. Claude Codeが英語化・発音記号・和訳・ブレスグループ分割を行った案を提示し、Famiが内容を確認・承認する
5. 承認後、Claude Codeがshadowing.htmlとdata/vocab.jsonに反映してpushし、そのままIssueもクローズする（Famiの内容承認がゲートであり、push/クローズ自体は都度あらためて確認を取らない。gh認証設定後はClaude Code側で完結可能。未設定の間はIssueのクローズのみGitHubアプリで手動対応）

### Pimsleur学習法の導入
- Anticipation: 日本語提示→数秒以内に英語で答える→確認、という形式をChatGPTとの通常会話練習に採用
- Core Vocabulary優先: 単語帳で中学英語・ネイティブ日常カテゴリを優先出題
- Organic Learning: 単語は必ずスクリプトの文脈と紐づけて学ぶ
- Graduated Interval Recall: SM-2で実装済み・継続

### 週次サイクル（2026-07-26改訂・現実的な最小構成）
6-7月に平日毎日+土曜60分のフル構成が続かなかったことを踏まえ、「週1回の固定セッションだけは必ず、それ以外は任意」に変更。

- **週1回・固定曜日（15〜20分）**: ChatGPTで教材の壁打り→GitHub Issueに投稿→Claude Codeで仕上げ。奇数週=ビジネス英語、偶数週=旅行英語（下記フェーズ参照）
- 平日、気が向いた時（5〜10分）: 直近追加されたスクリプトのシャドーイング1〜2周
- 平日、気が向いた時（5分）: 単語帳のSM-2復習（期限が来ている分だけ）
- 縛らない: 独り言・仕事中に英語を思い浮かべる習慣（できたら儲けもの程度）

## フェーズ構成（2026-07-26改訂）

6月中旬〜7月の実績がほぼ空白だったこと、旅行が9月第3週に迫っていることを踏まえ、「ビジネス英語→旅行英語」の順次進行から、**週替わりでの並行進行**に変更。

### ビジネス英語（奇数週）
1on1・週次進捗報告・国際会議・反論・提案などのシーンを継続。シャドーイング速度は無理のない範囲で段階的に上げる。

### 旅行英語（偶数週）
9月第3週の旅行に向け、以下のシーンを1回のセッションにつき1テーマずつ扱う（残り約8週間で偶数週4回想定、優先度順）:
1. 空港・入国審査
2. ホテルのチェックイン・トラブル対応
3. レストランでの注文
4. 道案内・ちょっとしたトラブル（忘れ物・遅延など）

アプリ側はスクリプトの区別が必要になったタイミングで「日常会話」タグ等の分類を検討する。

## 機密情報の取り扱い
教材作成時（ChatGPTとの壁打ち・Claude Codeでのスクリプト化、いずれも）に以下を含む場合は警告・マスク：
- 製品名・プロジェクト名の具体的な記載
- 数字（売上・予算・目標値など）
- 人名・組織名
- 未公開の技術情報

社内固有のプロセス名・用語（例:社内の変更管理プロセスの具体的な呼称）も、公開リポジトリに載せる練習用スクリプトでは一般化した表現に置き換え、実際の会議で話す際に本人が具体名に置き換える運用とする。
