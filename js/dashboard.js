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
  var DAILY_PLAN = {
    0: { title: '今日やること — シャドーイング＋単語復習', buttons: [{ label: 'シャドーイング', target: 'shadowing.html', cls: 'btn-primary' }, { label: '単語帳', target: 'vocab.html', cls: 'btn-secondary' }] },
    1: { title: '今日やること — シャドーイング練習', buttons: [{ label: 'シャドーイングを始める', target: 'shadowing.html', cls: 'btn-primary' }] },
    2: { title: '今日やること — シャドーイング練習', buttons: [{ label: 'シャドーイングを始める', target: 'shadowing.html', cls: 'btn-primary' }] },
    3: { title: '今日やること — Pimsleur式対話練習', buttons: [{ label: 'ChatGPTで壁打ち', onclick: 'DashboardTab.openChatGPT()', cls: 'btn-secondary' }] },
    4: { title: '今日やること — Pimsleur式対話練習', buttons: [{ label: 'ChatGPTで壁打ち', onclick: 'DashboardTab.openChatGPT()', cls: 'btn-secondary' }] },
    5: { title: '今日やること — 単語復習', buttons: [{ label: '単語帳を開く', target: 'vocab.html', cls: 'btn-primary' }] },
    6: { title: '今日やること — 振り返り＋スクリプト作成＋初回練習', buttons: [{ label: '週次レポートを生成', onclick: 'DashboardTab.openWeeklyReport()', cls: 'btn-primary' }, { label: 'ChatGPTで壁打ち', onclick: 'DashboardTab.openChatGPT()', cls: 'btn-secondary' }] },
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
  var recordings = [];   // parsed {date, scriptId, mode}
  var recentRecords = []; // parsed record JSONs, newest-first
  var weeklyReportData = null;
  var editingPastRecords = {};
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

  var CHATGPT_PROJECT_URL = 'https://chatgpt.com/g/g-p-6a64216444588191b40c3a829fd3121b'; // 「英語学習」プロジェクト
  function openChatGPT() {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var title = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    window.open(CHATGPT_PROJECT_URL + '?q=' + encodeURIComponent(title), '_blank');
  }

  // ── load ──
  function loadAll() {
    return S.apiGetJson('data/progress.json').then(function (obj) {
      dailyTaskData = (obj && obj.dailyTasks) || {};
      dailyTaskState = dailyTaskData[todayStr] || {};
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
      }).sort(function (a, b) { return b.name.localeCompare(a.name); }).slice(0, 5);
      return Promise.all(jsonFiles.map(function (f) {
        return S.apiGetJson('records/' + f.name).catch(function () { return null; });
      }));
    }).then(function (recs) {
      recentRecords = (recs || []).filter(Boolean);
    }).then(function () {
      return S.rawGetJson('data/vocab.json').catch(function () { return null; });
    }).then(function (data) {
      if (!data) { vocabDueCount = null; return; }
      var progress = {};
      try { progress = JSON.parse(localStorage.getItem('vocab_progress_v2') || '{}'); } catch (e) {}
      vocabDueCount = (data.words || []).filter(function (w) {
        var nr = (progress[w.id] && progress[w.id].nextReview) || w.nextReview || todayStr;
        return nr <= todayStr;
      }).length;
    }).then(function () { loaded = true; });
  }

  // ── streak / score data ──
  function streakDatesSet() {
    var s = {};
    recordings.forEach(function (r) { s[r.date] = true; });
    return s;
  }
  function streakDays() { return S.GH_TOKEN ? calcStreak(streakDatesSet(), new Date()) : 0; }

  // ── HOME ──
  function todayTaskItemsHtml() {
    var day = new Date().getDay();
    var defs = DAILY_TASKS_DEF[day] || [];
    return defs.map(function (t) {
      var done = !!dailyTaskState[t.key];
      var onclick = t.auto ? '' : ' onclick="DashboardTab.toggleTask(\'' + t.key + '\')"';
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
    var weeksToTrip = Math.max(0, Math.ceil((new Date(TRIP_START) - new Date()) / (7 * 86400000)));
    var userName = localStorage.getItem('profile_name') || 'Fami';

    var html = '';
    html += '<div style="display:flex;align-items:baseline;justify-content:space-between">'
      + '<div style="font-weight:600;font-size:24px">こんにちは、' + esc(userName) + 'さん</div>'
      + '<span class="tag tag-accent">継続' + streakDays() + '日</span></div>';

    html += '<div class="card"><div style="display:flex;align-items:center;gap:8px">'
      + '<span class="tag tag-accent">今週</span><span style="font-size:15px;font-weight:500">' + (wt === 'business' ? 'ビジネス英語' : '旅行英語') + ' week</span></div>'
      + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:6px">来週は ' + nextWt + ' week ・ 旅行まで残り' + weeksToTrip + '週</div></div>';

    html += '<div class="card"><div class="card-kicker">今日のタスク</div>'
      + '<div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">' + todayTaskItemsHtml() + '</div></div>';

    html += continueScriptHtml();

    html += '<button onclick="DashboardTab.openChatGPT()" style="display:flex;align-items:center;gap:12px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:14px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;width:100%">'
      + '<div style="width:36px;height:36px;border-radius:12px;background:rgba(56,189,248,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + TASK_ICON.dialogue.replace('currentColor', 'var(--color-info)') + '</div>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:500">対話練習・瞬間英作文</div><div style="font-size:12px;color:var(--color-neutral-400);margin-top:2px">ChatGPTを外部で開きます</div></div>'
      + '<span style="font-size:13px;color:var(--color-accent-300)">開く ›</span></button>';

    html += '<div class="card"><div class="card-kicker">今週のスケジュール</div><div style="display:flex;gap:4px;margin-top:8px">' + weekScheduleHtml() + '</div></div>';

    var lastScore = recentRecords[0] && recentRecords[0].score != null ? recentRecords[0].score + '点' : '—';
    html += '<div style="display:flex;gap:10px">'
      + statPill('直近スコア', lastScore) + statPill('復習待ち', vocabDueCount != null ? vocabDueCount + '語' : '—') + statPill('学習日数', streakDays() + '日')
      + '</div>';

    el.innerHTML = html;
  }
  function statPill(label, value) {
    return '<div style="flex:1;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:10px 8px;text-align:center">'
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
    var cells = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      var ds = S.todayStr(d);
      var override = editingPastRecords[ds];
      var done = override ? Object.keys(override).some(function (k) { return k !== '_manualKeys' && override[k]; }) : !!set[ds];
      cells.push('<div style="width:14px;height:14px;border-radius:3px;background:' + (done ? 'var(--color-accent-500)' : 'transparent') + ';border:1px solid ' + (done ? 'var(--color-accent-500)' : 'var(--color-neutral-600)') + '"></div>');
    }
    return cells.join('');
  }

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
      + '<div id="dash-report-body" style="font-size:13px;line-height:1.8;color:var(--color-neutral-300)"></div>'
      + '<button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="DashboardTab.openWeeklyReport()">今週のレポートを生成</button></div>';

    html += '<div class="card"><div class="card-kicker">目標</div><div style="font-size:14px;margin-top:4px">TOEIC 750（5年前）→ 会議で自信を持って話せるレベル</div></div>';

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
      }, '📝 記録修正: ' + dateStr).then(function () { App.toast('保存しました'); }).catch(function () { App.toast('保存に失敗しました'); });
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
    data.scores = recentRecords.filter(function (r) { return r.score != null && r.date >= weekStart && r.date <= weekEnd; }).map(function (r) { return r.score; });
    return Promise.resolve(data);
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
  function openWeeklyReport() {
    var body = document.getElementById('dash-report-body');
    if (!body) return;
    body.textContent = '生成中…';
    collectWeeklyData().then(function (data) {
      weeklyReportData = data;
      if (!S.GEM_KEY) { body.textContent = data.shadDays + '日シャドーイング・' + data.vocabDays + '日単語復習（GEM_KEY未設定のためAI分析なし）'; return; }
      analyzeWeekWithGemini(data).then(function (analysis) {
        body.textContent = analysis ? analysis.summary : '分析に失敗しました。';
        if (!dailyTaskState.weeklyReport) toggleTask('weeklyReport');
      }).catch(function () { body.textContent = '分析に失敗しました。'; });
    });
  }

  window.DashboardTab = { toggleTask: toggleTask, openChatGPT: openChatGPT, openPastRecordsModal: openPastRecordsModal, openWeeklyReport: openWeeklyReport };

  App.registerTab('home', { onShow: renderHome });
  App.registerTab('progress', { onShow: renderProgress });
})();
