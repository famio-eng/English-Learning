// Home + Progress tabs. Ported from dashboard.html (calcStreak, DAILY_PLAN/DAILY_TASKS_DEF,
// weekly report generation, past-record editing) — logic kept verbatim, markup rebuilt to
// match the Nocturne design.
(function () {
  'use strict';
  var S = window.Shared;
  var TRIP_START = '2026-09-12'; // Roma/Barcelona trip — see vault Trip/2026旅行_ローマ・バルセロナ

  // ── constants ported from dashboard.html ──
  var WEEKLY_SCHEDULE = [
    { days: [6], dayLabel: '土', tasks: [{ icon: 'file-text', text: 'スクリプト作成' }, { icon: 'mic', text: 'シャドーイング 初回練習' }, { icon: 'book-open', text: '単語帳 初回学習' }] },
    { days: [0], dayLabel: '日', tasks: [{ icon: 'mic', text: 'シャドーイング ×3' }, { icon: 'book-open', text: '単語復習（SM-2）' }] },
    { days: [1, 2], dayLabel: '月・火', tasks: [{ icon: 'mic', text: 'シャドーイング 録音' }, { icon: 'zap', text: 'AI評価' }] },
    { days: [3, 4], dayLabel: '水・木', tasks: [{ icon: 'message-circle', text: 'Pimsleur式対話練習' }] },
    { days: [5], dayLabel: '金', tasks: [{ icon: 'book-open', text: 'SM-2 単語復習' }] },
  ];
  // `tab`: switches to that in-app tab. `onclick`: runs a DashboardTab method instead
  // (ChatGPT / weekly report). Ported from dashboard.html's DAILY_PLAN, with the old
  // `target: 'shadowing.html'`-style page links replaced by in-app tab switches now that
  // everything lives in one SPA.
  var DAILY_PLAN = {
    0: { buttons: [{ label: 'シャドーイングを始める', tab: 'practice', cls: 'btn-primary' }, { label: '単語帳を開く', tab: 'vocab', cls: 'btn-secondary' }] },
    1: { buttons: [{ label: 'シャドーイングを始める', tab: 'practice', cls: 'btn-primary' }] },
    2: { buttons: [{ label: 'シャドーイングを始める', tab: 'practice', cls: 'btn-primary' }] },
    3: { buttons: [{ label: 'ChatGPTで壁打ち', hint: 'プロンプトをコピーして開きます', onclick: "DashboardTab.openChatGPT('practice')", cls: 'btn-secondary' }] },
    4: { buttons: [{ label: 'ChatGPTで壁打ち', hint: 'プロンプトをコピーして開きます', onclick: "DashboardTab.openChatGPT('practice')", cls: 'btn-secondary' }] },
    5: { buttons: [{ label: '単語帳を開く', tab: 'vocab', cls: 'btn-primary' }] },
    6: { buttons: [{ label: '週次レポートを生成', onclick: 'DashboardTab.openWeeklyReportModal()', cls: 'btn-primary' }, { label: 'ChatGPTで壁打ち', hint: 'プロンプトをコピーして開きます', onclick: "DashboardTab.openChatGPT('kickoff')", cls: 'btn-secondary' }] },
  };
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
  var SCRIPT_NAMES = {
    short: '自己紹介 ショート版', casual: '自己紹介 カジュアル版', formal: '自己紹介 フォーマル版',
    'sop-status-report': 'SOP対応課題の状況報告', 'pentest-alignment': 'ペネトレーションテスト方針の確認',
    '510k-readiness': '510k申請に向けた準備状況の確認', 'launch-status-update': '海外向け週次進捗報告',
  };
  var TASK_ICON = {
    shadowing: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="6" y="1" width="4" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 7.5a4.5 4.5 0 009 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M8 12v2.5M5.5 14.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    vocab: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.5S6.5 2 3 2v10c3.5 0 5 1.5 5 1.5s1.5-1.5 5-1.5V2c-3.5 0-5 1.5-5 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 3.5V13.5" stroke="currentColor" stroke-width="1.2"/></svg>',
    dialogue: '<svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M3 5h16a1 1 0 011 1v9a1 1 0 01-1 1h-9l-4 3v-3H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    weeklyReport: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.5 8.5h5M5.5 11h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  };
  var TASK_TINT = { shadowing: 'rgba(124,111,247,.15)', vocab: 'rgba(34,197,94,.15)', dialogue: 'rgba(56,189,248,.15)', weeklyReport: 'rgba(124,111,247,.15)' };
  var TASK_COLOR = { shadowing: 'var(--color-accent)', vocab: 'var(--color-success)', dialogue: 'var(--color-info)', weeklyReport: 'var(--color-accent)' };

  // ── state ──
  var todayStr = S.todayStr();
  var dailyTaskState = {};
  var dailyTaskData = {};
  var vocabDueCount = null;
  var vocabMasteredCount = null;
  var recordings = [];   // parsed {date, scriptId, mode}
  var recentRecords = []; // parsed record JSONs, newest-first
  var weeklyReportData = null;
  var editingPastRecords = {};
  var cefrHistory = []; // [{date, index, avgScore}], persisted in data/progress.json
  var cefrLegendOpen = false;
  var cefrBasisOpen = false;
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
  function isoWeekNumber(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    var firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    return 1 + Math.round((date - firstThursday) / (7 * 86400000));
  }
  function weekType(d) { return isoWeekNumber(d) % 2 === 1 ? 'business' : 'travel'; }

  // 2026-09-07追加: 通常の隔週business/travel切替とは別に、出発直前5日間(9/7〜9/11)だけ
  // 旅行英語に全振りする一時的な上書き。恒久的な週次設定(DAILY_PLAN等)は変えず、
  // renderHome側の表示だけをこの期間中差し替える。
  var PRE_TRIP_PLAN = {
    5: { dayLabel: '月', focus: '空港・入国審査', scriptId: 'airport' },
    4: { dayLabel: '火', focus: 'ホテルのチェックイン・トラブル対応', scriptId: 'hotel' },
    3: { dayLabel: '水', focus: 'レストランでの注文', scriptId: 'restaurant' },
    2: { dayLabel: '木', focus: '道案内・ちょっとしたトラブル', scriptId: 'directions' },
    1: { dayLabel: '金', focus: '4スクリプト総復習＋単語帳の苦手復習', scriptId: null },
  };
  function preTripPlanFor(d) {
    var trip = new Date(TRIP_START + 'T00:00:00');
    var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diffDays = Math.round((trip - day) / 86400000);
    return PRE_TRIP_PLAN[diffDays] || null;
  }
  function preTripCardHtml(plan) {
    var openBtn = plan.scriptId
      ? '<button class="btn btn-primary btn-block" style="margin-top:10px" onclick="App.state.pendingOpenScriptId=\'' + plan.scriptId + '\';App.switchTab(\'practice\')">練習する</button>'
      : '<div style="display:flex;gap:8px;margin-top:10px">'
        + '<button class="btn btn-primary" style="flex:1" onclick="App.state.pendingPracticeCategory=\'travel\';App.switchTab(\'practice\')">4スクリプトを見直す</button>'
        + '<button class="btn btn-secondary" style="flex:1" onclick="VocabTab.toggleWeakOnly();App.switchTab(\'vocab\')">苦手単語を復習</button>'
        + '</div>';
    return '<div class="card" style="border-color:var(--color-accent)">'
      + '<div style="display:flex;align-items:center;gap:8px"><span class="tag tag-accent">旅行直前・' + plan.dayLabel + '曜</span></div>'
      + '<div class="card-title" style="margin-top:6px">' + esc(plan.focus) + '</div>'
      + '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:4px">ローマ・バルセロナ旅行（9/12〜）に向けた集中復習</div>'
      + openBtn + '</div>';
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
      return S.rawGetJson('data/vocab.json').catch(function () { return null; });
    }).then(function (data) {
      if (!data) { vocabDueCount = null; vocabMasteredCount = null; return; }
      var progress = {};
      try { progress = JSON.parse(localStorage.getItem('vocab_progress_v2') || '{}'); } catch (e) {}
      vocabDueCount = (data.words || []).filter(function (w) {
        var nr = (progress[w.id] && progress[w.id].nextReview) || w.nextReview || todayStr;
        return nr <= todayStr;
      }).length;
      // マスター判定はvocab.jsのwordStatus()と同じ基準(streak>=3 かつ interval>=4)。
      vocabMasteredCount = (data.words || []).filter(function (w) {
        var p = progress[w.id] || {};
        var streak = p.streak !== undefined ? p.streak : (w.streak || 0);
        var interval = p.interval !== undefined ? p.interval : (w.interval || 1);
        return streak >= 3 && interval >= 4;
      }).length;
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
  function todayTaskItemsHtml() {
    var day = new Date().getDay();
    var defs = DAILY_TASKS_DEF[day] || [];
    return defs.map(function (t) {
      var done = !!dailyTaskState[t.key];
      var onclick = t.auto ? '' : (t.key === 'weeklyReport' ? ' onclick="DashboardTab.openWeeklyReportModal()"' : ' onclick="DashboardTab.toggleTask(\'' + t.key + '\')"');
      var label = t.label;
      if (t.key === 'vocab' && vocabDueCount !== null) {
        label = done ? '単語復習（完了 ✓）' : (vocabDueCount === 0 ? '単語復習（今日は復習なし）' : '単語復習（今日の復習 ' + vocabDueCount + '件）');
      }
      return '<button' + onclick + ' style="display:flex;align-items:center;gap:10px;background:none;border:none;padding:0;cursor:' + (t.auto ? 'default' : 'pointer') + ';text-align:left;color:inherit;font-family:inherit;width:100%">'
        + '<div style="width:36px;height:36px;border-radius:12px;background:' + (TASK_TINT[t.key] || 'var(--color-neutral-700)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + (TASK_COLOR[t.key] || 'var(--color-neutral-400)') + '">' + (TASK_ICON[t.key] || '') + '</div>'
        + '<div style="flex:1"><div style="font-size:14px' + (done ? ';color:var(--color-neutral-400);text-decoration:line-through' : '') + '">' + esc(label) + '</div>'
        + '<div style="font-size:11px;color:var(--color-neutral-500)">' + (t.priority === 'must' ? '必須' : 'できれば') + (done ? ' ・ 完了' : '') + '</div></div>'
        + '</button>';
    }).join('');
  }

  function todayButtonsHtml() {
    var plan = DAILY_PLAN[new Date().getDay()];
    if (!plan || !plan.buttons.length) return '';
    return '<div style="display:flex;flex-direction:column;gap:8px">' + plan.buttons.map(function (b) {
      var onclick = b.onclick ? b.onclick : (b.tab ? "App.switchTab('" + b.tab + "')" : '');
      var inner = b.hint
        ? '<span style="display:flex;flex-direction:column;gap:2px;line-height:1.3"><span>' + esc(b.label) + '</span><span style="font-size:11px;font-weight:400;opacity:.7">' + esc(b.hint) + '</span></span>'
        : esc(b.label);
      return '<button class="btn ' + b.cls + ' btn-block" style="height:auto;padding-top:8px;padding-bottom:8px" onclick="' + onclick + '">' + inner + '</button>';
    }).join('') + '</div>';
  }

  function weekScheduleHtml() {
    var today = new Date().getDay();
    return [0, 1, 2, 3, 4, 5, 6].map(function (dow) {
      var entry = WEEKLY_SCHEDULE.find(function (w) { return w.days.indexOf(dow) !== -1; });
      var taskLabel = entry ? entry.tasks[0].text : '';
      var isToday = dow === today;
      return '<div style="flex:1;min-width:0;text-align:center;padding:7px 2px;border-radius:var(--radius-sm);background:' + (isToday ? 'var(--color-accent-800)' : 'transparent') + ';border:1px solid ' + (isToday ? 'var(--color-accent)' : 'var(--color-neutral-700)') + '">'
        + '<div style="font-size:11px;font-weight:500;color:' + (isToday ? 'var(--color-text)' : 'var(--color-neutral-400)') + '">' + DAY_JA[dow] + '</div>'
        + '<div style="font-size:8.5px;line-height:1.3;color:var(--color-neutral-300);margin-top:3px;word-break:break-all">' + esc(taskLabel) + '</div>'
        + '</div>';
    }).join('');
  }

  function continueScriptHtml() {
    var last = recentRecords[0];
    if (!last) return '';
    var title = SCRIPT_NAMES[last.scriptId] || last.scriptTitle || last.scriptId || '—';
    return '<div class="card">'
      + '<div class="card-kicker">前回の続き</div>'
      + '<div class="card-title" style="font-size:16px">' + esc(title) + '</div>'
      + '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:4px">' + (last.score != null ? '前回スコア ' + last.score + '点' : '') + '</div>'
      + '<button class="btn btn-primary" style="margin-top:8px" onclick="App.state.pendingOpenScriptId=\'' + esc(last.scriptId) + '\';App.switchTab(\'practice\')">続ける</button>'
      + '</div>';
  }

  function renderHome() {
    var el = document.getElementById('tab-home');
    if (!loaded) {
      el.innerHTML = '<div class="card"><div style="padding:24px;text-align:center;color:var(--color-neutral-400)">読み込み中…</div></div>';
      loadAll().then(renderHome);
      return;
    }
    var wt = weekType(new Date());
    var nextWt = wt === 'business' ? '旅行英語' : 'ビジネス英語';
    var daysToTrip = Math.max(0, Math.ceil((new Date(TRIP_START) - new Date()) / 86400000));
    var weeksToTrip = Math.max(0, Math.ceil((new Date(TRIP_START) - new Date()) / (7 * 86400000)));
    var userName = localStorage.getItem('profile_name') || 'Fami';
    var preTrip = preTripPlanFor(new Date());

    var html = '';
    html += '<div style="display:flex;align-items:center;justify-content:space-between">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<img src="./assets/app-icon.png" alt="" style="width:36px;height:36px;border-radius:10px;flex-shrink:0">'
      + '<div style="font-weight:600;font-size:24px">こんにちは、' + esc(userName) + 'さん</div></div>'
      + '<span class="tag tag-accent">継続' + streakDays() + '日</span></div>';

    if (preTrip) {
      html += '<div class="card"><div style="display:flex;align-items:center;gap:8px">'
        + '<span class="tag tag-accent">🧳 旅行直前</span><span style="font-size:15px;font-weight:500">出発まであと' + daysToTrip + '日</span></div>'
        + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:6px">9/12(土)ローマ・バルセロナへ出発。今週は旅行英語に全振りします</div></div>';
      html += preTripCardHtml(preTrip);
    } else {
      html += '<div class="card"><div style="display:flex;align-items:center;gap:8px">'
        + '<span class="tag tag-accent">今週</span><span style="font-size:15px;font-weight:500">' + (wt === 'business' ? 'ビジネス英語' : '旅行英語') + ' week</span></div>'
        + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:6px">来週は ' + nextWt + ' week ・ 旅行まで残り' + weeksToTrip + '週</div></div>';

      html += '<div class="card"><div class="card-kicker">今日のタスク</div>'
        + '<div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">' + todayTaskItemsHtml() + '</div></div>';

      html += todayButtonsHtml();
    }

    html += continueScriptHtml();

    html += '<button onclick="DashboardTab.openChatGPT(\'practice\')" style="display:flex;align-items:center;gap:12px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:14px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;width:100%">'
      + '<div style="width:36px;height:36px;border-radius:12px;background:rgba(56,189,248,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + TASK_ICON.dialogue.replace('currentColor', 'var(--color-info)') + '</div>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:500">対話練習・瞬間英作文</div><div style="font-size:12px;color:var(--color-neutral-400);margin-top:2px">プロンプトをコピーしてChatGPTを開きます</div></div>'
      + '<span style="font-size:13px;color:var(--color-accent-300)">開く ›</span></button>';

    html += '<div class="card"><div class="card-kicker">今週のスケジュール</div><div style="display:flex;gap:4px;margin-top:8px">' + weekScheduleHtml() + '</div></div>';

    var lastScore = recentRecords[0] && recentRecords[0].score != null ? recentRecords[0].score + '点' : '—';
    html += '<div style="display:flex;flex-wrap:wrap;gap:10px">'
      + statPill('直近スコア', lastScore) + statPill('復習待ち', vocabDueCount != null ? vocabDueCount + '語' : '—')
      + statPill('学習日数', streakDays() + '日') + statPill('習得語数', vocabMasteredCount != null ? vocabMasteredCount + '語' : '—')
      + '</div>';

    el.innerHTML = html;
  }
  function statPill(label, value) {
    return '<div style="flex:1 1 calc(50% - 5px);min-width:100px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:10px 8px;text-align:center">'
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

  function weekCycleTimelineHtml() {
    var now = new Date();
    var cells = [];
    for (var i = 0; i < 8; i++) {
      var d = new Date(now); d.setDate(d.getDate() + i * 7);
      var isTrip = S.todayStr(d) <= TRIP_START && S.todayStr(new Date(d.getTime() + 7 * 86400000)) > TRIP_START;
      var label = isTrip ? '出発週' : (i === 0 ? '今週' : '第' + (i + 1) + '週');
      var type = isTrip ? '旅行英語' : (weekType(d) === 'business' ? 'ビジネス' : '旅行');
      cells.push({ label: label, type: type, current: i === 0 });
    }
    return cells.map(function (c) {
      return '<div style="flex-shrink:0;min-width:52px;text-align:center;padding:8px 4px;border-radius:var(--radius-sm);background:' + (c.current ? 'var(--color-accent-700)' : 'var(--color-neutral-900)') + ';border:1px solid ' + (c.current ? 'var(--color-accent-500)' : 'var(--color-neutral-700)') + '">'
        + '<div style="font-size:10px;color:' + (c.current ? 'var(--color-text)' : 'var(--color-neutral-400)') + '">' + c.label + '</div>'
        + '<div style="font-size:11px;font-weight:500;color:' + (c.current ? 'var(--color-text)' : 'var(--color-neutral-400)') + ';margin-top:2px">' + c.type + '</div></div>';
    }).join('');
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

    html += '<div class="card"><div class="card-kicker">週サイクル（' + TRIP_START.replace(/-/g, '/') + ' の旅行まで）</div>'
      + '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-top:8px">' + weekCycleTimelineHtml() + '</div></div>';

    html += '<div class="card"><div class="card-kicker">週次レポート</div>'
      + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:4px">その週のシャドーイング・単語復習・スコアをAIがまとめます</div>'
      + '<button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="DashboardTab.openWeeklyReportModal()">今週のレポートを生成</button></div>';

    html += cefrGridHtml();

    html += '<div class="card"><div class="card-kicker">目標</div><div style="font-size:14px;margin-top:4px">TOEIC 750（5年前）→ 会議で自信を持って話せるレベル</div></div>';

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
          + '<button class="btn btn-icon btn-ghost" data-date="' + ds + '" data-key="' + t.key + '" style="width:28px;height:28px">✏️</button></div>';
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
      if (analysis.achievements && analysis.achievements.length) html += reportSectionHtml('✨ よかった点', analysis.achievements);
      if (analysis.improvements && analysis.improvements.length) html += reportSectionHtml('🎯 改善ポイント', analysis.improvements, 'flag');
      if (analysis.keyPhrases && analysis.keyPhrases.length) {
        html += '<div class="card-kicker" style="margin-top:12px">💡 今週のキーフレーズ</div><div style="margin-top:4px">'
          + analysis.keyPhrases.map(function (p) { return '<span class="tag tag-accent" style="margin:2px 4px 2px 0">' + esc(p) + '</span>'; }).join('') + '</div>';
      }
      if (analysis.nextWeekFocus) html += '<div class="card-kicker" style="margin-top:12px">📅 来週の重点</div><div style="font-size:13px;margin-top:4px">' + esc(analysis.nextWeekFocus) + '</div>';
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
        var pts = (r.strengths || []).map(function (s) { return '<div style="font-size:12px;padding:2px 0">✅ ' + esc(s) + '</div>'; }).join('');
        var imps = (r.improvements || []).map(function (s) { return '<div style="font-size:12px;line-height:1.5;padding:2px 0 2px 8px;margin:3px 0;border-left:2px solid var(--color-accent)">💡 ' + esc(s) + '</div>'; }).join('');
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
  };

  App.registerTab('home', { onShow: renderHome });
  App.registerTab('progress', { onShow: renderProgress });
})();
