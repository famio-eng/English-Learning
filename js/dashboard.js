// Home + Progress tabs. Ported from dashboard.html (calcStreak, DAILY_TASKS_DEF,
// weekly report generation, past-record editing) — logic kept verbatim, markup rebuilt to
// match the Nocturne design.
(function () {
  'use strict';
  var S = window.Shared;

  // ── constants ported from dashboard.html ──
  var DAILY_TASKS_DEF = {
    0: [{ key: 'shadowing', label: 'シャドーイング 0.7倍速 3回通し', priority: 'must', auto: true }, { key: 'vocab', label: '単語復習（SM-2）', priority: 'must', auto: true }],
    1: [{ key: 'shadowing', label: '速度を上げながら録音・AI評価', priority: 'must', auto: true }],
    2: [{ key: 'shadowing', label: '速度を上げながら録音・AI評価', priority: 'must', auto: true }],
    3: [{ key: 'dialogue', label: 'Pimsleur式対話練習（ChatGPT）', priority: 'optional', auto: false }],
    4: [{ key: 'dialogue', label: 'Pimsleur式対話練習（ChatGPT）', priority: 'optional', auto: false }],
    5: [{ key: 'vocab', label: 'SM-2に従った単語復習', priority: 'must', auto: true }],
    6: [{ key: 'weeklyReport', label: '今週のレポートを生成', priority: 'must', auto: false }, { key: 'dialogue', label: 'ChatGPTで壁打ち・スクリプト作成', priority: 'must', auto: false }, { key: 'shadowing', label: 'シャドーイング初回練習', priority: 'must', auto: true }, { key: 'vocab', label: '単語帳 初回学習', priority: 'optional', auto: true }],
  };
  var PAST_TASK_DEFS_BY_DOW = {
    6: [{ key: 'shadowing', label: 'シャドーイング' }, { key: 'vocab', label: '単語復習' }, { key: 'weeklyReport', label: '週次レポート' }, { key: 'dialogue', label: 'スクリプト作成（対話）' }, { key: 'monologue', label: '独り言 10分' }],
    0: [{ key: 'shadowing', label: 'シャドーイング' }, { key: 'vocab', label: '単語復習' }, { key: 'monologue', label: '独り言 10分' }],
    1: [{ key: 'shadowing', label: 'シャドーイング 録音' }, { key: 'monologue', label: '独り言 10分' }],
    2: [{ key: 'shadowing', label: 'シャドーイング 録音' }, { key: 'monologue', label: '独り言 10分' }],
    3: [{ key: 'dialogue', label: '対話練習' }, { key: 'monologue', label: '独り言 10分' }],
    4: [{ key: 'dialogue', label: '対話練習' }, { key: 'monologue', label: '独り言 10分' }],
    5: [{ key: 'vocab', label: '単語復習' }, { key: 'monologue', label: '独り言 10分' }],
  };
  var DAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
  // 2026-11-27(Anuviliaの指摘): short/casual/formal・sop-status-report・
  // pentest-alignment・510k-readiness・launch-status-updateはFamiの実際の経歴・
  // 業務がもとになっているため、js/practice.js側と同様にdata/personal-scripts.json
  // (非公開データリポジトリ)へ移した。ここにはタイトルも直書きせず、
  // loadPersonalScriptTitles()でログイン後に取得して埋める。公開リポジトリ側に
  // 残すのは業務に依存しない汎用スクリプト(biz-*)のタイトルのみ。
  var SCRIPT_NAMES = {
    'biz-progress-update': '定例進捗報告', 'biz-issue-escalation': '課題共有・エスカレーション',
    'biz-seeking-advice': '相談', 'biz-smalltalk-coffee': '雑談・スモールトーク',
  };
  function loadPersonalScriptTitles() {
    S.apiGetJson('data/personal-scripts.json').then(function (obj) {
      var items = (obj && obj.scripts) || [];
      items.forEach(function (s) { if (s.id && s.title) SCRIPT_NAMES[s.id] = s.title; });
    }).catch(function () {});
  }
  loadPersonalScriptTitles();
  var TASK_ICON = {
    shadowing: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="6" y="1" width="4" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 7.5a4.5 4.5 0 009 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M8 12v2.5M5.5 14.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    vocab: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.5S6.5 2 3 2v10c3.5 0 5 1.5 5 1.5s1.5-1.5 5-1.5V2c-3.5 0-5 1.5-5 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 3.5V13.5" stroke="currentColor" stroke-width="1.2"/></svg>',
    dialogue: '<svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M3 5h16a1 1 0 011 1v9a1 1 0 01-1 1h-9l-4 3v-3H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    weeklyReport: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.5 8.5h5M5.5 11h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  };

  // ── state ──
  var todayStr = S.todayStr();
  var dailyTaskState = {};
  var dailyTaskData = {};
  var vocabDueCount = null;
  var vocabTodayPlan = null; // { planned, dueTotal } — 1日の上限を適用した「今日やる分」
  var vocabMasteredCount = null;
  var recordings = [];   // parsed {date, scriptId, mode}
  var recentRecords = []; // parsed record JSONs, newest-first
  var weeklyReportData = null;
  var editingPastRecords = {};
  var cefrHistory = []; // [{date, index, avgScore}], persisted in data/progress.json
  var cefrLegendOpen = false;
  var cefrBasisOpen = false;
  var highlightNoteOpen = false; // 「今日のフレーズ」の解説(使う場面/ニュアンス/言い換え/注意点)の開閉
  var heatmapSelectedDate = null; // CONSISTENCYヒートマップでタップされた日(YYYY-MM-DD)
  var drillState = 'idle'; // idle | asking | revealed — 瞬発力ミニドリルの画面状態
  var drillIndex = 0;
  var drillCache = null; // { day, items } — 日付が変わるまで同じ3問を出す
  // 瞬発力ドリル改修(2026-11-22、Famiの依頼): 電車内でもできるよう声あり/声なしを
  // 選べるように。声なしでもキー入力でAI採点を受けられる。段階①の範囲は
  // 採点+即時フィードバックまで(誤りタグの履歴保存・傾向反映・振り返り画面は後続)。
  var drillMode = (function () { try { return localStorage.getItem('instant_drill_mode') || 'silent'; } catch (e) { return 'silent'; } })(); // 'voice' | 'silent'
  var drillHintLevel = 0; // 0 none, 1 used words, 2 + opening words
  var drillAnswerMode = 'none'; // silent modeのサブ状態: 'none' | 'typing'
  var drillTypedText = '';
  var drillGrading = false; // Gemini採点中
  var drillFeedback = null; // AI採点結果 {transcript,correct,errorTags,growthNote,improveNote,naturalParaphrase} | null
  // 2026-11-26(Famiの指摘: 「採点ができない。止まっているように感じる」): 採点中が
  // 無表示のまま数十秒続くと壊れて見えるため、経過秒数を出す。失敗時も黙って自己採点に
  // 切り替えず、理由と「もう一度」を出して選べるようにする(直前の入力をdrillGradeInputに
  // 保持してリトライに使う)。
  var drillGradeError = null; // 直近の採点失敗理由(成功/未試行ならnull)
  var drillGradeStartedAt = null;
  var drillGradeTimer = null;
  var drillGradeInput = null; // {q, input} — 「もう一度」で同じ入力を再送信する
  var drillLevel = 'easy'; // easy|medium|hard、data/progress.jsonのinstantDrillLevelから読み込み
  var drillResults = []; // 今日の3問の正誤(true/false)、段階の上げ下げ判定に使う
  var drillRec = { isRec: false, mediaRec: null, chunks: [], mimeType: '' };
  var loaded = false;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ── date/week helpers (ported verbatim) ──
  function getWeekStart(now) { var day = now.getDay(); var diff = day === 6 ? 0 : day + 1; var sat = new Date(now); sat.setDate(now.getDate() - diff); return S.todayStr(sat); }
  function getWeekEnd(now) { var day = now.getDay(); var diff = day === 6 ? 6 : 5 - day; var fri = new Date(now); fri.setDate(now.getDate() + diff); return S.todayStr(fri); }
  function parseRecording(name) {
    var m = name.match(/^(\d{4}-\d{2}-\d{2})-\d{2}-\d{2}-(.+)-(reading|shadowing)\./);
    if (!m) return null;
    return { date: m[1], scriptId: m[2], mode: m[3] };
  }
  function calcStreak(datesSet, now) {
    var streak = 0, d = new Date(now);
    for (var i = 0; i < 365; i++) {
      var key = S.todayStr(d);
      if (datesSet[key]) { streak++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }
  // Confirmed on-device: ?q= prefill just lands on the project's top page, no session
  // starts. Fallback per Fami's suggestion — copy a starter prompt to the clipboard and
  // open the bare project URL, so the prompt can be pasted into the compose box by hand.
  var CHATGPT_PROJECT_URL = 'https://chatgpt.com/g/g-p-6a64216444588191b40c3a829fd3121b'; // 「英語学習」プロジェクト
  var CHATGPT_PROMPTS = {
    kickoff: '今週の教材を準備したい', // LEARNING_PLAN.md記載の壁打ち開始フレーズ
    practice: '対話練習をしたい。今日のテーマで日本語提示→数秒以内に英語で即答→フィードバック、という形式で進めてください。',
  };
  function openChatGPT(kind) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    var text = (CHATGPT_PROMPTS[kind] || CHATGPT_PROMPTS.practice) + '\n（' + stamp + '）';
    window.open(CHATGPT_PROJECT_URL, '_blank');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { App.toast('プロンプトをコピーしました。チャット欄に貼り付けてください', 'success'); })
        .catch(function () { App.toast('コピーに失敗しました'); });
    }
  }

  // ── load ──
  function loadAll() {
    return S.apiGetJson('data/progress.json').then(function (obj) {
      dailyTaskData = (obj && obj.dailyTasks) || {};
      dailyTaskState = dailyTaskData[todayStr] || {};
      cefrHistory = (obj && obj.cefrHistory) || [];
      drillLevel = (obj && obj.instantDrillLevel) || 'easy';
    }).catch(function () {}).then(function () {
      return Promise.all([
        S.apiListDir('recordings').catch(function () { return []; }),
        S.apiListDir('records').catch(function () { return []; }),
      ]);
    }).then(function (results) {
      var recFiles = Array.isArray(results[0]) ? results[0] : [];
      recordings = recFiles.map(function (f) { return parseRecording(f.name || ''); }).filter(Boolean);
      var jsonFiles = (Array.isArray(results[1]) ? results[1] : []).filter(function (f) {
        return f.name && f.name.endsWith('.json') && f.name !== 'vocab-stats.json';
      }).sort(function (a, b) { return b.name.localeCompare(a.name); }).slice(0, 12);
      return Promise.all(jsonFiles.map(function (f) {
        return S.apiGetJson('records/' + f.name).catch(function () { return null; });
      }));
    }).then(function (recs) {
      recentRecords = (recs || []).filter(Boolean);
      updateCefrEstimate();
    }).then(function () {
      return S.apiGetJson('data/vocab.json').catch(function () { return null; });
    }).then(function (data) {
      if (!data) { vocabDueCount = null; vocabMasteredCount = null; vocabTodayPlan = null; return; }
      var progress = {};
      try { progress = JSON.parse(localStorage.getItem('vocab_progress_v2') || '{}'); } catch (e) {}
      var dueWords = (data.words || []).filter(function (w) {
        var nr = (progress[w.id] && progress[w.id].nextReview) || w.nextReview || todayStr;
        return nr <= todayStr;
      });
      vocabDueCount = dueWords.length;
      // マスター判定はvocab.jsのwordStatus()と同じ基準(streak>=3 かつ interval>=4)。
      vocabMasteredCount = (data.words || []).filter(function (w) {
        var p = progress[w.id] || {};
        var streak = p.streak !== undefined ? p.streak : (w.streak || 0);
        var interval = p.interval !== undefined ? p.interval : (w.interval || 1);
        return streak >= 3 && interval >= 4;
      }).length;
      // 1日の上限(2026-11-25、vocab.jsのbuildTodayPlanと同じロジック)。ホームの
      // 「単語復習」表示を、期限切れの総数(94のような大きな数字)ではなく今日
      // 実際にやる分の件数にするため、ここでも同じ計算をミラーする。
      var isNew = function (w) {
        var rc = (progress[w.id] && progress[w.id].reviewCount !== undefined) ? progress[w.id].reviewCount : w.reviewCount;
        return !rc;
      };
      var overdue = dueWords.filter(function (w) { return !isNew(w); });
      var fresh = dueWords.filter(isNew);
      var cap = (function () { var n = parseInt(localStorage.getItem('vocab_daily_cap') || '', 10); return n > 0 ? n : 20; })();
      var newCap = (function () { var n = parseInt(localStorage.getItem('vocab_new_cap') || '', 10); return (n >= 0 && !isNaN(n)) ? n : 5; })();
      var plannedCount = Math.min(overdue.length, cap) + Math.min(fresh.length, Math.max(0, cap - Math.min(overdue.length, cap)), newCap);
      vocabTodayPlan = { planned: plannedCount, dueTotal: dueWords.length };
    }).then(function () { loaded = true; });
  }

  // ── streak / score data ──
  // シャドーイング録音のあった日に加えて、単語復習のみ行った日(dailyTasks側にしか
  // 記録が残らない)も「継続」に数える。以前はrecordingsだけを見ていたため、SM-2復習
  // だけした日はストリークが途切れて見えていた。
  function streakDatesSet() {
    var s = {};
    recordings.forEach(function (r) { s[r.date] = true; });
    Object.keys(dailyTaskData).forEach(function (d) {
      var day = dailyTaskData[d];
      if (day && Object.keys(day).some(function (k) { return day[k]; })) s[d] = true;
    });
    return s;
  }
  function streakDays() { return S.GH_TOKEN ? calcStreak(streakDatesSet(), new Date()) : 0; }

  // ── HOME ──
  // 今の流れ(毎日: 単語復習+瞬発力ドリル、曜日でシャドーイング/リスニングが交互、
  // ChatGPT会話はいつでもクイックリンクから)に合わせて再構成(2026-11-22、Famiの
  // 指摘「Pimsleur式対話練習・スクリプト作成など今の流れにない項目が残っている」
  // への対応)。単語復習/ドリルは毎日同じなので、日ごとに変わるシャドー/リスニングの
  // 区別だけを1マスに表示する。
  function weekScheduleHtml() {
    var today = new Date().getDay();
    return [0, 1, 2, 3, 4, 5, 6].map(function (dow) {
      var isShadow = dow % 2 === 0;
      var label = isShadow ? 'シャドーイング' : 'リスニング';
      var isToday = dow === today;
      return '<div style="flex:1;min-width:0;text-align:center;padding:7px 2px;border-radius:var(--radius-sm);background:' + (isToday ? 'rgba(var(--color-accent-rgb),.15)' : 'transparent') + ';border:1px solid ' + (isToday ? 'var(--color-accent)' : 'var(--color-neutral-700)') + '">'
        + '<div style="font-size:11px;font-weight:500;color:' + (isToday ? 'var(--color-text)' : 'var(--color-neutral-400)') + '">' + DAY_JA[dow] + '</div>'
        + '<div style="font-size:8.5px;line-height:1.3;color:var(--color-neutral-300);margin-top:3px;word-break:break-all">' + esc(label) + '</div>'
        + '</div>';
    }).join('');
  }

  // ── 今日の1セット(2026-11-22追加: ホーム=情報過多で始めにくい、という指摘への対応) ──
  // 単語復習(既存のSRS)+瞬発力ドリル(新規)を1枚のカードにまとめ、開いたら1タップで
  // 始められるようにする。
  function seededShuffle(arr, seedStr) {
    var seed = 0;
    for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; }
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }
  // 会話タブの既存スクリプト+やさしい文バンク(PracticeTab.getSentencePool)から、
  // 現在の難度(drillLevel)を中心に3問選ぶ。該当難度が足りなければ他難度で補う。
  function todayDrillQuestions() {
    if (drillCache && drillCache.day === todayStr && drillCache.level === drillLevel) return drillCache.items;
    var pool = (window.PracticeTab && window.PracticeTab.getSentencePool) ? window.PracticeTab.getSentencePool() : [];
    var order = drillLevel === 'easy' ? ['easy', 'medium', 'hard'] : drillLevel === 'medium' ? ['medium', 'easy', 'hard'] : ['hard', 'medium', 'easy'];
    var picked = [];
    order.forEach(function (lvl) {
      if (picked.length >= 3) return;
      var subset = pool.filter(function (p) { return p.difficulty === lvl; });
      var shuffled = seededShuffle(subset, todayStr + lvl);
      picked = picked.concat(shuffled.slice(0, 3 - picked.length));
    });
    drillCache = { day: todayStr, level: drillLevel, items: picked };
    return picked;
  }
  function currentDrillQuestion() { var qs = todayDrillQuestions(); return qs[Math.min(drillIndex, qs.length - 1)]; }
  // 「今日のフレーズ」(2026-11-22追加: ホーム下部の空きスペース対策)。ドリル出題プールから
  // 日替わりで1文をピックし、手描きSVGアイコンと一緒に表示するだけの観賞用カード。
  // 外部の画像サービスには依存しない(ライセンス・依存の懸念を避ける、Famiの指示どおり)。
  var DAILY_HIGHLIGHT_ICONS = ['coffee', 'sun', 'mapPin', 'luggage', 'star', 'lightbulb', 'target'];
  function dayOfYear(d) { var start = new Date(d.getFullYear(), 0, 0); return Math.floor((d - start) / 86400000); }
  function escJs(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function speakHighlight(text, rate) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate || 1;
    window.speechSynthesis.speak(u);
  }
  function toggleHighlightNote() { highlightNoteOpen = !highlightNoteOpen; renderHome(); }
  // 発音・IPA・解説(使う場面/ニュアンス/言い換え/注意点)はFamiの依頼(2026-11-24)で追加。
  // 解説はタップで開閉し、ホームが長くなりすぎないようにする。続くフィードバックで、
  // ゆっくり再生ボタンを削除して発音ボタンは1つに、発音ボタンは文の下に配置、
  // 左の大きいアイコンをやめて見出し横の小アイコンにし英文をカード幅いっぱいに広げた。
  function todayHighlightHtml() {
    var pool = (window.PracticeTab && window.PracticeTab.getSentencePool) ? window.PracticeTab.getSentencePool() : [];
    if (!pool.length) return '';
    var easyPool = pool.filter(function (p) { return p.difficulty === 'easy'; });
    var picked = seededShuffle(easyPool.length ? easyPool : pool, todayStr + '-highlight')[0];
    var iconName = DAILY_HIGHLIGHT_ICONS[dayOfYear(new Date()) % DAILY_HIGHLIGHT_ICONS.length];
    var soundAttrs = ' onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation()"';
    var soundBtn = '<button class="btn btn-sound" style="width:32px;height:32px;margin-top:8px" aria-label="発音を再生"' + soundAttrs
      + ' onclick="event.stopPropagation();DashboardTab.speakHighlight(\'' + escJs(picked.en) + '\',1)">' + S.icon('volume2', 15) + '</button>';
    var ipaHtml = picked.ipa ? '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">' + esc(picked.ipa) + '</div>' : '';
    var note = picked.note;
    var noteToggle = note ? '<button onclick="event.stopPropagation();DashboardTab.toggleHighlightNote()"' + soundAttrs
      + ' style="background:none;border:none;color:var(--color-accent-300);font-size:11.5px;cursor:pointer;padding:0;margin-top:8px">'
      + (highlightNoteOpen ? '▴ 解説を閉じる' : '▾ 解説を見る（使い方・言い換えなど）') + '</button>' : '';
    var noteBody = (note && highlightNoteOpen) ? '<div style="font-size:12.5px;color:var(--color-text);line-height:1.65;margin-top:6px;padding-top:8px;border-top:1px solid var(--color-divider)">'
      + (note.scene ? '<div><span style="color:var(--color-neutral-400)">場面：</span>' + esc(note.scene) + '</div>' : '')
      + (note.nuance ? '<div style="margin-top:3px"><span style="color:var(--color-neutral-400)">ニュアンス：</span>' + esc(note.nuance) + '</div>' : '')
      + (note.alt ? '<div style="margin-top:3px"><span style="color:var(--color-neutral-400)">言い換え：</span>' + esc(note.alt) + '</div>' : '')
      + (note.caution ? '<div style="margin-top:3px"><span style="color:var(--color-neutral-400)">注意：</span>' + esc(note.caution) + '</div>' : '')
      + '</div>' : '';
    return '<div class="card sel-dict">'
      + '<div style="display:flex;align-items:center;gap:5px;color:var(--color-accent)">' + S.icon(iconName, 15) + '<div class="card-kicker" style="font-size:11px">今日のフレーズ</div></div>'
      + '<div style="font-size:17px;font-weight:600;color:var(--color-text);line-height:1.4;margin-top:6px">' + esc(picked.en) + '</div>'
      + ipaHtml
      + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:3px">' + esc(picked.ja) + '</div>'
      + soundBtn
      + noteToggle + noteBody
      + '</div>';
  }
  function chunksOf(q) { return (q && q.chunks) || (q ? [{ en: q.en, ja: q.ja }] : []); }
  var DRILL_LEVEL_LABEL = { easy: 'やさしい', medium: 'ふつう', hard: 'むずかしい' };

  function markInstantDrillDone() {
    if (dailyTaskState.instantDrill) return;
    dailyTaskState.instantDrill = true;
    if (!S.GH_TOKEN) return;
    S.apiPutJson('data/progress.json', function (obj) {
      obj = obj || {};
      if (!obj.dailyTasks) obj.dailyTasks = {};
      obj.dailyTasks[todayStr] = Object.assign({}, dailyTaskState);
      return obj;
    }, '✅ タスク更新: instantDrill').catch(function () {});
  }
  // 1日3問終えた時点で、全問○なら1段階上げ・1問でも×なら1段階下げる(段階①の
  // 範囲では当日の自己採点/AI採点の結果だけを見る単純なロジック)。
  function adjustDrillLevel() {
    if (drillResults.length < todayDrillQuestions().length) return;
    var order = ['easy', 'medium', 'hard'];
    var idx = order.indexOf(drillLevel);
    var allGood = drillResults.every(function (r) { return r; });
    var anyBad = drillResults.some(function (r) { return !r; });
    var next = drillLevel;
    if (allGood && idx < order.length - 1) next = order[idx + 1];
    else if (anyBad && idx > 0) next = order[idx - 1];
    if (next === drillLevel) return;
    drillLevel = next;
    if (!S.GH_TOKEN) return;
    S.apiPutJson('data/progress.json', function (obj) {
      obj = obj || {};
      obj.instantDrillLevel = drillLevel;
      return obj;
    }, '📈 瞬発力ドリル難度更新: ' + drillLevel).catch(function () {});
  }
  function startTodayVocab() {
    window.App.state.pendingStartVocabSession = true;
    window.App.switchTab('vocab');
  }
  function setDrillMode(m) {
    drillMode = m;
    try { localStorage.setItem('instant_drill_mode', m); } catch (e) {}
    renderHome();
  }
  function startDrill() {
    drillState = 'asking'; drillIndex = 0; drillHintLevel = 0; drillAnswerMode = 'none'; drillFeedback = null; drillResults = []; drillGradeError = null;
    renderHome();
  }
  function showDrillHint() { drillHintLevel = Math.min(2, drillHintLevel + 1); renderHome(); }
  function revealDrill() { drillState = 'revealed'; drillFeedback = null; drillGradeError = null; stopDrillGradeTick(); renderHome(); }
  function startTyping() { drillAnswerMode = 'typing'; renderHome(); }
  function cancelTyping() { drillAnswerMode = 'none'; renderHome(); }
  function submitTyped() {
    var el = document.getElementById('drill-type-input');
    var text = el ? el.value.trim() : '';
    if (!text) return;
    if (!S.GEM_KEY) { revealDrill(); return; }
    gradeDrillAnswer(currentDrillQuestion(), { text: text });
  }
  function advanceAfterRating(ok) {
    drillResults.push(ok);
    drillIndex++;
    if (drillIndex >= todayDrillQuestions().length) { markInstantDrillDone(); adjustDrillLevel(); }
    drillHintLevel = 0; drillAnswerMode = 'none'; drillFeedback = null; drillGradeError = null;
    drillState = drillIndex >= todayDrillQuestions().length ? 'idle' : 'asking';
    renderHome();
  }
  function rateDrill(ok) { advanceAfterRating(ok); }
  function nextAfterDrillFeedback() { advanceAfterRating(!!(drillFeedback && drillFeedback.correct)); }

  // ── 録音(段階①: 音声は送信のみ、ファイルとしては保存しない) ──
  function toggleDrillRec() { if (drillRec.isRec) stopDrillRec(); else startDrillRec(); }
  function startDrillRec() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      drillRec.chunks = [];
      var types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
      drillRec.mimeType = '';
      for (var i = 0; i < types.length; i++) { if (MediaRecorder.isTypeSupported(types[i])) { drillRec.mimeType = types[i]; break; } }
      drillRec.mediaRec = new MediaRecorder(stream, drillRec.mimeType ? { mimeType: drillRec.mimeType } : {});
      drillRec.mediaRec.ondataavailable = function (e) { if (e.data && e.data.size > 0) drillRec.chunks.push(e.data); };
      drillRec.mediaRec.onstop = function () { stream.getTracks().forEach(function (t) { t.stop(); }); setTimeout(onDrillRecReady, 300); };
      // 2026-11-25: start()にtimeslice(100ms)を渡すと、録音中に複数回dataavailableが
      // 発火し、後で全チャンクを1つのBlobに連結して送る形になる。iOS WebKitの
      // MediaRecorder(audio/mp4)はこの分割記録で生成したファイルのduration等の
      // メタデータが壊れることが知られており、Geminiへの音声採点が実機で応答なしに
      // なった件の調査でこれが疑わしい点の1つだったため、録音は.stop()時に1回だけ
      // 完全なBlobを受け取る形に変更した(短い瞬間英作文の録音なので問題ない)。
      drillRec.mediaRec.start();
      drillRec.isRec = true;
      renderHome();
    }).catch(function () { App.toast('マイクへのアクセスを許可してください'); });
  }
  function stopDrillRec() {
    if (drillRec.mediaRec && drillRec.isRec) {
      // requestData()をstop()の直前に呼んでいたが、これも「録音継続中に一部だけ
      // 先に吐き出させる」操作であり、start()のtimeslice指定と同じ理由でファイルの
      // 断片化を招きうる。stop()自体が最後にdataavailableを1回発火させる仕様なので、
      // 完全な1個のBlobだけを受け取るようrequestData()の呼び出しは取り除いた。
      drillRec.mediaRec.stop();
      drillRec.isRec = false;
      renderHome();
    }
  }
  function onDrillRecReady() {
    var totalSize = drillRec.chunks.reduce(function (s, c) { return s + c.size; }, 0);
    if (totalSize === 0) { App.toast('録音データが空です'); return; }
    if (!S.GEM_KEY) { App.toast('Geminiキーが設定されていません。自己採点に切り替えます'); revealDrill(); return; }
    var mtype = drillRec.mimeType || 'audio/webm';
    var blob = new Blob(drillRec.chunks, { type: mtype });
    var reader = new FileReader();
    reader.onload = function () {
      var b64 = reader.result.split(',')[1];
      gradeDrillAnswer(currentDrillQuestion(), { audioB64: b64, mimeType: mtype });
    };
    reader.readAsDataURL(blob);
  }

  // ── Gemini採点(音声/テキスト共通) ──
  function buildDrillGradingPrompt(q, typedText) {
    return 'あなたは日本人の英語学習者の「瞬間英作文」回答を採点するコーチです。\n'
      + '問題(日本語): "' + q.ja + '"\n'
      + '模範解答(英語): "' + q.en + '"\n'
      + (q.explanation ? '模範解答の文法ポイント: "' + q.explanation + '"\n' : '')
      + '学習者の回答: ' + (typedText ? ('テキスト入力: "' + typedText + '"') : '(添付した音声を文字起こしして評価してください)') + '\n\n'
      + '採点基準: 模範解答と一字一句同じである必要はない。意味が通り、文法的に大きな誤りがなければ正解として良い(言い換え・多少の語順の違いは許容)。\n'
      + 'JSON形式のみで返答(説明文不要、マークダウン不要):\n'
      + '{"transcript":"回答の文字起こし(テキスト入力ならその文のまま)","correct":true,"errorTags":[],"growthNote":"","improveNote":"","naturalParaphrase":""}\n'
      + '- errorTagsは該当するものだけ配列で: "article"(冠詞) "tense"(時制) "preposition"(前置詞) "word-order"(語順) "word-choice"(語彙選択) "other"\n'
      + '- growthNoteは良かった点を一言(無ければ空文字でよい)\n'
      + '- improveNoteは次に意識すると良い点を一言\n'
      + '- naturalParaphraseは模範解答と違う、より自然な言い方の例があれば(無ければ空文字)\n'
      + '- correct/errorTagsの値以外(growthNote等)は日本語で記述';
  }
  // 2026-11-26: 「AI採点中…」のまま進み具合が見えないと止まって見えるため、経過秒数
  // だけを直接書き換える(vocab.jsのtickTimerOnlyと同じく、renderHome()をまるごと
  // 呼ぶとその都度DOMが作り直されてしまうのを避ける)。
  function drillGradeElapsedSec() { return drillGradeStartedAt ? Math.floor((Date.now() - drillGradeStartedAt) / 1000) : 0; }
  function tickDrillGradeElapsed() {
    var el = document.getElementById('drill-grade-elapsed');
    if (el) el.textContent = drillGradeElapsedSec() + '秒経過';
  }
  function startDrillGradeTick() { clearInterval(drillGradeTimer); drillGradeTimer = setInterval(tickDrillGradeElapsed, 1000); }
  function stopDrillGradeTick() { clearInterval(drillGradeTimer); drillGradeTimer = null; }
  function retryDrillGrade() { if (drillGradeInput) gradeDrillAnswer(drillGradeInput.q, drillGradeInput.input); }
  // 採点中の進捗(不確定バー+経過秒数)と、失敗時の理由+「もう一度」をまとめた共通ブロック。
  // typing/voiceどちらの回答方法でも同じ見た目になるよう共通化する。
  function drillGradeStatusHtml() {
    if (drillGrading) {
      return '<div style="margin-top:8px">'
        + '<div class="drill-grade-bar"></div>'
        + '<div id="drill-grade-elapsed" style="font-size:10.5px;color:var(--color-neutral-500);margin-top:4px;text-align:center">' + drillGradeElapsedSec() + '秒経過</div>'
        + '</div>';
    }
    if (drillGradeError) {
      return '<div style="margin-top:8px;padding:8px 10px;background:rgba(var(--color-warning-rgb),.12);border:1px solid var(--color-warning);border-radius:var(--radius-sm)">'
        + '<div style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--color-warning)">' + S.icon('alertTriangle', 13) + 'AI採点に失敗しました（' + esc(drillGradeError) + '）</div>'
        + '<div style="display:flex;gap:6px;margin-top:6px">'
        + '<button class="btn btn-secondary" style="flex:1;font-size:12px" onclick="DashboardTab.retryDrillGrade()">もう一度</button>'
        + '<button class="btn btn-ghost" style="flex:1;font-size:12px" onclick="DashboardTab.revealDrill()">自己採点にする</button>'
        + '</div></div>';
    }
    return '';
  }
  function gradeDrillAnswer(q, input) {
    drillGradeInput = { q: q, input: input };
    drillGrading = true; drillGradeError = null; drillGradeStartedAt = Date.now(); renderHome(); startDrillGradeTick();
    var parts = [{ text: buildDrillGradingPrompt(q, input.text) }];
    if (input.audioB64) parts.push({ inline_data: { mime_type: input.mimeType, data: input.audioB64 } });
    var payload = { contents: [{ parts: parts }], generationConfig: { temperature: 0.3, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } } };
    S.callGeminiWithFallback(payload).then(function (data) {
      if (!data.candidates || !data.candidates[0]) throw new Error('レスポンスなし');
      var txt = data.candidates[0].content.parts[0].text || '';
      var result = S.parseJsonFromModelText(txt);
      drillGrading = false; stopDrillGradeTick();
      drillFeedback = result;
      drillState = 'revealed';
      renderHome();
    }).catch(function (err) {
      drillGrading = false; stopDrillGradeTick();
      // 2026-11-26(Famiの指摘: 失敗時に黙って自己採点へ切り替わると気づけない):
      // 以前はここでdrillState='revealed'にして自己採点へ自動で進めていたが、
      // 理由を見せた上で「もう一度」を選べるようにし、自己採点は別ボタンで
      // 本人が選んだ時だけ進むようにする。
      drillGradeError = (err && err.message) ? String(err.message).slice(0, 60) : '不明なエラー';
      renderHome();
    });
  }

  // ── 表示ヘルパー ──
  function chunkLinesHtml(q, which, color) {
    var chunks = chunksOf(q);
    return chunks.map(function (c, i) {
      var numPrefix = chunks.length > 1 ? '<span style="color:var(--color-neutral-500);font-size:11px;margin-right:4px">' + (i + 1) + '.</span>' : '';
      return '<div style="font-size:14.5px;margin-top:' + (i === 0 ? '8' : '4') + 'px;color:' + color + '">' + numPrefix + esc(c[which]) + '</div>';
    }).join('');
  }
  function hintBlockHtml(q) {
    if (!q.hint) return '';
    var html = '';
    if (drillHintLevel >= 1 && q.hint.words && q.hint.words.length) {
      html += '<div style="font-size:12px;color:var(--color-accent-300);margin-top:8px">使う単語: ' + q.hint.words.map(esc).join(' / ') + '</div>';
    }
    if (drillHintLevel >= 2 && q.hint.opening) {
      html += '<div style="font-size:12px;color:var(--color-accent-300);margin-top:4px">出だし: ' + esc(q.hint.opening) + ' …</div>';
    }
    if (drillHintLevel < 2) {
      html += '<button class="btn btn-ghost" style="font-size:11px;padding:4px 0;margin-top:4px" onclick="DashboardTab.showDrillHint()">' + S.icon('lightbulb', 13) + (drillHintLevel === 0 ? 'Hint' : 'More hint') + '</button>';
    }
    return html;
  }
  function explanationBlockHtml(q) {
    if (!q.explanation) return '';
    return '<div style="display:flex;gap:6px;margin-top:10px;padding:8px 10px;background:rgba(var(--color-accent-rgb),.1);border-radius:var(--radius-sm);font-size:11.5px;color:var(--color-neutral-300);line-height:1.6">'
      + '<span style="flex-shrink:0;color:var(--color-accent-300)">' + S.icon('lightbulb', 13) + '</span><span>' + esc(q.explanation) + '</span></div>';
  }
  var DRILL_TAG_LABEL = { article: '冠詞', tense: '時制', preposition: '前置詞', 'word-order': '語順', 'word-choice': '語彙選択', other: 'その他' };
  function aiFeedbackHtml(fb) {
    var tags = (fb.errorTags || []).map(function (t) { return '<span class="tag tag-outline" style="font-size:10px;margin:0 4px 4px 0">' + esc(DRILL_TAG_LABEL[t] || t) + '</span>'; }).join('');
    return '<div style="margin-top:10px;padding:10px;border-radius:var(--radius-sm);background:' + (fb.correct ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)') + '">'
      + '<div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:' + (fb.correct ? 'var(--color-success)' : 'var(--color-warning)') + '">' + S.icon(fb.correct ? 'checkCircle' : 'alertTriangle', 15) + (fb.correct ? '通じる言い方です' : 'もう少し調整の余地あり') + '</div>'
      + (fb.transcript ? '<div style="font-size:12.5px;color:var(--color-neutral-300);margin-top:6px;font-style:italic">"' + esc(fb.transcript) + '"</div>' : '')
      + (tags ? '<div style="margin-top:6px">' + tags + '</div>' : '')
      + (fb.growthNote ? '<div style="display:flex;gap:4px;font-size:11.5px;color:var(--color-success);margin-top:6px">' + S.icon('star', 12) + esc(fb.growthNote) + '</div>' : '')
      + (fb.improveNote ? '<div style="display:flex;gap:4px;font-size:11.5px;color:var(--color-neutral-300);margin-top:4px">' + S.icon('arrowRight', 12) + esc(fb.improveNote) + '</div>' : '')
      + (fb.naturalParaphrase ? '<div style="font-size:11.5px;color:var(--color-accent-300);margin-top:4px">言い換え例: ' + esc(fb.naturalParaphrase) + '</div>' : '')
      + '</div>';
  }

  function drillSectionHtml(qs) {
    if (!qs.length) return '';
    if (dailyTaskState.instantDrill) {
      return '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--color-neutral-700);display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--color-success);font-weight:500">' + S.icon('checkCircle', 16) + '瞬発力ドリル完了（また明日）</div>';
    }
    var q = qs[Math.min(drillIndex, qs.length - 1)];
    var body;
    if (drillState === 'idle') {
      // Silent/Voiceの切替をDrillボタンのすぐ隣の小さなアイコントグルにして、
      // 「ここで声あり/なしを選んでからDrillを押す」関係が一目でわかるようにする
      // (2026-11-22、Famiの指摘「切替とボタンの関係がわかりにくい」への対応)。
      // 親指で確実に押せるサイズに(2026-11-22、Famiの指摘: 「各セグメントの高さは
      // Drillボタンと同じ、幅も最低48px以上、アイコンも一回り大きく」)。選択中は
      // Drillと同じクレイ色を塗って状態がはっきりわかるようにする(アイコン色も)。
      var modeToggle = '<div class="seg" style="display:flex;flex-shrink:0">'
        + '<button class="seg-opt" data-active="' + (drillMode === 'silent') + '" style="width:48px;height:40px;padding:0;display:flex;align-items:center;justify-content:center;' + (drillMode === 'silent' ? 'background:rgba(var(--color-warning-rgb),.28);color:var(--color-warning)' : '') + '" onclick="DashboardTab.setDrillMode(\'silent\')" aria-label="Silent">' + S.icon('micOff', 19) + '</button>'
        + '<button class="seg-opt" data-active="' + (drillMode === 'voice') + '" style="width:48px;height:40px;padding:0;display:flex;align-items:center;justify-content:center;' + (drillMode === 'voice' ? 'background:rgba(var(--color-warning-rgb),.28);color:var(--color-warning)' : '') + '" onclick="DashboardTab.setDrillMode(\'voice\')" aria-label="Voice">' + S.icon('mic', 19) + '</button>'
        + '</div>';
      body = '<div style="display:flex;gap:8px;margin-top:10px">' + modeToggle
        + '<button class="btn btn-fill-warn" style="flex:1;font-weight:600" onclick="DashboardTab.startDrill()">' + S.icon('zap', 16) + 'Drill</button>'
        + '</div>';
    } else if (drillState === 'asking') {
      var progressLabel = '(' + (drillIndex + 1) + '/' + qs.length + ')';
      var actions;
      if (drillAnswerMode === 'typing') {
        actions = '<textarea id="drill-type-input" class="field" rows="2" placeholder="英語で入力" style="margin-top:10px;width:100%"></textarea>'
          + '<div style="display:flex;gap:8px;margin-top:8px">'
          + '<button class="btn btn-secondary" style="flex:1" onclick="DashboardTab.cancelTyping()">Cancel</button>'
          + '<button class="btn btn-primary" style="flex:1" onclick="DashboardTab.submitTyped()"' + (drillGrading ? ' disabled' : '') + '>' + (drillGrading ? 'Grading…' : 'Submit') + '</button>'
          + '</div>' + drillGradeStatusHtml();
      } else if (drillMode === 'voice') {
        actions = '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:12px">'
          + '<button onclick="DashboardTab.toggleDrillRec()"' + (drillGrading ? ' disabled' : '') + ' style="width:50px;height:50px;border-radius:50%;border:2px solid var(--color-accent);background:' + (drillRec.isRec ? 'var(--color-accent-800)' : 'transparent') + ';cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--color-accent)">' + (drillRec.isRec ? '<div style="width:14px;height:14px;background:var(--color-accent)"></div>' : S.icon('mic', 22)) + '</button>'
          + '<div style="font-size:11px;color:var(--color-neutral-500)">' + (drillGrading ? 'AI採点中…' : (drillRec.isRec ? '録音中…（タップで停止）' : 'タップして録音')) + '</div></div>'
          + drillGradeStatusHtml()
          + (drillGrading || drillGradeError ? '' : '<button class="btn btn-ghost btn-block" style="margin-top:4px;font-size:11.5px" onclick="DashboardTab.revealDrill()">Answer（録音しない）</button>');
      } else {
        actions = '<div style="display:flex;gap:8px;margin-top:10px">'
          + '<button class="btn btn-secondary" style="flex:1;font-size:12.5px" onclick="DashboardTab.startTyping()">Type</button>'
          + '<button class="btn btn-secondary" style="flex:1;font-size:12.5px" onclick="DashboardTab.revealDrill()">Answer</button>'
          + '</div>';
      }
      body = chunkLinesHtml(q, 'ja', 'var(--color-neutral-100)')
        + '<div style="font-size:11px;color:var(--color-neutral-500);margin-top:6px">' + progressLabel + ' 英語で言ってみてから確認する</div>'
        + hintBlockHtml(q) + actions;
    } else { // revealed
      var isAI = !!drillFeedback;
      body = chunkLinesHtml(q, 'ja', 'var(--color-neutral-100)') + chunkLinesHtml(q, 'en', 'var(--color-accent-300)')
        + explanationBlockHtml(q)
        + (isAI ? aiFeedbackHtml(drillFeedback) : '')
        + (isAI
          ? '<button class="btn btn-primary btn-block" style="margin-top:10px" onclick="DashboardTab.nextAfterDrillFeedback()">Next</button>'
          : '<div style="display:flex;gap:8px;margin-top:10px">'
            + '<button class="btn btn-secondary" style="flex:1;font-weight:600;gap:6px" onclick="DashboardTab.rateDrill(false)">' + S.icon('thumbsDown', 18, '', 2.2) + 'Missed</button>'
            + '<button class="btn btn-primary" style="flex:1;font-weight:600;gap:6px" onclick="DashboardTab.rateDrill(true)">' + S.icon('thumbsUp', 18, '', 2.2) + 'Got it</button>'
            + '</div>');
    }
    return '<div class="sel-dict" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--color-neutral-700)">'
      + '<div style="display:flex;align-items:center;gap:10px">' + iconChipHtml(S.icon('zap', 18), '--color-warning')
      + '<span style="font-size:15.5px;color:var(--color-neutral-100);flex:1;min-width:0">瞬発力ドリル <b style="color:var(--color-text)">' + qs.length + '問</b></span>'
      + '<span class="tag tag-outline" style="font-size:9.5px;flex-shrink:0">難度: ' + DRILL_LEVEL_LABEL[drillLevel] + '</span>'
      + nextBadgeHtml('instantDrill', '--color-warning') + ringSvg(moduleWeekCount('instantDrill'), 7, 'var(--color-warning)', 30)
      + '</div>' + body + '</div>';
  }

  // 7日分のドット(週間の継続状況)。日曜始まり固定(weekScheduleHtmlと揃える)。
  function weekDotsHtml() {
    var set = streakDatesSet();
    var today = new Date();
    var cells = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today); d.setDate(today.getDate() - i);
      var key = S.todayStr(d);
      var done = !!set[key];
      var isToday = i === 0;
      cells.push('<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">'
        + '<div style="width:9px;height:9px;border-radius:50%;background:' + (done ? 'var(--color-warning)' : 'var(--color-neutral-700)') + (isToday && !done ? ';border:1.5px solid var(--color-neutral-500)' : '') + '"></div>'
        + '<div style="font-size:10px;color:' + (isToday ? 'var(--color-text)' : 'var(--color-neutral-500)') + ';font-weight:' + (isToday ? '700' : '400') + '">' + DAY_JA[d.getDay()] + '</div>'
        + '</div>');
    }
    return '<div style="display:flex;margin-top:14px">' + cells.join('') + '</div>';
  }
  function ringSvg(done, total, color, size) {
    size = size || 40;
    var r = 15, c = 2 * Math.PI * r;
    var pct = total > 0 ? Math.min(1, done / total) : 0;
    // 達成済み(7/7)は輪郭だけでなく塗りのリングにして、進行中のものと区別がつく
    // ようにする(2026-11-22、Famiの指摘「達成済みは塗りのリング等で立体感を」)。
    if (pct >= 1) {
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 36 36" style="flex-shrink:0">'
        + '<circle cx="18" cy="18" r="' + r + '" fill="' + color + '"/>'
        + '<text x="18" y="18" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="var(--color-bg)">✓</text>'
        + '</svg>';
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 36 36" style="flex-shrink:0">'
      + '<circle cx="18" cy="18" r="' + r + '" fill="none" stroke="var(--color-neutral-700)" stroke-width="3.5"/>'
      + '<circle cx="18" cy="18" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - pct)).toFixed(1) + '" transform="rotate(-90 18 18)"/>'
      + '<text x="18" y="18" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="' + color + '">' + done + '/' + total + '</text>'
      + '</svg>';
  }
  // 直近7日で、その種のタスクを何日やったか(モジュールごとの週間リング用)。
  function moduleWeekCount(key) {
    var now = new Date(), count = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(now); d.setDate(now.getDate() - i);
      var day = dailyTaskData[S.todayStr(d)];
      if (day && day[key]) count++;
    }
    return count;
  }
  // 3つの練習のうち、今日まだやっていない最初の1つを「次にやるべき練習」として
  // Nextバッジで示す(2026-11-22、Famiの指摘「3つとも塗りつぶしてよい、次はこれの
  // 強調はバッジ等の別手段で」への対応。塗り自体は常にモジュールごとの色を使う)。
  // 全部終わっていればnullを返し、どのバッジも出さない。
  function nextModuleKey() {
    var order = ['vocab', 'instantDrill', 'shadowing'];
    for (var i = 0; i < order.length; i++) { if (!dailyTaskState[order[i]]) return order[i]; }
    return null;
  }
  // モジュール見出しのアイコンを、色をごく薄く敷いた角丸チップに乗せて単色の
  // 背景から浮かせる(カードの立体感を出す指摘への対応)。3つの練習モジュールは
  // それぞれ別の色のチップにして見分けやすくする(2026-11-22、Famiの指摘:
  // 「単色すぎる」「参考画像のようにメイン+補助色を」への対応)。各モジュールの
  // 進捗リング・ボタンの塗りも同じ色でそろえる(ヒートマップだけはメイン
  // (--color-accent)のみ、継続全体の指標のため)。colorVarは
  // '--color-accent'|'--color-warning'|'--color-info'。
  function iconChipHtml(iconHtml, colorVar) {
    colorVar = colorVar || '--color-accent';
    return '<div style="width:32px;height:32px;border-radius:10px;background:rgba(var(' + colorVar + '-rgb),.16);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(' + colorVar + ')">' + iconHtml + '</div>';
  }
  // 「次はこれ」はボタンの塗り分けではなく小さな「Next」バッジで示す(2026-11-22、
  // Famiの指摘「Drill/Shadowも塗りつぶしていい、次はこれの強調は別の手段で」への
  // 対応。3つとも常にそれぞれのモジュール色で塗りつぶし、完了済みは薄く+チェックに)。
  function nextBadgeHtml(key, colorVar) {
    if (nextModuleKey() !== key) return '';
    return '<span class="tag" style="border:1px solid var(' + colorVar + ');color:var(' + colorVar + ');font-size:9px;margin-right:6px;flex-shrink:0">Next</span>';
  }
  function todaySetCardHtml() {
    var due = vocabDueCount || 0;
    var qs = todayDrillQuestions();
    // 2026-11-25(Famiの指摘「94問って表示されてるけど何したら完了？」への対応):
    // 期限切れの総数をそのまま出すのをやめ、1日の上限を適用した「今日の分」を
    // 主に、溜まっている総数は小さく添えるだけにする。
    var plan = vocabTodayPlan;
    var vocabLabel;
    if (!plan || plan.planned === 0) vocabLabel = '期限分なし・前倒しOK';
    else {
      var remain = Math.max(0, plan.dueTotal - plan.planned);
      vocabLabel = plan.planned + '問' + (remain > 0 ? '(残り期限切れ' + remain + ')' : '');
    }
    var vocabDone = !!dailyTaskState.vocab;
    return '<div class="card" style="border-color:var(--color-accent);box-shadow:0 8px 28px rgba(var(--color-accent-rgb),.12)">'
      + '<div class="card-kicker" style="font-size:12px">今日の1セット（10〜15分）</div>'
      + '<div style="display:flex;align-items:baseline;gap:6px;margin-top:8px">' + S.icon('flame', 26, 'color:var(--color-warning)') + '<span style="font-size:30px;font-weight:700;line-height:1">' + streakDays() + '</span><span style="font-size:14px;color:var(--color-neutral-400)">日継続</span></div>'
      + weekDotsHtml()
      + '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--color-neutral-700);display:flex;align-items:center;gap:10px">' + iconChipHtml(TASK_ICON.vocab.replace('width="16" height="16"', 'width="18" height="18"'))
      + '<span style="font-size:15.5px;color:var(--color-neutral-100);flex:1;min-width:0">単語復習 <b style="color:var(--color-text)">' + esc(vocabLabel) + '</b></span>'
      + nextBadgeHtml('vocab', '--color-accent') + ringSvg(moduleWeekCount('vocab'), 7, 'var(--color-accent)', 30)
      + '</div>'
      + '<button class="btn btn-primary btn-block" style="margin-top:10px;font-weight:600' + (vocabDone ? ';opacity:.55' : '') + '" onclick="DashboardTab.startTodayVocab()">' + (vocabDone ? S.icon('check', 16) + 'Done' : S.icon('bookOpen', 16) + 'Review') + '</button>'
      + drillSectionHtml(qs)
      + shadowListenSlotHtml()
      + '</div>';
  }

  // 「今日の1セット」3枠目(2026-11-22追加、Famiの依頼「単語復習・ドリル以外が詳細に
  // 隠れているのはどうか」への対応)。曜日で発音(シャドーイング)/リスニングを交互にし、
  // PracticeTab.pickScriptForで未練習優先のスクリプトを1つ自動選択する。ビジネス英語に
  // フォーカスする方針になったため(2026-11-22、Famiの指摘「旅行が終わったので隔週の
  // ビジネス/旅行交互をやめる」)、カテゴリは常にbusiness固定。
  function shadowListenSlotHtml() {
    var pick = (window.PracticeTab && window.PracticeTab.pickScriptFor) ? window.PracticeTab.pickScriptFor('business') : null;
    if (!pick) return '';
    var isShadow = new Date().getDay() % 2 === 0; // 日火木土=発音、月水金=リスニング
    var mode = isShadow ? 'shadow' : 'listen';
    var label = isShadow ? 'Shadow' : 'Listen';
    var kicker = isShadow ? '発音練習' : 'リスニング';
    var icon = isShadow
      ? TASK_ICON.shadowing.replace('width="16" height="16"', 'width="18" height="18"')
      : S.icon('volume2', 18);
    var shadowDone = !!dailyTaskState.shadowing;
    return '<div class="sel-dict" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--color-neutral-700)">'
      + '<div style="display:flex;align-items:center;gap:10px">' + iconChipHtml(icon, '--color-info')
      + '<span style="font-size:15.5px;color:var(--color-neutral-100);flex:1;min-width:0">' + kicker + ' <b style="color:var(--color-text)">' + esc(pick.title) + '</b></span>'
      + nextBadgeHtml('shadowing', '--color-info') + ringSvg(moduleWeekCount('shadowing'), 7, 'var(--color-info)', 30)
      + '</div>'
      + '<button class="btn btn-fill-info btn-block" style="margin-top:10px;font-weight:600' + (shadowDone ? ';opacity:.55' : '') + '" onclick="App.state.pendingOpenScriptId=\'' + esc(pick.id) + '\';App.state.pendingPracticeMode=\'' + mode + '\';App.switchTab(\'practice\')">' + (shadowDone ? S.icon('check', 16) + 'Done' : S.icon(isShadow ? 'mic' : 'volume2', 16) + label) + '</button></div>';
  }

  // ホーム下部の「クイックリンク」行(2026-11-22追加)。従来Detailsに隠れていた会話
  // スクリプト一覧・ChatGPT連携・前回の続き・週次レポートへの入口を、常時見える
  // 小さな横並びピルにする。Chatを押した時、今日のタスクにdialogueがあれば完了にする
  // (従来チェックリストの手動チェックをワンタップに統合)。
  function markTaskDone(key) { if (!dailyTaskState[key]) toggleTask(key); }
  function quickChatGPT(kind) {
    var defs = DAILY_TASKS_DEF[new Date().getDay()] || [];
    if (defs.some(function (t) { return t.key === 'dialogue'; })) markTaskDone('dialogue');
    openChatGPT(kind);
  }
  // アイコンの色は青/緑などバラバラだったのをアクセント1色に統一(2026-11-22、
  // Famiの指摘「Chatアイコンだけ青なのもテーマに合わせて」への対応)。
  function quickLinksHtml() {
    var day = new Date().getDay();
    var chatKind = day === 6 ? 'kickoff' : 'practice';
    var pills = [];
    pills.push({ icon: TASK_ICON.weeklyReport, label: 'Scripts', onclick: "App.switchTab('practice')" });
    pills.push({ icon: TASK_ICON.dialogue, label: 'Chat', onclick: "DashboardTab.quickChatGPT('" + chatKind + "')" });
    var last = recentRecords[0];
    if (last) {
      pills.push({ icon: S.icon('arrowRight', 16), label: 'Continue', onclick: "App.state.pendingOpenScriptId='" + esc(last.scriptId) + "';App.switchTab('practice')" });
    }
    if (day === 6) {
      pills.push({ icon: TASK_ICON.weeklyReport, label: 'Report', onclick: 'DashboardTab.openWeeklyReportModal()' });
    }
    // 注意: overflow-xを持つ行を#tab-home(縦flex)の直接の子にすると、flexアイテムの
    // 自動最小サイズがautoから0になり潰れてしまう(既知のflexboxの挙動)。overflowなしの
    // 外側divで一段包んでから、中でスクロール行を作る。
    return '<div style="margin-top:4px">' + '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px">' + pills.map(function (p) {
      return '<button onclick="' + p.onclick + '" style="display:flex;align-items:center;gap:6px;flex-shrink:0;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:999px;padding:8px 14px;cursor:pointer;color:inherit;font-family:inherit;font-size:12.5px;font-weight:500">'
        + '<span style="color:var(--color-accent);display:flex">' + p.icon + '</span>' + esc(p.label) + '</button>';
    }).join('') + '</div></div>';
  }

  // CONSISTENCYヒートマップ(2026-11-22追加、Pinterestの習慣トラッカー参考例を
  // 踏まえたFamiの依頼)。直近4週間、その日に(単語復習/シャドーイング/瞬発力ドリルの
  // うち何種類やったか)をマス目の濃淡で表示する。Detailsを常時表示にする代わりに、
  // 週間スケジュールの文字情報よりも一目で継続状況がわかる見た目にする。
  // 2026-11-24、Fami「見方がよくわからない」への対応で、見出しの日本語併記・
  // 曜日/週ラベル・今日のマスの目印・未来日の点線表示・凡例・%の説明・
  // マスタップでの内訳表示を追加。
  var HEATMAP_KEYS = ['vocab', 'shadowing', 'instantDrill'];
  var HEATMAP_LABELS = { vocab: '単語復習', shadowing: 'シャドー/リスニング', instantDrill: '瞬発力ドリル' };
  var HEATMAP_DOW = ['月', '火', '水', '木', '金', '土', '日'];
  function mondayOf(d) {
    var c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var dow = c.getDay();
    c.setDate(c.getDate() + (dow === 0 ? -6 : 1 - dow));
    return c;
  }
  function toggleHeatmapDay(ds) { heatmapSelectedDate = heatmapSelectedDate === ds ? null : ds; renderHome(); }
  function consistencyHeatmapHtml() {
    var now = new Date();
    var today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var thisMonday = mondayOf(today0);
    var activeDays = 0, pastDays = 0;
    var headerCells = '<div></div>' + HEATMAP_DOW.map(function (l) {
      return '<div style="text-align:center;font-size:10px;color:var(--color-neutral-400)">' + l + '</div>';
    }).join('');
    var bodyRows = '';
    for (var w = 3; w >= 0; w--) {
      var weekStart = new Date(thisMonday); weekStart.setDate(thisMonday.getDate() - w * 7);
      var label = w === 0 ? '今週' : (weekStart.getMonth() + 1) + '/' + weekStart.getDate() + '週';
      bodyRows += '<div style="font-size:9.5px;color:var(--color-neutral-400);display:flex;align-items:center;white-space:nowrap">' + esc(label) + '</div>';
      for (var c = 0; c < 7; c++) {
        var d = new Date(weekStart); d.setDate(weekStart.getDate() + c);
        var ds = S.todayStr(d);
        var isFuture = d.getTime() > today0.getTime();
        var isToday = d.getTime() === today0.getTime();
        if (isFuture) {
          bodyRows += '<div style="width:100%;aspect-ratio:1;border-radius:3px;border:1px dashed var(--color-neutral-700);box-sizing:border-box"></div>';
          continue;
        }
        pastDays++;
        var day = dailyTaskData[ds] || {};
        var n = HEATMAP_KEYS.filter(function (k) { return day[k]; }).length;
        if (n > 0) activeDays++;
        var opacity = n === 0 ? 1 : n === 1 ? .4 : n === 2 ? .7 : 1;
        var outline = isToday ? 'outline:1.5px solid var(--color-accent);outline-offset:1px;' : '';
        bodyRows += '<button onclick="DashboardTab.toggleHeatmapDay(\'' + ds + '\')" aria-label="' + ds + 'の学習内容"'
          + ' style="width:100%;aspect-ratio:1;border-radius:3px;border:none;padding:0;cursor:pointer;' + outline
          + 'background:' + (n ? 'var(--color-accent)' : 'var(--color-neutral-700)') + ';opacity:' + opacity + '"></button>';
      }
    }
    var pct = pastDays ? Math.round(activeDays / pastDays * 100) : 0;
    var detail = '';
    if (heatmapSelectedDate) {
      var selDate = new Date(heatmapSelectedDate + 'T00:00:00');
      var selLabel = (selDate.getMonth() + 1) + '/' + selDate.getDate() + '(' + HEATMAP_DOW[(selDate.getDay() + 6) % 7] + ')';
      var selDay = dailyTaskData[heatmapSelectedDate] || {};
      var rows = HEATMAP_KEYS.map(function (k) {
        return '<span style="display:inline-flex;align-items:center;gap:3px;margin-right:12px">'
          + (selDay[k] ? S.icon('check', 12, '', 2.5) : '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:1.3px solid var(--color-neutral-600)"></span>')
          + esc(HEATMAP_LABELS[k]) + '</span>';
      }).join('');
      detail = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--color-neutral-700);font-size:11.5px">'
        + '<div style="color:var(--color-neutral-400);margin-bottom:4px">' + esc(selLabel) + 'の内容</div>' + rows + '</div>';
    }
    return '<div>'
      + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">'
      + '<div><span class="card-kicker" style="margin:0">CONSISTENCY</span>'
      + '<span style="font-size:10.5px;color:var(--color-neutral-400);margin-left:5px">直近4週間の学習日</span></div>'
      + '<span style="font-size:12px;color:var(--color-accent);font-weight:600;white-space:nowrap" title="学習した日の割合">学習した日 ' + activeDays + '/' + pastDays + '日</span>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:30px repeat(7,1fr);gap:3px;margin-top:8px;align-items:center">' + headerCells + bodyRows + '</div>'
      + '<div style="font-size:10px;color:var(--color-neutral-400);margin-top:6px">薄い=少し　濃い=たくさん（単語復習・ドリル・シャドーのうち完了した数）</div>'
      + detail
      + '</div>';
  }
  // 週間スケジュール・CONSISTENCY・統計をまとめた、常時表示の「見るだけ」情報
  // (2026-11-22、Famiの指摘「Detailsが開かないと見えないのは良くない」への対応で
  // 折りたたみを廃止。学習日数は上のストリーク表示と重複するため統計からは外した)。
  function detailsHtml() {
    var lastScore = recentRecords[0] && recentRecords[0].score != null ? recentRecords[0].score + '点' : '—';
    return '<div class="card">'
      + '<div class="card-kicker">今週のスケジュール</div>'
      + '<div style="font-size:11px;color:var(--color-neutral-400);margin-top:2px">毎日: 単語復習+瞬発力ドリル／曜日でシャドーイング・リスニングが交互</div>'
      + '<div style="display:flex;gap:4px;margin-top:8px">' + weekScheduleHtml() + '</div>'
      + '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--color-neutral-700)">' + consistencyHeatmapHtml() + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--color-neutral-700)">'
      + statPill('直近スコア', lastScore) + statPill('復習待ち', vocabDueCount != null ? vocabDueCount + '語' : '—') + statPill('習得語数', vocabMasteredCount != null ? vocabMasteredCount + '語' : '—')
      + '</div></div>';
  }
  function renderHome() {
    var el = document.getElementById('tab-home');
    if (!loaded) {
      el.innerHTML = '<div class="card"><div style="padding:24px;text-align:center;color:var(--color-neutral-400)">読み込み中…</div></div>';
      loadAll().then(renderHome);
      return;
    }
    var userName = localStorage.getItem('profile_name') || 'Fami';

    var html = '';
    html += '<div style="display:flex;align-items:center;gap:10px">'
      // 元画像は紫のまま(ラスター素材のため作り直せない)なので、CSSのhue-rotateで
      // パレットのオリーブ系に寄せる(2026-11-22、Famiの指摘「アイコンだけ紫で浮いている」)。
      + '<img src="./assets/app-icon.png" alt="" style="width:36px;height:36px;border-radius:10px;flex-shrink:0;filter:hue-rotate(200deg) saturate(.75)">'
      + '<div style="font-weight:600;font-size:24px">こんにちは、' + esc(userName) + 'さん</div></div>';

    html += todaySetCardHtml();
    html += quickLinksHtml();
    html += todayHighlightHtml();
    html += detailsHtml();

    el.innerHTML = html;
  }
  function statPill(label, value) {
    return '<div style="background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:10px 8px;text-align:center">'
      + '<div style="font-size:18px;font-weight:500">' + esc(value) + '</div><div style="font-size:11px;color:var(--color-neutral-400);margin-top:2px">' + esc(label) + '</div></div>';
  }

  function toggleTask(key) {
    dailyTaskState[key] = !dailyTaskState[key];
    renderHome();
    if (!S.GH_TOKEN) return;
    clearTimeout(toggleTask._t);
    toggleTask._t = setTimeout(function () {
      S.apiPutJson('data/progress.json', function (obj) {
        obj = obj || {};
        if (!obj.dailyTasks) obj.dailyTasks = {};
        obj.dailyTasks[todayStr] = Object.assign({}, dailyTaskState);
        return obj;
      }, '✅ タスク更新: ' + key).catch(function () {});
    }, 1000);
  }

  // ── PROGRESS ──
  function scoreTrendSvg() {
    var scores = recentRecords.filter(function (r) { return r.score != null; }).map(function (r) { return r.score; }).slice(0, 5).reverse();
    if (!scores.length) return '<div style="font-size:13px;color:var(--color-neutral-400);text-align:center;padding:20px 0">データなし</div>';
    var w = 260, h = 90, pad = 8, min = 50, max = 100;
    var yFor = function (v) { return pad + (1 - (v - min) / (max - min)) * (h - 2 * pad); };
    var pts = scores.map(function (s, i) { return (pad + i * (w - 2 * pad) / Math.max(1, scores.length - 1)).toFixed(1) + ',' + yFor(s).toFixed(1); }).join(' ');
    var dots = scores.map(function (s, i) {
      var x = (pad + i * (w - 2 * pad) / Math.max(1, scores.length - 1)).toFixed(1);
      return '<circle cx="' + x + '" cy="' + yFor(s).toFixed(1) + '" r="3.5" fill="var(--color-accent)"/>';
    }).join('');
    return '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">'
      + '<polyline points="' + pts + '" fill="none" stroke="var(--color-accent)" stroke-width="2"/>' + dots + '</svg>';
  }

  function streakDotsHtml() {
    var now = new Date();
    var set = streakDatesSet();
    var dayNamesShort = ['日', '月', '火', '水', '木', '金', '土'];
    var cells = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      var ds = S.todayStr(d);
      var override = editingPastRecords[ds];
      var done = override ? Object.keys(override).some(function (k) { return k !== '_manualKeys' && override[k]; }) : !!set[ds];
      cells.push('<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1">'
        + '<div style="font-size:8px;color:var(--color-neutral-300)">' + d.getDate() + '</div>'
        + '<div style="font-size:7px;color:var(--color-neutral-400)">' + dayNamesShort[d.getDay()] + '</div>'
        + '<div style="width:14px;height:14px;border-radius:3px;background:' + (done ? 'var(--color-accent-500)' : 'transparent') + ';border:1px solid ' + (done ? 'var(--color-accent-500)' : 'var(--color-neutral-600)') + '"></div></div>');
    }
    return cells.join('');
  }

  // ── CEFR estimate (derived from recent AI-scored practice, not an official test — see
  // README note in the card itself). Score→level mapping and the TOEIC900+ goal anchor are
  // both simple heuristics, not calibrated against a real CEFR assessment. ──
  var CEFR_LEVELS = ['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2', 'C1.1', 'C1.2', 'C2.1', 'C2.2'];
  var CEFR_GOAL_INDEX = 9; // TOEIC900+ ≈ C1.2, per a standard TOEIC↔CEFR correspondence table
  var CEFR_LEGEND = [
    { level: 'A1.1', desc: '挨拶や自己紹介など、ごく基本的な表現が言える' },
    { level: 'A1.2', desc: '簡単な質問への受け答えができる' },
    { level: 'A2.1', desc: '買い物や道案内など身近な場面で会話できる' },
    { level: 'A2.2', desc: '日常の出来事について簡単に説明できる' },
    { level: 'B1.1', desc: '身近な話題なら要点を理解し、意見を言える' },
    { level: 'B1.2', desc: '会議や旅行先で自立してやり取りできる' },
    { level: 'B2.1', desc: '抽象的な話題も含め、複雑な文章を理解できる' },
    { level: 'B2.2', desc: 'ネイティブと自然なスピードで議論できる' },
    { level: 'C1.1', desc: '専門的な内容を柔軟かつ的確に扱える' },
    { level: 'C1.2', desc: '長い文章の含意まで正確に読み取れる' },
    { level: 'C2.1', desc: 'ほぼネイティブ同等に、あらゆる場面に対応できる' },
    { level: 'C2.2', desc: '文化的なニュアンスやジョークまで理解できる' },
  ];
  function avgRecentScore() {
    var scores = recentRecords.filter(function (r) { return r.score != null; }).map(function (r) { return r.score; });
    if (!scores.length) return null;
    return Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length);
  }
  // Linear mapping, anchored so the app's own pass thresholds land near the middle of the
  // scale: score 70 (shadowing pass line) → B2.1 (index 6), ~5 points per half-level.
  function estimateCefrIndex(avgScore) {
    if (avgScore == null) return null;
    return Math.max(0, Math.min(CEFR_LEVELS.length - 1, Math.round((avgScore - 40) / 5)));
  }
  function updateCefrEstimate() {
    var avg = avgRecentScore();
    var idx = estimateCefrIndex(avg);
    if (idx == null) return;
    var last = cefrHistory[cefrHistory.length - 1];
    if (last && last.date === todayStr && last.index === idx) return; // no change to record today
    cefrHistory = cefrHistory.filter(function (h) { return h.date !== todayStr; }).concat([{ date: todayStr, index: idx, avgScore: avg }]);
    if (cefrHistory.length > 20) cefrHistory = cefrHistory.slice(-20);
    if (!S.GH_TOKEN) return;
    S.apiPutJson('data/progress.json', function (obj) { obj = obj || {}; obj.cefrHistory = cefrHistory; return obj; }, '📈 CEFR推定更新').catch(function () {});
  }
  function cefrTrendSvg() {
    if (cefrHistory.length < 2) return '';
    var w = 260, h = 50, pad = 6;
    var yFor = function (idx) { return pad + (1 - idx / (CEFR_LEVELS.length - 1)) * (h - 2 * pad); };
    var pts = cefrHistory.map(function (pt, i) { return (pad + i * (w - 2 * pad) / Math.max(1, cefrHistory.length - 1)).toFixed(1) + ',' + yFor(pt.index).toFixed(1); }).join(' ');
    return '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="margin-top:6px">'
      + '<polyline points="' + pts + '" fill="none" stroke="var(--color-accent)" stroke-width="2"/></svg>';
  }
  function cefrBasisHtml(currentIndex) {
    if (!cefrBasisOpen) return '';
    var scored = recentRecords.filter(function (r) { return r.score != null; });
    var rows = scored.map(function (r) {
      var title = SCRIPT_NAMES[r.scriptId] || r.scriptTitle || r.scriptId || '—';
      return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0">'
        + '<span style="color:var(--color-neutral-300);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">' + esc(title) + ' ・ ' + esc(r.date || '') + '</span>'
        + '<span style="color:var(--color-neutral-400);flex-shrink:0">' + r.score + '点</span></div>';
    }).join('') || '<div style="font-size:12px;color:var(--color-neutral-500)">AI評価付きの記録がありません</div>';
    var avg = avgRecentScore();
    var historyRows = cefrHistory.slice().reverse().map(function (h) {
      return '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--color-neutral-400);padding:2px 0">'
        + '<span>' + h.date + '</span><span>平均' + h.avgScore + '点 → ' + CEFR_LEVELS[h.index] + '</span></div>';
    }).join('');
    return '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--color-neutral-700)">'
      + '<div style="font-size:11px;color:var(--color-neutral-400);margin-bottom:4px">直近の採点記録（新しい順、最大12件）</div>'
      + rows
      + (scored.length ? '<div style="font-size:12px;color:var(--color-text);font-weight:500;margin-top:6px;padding-top:6px;border-top:1px solid var(--color-neutral-800)">平均 ' + avg + '点 → ' + (currentIndex != null ? CEFR_LEVELS[currentIndex] : '—') + ' と推定</div>' : '')
      + (historyRows ? '<div style="font-size:11px;color:var(--color-neutral-400);margin-top:10px;margin-bottom:4px">推定の推移履歴</div>' + historyRows : '')
      + '</div>';
  }
  function cefrGridHtml() {
    var currentIndex = cefrHistory.length ? cefrHistory[cefrHistory.length - 1].index : null;
    var cells = CEFR_LEVELS.map(function (lvl, i) {
      var isCurrent = i === currentIndex, isGoal = i === CEFR_GOAL_INDEX;
      return '<div style="flex:1;min-width:0;text-align:center;padding:6px 1px;border-radius:var(--radius-sm);background:' + (isCurrent ? 'var(--color-accent-700)' : 'var(--color-neutral-900)') + ';border:1.5px solid ' + (isGoal ? 'var(--color-accent)' : 'var(--color-neutral-700)') + '">'
        + '<div style="font-size:10px;font-weight:500;color:' + (isCurrent ? 'var(--color-text)' : 'var(--color-neutral-400)') + '">' + lvl[0] + '</div>'
        + '<div style="font-size:9px;font-weight:500;color:' + (isCurrent ? 'var(--color-text)' : 'var(--color-neutral-400)') + '">' + lvl.slice(1) + '</div>'
        + (isGoal ? '<div style="font-size:7px;color:var(--color-accent-300);margin-top:1px">目標</div>' : '') + '</div>';
    }).join('');
    var legend = cefrLegendOpen ? '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid var(--color-neutral-700)">'
      + CEFR_LEGEND.map(function (lg) {
        return '<div style="display:flex;gap:8px"><span style="font-size:12px;font-weight:500;color:var(--color-accent-300);width:34px;flex-shrink:0">' + lg.level + '</span><span style="font-size:12px;color:var(--color-neutral-300)">' + lg.desc + '</span></div>';
      }).join('') + '</div>' : '';
    var note = currentIndex == null
      ? 'AI評価付きの記録がまだ少ないため推定できません。シャドーイング・音読を録音してAI評価を受けると表示されます。'
      : '直近の練習スコア平均から簡易的に推定した目安です（実際のCEFR試験ではありません）。目標はTOEIC900+相当。';
    return '<div class="card"><div class="card-kicker">CEFR目安（練習スコアからの推定）</div>'
      + '<div style="display:flex;gap:2px;margin-top:8px">' + cells + '</div>'
      + cefrTrendSvg()
      + '<div style="font-size:11px;color:var(--color-neutral-400);margin-top:8px">' + note + '</div>'
      + '<div style="display:flex;gap:14px;margin-top:8px">'
      + '<button onclick="DashboardTab.toggleCefrBasis()" style="background:none;border:none;color:var(--color-accent-300);font-size:12px;cursor:pointer;padding:0">' + (cefrBasisOpen ? '▴ 推定の根拠を閉じる' : '▾ 推定の根拠を見る') + '</button>'
      + '<button onclick="DashboardTab.toggleCefrLegend()" style="background:none;border:none;color:var(--color-accent-300);font-size:12px;cursor:pointer;padding:0">' + (cefrLegendOpen ? '▴ レベルの説明を閉じる' : '▾ レベルの説明を見る') + '</button>'
      + '</div>'
      + cefrBasisHtml(currentIndex)
      + legend + '</div>';
  }
  function toggleCefrLegend() { cefrLegendOpen = !cefrLegendOpen; renderProgress(); }
  function toggleCefrBasis() { cefrBasisOpen = !cefrBasisOpen; renderProgress(); }

  function renderProgress() {
    var el = document.getElementById('tab-progress');
    if (!loaded) {
      el.innerHTML = '<div class="card"><div style="padding:24px;text-align:center;color:var(--color-neutral-400)">読み込み中…</div></div>';
      loadAll().then(renderProgress);
      return;
    }
    var html = '<div style="font-weight:600;font-size:24px">学習の記録</div>';

    html += '<div class="card"><div style="display:flex;align-items:baseline;justify-content:space-between">'
      + '<div style="display:flex;align-items:baseline;gap:8px"><div style="font-size:30px;font-weight:500">' + streakDays() + '</div><div style="font-size:13px;color:var(--color-neutral-400)">日連続</div></div>'
      + '<button onclick="DashboardTab.openPastRecordsModal()" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--color-accent-300);font-family:inherit">記録を修正</button></div>'
      + '<div style="display:flex;gap:4px;margin-top:10px">' + streakDotsHtml() + '</div></div>';

    html += '<div class="card"><div class="card-kicker">直近のスコア推移</div><div style="margin-top:8px">' + scoreTrendSvg() + '</div></div>';

    html += '<div class="card"><div class="card-kicker">週次レポート</div>'
      + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:4px">その週のシャドーイング・単語復習・スコアをAIがまとめます</div>'
      + '<button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="DashboardTab.openWeeklyReportModal()">今週のレポートを生成</button></div>';

    html += cefrGridHtml();

    html += '<div class="card"><div class="card-kicker">目標</div><div style="font-size:14px;margin-top:4px">' + esc((S.profile && S.profile.goalText) || '未設定') + '</div></div>';

    html += '<div class="card"><div class="card-kicker">過去の記録</div>'
      + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:4px">録音のAI採点・フィードバックを振り返る</div>'
      + '<button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="DashboardTab.openRecordsModal()">過去の記録・AI分析を見る</button></div>';

    el.innerHTML = html;
  }

  // ── past-records edit sheet (ported: togglePastTask / savePastRecords) ──
  function openPastRecordsModal() {
    editingPastRecords = {};
    var fetchP = S.GH_TOKEN ? S.apiGetJson('data/progress.json') : Promise.resolve(null);
    var sheet = document.createElement('div');
    sheet.innerHTML = '<div class="sheet-backdrop" id="prm-backdrop"></div>'
      + '<div class="sheet" style="max-height:80vh"><div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px 8px"><div style="font-size:17px;font-weight:500">過去の記録を修正</div><button class="btn btn-icon btn-ghost" id="prm-close">×</button></div>'
      + '<div id="prm-body" style="overflow:auto;padding:0 18px 20px;display:flex;flex-direction:column;gap:14px"><div style="text-align:center;padding:20px;color:var(--color-neutral-400)">読み込み中…</div></div></div>';
    document.body.appendChild(sheet);
    function close() { sheet.remove(); renderProgress(); }
    sheet.querySelector('#prm-backdrop').onclick = close;
    sheet.querySelector('#prm-close').onclick = close;
    fetchP.then(function (obj) {
      editingPastRecords = (obj && obj.dailyTasks) || {};
      renderPastRecordsBody(sheet);
    }).catch(function () { renderPastRecordsBody(sheet); });
  }
  function renderPastRecordsBody(sheet) {
    var now = new Date();
    var html = '';
    for (var i = 0; i < 14; i++) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      var ds = S.todayStr(d), dow = d.getDay();
      var defs = PAST_TASK_DEFS_BY_DOW[dow] || [];
      var dayData = editingPastRecords[ds] || {};
      var manuals = Array.isArray(dayData._manualKeys) ? dayData._manualKeys : [];
      html += '<div><div style="font-size:12px;color:var(--color-neutral-400);margin-bottom:6px">' + ds + '（' + DAY_JA[dow] + '）' + (i === 0 ? ' — 今日' : '') + '</div>';
      defs.forEach(function (t) {
        var done = !!dayData[t.key];
        var isManual = manuals.indexOf(t.key) !== -1;
        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0">'
          + '<div style="width:18px;height:18px;border-radius:5px;background:' + (done ? 'var(--color-accent)' : 'transparent') + ';border:1px solid ' + (done ? 'var(--color-accent)' : 'var(--color-neutral-600)') + ';flex-shrink:0"></div>'
          + '<span style="flex:1;font-size:13px">' + esc(t.label) + (isManual ? ' <span style="color:var(--color-accent-300);font-size:11px">(手動)</span>' : '') + '</span>'
          + '<button class="btn btn-icon btn-ghost" data-date="' + ds + '" data-key="' + t.key + '" style="width:28px;height:28px">' + S.icon('pencil', 14) + '</button></div>';
      });
      html += '</div>';
    }
    var body = sheet.querySelector('#prm-body');
    body.innerHTML = html;
    body.querySelectorAll('button[data-date]').forEach(function (btn) {
      btn.onclick = function () { togglePastTask(btn.getAttribute('data-date'), btn.getAttribute('data-key')); renderPastRecordsBody(sheet); };
    });
  }
  function togglePastTask(dateStr, key) {
    if (!editingPastRecords[dateStr]) editingPastRecords[dateStr] = {};
    var dayData = editingPastRecords[dateStr];
    dayData[key] = !dayData[key];
    if (!Array.isArray(dayData._manualKeys)) dayData._manualKeys = [];
    if (dayData._manualKeys.indexOf(key) === -1) dayData._manualKeys.push(key);
    if (dateStr === todayStr) { dailyTaskState[key] = dayData[key]; }
    savePastRecords(dateStr);
  }
  function savePastRecords(dateStr) {
    if (!S.GH_TOKEN) { App.toast('GHトークン未設定'); return; }
    clearTimeout(savePastRecords._t);
    savePastRecords._t = setTimeout(function () {
      S.apiPutJson('data/progress.json', function (obj) {
        obj = obj || {};
        if (!obj.dailyTasks) obj.dailyTasks = {};
        Object.keys(editingPastRecords).forEach(function (k) { obj.dailyTasks[k] = editingPastRecords[k]; });
        return obj;
      }, '📝 記録修正: ' + dateStr).then(function () { App.toast('保存しました', 'success'); }).catch(function () { App.toast('保存に失敗しました'); });
    }, 800);
  }

  // ── weekly report (ported: collectWeeklyData / analyzeWeekWithGemini) ──
  function collectWeeklyData() {
    var now = new Date();
    var weekStart = getWeekStart(now), weekEndFull = getWeekEnd(now), weekEnd = S.todayStr(now);
    var data = { weekStart: weekStart, weekEndFull: weekEndFull, weekEnd: weekEnd, taskDays: {}, scores: [], shadDays: 0, vocabDays: 0, dialogueDays: 0, totalMust: 0, completedMust: 0 };
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart); d.setDate(d.getDate() + i);
      var ds = S.todayStr(d);
      if (ds > weekEnd) break;
      var tasks = ds === todayStr ? dailyTaskState : (dailyTaskData[ds] || {});
      data.taskDays[ds] = tasks;
      (DAILY_TASKS_DEF[d.getDay()] || []).filter(function (t) { return t.priority === 'must'; }).forEach(function (t) {
        data.totalMust++; if (tasks[t.key]) data.completedMust++;
      });
      if (tasks.shadowing) data.shadDays++;
      if (tasks.vocab) data.vocabDays++;
      if (tasks.dialogue) data.dialogueDays++;
    }
    // Fetch this week's records directly rather than relying on the Home tab's 5-item
    // cache, which can miss earlier-in-the-week scores once more recordings pile up.
    if (!S.GH_TOKEN) { data.scores = []; return Promise.resolve(data); }
    return S.apiListDir('records').then(function (files) {
      var jsonFiles = (Array.isArray(files) ? files : []).filter(function (f) {
        return f.name && f.name.endsWith('.json') && f.name !== 'vocab-stats.json' && f.name >= weekStart;
      }).sort(function (a, b) { return b.name.localeCompare(a.name); }).slice(0, 15);
      return Promise.all(jsonFiles.map(function (f) { return S.apiGetJson('records/' + f.name).catch(function () { return null; }); }));
    }).then(function (recs) {
      data.scores = (recs || []).filter(Boolean).filter(function (r) { return r.score != null && r.date >= weekStart && r.date <= weekEnd; }).map(function (r) { return r.score; });
      return data;
    }).catch(function () { return data; });
  }
  function analyzeWeekWithGemini(data) {
    var taskSummary = '';
    Object.keys(data.taskDays).sort().forEach(function (ds) {
      var tasks = data.taskDays[ds];
      var done = Object.keys(tasks).filter(function (k) { return tasks[k]; }).join(', ');
      taskSummary += ds + ': ' + (done || 'なし') + '\n';
    });
    var avgScore = data.scores.length ? Math.round(data.scores.reduce(function (s, v) { return s + v; }, 0) / data.scores.length) : null;
    var prompt = '英語学習の週次レポートを日本語で作成してください。\n\n'
      + '【今週のデータ】\n期間: ' + data.weekStart + '（土）〜 ' + data.weekEndFull + '（金）\n'
      + 'シャドーイング実施日数: ' + data.shadDays + '日\n単語復習実施日数: ' + data.vocabDays + '日\n対話練習実施日数: ' + data.dialogueDays + '日\n'
      + '必須タスク達成率: ' + data.completedMust + '/' + data.totalMust + '\n'
      + (avgScore !== null ? 'AI評価スコア平均: ' + avgScore + '点\n' : '')
      + 'スコア推移: ' + (data.scores.length ? data.scores.join(', ') : 'データなし') + '\n\n'
      + '【日別タスク実施状況】\n' + taskSummary
      + '\n以下のJSON形式のみで返してください（コードブロック不要）:\n'
      + '{"summary":"今週の総括（2〜3文）","achievements":["よかった点1","よかった点2"],"improvements":["改善点1","改善点2"],"nextWeekFocus":"来週の重点事項（1文）","keyPhrases":["覚えたフレーズや表現（あれば）"]}';
    return S.callGeminiText([{ text: prompt }]).then(function (text) { return S.parseJsonFromModelText(text); });
  }
  function spinnerHtml(label) {
    return '<div style="text-align:center;padding:24px;color:var(--color-neutral-400);font-size:13px">' + esc(label) + '</div>';
  }
  function openSheet(title, bodyId, actionsId) {
    var sheet = document.createElement('div');
    sheet.innerHTML = '<div class="sheet-backdrop" id="' + bodyId + '-backdrop"></div>'
      + '<div class="sheet" style="max-height:85vh"><div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px 8px"><div style="font-size:17px;font-weight:500">' + esc(title) + '</div><button class="btn btn-icon btn-ghost" id="' + bodyId + '-close">×</button></div>'
      + '<div id="' + bodyId + '" style="overflow:auto;padding:0 18px 12px;flex:1;min-height:0"></div>'
      + (actionsId ? '<div id="' + actionsId + '" style="display:flex;gap:8px;padding:0 18px 20px;flex-shrink:0"></div>' : '')
      + '</div>';
    document.body.appendChild(sheet);
    function close() { sheet.remove(); }
    sheet.querySelector('#' + bodyId + '-backdrop').onclick = close;
    sheet.querySelector('#' + bodyId + '-close').onclick = close;
    return sheet;
  }

  // ── weekly report modal (ported: renderWeeklyReportContent / copyWeeklyReport / saveWeeklyReport) ──
  function statCardHtml(label, value, color) {
    return '<div style="text-align:center;padding:12px 6px;border-radius:var(--radius-sm);background:var(--color-neutral-900);border:1px solid var(--color-neutral-700)">'
      + '<div style="font-size:19px;font-weight:500;color:' + color + '">' + esc(value) + '</div><div style="font-size:11px;color:var(--color-neutral-400);margin-top:2px">' + esc(label) + '</div></div>';
  }
  // `tone:'flag'` marks items as needing attention via a left accent bar rather than
  // coloring the whole sentence — full-line warning/error color reads as if it were a
  // score judgment (those colors already mean pass/borderline/fail elsewhere in the app).
  function iconKicker(name, label) {
    return '<span style="display:inline-flex;align-items:center;gap:5px">' + S.icon(name, 13) + esc(label) + '</span>';
  }
  function reportSectionHtml(title, items, tone) {
    if (tone === 'flag') {
      return '<div class="card-kicker" style="margin-top:12px">' + title + '</div>'
        + '<div style="margin-top:4px">' + items.map(function (a) {
          return '<div style="font-size:13px;line-height:1.6;padding:2px 0 2px 10px;margin:4px 0;border-left:3px solid var(--color-accent)">' + esc(a) + '</div>';
        }).join('') + '</div>';
    }
    return '<div class="card-kicker" style="margin-top:12px">' + title + '</div>'
      + '<ul style="font-size:13px;line-height:1.8;padding-left:18px;margin:4px 0 0">' + items.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
  }
  function openWeeklyReportModal() {
    var sheet = openSheet('週次レポート', 'wr-body', 'wr-actions');
    document.getElementById('wr-body').innerHTML = spinnerHtml('データを収集中…');
    collectWeeklyData().then(function (data) {
      weeklyReportData = data;
      if (!S.GEM_KEY) { renderWeeklyReportBody(data, null); return; }
      document.getElementById('wr-body').innerHTML = spinnerHtml('Geminiで分析中…');
      analyzeWeekWithGemini(data).then(function (analysis) { renderWeeklyReportBody(data, analysis); })
        .catch(function () { renderWeeklyReportBody(data, null); });
    }).catch(function () {
      document.getElementById('wr-body').innerHTML = '<div style="color:var(--color-error);font-size:13px">データ収集に失敗しました</div>';
    });
  }
  function renderWeeklyReportBody(data, analysis) {
    var body = document.getElementById('wr-body');
    if (!body) return;
    var avgScore = data.scores.length ? Math.round(data.scores.reduce(function (s, v) { return s + v; }, 0) / data.scores.length) : null;
    var mustPct = data.totalMust > 0 ? Math.round((data.completedMust / data.totalMust) * 100) : 0;
    var html = '<div style="font-size:12px;color:var(--color-neutral-400);text-align:center;margin-bottom:10px">' + esc(data.weekStart) + '（土）〜 ' + esc(data.weekEndFull) + '（金）</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + statCardHtml('シャドーイング', data.shadDays + '日', 'var(--color-accent)')
      + statCardHtml('必須タスク達成率', mustPct + '%', 'var(--color-success)')
      + statCardHtml('単語復習', data.vocabDays + '日', 'var(--color-info)')
      + statCardHtml('AI評価平均', avgScore != null ? avgScore + '点' : '—', 'var(--color-warning)')
      + '</div>';
    if (analysis) {
      html += '<div class="card" style="margin-top:14px"><div style="font-size:14px;line-height:1.7">' + esc(analysis.summary || '') + '</div></div>';
      if (analysis.achievements && analysis.achievements.length) html += reportSectionHtml(iconKicker('star', 'よかった点'), analysis.achievements);
      if (analysis.improvements && analysis.improvements.length) html += reportSectionHtml(iconKicker('target', '改善ポイント'), analysis.improvements, 'flag');
      if (analysis.keyPhrases && analysis.keyPhrases.length) {
        html += '<div class="card-kicker" style="margin-top:12px">' + iconKicker('lightbulb', '今週のキーフレーズ') + '</div><div style="margin-top:4px">'
          + analysis.keyPhrases.map(function (p) { return '<span class="tag tag-accent" style="margin:2px 4px 2px 0">' + esc(p) + '</span>'; }).join('') + '</div>';
      }
      if (analysis.nextWeekFocus) html += '<div class="card-kicker" style="margin-top:12px">' + iconKicker('calendar', '来週の重点') + '</div><div style="font-size:13px;margin-top:4px">' + esc(analysis.nextWeekFocus) + '</div>';
    } else {
      html += '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:14px">（Gemini分析なし — GEM_KEYを設定するとAIコメントが追加されます）</div>';
    }
    body.innerHTML = html;
    var actions = document.getElementById('wr-actions');
    if (actions) {
      actions.innerHTML = '<button class="btn btn-secondary" style="flex:1" onclick="DashboardTab.copyWeeklyReport()">コピー</button>'
        + (S.GH_TOKEN ? '<button class="btn btn-primary" style="flex:1" onclick="DashboardTab.saveWeeklyReport()">GitHubに保存</button>' : '');
    }
  }
  function copyWeeklyReport() {
    var body = document.getElementById('wr-body');
    if (!body) return;
    navigator.clipboard.writeText(body.innerText || '').then(function () {
      App.toast('レポートをコピーしました', 'success');
      if (!dailyTaskState.weeklyReport) toggleTask('weeklyReport');
    }).catch(function () { App.toast('コピーに失敗しました'); });
  }
  function saveWeeklyReport() {
    if (!S.GH_TOKEN || !weeklyReportData) return;
    var body = document.getElementById('wr-body');
    var text = body ? (body.innerText || '') : '';
    var report = { generatedAt: new Date().toISOString(), weekStart: weeklyReportData.weekStart, weekEnd: weeklyReportData.weekEndFull,
      stats: { shadDays: weeklyReportData.shadDays, vocabDays: weeklyReportData.vocabDays, dialogueDays: weeklyReportData.dialogueDays, completedMust: weeklyReportData.completedMust, totalMust: weeklyReportData.totalMust, scores: weeklyReportData.scores }, text: text };
    S.apiPutJson('data/weekly-reports/' + weeklyReportData.weekStart + '.json', function () { return report; }, '📊 週次レポート: ' + weeklyReportData.weekStart)
      .then(function () { App.toast('GitHubに保存しました', 'success'); if (!dailyTaskState.weeklyReport) toggleTask('weeklyReport'); })
      .catch(function () { App.toast('保存に失敗しました'); });
  }

  // ── past records / AI feedback review (ported: openRecordsModal / renderRecordsModal) ──
  function openRecordsModal() {
    var sheet = openSheet('過去の記録・AI分析', 'rm-body');
    document.getElementById('rm-body').innerHTML = spinnerHtml('読み込み中…');
    if (!S.GH_TOKEN) { document.getElementById('rm-body').innerHTML = '<div style="color:var(--color-neutral-400);font-size:13px">GHトークンが必要です</div>'; return; }
    S.apiListDir('records').then(function (files) {
      var jsonFiles = (Array.isArray(files) ? files : []).filter(function (f) {
        return f.name && f.name.endsWith('.json') && f.name !== 'vocab-stats.json';
      }).sort(function (a, b) { return b.name.localeCompare(a.name); }).slice(0, 20);
      if (!jsonFiles.length) { document.getElementById('rm-body').innerHTML = '<div style="color:var(--color-neutral-400);font-size:13px">記録がまだありません</div>'; return; }
      return Promise.all(jsonFiles.map(function (f) { return S.apiGetJson('records/' + f.name).catch(function () { return null; }); })).then(function (recs) {
        renderRecordsModalBody((recs || []).filter(Boolean));
      });
    }).catch(function () {
      document.getElementById('rm-body').innerHTML = '<div style="color:var(--color-error);font-size:13px">読み込みに失敗しました</div>';
    });
  }
  function renderRecordsModalBody(recs) {
    var groups = {}, order = [];
    recs.forEach(function (r) {
      var key = r.scriptId || r.type || 'other';
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(r);
    });
    var html = order.map(function (key) {
      var title = SCRIPT_NAMES[key] || key;
      var entries = groups[key].map(function (r) {
        var modeLbl = r.mode === 'reading' ? '音読' : r.mode === 'shadowing' ? 'シャドー' : (r.mode || r.type || '—');
        var scoreCol = r.score >= 75 ? 'var(--color-success)' : r.score >= 55 ? 'var(--color-warning)' : 'var(--color-error)';
        var pts = (r.strengths || []).map(function (s) { return '<div style="display:flex;align-items:flex-start;gap:5px;font-size:12px;padding:2px 0;color:var(--color-success)"><span style="flex-shrink:0;margin-top:1px">' + S.icon('check', 12) + '</span><span style="color:var(--color-neutral-300)">' + esc(s) + '</span></div>'; }).join('');
        var imps = (r.improvements || []).map(function (s) { return '<div style="display:flex;align-items:flex-start;gap:5px;font-size:12px;line-height:1.5;padding:2px 0 2px 8px;margin:3px 0;border-left:2px solid var(--color-accent)"><span style="flex-shrink:0;margin-top:1px;color:var(--color-accent-300)">' + S.icon('lightbulb', 12) + '</span><span>' + esc(s) + '</span></div>'; }).join('');
        var audio = r.recordingUrl ? '<audio controls style="width:100%;height:32px;margin-top:6px" src="' + esc(r.recordingUrl) + '"></audio>' : '';
        return '<div class="card" style="margin-top:6px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'
          + '<span class="tag tag-neutral">' + esc(modeLbl) + '</span>'
          + '<span style="font-size:11px;color:var(--color-neutral-400);flex:1">' + esc((r.date || '') + ' ' + (r.time || '')) + '</span>'
          + (r.score != null ? '<span style="font-weight:600;color:' + scoreCol + '">' + r.score + '</span>' : '') + '</div>'
          + (pts || imps ? '<div style="margin-top:6px">' + pts + imps + '</div>' : '') + audio + '</div>';
      }).join('');
      return '<div class="card-kicker" style="margin-top:14px">' + esc(title) + '</div>' + entries;
    }).join('') || spinnerHtml('記録がありません');
    var body = document.getElementById('rm-body');
    if (body) body.innerHTML = html;
  }

  window.DashboardTab = {
    toggleTask: toggleTask, openChatGPT: openChatGPT, openPastRecordsModal: openPastRecordsModal,
    openWeeklyReportModal: openWeeklyReportModal, copyWeeklyReport: copyWeeklyReport, saveWeeklyReport: saveWeeklyReport,
    openRecordsModal: openRecordsModal, toggleCefrLegend: toggleCefrLegend, toggleCefrBasis: toggleCefrBasis,
    startTodayVocab: startTodayVocab, startDrill: startDrill, revealDrill: revealDrill, rateDrill: rateDrill,
    setDrillMode: setDrillMode, showDrillHint: showDrillHint, startTyping: startTyping, cancelTyping: cancelTyping, submitTyped: submitTyped,
    toggleDrillRec: toggleDrillRec, nextAfterDrillFeedback: nextAfterDrillFeedback, quickChatGPT: quickChatGPT,
    speakHighlight: speakHighlight, toggleHighlightNote: toggleHighlightNote, toggleHeatmapDay: toggleHeatmapDay,
    retryDrillGrade: retryDrillGrade,
  };

  App.registerTab('home', { onShow: renderHome });
  App.registerTab('progress', { onShow: renderProgress });
})();
