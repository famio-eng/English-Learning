// Shared auth/GitHub/Gemini helpers, extracted from dashboard.html / shadowing.html /
// vocab.html / dialogue.html (each had its own copy of this exact logic).
(function (global) {
  'use strict';

  var _qs = new URLSearchParams(window.location.search);

  // 2026-11-26: トークンをURLの?gh=/?k=に埋め込む方式をやめ、ログイン画面(フォーム
  // +パスワードマネージャー連携)に移行する。過去に実際にclassic PATの漏洩が
  // 検知された経緯(リポジトリIssue #1)もあり、URLに残り続ける・共有時に見えて
  // しまう形は避ける。保存先はsessionStorage(タブを閉じるまで)がデフォルトで、
  // ログイン画面の「この端末を記憶」を選んだ時だけlocalStorageに保存する。
  // 移行期間中は、?gh=のURLパラメータ(旧classic PAT)もフォールバックとして
  // 引き続き受け付ける(ログイン画面経由の新トークンでのログインが確認でき次第、
  // Famiに旧トークンの失効をお願いする)。
  var SESSION_TOKEN_KEY = 'gh_token_session';
  var REMEMBER_TOKEN_KEY = 'gh_token_remembered';
  function readStoredToken() {
    try { return sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(REMEMBER_TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function saveToken(token, remember) {
    try {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      if (remember) localStorage.setItem(REMEMBER_TOKEN_KEY, token);
      else localStorage.removeItem(REMEMBER_TOKEN_KEY);
    } catch (e) {}
  }
  function clearStoredToken() {
    try { sessionStorage.removeItem(SESSION_TOKEN_KEY); localStorage.removeItem(REMEMBER_TOKEN_KEY); } catch (e) {}
  }

  var GH_TOKEN = readStoredToken() || _qs.get('gh') || '';
  var GEM_KEY = _qs.get('k') || ''; // 移行期間の後方互換用。ログイン後はconfig/secrets.jsonから取得する(下記)。
  // データ(vocab/progress/records/recordings)は非公開リポジトリへ分離する予定。
  // アプリ自身(html/js/css)はGitHub Pagesが静的配信するだけで実行時にAPIで読み書き
  // しないため、ここのGH_OWNER/GH_REPOは「データの保存先」だけを指す。改名作業が
  // 完了するまでは、ローカル・移行前テスト用に現在の公開リポジトリ名のままにして
  // あり、改名完了時にこの2行だけ新しいデータリポジトリ名へ差し替える。
  var GH_OWNER = 'famio-eng';
  var GH_REPO = 'English-Learning-data'; // 2026-11-27: 非公開データリポジトリへ移行済み
  var GH_API = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/';
  var GEM_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  // 2026-11-27(Famiが新しいGeminiキーで実機確認・Mac上でcurl直接検証した結果):
  //  - gemini-2.5-flash / gemini-2.5-flash-lite: 新しいキーは新規プロジェクト扱いで、
  //    どちらも404「is no longer available to new users」。新しいキーでは一切使えない
  //    ため、フォールバック候補から完全に除外した。
  //  - gemini-3.5-flash-lite: 200 OK、0.7秒。最速・最安定、最初に試す。
  //  - gemini-3.6-flash: 応答はするがthinkingConfig次第で非常に遅くなる(後述)。
  //    2番目の予備。
  //  - gemini-3.8-flash: 503(混雑)はあるが実在し応答する。3番目の予備。
  //  - gemini-3.8-flash-lite: 404(存在しないモデル名)。候補に入れない。
  // thinkingConfigの扱い(モデルごとに異なる、THINKING_LEVEL_BY_MODEL参照)と合わせて
  // 修正した。
  var GEM_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];

  function b64EncodeUtf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  }

  // GET a file's parsed JSON (or raw text) + sha from the GitHub Contents API.
  function apiGet(path) {
    return fetch(GH_API + path, {
      headers: GH_TOKEN ? { Authorization: 'Bearer ' + GH_TOKEN } : {},
    }).then(function (res) {
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('GitHub GET ' + path + ' failed: ' + res.status);
      }
      return res.json();
    });
  }

  function apiGetJson(path) {
    return apiGet(path).then(function (file) {
      if (!file) return null;
      return JSON.parse(b64DecodeUtf8(file.content));
    });
  }

  // GET-then-PUT with sha, so concurrent edits from other devices don't clobber each other.
  // `mutate(current)` receives the current parsed object (or null if the file doesn't exist
  // yet) and must return the object to write.
  function apiPutJson(path, mutate, message) {
    return apiGet(path).then(function (file) {
      var current = file ? JSON.parse(b64DecodeUtf8(file.content)) : null;
      var next = mutate(current);
      var body = {
        message: message,
        content: b64EncodeUtf8(JSON.stringify(next, null, 2)),
      };
      if (file && file.sha) body.sha = file.sha;
      return fetch(GH_API + path, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + GH_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }).then(function (res) {
        if (!res.ok) throw new Error('GitHub PUT ' + path + ' failed: ' + res.status);
        return res.json();
      }).then(function () {
        return next;
      });
    });
  }

  // PUT raw binary/base64 content (recordings) as a brand-new file — no sha lookup, since
  // filenames are timestamped and never collide.
  function apiPutBinary(path, base64Content, message) {
    return fetch(GH_API + path, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + GH_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message, content: base64Content }),
    }).then(function (res) {
      if (!res.ok) throw new Error('GitHub PUT ' + path + ' failed: ' + res.status);
      return res.json();
    });
  }

  function apiListDir(path) {
    return apiGet(path).then(function (listing) {
      return listing || [];
    });
  }

  // 2026-11-27(Famiが新しいGeminiキーで実機確認・Mac上でcurl直接検証): 新しいキーは
  // 新規プロジェクト扱いで、2.5系モデルは「no longer available to new users」で404。
  // またGemini 3系はthinkingConfig.thinkingBudget(2.5系の指定方法)を受け付けず、
  // 400 INVALID_ARGUMENTになる(公式ドキュメントのControlling thinkingページで、
  // 3系はthinkingConfig.thinkingLevel(minimal/low/medium/high)に変わったことを確認)。
  // モデルごとに対応レベルが違う: gemini-3.5-flash-liteはデフォルトが既に最速のminimal
  // なので、thinkingConfig自体を付けないのが最も安全(実機テストでも、付けると400・
  // 外すと200で確認済み)。gemini-3.6-flashはデフォルトmedium(=厚く考えて遅い)なので
  // 明示的にminimalを指定。gemini-3.8-flashはminimal非対応なので最速でもlow。
  // 呼び出し元(gradeDrillAnswer等)が渡すgenerationConfig.thinkingConfigは無視し、
  // ここでモデルごとに必ず正しい値へ差し替える(対象は採点・辞書・単語解説等、
  // callGeminiWithFallback/callGeminiTextを使う全機能)。
  var THINKING_LEVEL_BY_MODEL = {
    'gemini-3.5-flash-lite': null, // 付けない(デフォルトのminimalが最速)
    'gemini-3.6-flash': 'minimal',
    'gemini-3.8-flash': 'low', // minimal非対応のため
  };
  function applyThinkingConfig(payload, model) {
    var next = Object.assign({}, payload, { generationConfig: Object.assign({}, payload.generationConfig) });
    var level = THINKING_LEVEL_BY_MODEL[model];
    if (level) next.generationConfig.thinkingConfig = { thinkingLevel: level };
    else delete next.generationConfig.thinkingConfig;
    return next;
  }

  // Calls Gemini, retrying across GEM_MODELS on quota/availability errors (429/503/404,
  // or messages containing quota/unavailable/overloaded/not found/not supported/deprecated)。
  // 2026-11-25: fetchに一切タイムアウトがなく、通信が詰まるとPromiseが永遠に未解決の
  // ままになる(「AI採点中…」から抜けられない)不具合への対応でAbortControllerを導入。
  // 2026-11-27(Famiの実機確認): 当初はタイムアウトを「他モデルに切り替えても改善しない
  // 可能性が高い」として__final(即時失敗)にしていたが、実際にはモデル固有の挙動
  // (例: gemini-3.6-flashがthinking設定次第で非常に遅く応答すること)が原因で特定の
  // モデルだけがタイムアウトするケースがあり、切り替えれば直ることが判明。タイムアウトも
  // 他の失敗理由と同様に次のモデルへ切り替えるようにし、1回あたりの待ち時間は15秒に
  // 短縮する(3モデル×15秒・リトライ待ち込みで最大1分弱に収める)。
  function callGeminiWithFallback(payload) {
    var RETRYABLE = /quota|unavailable|overloaded|not found|not supported|deprecated/i;
    // 2026-11-26(Famiの指摘「採点が止まっているように感じる」の調査): キー無効・権限
    // エラーは全モデル共通の問題なので、他モデルに切り替えても直らない。以前はこの
    // 種のエラーも他のエラーと同様に2秒待って次のモデルへ再試行していたため、キーが
    // 無効な状態では「毎回必ず数秒〜十数秒待たされてから失敗する」が常に再現して
    // いた可能性がある。即座に失敗を確定させ、無駄な再試行で待たせないようにする。
    var PERMANENT = /api key not valid|api_key_invalid|permission.denied|unauthenticated/i;
    var TIMEOUT_MS = 15000;
    var lastDetail = '';
    function attempt(i) {
      if (i >= GEM_MODELS.length) {
        var finalErr = new Error('全モデルで失敗' + (lastDetail ? '(' + lastDetail + ')' : ''));
        finalErr.__final = true;
        return Promise.reject(finalErr);
      }
      var model = GEM_MODELS[i];
      var modelPayload = applyThinkingConfig(payload, model);
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timedOut = false;
      var timer = controller ? setTimeout(function () { timedOut = true; controller.abort(); }, TIMEOUT_MS) : null;
      return fetch(GEM_BASE + model + ':generateContent?key=' + GEM_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelPayload),
        signal: controller ? controller.signal : undefined,
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        if (res.status === 429 || res.status === 503 || res.status === 404) {
          lastDetail = 'HTTP ' + res.status;
          return new Promise(function (resolve) { setTimeout(resolve, 2000); }).then(function () {
            return attempt(i + 1);
          });
        }
        return res.json().then(function (json) {
          if (json.error && RETRYABLE.test(json.error.message || '')) {
            lastDetail = (json.error.message || '').slice(0, 50);
            return new Promise(function (resolve) { setTimeout(resolve, 2000); }).then(function () {
              return attempt(i + 1);
            });
          }
          if (json.error) {
            var permErr = new Error(json.error.message || 'Gemini error');
            if (PERMANENT.test(json.error.message || '')) permErr.__final = true;
            throw permErr;
          }
          return json;
        });
      }).catch(function (err) {
        if (timer) clearTimeout(timer);
        // __finalは、より深い再帰呼び出しで既に確定・分類済みのエラー
        // (APIキー無効等のPERMANENT判定、または全モデル失敗の最終メッセージ)で
        // あることを示す。タイムアウトはモデル固有の遅さが原因のこともあるため
        // __finalにはしない(下のlastDetail設定を経て次のモデルへ再試行する)。
        // ここでさらにリトライ扱いにして上書き・二重ラップしないよう、__finalだけは
        // 素通しする(この.catchは自分のfetch呼び出しだけでなく、同じ.then内で
        // さらにattempt(i+1)を呼んだ結果のrejectionも拾ってしまうチェーン構造のため)。
        if (err && err.__final) throw err;
        lastDetail = timedOut
          ? (TIMEOUT_MS / 1000) + '秒応答なし(' + model + ')'
          : ((err && err.name === 'TypeError') ? 'ネットワークエラー' : ((err && err.message) ? err.message.slice(0, 50) : '不明なエラー'));
        return new Promise(function (resolve) { setTimeout(resolve, 2000); }).then(function () {
          return attempt(i + 1);
        });
      });
    }
    if (!GEM_KEY) return Promise.reject(new Error('Geminiキーが設定されていません'));
    return attempt(0);
  }

  function callGeminiText(parts, opts) {
    var payload = {
      contents: [{ parts: parts }],
      generationConfig: Object.assign({ temperature: 0.4, maxOutputTokens: 2048 }, opts || {}),
    };
    return callGeminiWithFallback(payload).then(function (json) {
      var cands = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
      return cands.map(function (p) { return p.text || ''; }).join('');
    });
  }

  function parseJsonFromModelText(text) {
    var cleaned = text.replace(/```json/g, '').replace(/```/g, '');
    var match = cleaned.match(/\{[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('モデル応答からJSONを抽出できませんでした');
    return JSON.parse(match[0]);
  }

  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Lucide風の線画アイコン一式(2026-11-22追加)。絵文字を全面的に置き換えるための
  // 共通ヘルパー。CDN依存を避け、フォント差・オフライン・ライト/ダーク配色
  // (stroke="currentColor"でテキスト色に追従)を優先してインラインSVGで持つ。
  var ICON_PATHS = {
    check: '<polyline points="20 6 9 17 4 12"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><polyline points="16 9.5 10.5 15 8 12.5"/>',
    thumbsUp: '<path d="M7 11v9"/><path d="M10.5 6 11 11h7.2a2 2 0 0 1 1.9 2.6l-1.8 6A2 2 0 0 1 16.4 21H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2.9a2 2 0 0 0 1.7-1L11 3a2.3 2.3 0 0 1 2.5 3Z"/>',
    thumbsDown: '<path d="M17 13V4"/><path d="M13.5 18 13 13H5.8a2 2 0 0 1-1.9-2.6l1.8-6A2 2 0 0 1 7.6 3H20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.9a2 2 0 0 0-1.7 1L13 21a2.3 2.3 0 0 1-2.5-3Z"/>',
    frown: '<circle cx="12" cy="12" r="9"/><path d="M16 16.5c-.8-1.3-2.2-2-4-2s-3.2.7-4 2"/><circle cx="9" cy="9.5" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r=".9" fill="currentColor" stroke="none"/>',
    meh: '<circle cx="12" cy="12" r="9"/><line x1="8" y1="15" x2="16" y2="15"/><circle cx="9" cy="9.5" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r=".9" fill="currentColor" stroke="none"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c.8 1.3 2.2 2 4 2s3.2-.7 4-2"/><circle cx="9" cy="9.5" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r=".9" fill="currentColor" stroke="none"/>',
    luggage: '<rect x="5" y="8" width="14" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="20" x2="10" y2="22"/><line x1="14" y1="20" x2="14" y2="22"/>',
    pencil: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19 3 20l1-4Z"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    lightbulb: '<path d="M9 19h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="3" y1="10" x2="21" y2="10"/>',
    eye: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.5 10.5 0 0 1 12 5c6.2 0 10 7 10 7a16.3 16.3 0 0 1-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.8 7 10 7a9.8 9.8 0 0 0 3.4-.6"/><path d="M9.5 10.5a3 3 0 0 0 4 4"/>',
    alertTriangle: '<path d="M10.3 4.2 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none"/>',
    arrowRight: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>',
    arrowLeft: '<line x1="20" y1="12" x2="4" y2="12"/><polyline points="11 5 4 12 11 19"/>',
    flame: '<path d="M8 14.5A3 3 0 0 0 11 17.5a3 3 0 0 0 3-3c0-1.4-.6-2.2-1.1-3.1-1.1-2-.4-3.9 1.6-5.4.5 2.2 1.8 4.2 3.5 5.6 1.7 1.4 2.5 3 2.5 4.9a6.5 6.5 0 1 1-13 0c0-1 .4-2 1-2.7a3 3 0 0 0 .5 1.7Z"/>',
    volume2: '<polygon points="10 6 5 10 2 10 2 15 5 15 10 19 10 6"/><path d="M17.5 5a11 11 0 0 1 0 15M14.3 8.5a6 6 0 0 1 0 8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/>',
    zap: '<polygon points="12 2 4 13 11 13 10 22 20 10 13 10 14 2"/>',
    coffee: '<path d="M18 8h1a3 3 0 0 1 0 6h-1"/><path d="M3 8h15v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="7" y1="2" x2="7" y2="4"/><line x1="11" y1="2" x2="11" y2="4"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/>',
    bookOpen: '<path d="M12 6.5S10 4 4 4v14c6 0 8 2.5 8 2.5s2-2.5 8-2.5V4c-6 0-8 2.5-8 2.5z"/><line x1="12" y1="6.5" x2="12" y2="20.5"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>',
    micOff: '<line x1="2" y1="2" x2="22" y2="22"/><path d="M9 9v3a3 3 0 0 0 4.9 2.3M15 9.3V5a3 3 0 0 0-5.6-1.5"/><path d="M5 10v2a7 7 0 0 0 11.1 5.6"/><path d="M19 10v2a7 7 0 0 1-.3 2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>',
  };
  function icon(name, size, extraStyle, strokeWidth) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (strokeWidth || 2) + '" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0' + (extraStyle ? ';' + extraStyle : '') + '">' + (ICON_PATHS[name] || '') + '</svg>';
  }

  // ── ログイン画面(2026-11-26) ──────────────────────────────────────────
  // GH_TOKENが無い(未ログイン)時にフルスクリーンのフォームを被せる。本物の
  // パスキー(WebAuthn)は検証用サーバーが要るため、GitHub Pagesだけの静的構成
  // では使えない。代わりにふつうの<form>(autocomplete="username"/"current-password")
  // にすることで、iOS/Chromeのパスワードマネージャーに保存の提案をさせ、次回
  // 以降はFace ID等での自動入力に乗せる。入力されたトークンは、保存前に
  // データリポジトリへの実アクセスで検証し、401/403/404を見分けて理由を表示する。
  function validateToken(token) {
    return fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO, {
      headers: { Authorization: 'Bearer ' + token },
    }).then(function (res) {
      if (res.status === 200) return { ok: true };
      if (res.status === 401) return { ok: false, reason: 'トークンが無効です(期限切れの可能性があります)' };
      if (res.status === 403) return { ok: false, reason: 'このリポジトリへの権限がありません(Contents: Read and writeのスコープをご確認ください)' };
      if (res.status === 404) return { ok: false, reason: 'リポジトリが見つかりません(トークンのRepository accessの設定をご確認ください)' };
      return { ok: false, reason: '確認に失敗しました(HTTP ' + res.status + ')' };
    }).catch(function () {
      return { ok: false, reason: 'ネットワークエラーです。通信状況をご確認ください' };
    });
  }

  function renderLoginScreen() {
    var overlay = document.createElement('div');
    overlay.id = 'login-gate';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:var(--color-bg,#181a16);padding:20px;box-sizing:border-box';
    overlay.innerHTML =
      '<div style="width:100%;max-width:340px">'
      + '<div style="font-weight:600;font-size:22px;text-align:center;color:var(--color-text,#fff)">英会話学習アプリ</div>'
      + '<div style="font-size:12.5px;color:var(--color-neutral-400,#999);text-align:center;margin:4px 0 22px">ログインして学習データにアクセス</div>'
      + '<form id="login-form" autocomplete="on">'
      + '<div style="margin-bottom:12px">'
      + '<label style="font-size:12px;color:var(--color-neutral-400,#999)">ラベル(任意)</label>'
      + '<input type="text" id="login-username" name="username" autocomplete="username" value="famio-eng-data" class="field" style="width:100%;margin-top:4px;box-sizing:border-box">'
      + '</div>'
      + '<div style="margin-bottom:6px">'
      + '<label style="font-size:12px;color:var(--color-neutral-400,#999)">GitHubトークン</label>'
      + '<input type="password" id="login-password" name="token" autocomplete="current-password" class="field" style="width:100%;margin-top:4px;box-sizing:border-box" required>'
      + '</div>'
      + '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--color-neutral-300,#ccc);margin:10px 0 16px">'
      + '<input type="checkbox" id="login-remember"> この端末を記憶する'
      + '</label>'
      + '<div id="login-error" style="display:none;color:var(--color-warning,#f59e0b);font-size:12px;margin-bottom:10px;line-height:1.5"></div>'
      + '<button type="submit" class="btn btn-primary btn-block">ログイン</button>'
      + '</form>'
      + '<div style="font-size:11px;color:var(--color-neutral-500,#777);margin-top:16px;line-height:1.7">GitHubの「きめ細かいトークン(Fine-grained personal access token)」を入力してください。一度ログインすると、次回からブラウザに保存された内容をFace ID等で自動入力できます。</div>'
      + '</div>';
    document.body.appendChild(overlay);

    var form = overlay.querySelector('#login-form');
    var errEl = overlay.querySelector('#login-error');
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var token = overlay.querySelector('#login-password').value.trim();
      var remember = overlay.querySelector('#login-remember').checked;
      if (!token) return;
      errEl.style.display = 'none';
      btn.disabled = true; btn.textContent = '確認中…';
      validateToken(token).then(function (result) {
        if (result.ok) {
          saveToken(token, remember);
          location.reload();
        } else {
          errEl.textContent = result.reason;
          errEl.style.display = 'block';
          btn.disabled = false; btn.textContent = 'ログイン';
        }
      });
    });
  }

  if (!GH_TOKEN) {
    if (document.body) renderLoginScreen();
    else document.addEventListener('DOMContentLoaded', renderLoginScreen);
  } else {
    // ログイン済み: Geminiキーと、個人向けの表示文言(TOEICスコア・次の旅行予定等)を
    // データリポジトリ側の設定ファイルから取得する。GEM_KEYはプリミティブなので、
    // 取得後に明示的にglobal.Shared.GEM_KEYへ代入し直す(exportしたオブジェクトは
    // 代入時点の値のコピーであり、後からこの関数内のGEM_KEY変数を書き換えても
    // 自動では反映されないため)。profileはオブジェクトなので、中身を書き換える
    // (Object.assign)形にすれば参照がそのまま活きる。
    apiGetJson('config/secrets.json').then(function (cfg) {
      if (cfg && cfg.geminiKey) { GEM_KEY = cfg.geminiKey; global.Shared.GEM_KEY = GEM_KEY; }
    }).catch(function () {});
    apiGetJson('data/profile-config.json').then(function (cfg) {
      if (cfg) Object.assign(global.Shared.profile, cfg);
    }).catch(function () {});
  }

  // 2026-11-27(Anuvilia経由のFami依頼): iPhoneでGitHub上のconfig/secrets.jsonを直接
  // 編集するのは間違えやすいため、アプリ内からGeminiキーを設定・差し替えできるように
  // する。値はここでContents API経由でconfig/secrets.jsonへ書き込み、成功したら
  // GEM_KEY(と exportしたShared.GEM_KEY)を更新するだけで、画面やコンソールログには
  // 一切出さない(呼び出し元のUIコードも同様に扱うこと)。
  function saveGeminiKey(key) {
    return apiPutJson('config/secrets.json', function (obj) {
      obj = obj || {};
      obj.geminiKey = key;
      return obj;
    }, '🔑 Geminiキーを更新').then(function () {
      GEM_KEY = key;
      global.Shared.GEM_KEY = GEM_KEY;
    });
  }

  global.Shared = {
    GH_TOKEN: GH_TOKEN,
    GEM_KEY: GEM_KEY,
    GH_OWNER: GH_OWNER,
    GH_REPO: GH_REPO,
    profile: {}, // data/profile-config.jsonの中身をObject.assignで書き込む(ログイン後、非同期)
    clearStoredToken: clearStoredToken,
    saveGeminiKey: saveGeminiKey,
    b64EncodeUtf8: b64EncodeUtf8,
    b64DecodeUtf8: b64DecodeUtf8,
    apiGet: apiGet,
    apiGetJson: apiGetJson,
    apiPutJson: apiPutJson,
    apiPutBinary: apiPutBinary,
    apiListDir: apiListDir,
    callGeminiWithFallback: callGeminiWithFallback,
    callGeminiText: callGeminiText,
    parseJsonFromModelText: parseJsonFromModelText,
    todayStr: todayStr,
    icon: icon,
  };
})(window);
