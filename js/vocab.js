// 単語 tab. SRS algorithm (calcNext/applyReview/buildQueue), ALL_LEVELS, and GitHub
// persistence (saveToGitHub/persistWordPatch/submitAddWord's AI-fill prompt) ported
// verbatim from vocab.html. Level-category filtering, direction selection, and the
// session-timer UI (start/pause/resume/end) match the Nocturne design; the timer itself
// is new (local-only, not persisted — see plan decision #5).
(function () {
  'use strict';
  var S = window.Shared;
  var PROGRESS_KEY = 'vocab_progress_v2';
  var STATS_KEY = 'vocab_daily_stats';
  var ALL_LEVELS = ['中学英語', '高校英語', '大学受験', 'TOEIC600', 'TOEIC800', 'TOEIC900+', 'ネイティブ日常', 'ビジネス英語'];
  var HARD_LEVELS = ['TOEIC900+', 'ビジネス英語'];
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var words = [];
  var loaded = false;
  var scriptTitles = {};
  var synth = window.speechSynthesis;

  var vocabMode = 'list'; // list | review
  var vocabLevel = 'all';
  var vocabFilter = 'all'; // scriptId
  var vocabDirection = 'en2ja';
  var vocabInteraction = 'flip'; // 'flip' | 'reveal' (progressive-reveal, ja2en only)
  var vocabWeakOnly = false; // 苦手デッキ: missCount > 0 の単語だけに絞る
  var levelPanelOpen = false;
  var vocabSort = { key: null, dir: 'asc' }; // key: null(登録順) | 'word' | 'level' | 'added' | 'status'

  var queue = [], qIdx = 0, flipped = false;
  var revealCount = 1, revealSolved = false; // progressive-reveal state for the current card
  var sessionState = 'idle'; // idle | running | paused | ended
  var sessionElapsed = 0, sessionStartedAt = null, sessionTimer = null, sessionReviewed = 0;

  var wordDetailId = null;
  var wordFormOpen = false, wordFormMode = 'new', wordFormId = null;

  // ── localStorage progress (ported: getProgress / saveProgressSilent) ──
  function getProgress() { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch (e) { return {}; } }
  function saveProgressSilent() {
    var p = {};
    words.forEach(function (w) { p[w.id] = { interval: w.interval, nextReview: w.nextReview, reviewCount: w.reviewCount, streak: w.streak, missCount: w.missCount || 0, lastMissed: w.lastMissed || '' }; });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }
  function getDailyStats() { try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch (e) { return {}; } }
  function recordDailyStat(ok, total) {
    if (total === 0) return;
    var stats = getDailyStats(), today = S.todayStr();
    if (!stats[today]) stats[today] = { ok: 0, total: 0 };
    stats[today].ok += ok; stats[today].total += total;
    var keys = Object.keys(stats).sort();
    while (keys.length > 30) { delete stats[keys.shift()]; keys = Object.keys(stats).sort(); }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  // ── load (ported: loadVocab) ──
  function loadWords() {
    return S.rawGetJson('data/vocab.json').then(function (data) {
      var progress = getProgress();
      words = (data.words || []).map(function (w) {
        var p = progress[w.id] || {};
        return {
          id: w.id, word: w.word, pron: w.pron, meaning: w.meaning, example: w.example,
          source: w.source, scriptId: w.scriptId || '', added: w.added,
          level: w.level || [], otherMeanings: w.otherMeanings || [], usageTips: w.usageTips || '', collocations: w.collocations || [],
          interval: p.interval !== undefined ? p.interval : (w.interval || 1),
          nextReview: p.nextReview || w.nextReview || S.todayStr(),
          reviewCount: p.reviewCount !== undefined ? p.reviewCount : (w.reviewCount || 0),
          streak: p.streak !== undefined ? p.streak : (w.streak || 0),
          missCount: p.missCount !== undefined ? p.missCount : (w.missCount || 0),
          lastMissed: p.lastMissed || w.lastMissed || '',
        };
      });
      words.forEach(function (w) { if (w.scriptId && w.scriptId !== 'custom' && w.source) scriptTitles[w.scriptId] = w.source; });
      loaded = true;
    }).catch(function () { loaded = 'error'; });
  }

  // ── SRS (ported verbatim: calcNext / applyReview / buildQueue) ──
  function calcNext(word, q) {
    var base = word.interval || 1;
    var isHard = (word.level || []).some(function (l) { return HARD_LEVELS.indexOf(l) !== -1; });
    var f = isHard ? 0.8 : 1;
    if (q === 0) return 1 / 24;
    if (q === 1) return Math.max(0.1, base * 0.6 * f);
    if (q === 2) return Math.max(1, base * 2.2 * f);
    if (q === 3) return Math.max(4, base * 3.5 * f);
    return 1;
  }
  function applyReview(id, q) {
    var w = words.find(function (x) { return x.id === id; });
    if (!w) return;
    w.interval = calcNext(w, q);
    var d = new Date(); d.setTime(d.getTime() + w.interval * 86400000);
    w.nextReview = S.todayStr(d);
    w.reviewCount = (w.reviewCount || 0) + 1;
    if (q >= 2) { w.streak = (w.streak || 0) + 1; recordDailyStat(1, 1); }
    else { w.streak = 0; w.missCount = (w.missCount || 0) + 1; w.lastMissed = S.todayStr(); recordDailyStat(0, 1); }
    saveProgressSilent();
  }
  function buildQueue(targetWords, dir) {
    var today = S.todayStr();
    var sorted = targetWords.slice().sort(function (a, b) {
      var am = a.lastMissed === today ? 0 : 1, bm = b.lastMissed === today ? 0 : 1;
      if (am !== bm) return am - bm;
      var ad = a.nextReview || '', bd = b.nextReview || '';
      if (ad !== bd) return ad < bd ? -1 : 1;
      return (b.missCount || 0) - (a.missCount || 0);
    });
    queue = sorted.map(function (w) { return { word: w, dir: dir === 'random' ? (Math.random() < 0.5 ? 'en2ja' : 'ja2en') : dir }; });
    qIdx = 0; flipped = false; revealCount = 1; revealSolved = false; sessionReviewed = 0;
  }

  function levelsOf(w) { return w.level || []; }
  function scriptLabelFor(id) { return scriptTitles[id] || id; }
  function poolByLevel() { return vocabLevel === 'all' ? words : words.filter(function (w) { return levelsOf(w).indexOf(vocabLevel) !== -1; }); }
  function poolByLevelAndScript() {
    var byLevel = poolByLevel();
    var byScript = vocabFilter === 'all' ? byLevel : byLevel.filter(function (w) { return w.scriptId === vocabFilter; });
    return vocabWeakOnly ? byScript.filter(function (w) { return (w.missCount || 0) > 0; }) : byScript;
  }
  function getDue(pool) { var today = S.todayStr(); return pool.filter(function (w) { return !w.nextReview || w.nextReview <= today; }); }

  // ── GitHub persistence (ported verbatim: saveToGitHub / saveStatsToGitHub) ──
  function saveToGitHub() {
    if (!S.GH_TOKEN) return Promise.resolve();
    var vocabData = { words: words.map(function (w) {
      return { id: w.id, word: w.word, pron: w.pron, meaning: w.meaning, example: w.example, source: w.source, scriptId: w.scriptId, added: w.added,
        level: w.level, otherMeanings: w.otherMeanings, usageTips: w.usageTips, collocations: w.collocations,
        interval: w.interval, nextReview: w.nextReview, reviewCount: w.reviewCount, streak: w.streak, missCount: w.missCount || 0, lastMissed: w.lastMissed || '' };
    }) };
    return S.apiPutJson('data/vocab.json', function () { return vocabData; }, '📚 単語帳進捗保存: ' + S.todayStr()).catch(function () {});
  }
  function saveStatsToGitHub() {
    if (!S.GH_TOKEN) return;
    S.apiPutJson('records/vocab-stats.json', function () { return getDailyStats(); }, '📊 vocab stats: ' + S.todayStr()).catch(function () {});
  }
  function markDailyTask(key, doneCount) {
    if (!S.GH_TOKEN) return;
    S.apiPutJson('data/progress.json', function (obj) {
      obj = obj || {};
      if (!obj.dailyTasks) obj.dailyTasks = {};
      if (!obj.dailyTasks[S.todayStr()]) obj.dailyTasks[S.todayStr()] = {};
      obj.dailyTasks[S.todayStr()][key] = true;
      if (key === 'vocab' && doneCount !== undefined) obj.dailyTasks[S.todayStr()].vocabDoneCount = doneCount;
      return obj;
    }, '✅ タスク完了: ' + key).catch(function () {});
  }

  function speakWord(text) { synth.cancel(); var u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85; synth.speak(u); }

  // ── LIST ──
  function levelChipsHtml() {
    var pool = words;
    var chips = [{ id: 'all', label: '全レベル' }].concat(ALL_LEVELS.map(function (l) { return { id: l, label: l }; }));
    return chips.map(function (c) {
      var n = c.id === 'all' ? pool.length : pool.filter(function (w) { return levelsOf(w).indexOf(c.id) !== -1; }).length;
      var active = vocabLevel === c.id;
      return '<button onclick="VocabTab.setLevel(\'' + c.id + '\')" style="display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;font-size:11.5px;border:1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-neutral-700)') + ';background:' + (active ? 'var(--color-accent-800)' : 'transparent') + ';color:' + (active ? 'var(--color-text)' : 'var(--color-neutral-300)') + ';cursor:pointer">' + esc(c.label) + ' <span style="font-size:10px;color:var(--color-neutral-400)">' + n + '</span></button>';
    }).join('');
  }
  function filterChipsHtml() {
    var seen = [];
    poolByLevel().forEach(function (w) { if (w.scriptId && seen.indexOf(w.scriptId) === -1) seen.push(w.scriptId); });
    var defs = [{ id: 'all', label: '全体' }].concat(seen.map(function (id) { return { id: id, label: scriptLabelFor(id) }; }));
    return defs.map(function (f) {
      var active = vocabFilter === f.id;
      return '<button onclick="VocabTab.setFilter(\'' + f.id + '\')" style="flex-shrink:0;padding:6px 12px;border-radius:999px;font-size:12px;border:1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-neutral-700)') + ';background:' + (active ? 'var(--color-accent-800)' : 'transparent') + ';color:' + (active ? 'var(--color-text)' : 'var(--color-neutral-300)') + ';cursor:pointer;white-space:nowrap">' + esc(f.label) + '</button>';
    }).join('');
  }
  // 苦手デッキ: missCount>0 (過去に一度でも間違えた) 単語だけに絞るトグル。一覧にも
  // 学習セッション設定にも同じチップを出し、どちらもpoolByLevelAndScript()経由で
  // 反映されるので、セッション対象を「苦手だけ」に絞って復習することもできる。
  function weakChipHtml() {
    var weakCount = poolByLevel().filter(function (w) { return (w.missCount || 0) > 0; }).length;
    var active = vocabWeakOnly;
    return '<button onclick="VocabTab.toggleWeakOnly()" style="display:flex;align-items:center;gap:5px;flex-shrink:0;padding:6px 12px;border-radius:999px;font-size:12px;border:1px solid ' + (active ? 'var(--color-warning)' : 'var(--color-neutral-700)') + ';background:' + (active ? 'rgba(245,158,11,.15)' : 'transparent') + ';color:' + (active ? 'var(--color-warning)' : 'var(--color-neutral-300)') + ';cursor:pointer;white-space:nowrap">🔥 苦手だけ <span style="font-size:10px">' + weakCount + '</span></button>';
  }
  var LIST_COL_W = { level: '54px', date: '54px', status: '48px' };
  // status/level ranks are shared by the row renderer and the sort comparator so the
  // "状態"/"カテゴリ" columns sort by the same notion they display, not a re-derived one.
  function wordStatus(w, today) {
    var due = !w.nextReview || w.nextReview <= today;
    var label = w.reviewCount === 0 ? '未学習' : (due ? '復習期限' : (w.streak >= 3 && w.interval >= 4 ? '習得済み' : '学習中'));
    var color = label === '習得済み' ? 'var(--color-success)' : label === '復習期限' ? 'var(--color-warning)' : label === '学習中' ? 'var(--color-info)' : 'var(--color-neutral-400)';
    var rank = label === '復習期限' ? 0 : label === '未学習' ? 1 : label === '学習中' ? 2 : 3;
    var icon = label === '習得済み' ? '🌳' : label === '復習期限' ? '⏰' : label === '学習中' ? '🌿' : '🌱';
    return { label: label, color: color, rank: rank, icon: icon };
  }
  function levelRank(w) {
    var lvls = levelsOf(w);
    if (!lvls.length) return ALL_LEVELS.length;
    var idx = ALL_LEVELS.indexOf(lvls[0]);
    return idx === -1 ? ALL_LEVELS.length : idx;
  }
  function applySort(pool, today) {
    if (!vocabSort.key) return pool;
    var dir = vocabSort.dir === 'desc' ? -1 : 1;
    return pool.slice().sort(function (a, b) {
      var av, bv;
      if (vocabSort.key === 'word') { av = (a.word || '').toLowerCase(); bv = (b.word || '').toLowerCase(); }
      else if (vocabSort.key === 'level') { av = levelRank(a); bv = levelRank(b); }
      else if (vocabSort.key === 'status') { av = wordStatus(a, today).rank; bv = wordStatus(b, today).rank; }
      else { av = a.added || ''; bv = b.added || ''; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }
  function sortIndicator(key) { return vocabSort.key === key ? (vocabSort.dir === 'asc' ? ' ▲' : ' ▼') : ''; }
  function listHeaderHtml() {
    // Not position:sticky — its parent has overflow:hidden (for the card's rounded
    // corners), which becomes the nearest "scrolling ancestor" per spec and defeats
    // sticky before it ever reaches the real overflow:auto container further up.
    var col = function (key, label, extraStyle) {
      var active = vocabSort.key === key;
      return '<div onclick="VocabTab.setSort(\'' + key + '\')" style="' + (extraStyle || '') + 'font-size:9.5px;cursor:pointer;user-select:none;white-space:nowrap;color:' + (active ? 'var(--color-accent-300)' : 'var(--color-neutral-400)') + '">' + esc(label) + sortIndicator(key) + '</div>';
    };
    return '<div style="display:flex;align-items:center;background:var(--color-neutral-800);border-bottom:1px solid var(--color-neutral-700);padding:6px 6px">'
      + col('word', '単語', 'flex:1;min-width:0;')
      + col('level', 'カテゴリ', 'width:' + LIST_COL_W.level + ';flex-shrink:0;text-align:center;')
      + col('added', '登録日', 'width:' + LIST_COL_W.date + ';flex-shrink:0;text-align:center;')
      + col('status', '状態', 'width:' + LIST_COL_W.status + ';flex-shrink:0;text-align:center;')
      + '</div>';
  }
  function setSort(key) {
    if (vocabSort.key === key) { vocabSort.dir = vocabSort.dir === 'asc' ? 'desc' : 'asc'; }
    else { vocabSort.key = key; vocabSort.dir = 'asc'; }
    renderList();
  }
  function listRowsHtml() {
    var today = S.todayStr();
    var pool = applySort(poolByLevelAndScript(), today);
    return pool.map(function (w) {
      var st = wordStatus(w, today);
      var lvls = levelsOf(w);
      var levelBadge = lvls.length ? '<span class="tag tag-outline" style="font-size:8px;padding:2px 5px;white-space:nowrap">' + esc(lvls[0]) + (lvls.length > 1 ? '+' + (lvls.length - 1) : '') + '</span>' : '<span style="font-size:9px;color:var(--color-neutral-600)">—</span>';
      return '<button onclick="VocabTab.openDetail(\'' + w.id + '\')" style="display:flex;align-items:center;width:100%;background:var(--color-neutral-800);border:none;border-top:1px solid var(--color-neutral-700);cursor:pointer;text-align:left;color:inherit;padding:8px 6px">'
        + '<div style="flex:1;min-width:0;padding-right:4px"><div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(w.word) + '</div><div style="font-size:10px;color:var(--color-neutral-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(w.meaning) + '</div></div>'
        + '<div style="width:' + LIST_COL_W.level + ';flex-shrink:0;text-align:center">' + levelBadge + '</div>'
        + '<div style="width:' + LIST_COL_W.date + ';flex-shrink:0;text-align:center;font-size:9px;color:var(--color-neutral-500)">' + esc(w.added || '—') + '</div>'
        + '<div style="width:' + LIST_COL_W.status + ';flex-shrink:0;text-align:center" title="' + esc(st.label) + '"><span style="font-size:16px">' + st.icon + '</span></div>'
        + '</button>';
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--color-neutral-400);font-size:13px">該当する単語がありません</div>';
  }

  // vocab list has its own scroll region so the "新規登録"/"学習セッションを設定" action
  // bar stays visible without scrolling through the whole word list — position:sticky at
  // the bottom of a *long* list only pins once you've already scrolled past it once, it
  // doesn't keep it in view from the top, so the action bar must live outside the scroll.
  // NOTE: only touch overflow/padding here, never `display` — `.tab-panel`/`.tab-panel.active`
  // control visibility via that property, and an inline `display` would out-rank both class
  // rules and break tab switching (the panel would stay visible after navigating away).
  function resetPanelLayout(el) { el.style.overflow = ''; el.style.paddingBottom = ''; }

  function renderList() {
    var el = document.getElementById('tab-vocab');
    if (loaded !== true) {
      resetPanelLayout(el);
      el.innerHTML = '<div class="card"><div style="padding:24px;text-align:center;color:var(--color-neutral-400)">読み込み中…</div></div>';
      loadWords().then(renderList);
      return;
    }
    if (wordDetailId) { resetPanelLayout(el); renderWordDetail(); return; }
    if (wordFormOpen) { resetPanelLayout(el); renderWordForm(); return; }
    if (vocabMode === 'review') { resetPanelLayout(el); renderReview(); return; }

    var pool = poolByLevelAndScript();
    var top = '<div style="display:flex;align-items:baseline;justify-content:space-between"><div style="font-weight:600;font-size:24px">単語帳</div><span class="tag tag-neutral">' + pool.length + '語</span></div>';
    top += '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">'
      + '<button onclick="VocabTab.toggleLevelPanel()" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-neutral-700);background:var(--color-neutral-800);cursor:pointer;color:inherit">'
      + '<span style="font-size:12px;color:var(--color-neutral-400)">レベルカテゴリ</span><span style="font-size:12px;color:var(--color-accent-300)">' + (vocabLevel === 'all' ? '全レベル' : esc(vocabLevel)) + (levelPanelOpen ? ' ▴' : ' ▾') + '</span></button>'
      + (levelPanelOpen ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + levelChipsHtml() + '</div>' : '')
      + '</div>';
    top += '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-top:8px">' + weakChipHtml() + filterChipsHtml() + '</div>';

    var middle = '<div style="border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);overflow:hidden;margin-top:8px">' + listHeaderHtml() + listRowsHtml() + '</div>';

    var footer = '<div style="display:flex;gap:8px;flex-shrink:0;padding-top:10px">'
      + '<button class="btn btn-secondary" onclick="VocabTab.openNewWord()">＋ 新規登録</button>'
      + '<button class="btn btn-primary" style="flex:1" onclick="VocabTab.showReview()">学習セッションを設定（' + pool.length + '語）</button></div>';

    el.style.overflow = 'hidden';
    el.style.paddingBottom = '20px';
    el.innerHTML = '<div style="flex-shrink:0">' + top + '</div>'
      + '<div style="flex:1;min-height:0;overflow:auto">' + middle + '</div>'
      + footer;
  }

  // ── SESSION CONFIG + REVIEW ──
  function directionOptionsHtml() {
    return ['en2ja', 'ja2en', 'random'].map(function (d) {
      var label = d === 'en2ja' ? '英→日' : d === 'ja2en' ? '日→英' : 'ランダム';
      var active = vocabDirection === d;
      return '<button class="seg-opt" data-active="' + active + '" onclick="VocabTab.setDirection(\'' + d + '\')">' + label + '</button>';
    }).join('');
  }
  function interactionOptionsHtml() {
    return ['flip', 'reveal'].map(function (m) {
      var label = m === 'flip' ? 'フリップ式' : '部分ヒント式';
      var active = vocabInteraction === m;
      return '<button class="seg-opt" data-active="' + active + '" onclick="VocabTab.setInteraction(\'' + m + '\')">' + label + '</button>';
    }).join('');
  }
  function fmtMs(ms) {
    var s = Math.floor(ms / 1000);
    var p2 = function (n) { return String(n).padStart(2, '0'); };
    return p2(Math.floor(s / 3600)) + ':' + p2(Math.floor(s / 60) % 60) + ':' + p2(s % 60);
  }
  function currentSessionMs() { return sessionElapsed + (sessionState === 'running' && sessionStartedAt ? Date.now() - sessionStartedAt : 0); }

  function renderReview() {
    var el = document.getElementById('tab-vocab');
    var html = '<div style="display:flex;align-items:baseline;justify-content:space-between"><div style="font-weight:600;font-size:24px">単語帳</div>'
      + '<button onclick="VocabTab.showList()" style="background:none;border:none;color:var(--color-accent-300);font-size:12px;cursor:pointer">一覧に戻る</button></div>';

    if (sessionState === 'idle') {
      var pool = poolByLevelAndScript();
      html += '<div class="card"><div class="card-kicker">学習セッションの設定</div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">レベルカテゴリ</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + levelChipsHtml() + '</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">ダイアグラム</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + weakChipHtml() + filterChipsHtml() + '</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">出題方向</div><div class="seg" style="display:flex;margin-top:6px">' + directionOptionsHtml() + '</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">出題スタイル</div><div class="seg" style="display:flex;margin-top:6px">' + interactionOptionsHtml() + '</div>'
        + '<div style="font-size:11px;color:var(--color-neutral-500);margin-top:4px">部分ヒント式は「日→英」出題のときだけ有効です</div></div>'
        + '<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--color-neutral-700);font-size:12px;color:var(--color-accent-300)">' + pool.length + '語が対象</div>'
        + '<button class="btn btn-primary btn-block" style="margin-top:10px" onclick="VocabTab.startSession()">学習を開始</button></div>';
    } else if (sessionState === 'ended') {
      html += '<div class="card" style="margin-top:16px"><div style="display:flex;flex-direction:column;gap:14px;padding:16px 4px;align-items:center;text-align:center">'
        + '<div style="font-size:16px;font-weight:500">学習を終了しました</div>'
        + '<div style="display:flex;gap:10px;width:100%">'
        + '<div style="flex:1;text-align:center;padding:12px 6px;border-radius:var(--radius-sm);background:var(--color-neutral-900);border:1px solid var(--color-neutral-700)"><div style="font-size:19px;font-weight:500">' + fmtMs(sessionElapsed) + '</div><div style="font-size:11px;color:var(--color-neutral-400)">学習時間</div></div>'
        + '<div style="flex:1;text-align:center;padding:12px 6px;border-radius:var(--radius-sm);background:var(--color-neutral-900);border:1px solid var(--color-neutral-700)"><div style="font-size:19px;font-weight:500">' + sessionReviewed + '語</div><div style="font-size:11px;color:var(--color-neutral-400)">復習した語数</div></div></div>'
        + '<button class="btn btn-primary btn-block" onclick="VocabTab.resetSession()">もう一度学習する</button>'
        + '<button class="btn btn-ghost btn-block" onclick="VocabTab.showList()">一覧に戻る</button></div></div>';
    } else {
      // running | paused
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-md);background:var(--color-neutral-800);border:1px solid var(--color-neutral-700)">'
        + '<div style="width:7px;height:7px;border-radius:50%;background:' + (sessionState === 'paused' ? 'var(--color-warning)' : 'var(--color-success)') + '"></div>'
        + '<div style="flex:1"><div id="vt-timer" style="font-size:19px;font-weight:500">' + fmtMs(currentSessionMs()) + '</div><div style="font-size:10.5px;color:var(--color-neutral-400)">' + (sessionState === 'paused' ? '中断中' : '学習中') + '</div></div>'
        + (sessionState === 'running'
          ? '<button onclick="VocabTab.pauseSession()" style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-neutral-600);background:transparent;color:var(--color-neutral-200);font-size:12px">中断</button>'
          : '<button onclick="VocabTab.resumeSession()" style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-accent);background:var(--color-accent-800);color:var(--color-text);font-size:12px">再開</button>')
        + '<button onclick="VocabTab.endSession()" style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-neutral-600);background:transparent;color:var(--color-neutral-400);font-size:12px">終了</button></div>';

      if (qIdx >= queue.length) {
        html += '<div class="card" style="margin-top:16px;text-align:center;padding:24px"><div style="font-size:16px;font-weight:500">このカテゴリを一周しました</div>'
          + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:6px">' + sessionReviewed + '語を復習しました（計測は継続中）</div>'
          + '<button class="btn btn-primary" style="margin-top:10px" onclick="VocabTab.endSession()">学習を終了する</button>'
          + '<button class="btn btn-ghost" style="margin-top:6px" onclick="VocabTab.resetQueue()">もう一周する</button></div>';
      } else {
        var item = queue[qIdx];
        var w = item.word;
        var askJa = item.dir === 'ja2en';
        var useReveal = vocabInteraction === 'reveal' && askJa;
        if (useReveal) {
          html += revealCardHtml(item);
          if (revealSolved) {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:14px">'
              + ratingBtn(0, 'もう一度') + ratingBtn(1, '難しい') + ratingBtn(2, 'OK') + ratingBtn(3, '完璧') + '</div>';
          }
        } else {
          var wEsc = esc(w.word).replace(/'/g, "\\'");
          var exEsc = w.example ? esc(w.example).replace(/'/g, "\\'") : '';
          var speakBtn = function (text) { return '<button class="btn-icon btn-ghost" style="flex-shrink:0;width:28px;height:28px" onclick="event.stopPropagation();VocabTab.speak(\'' + text + '\')">🔊</button>'; };
          html += '<div id="vt-active-card" style="margin-top:12px;perspective:1200px"><div id="vt-flip-card" style="position:relative;height:220px;transform-style:preserve-3d;transition:transform .5s ease;transform:' + (flipped ? 'rotateY(180deg)' : 'rotateY(0)') + ';cursor:pointer" onclick="VocabTab.flipCard()">'
            + '<div style="position:absolute;inset:0;backface-visibility:hidden;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-lg);padding:26px 20px;display:flex;flex-direction:column;justify-content:center;gap:10px;box-sizing:border-box">'
            + (askJa
              ? '<div style="font-weight:600;font-size:20px;line-height:1.5">' + esc(w.meaning) + '</div><div style="font-size:12px;color:var(--color-neutral-400)">英語で言ってみましょう</div>'
              : '<div style="display:flex;align-items:center;gap:8px"><div style="font-weight:600;font-size:26px">' + esc(w.word) + '</div>' + speakBtn(wEsc) + '</div><div style="font-size:13px;color:var(--color-accent-300)">' + esc(w.pron || '') + '</div>')
            + '</div>'
            + '<div style="position:absolute;inset:0;backface-visibility:hidden;transform:rotateY(180deg);background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-lg);padding:26px 20px;display:flex;flex-direction:column;justify-content:center;gap:8px;box-sizing:border-box">'
            + '<div style="display:flex;align-items:center;gap:8px"><div style="font-size:16px;font-weight:500">' + esc(w.word) + '</div>' + speakBtn(wEsc) + '</div>'
            + '<div style="font-size:13px;color:var(--color-neutral-200)">' + esc(w.meaning) + '</div>'
            + (w.example ? '<div style="display:flex;align-items:flex-start;gap:6px"><div style="font-size:12px;color:var(--color-neutral-400);font-style:italic;flex:1">"' + esc(w.example) + '"</div>' + speakBtn(exEsc) + '</div>' : '')
            + '</div></div></div>';
          html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:14px">'
            + ratingBtn(0, 'もう一度') + ratingBtn(1, '難しい') + ratingBtn(2, 'OK') + ratingBtn(3, '完璧') + '</div>';
        }
      }
    }
    el.innerHTML = html;
  }
  // プログレッシブリビール(部分ヒント)方式: 最初の1文字だけ見せ、「もう1文字」で
  // 少しずつ開示。フリップの代わりに「答えを見る」で全体を出して評価ボタンに進む。
  function revealCardHtml(item) {
    var w = item.word;
    var letters = w.word.replace(/ /g, '').length;
    var shown = w.word.split('').map(function (ch, i) {
      if (ch === ' ') return '&nbsp;&nbsp;';
      var idx = w.word.slice(0, i).replace(/ /g, '').length;
      return (revealSolved || idx < revealCount) ? esc(ch) : '_';
    }).join(' ');
    var canRevealMore = revealCount < letters;
    var html = '<div id="vt-active-card" class="card" style="margin-top:12px;padding:26px 20px;text-align:center">'
      + '<div style="font-weight:600;font-size:18px;line-height:1.5">' + esc(w.meaning) + '</div>'
      + '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:4px">英語で言ってみましょう（ヒントを見ながらでもOK）</div>'
      + '<div style="font-family:ui-monospace,Menlo,monospace;font-size:22px;letter-spacing:2px;margin-top:18px;min-height:32px;color:' + (revealSolved ? 'var(--color-accent-300)' : 'var(--color-text)') + '">' + shown + '</div>';
    if (revealSolved) {
      html += (w.pron ? '<div style="font-size:13px;color:var(--color-neutral-300);margin-top:10px">' + esc(w.pron) + '</div>' : '')
        + (w.example ? '<div style="font-size:12px;color:var(--color-neutral-400);font-style:italic;margin-top:8px">"' + esc(w.example) + '"</div>' : '');
    } else {
      html += '<div style="display:flex;gap:8px;margin-top:16px;justify-content:center">'
        + '<button class="btn btn-secondary"' + (canRevealMore ? '' : ' disabled') + ' onclick="VocabTab.revealMore()">もう1文字（' + revealCount + '/' + letters + '）</button>'
        + '<button class="btn btn-primary" onclick="VocabTab.revealSolve()">答えを見る</button></div>';
    }
    html += '</div>';
    return html;
  }
  function revealMore() {
    var item = queue[qIdx];
    if (!item) return;
    var letters = item.word.word.replace(/ /g, '').length;
    if (revealCount < letters) revealCount++;
    renderReview();
  }
  function revealSolve() { revealSolved = true; renderReview(); }
  function ratingBtn(q, label) {
    var style = q >= 2 ? 'background:var(--color-accent-800);border:1px solid var(--color-accent-600);color:var(--color-text)' : 'background:var(--color-neutral-800);border:1px solid var(--color-neutral-600);color:var(--color-neutral-200)';
    return '<button onclick="VocabTab.answer(' + q + ')" style="' + style + ';border-radius:var(--radius-sm);padding:10px 4px;font-size:12px">' + label + '</button>';
  }

  function startSessionTick() { clearInterval(sessionTimer); sessionTimer = setInterval(renderReview, 1000); }
  function stopSessionTick() { clearInterval(sessionTimer); sessionTimer = null; }

  function showReview() { vocabMode = 'review'; sessionState = 'idle'; renderList(); }
  function showList() { stopSessionTick(); vocabMode = 'list'; sessionState = 'idle'; renderList(); }
  function setLevel(l) { vocabLevel = l; levelPanelOpen = false; renderList(); }
  function setFilter(f) { vocabFilter = f; renderList(); }
  function toggleWeakOnly() { vocabWeakOnly = !vocabWeakOnly; renderList(); }
  function toggleLevelPanel() { levelPanelOpen = !levelPanelOpen; renderList(); }
  function setDirection(d) { vocabDirection = d; renderReview(); }
  function setInteraction(m) { vocabInteraction = m; renderReview(); }
  function startSession() {
    buildQueue(poolByLevelAndScript(), vocabDirection);
    sessionState = 'running'; sessionElapsed = 0; sessionStartedAt = Date.now();
    startSessionTick(); renderReview();
  }
  function pauseSession() { sessionElapsed = currentSessionMs(); sessionStartedAt = null; sessionState = 'paused'; stopSessionTick(); renderReview(); }
  function resumeSession() { sessionStartedAt = Date.now(); sessionState = 'running'; startSessionTick(); renderReview(); }
  function endSession() {
    sessionElapsed = currentSessionMs(); sessionStartedAt = null; sessionState = 'ended'; stopSessionTick();
    if (sessionReviewed > 0) {
      markDailyTask('vocab', sessionReviewed);
      saveStatsToGitHub();
      saveToGitHub();
    }
    renderReview();
  }
  function resetSession() { sessionState = 'idle'; renderReview(); }
  function resetQueue() { buildQueue(poolByLevelAndScript(), vocabDirection); renderReview(); }
  function flipCard() {
    // Toggle the transform directly on the existing node — re-rendering via innerHTML
    // (like every other state change here) would replace the element outright, so the
    // CSS transition never has an old value to animate from and the flip just snaps.
    flipped = !flipped;
    var cardEl = document.getElementById('vt-flip-card');
    if (cardEl) cardEl.style.transform = flipped ? 'rotateY(180deg)' : 'rotateY(0)';
    var item = queue[qIdx];
    if (flipped && item && item.dir === 'ja2en') speakWord(item.word.word);
    else if (!flipped && item && item.dir === 'en2ja') setTimeout(function () { speakWord(item.word.word); }, 250);
  }
  function answer(q) {
    var item = queue[qIdx];
    if (!item) return;
    var commit = function () {
      applyReview(item.word.id, q);
      sessionReviewed++;
      if (q === 0) { queue.push(queue.splice(qIdx, 1)[0]); }
      else qIdx++;
      flipped = false; revealCount = 1; revealSolved = false;
      renderReview();
    };
    // OK/完璧の正解時だけ、次のカードに進む前にカードを一瞬光らせる。ボックスシャドウ
    // のみをアニメーションさせ、フリップカードの3D transform(rotateY)とは競合しない。
    var cardEl = document.getElementById('vt-active-card');
    if (q >= 2 && cardEl) {
      cardEl.classList.add('vt-correct-pulse');
      setTimeout(commit, 380);
    } else {
      commit();
    }
  }

  // ── word detail / edit / add (ported: showWordDetail / persistWordPatch / submitAddWord) ──
  function openDetail(id) { wordDetailId = id; renderList(); }
  function closeDetail() { wordDetailId = null; renderList(); }
  function renderWordDetail() {
    var w = words.find(function (x) { return x.id === wordDetailId; });
    if (!w) { wordDetailId = null; renderList(); return; }
    var el = document.getElementById('tab-vocab');
    var st = wordStatus(w, S.todayStr());
    var badges = levelsOf(w).map(function (l) { return '<span class="tag tag-outline" style="margin-right:4px">' + esc(l) + '</span>'; }).join('');
    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div style="font-weight:600;font-size:20px">' + esc(w.word) + '</div>'
      + '<button class="btn-icon btn-ghost" onclick="VocabTab.speak(\'' + esc(w.word).replace(/'/g, "\\'") + '\')">🔊</button></div>'
      + '<div style="font-size:13px;color:var(--color-accent-300)">' + esc(w.pron || '') + '</div>'
      + '<div style="font-size:14px;color:var(--color-neutral-200)">' + esc(w.meaning) + '</div>'
      + (w.example ? '<div style="font-size:13px;color:var(--color-neutral-400);font-style:italic">"' + esc(w.example) + '"</div>' : '')
      + '<div style="margin-top:4px">' + badges + '<span class="tag" style="color:' + st.color + ';border-color:' + st.color + '">' + st.icon + ' ' + esc(st.label) + '</span>' + (w.missCount ? '<span class="tag tag-outline" style="margin-left:4px">🔥 ' + w.missCount + '回ミス</span>' : '') + '</div>'
      + (w.usageTips ? '<div class="card" style="margin-top:8px"><div class="card-kicker">使い方のコツ</div><div style="font-size:13px;margin-top:4px">' + esc(w.usageTips) + '</div></div>' : '')
      + (w.collocations && w.collocations.length ? '<div class="card" style="margin-top:8px"><div class="card-kicker">よく使う表現</div><div style="font-size:13px;margin-top:4px">' + esc(w.collocations.join(' / ')) + '</div></div>' : '')
      + '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-secondary" style="flex:1" onclick="VocabTab.openEditWord(\'' + w.id + '\')">編集</button>'
      + '<button class="btn btn-ghost" style="flex:1" onclick="VocabTab.closeDetail()">閉じる</button></div>'
      + '<button style="width:100%;margin-top:8px;padding:9px;border-radius:var(--radius-sm);border:1px solid var(--color-error);background:transparent;color:var(--color-error);font-size:12.5px;cursor:pointer" onclick="VocabTab.deleteWord(\'' + w.id + '\')">この単語を削除</button>';
  }

  function openNewWord() { wordFormMode = 'new'; wordFormId = null; wordFormOpen = true; renderList(); }
  function openEditWord(id) { wordFormMode = 'edit'; wordFormId = id; wordDetailId = null; wordFormOpen = true; renderList(); }
  function closeWordForm() { wordFormOpen = false; renderList(); }
  function renderWordForm() {
    var w = wordFormId ? words.find(function (x) { return x.id === wordFormId; }) : null;
    var el = document.getElementById('tab-vocab');
    var levelSel = (w ? levelsOf(w) : []).slice();
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:17px;font-weight:500">' + (wordFormMode === 'edit' ? '単語を編集' : '単語を新規登録') + '</div>'
      + '<button class="btn-icon btn-ghost" onclick="VocabTab.closeWordForm()">×</button></div>'
      + field('word', '単語・熟語（英語）', w ? w.word : '', 'e.g. align on')
      + field('meaning', '意味（日本語）', w ? w.meaning : '', 'e.g. 〜について合意する')
      + field('pron', '発音記号（任意）', w ? w.pron : '', 'e.g. /əˈlaɪn ɒn/')
      + fieldArea('example', '例文（任意・空欄でAI生成）', w ? w.example : '', "e.g. I'd like to align on two points.")
      + fieldArea('usageTips', '使い方のコツ（任意）', w ? w.usageTips : '', 'e.g. フォーマルな場でよく使う表現')
      + field('collocations', 'よく使う表現（任意・「/」区切り）', w && w.collocations ? w.collocations.join(' / ') : '', 'e.g. align on the plan / align expectations')
      + '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:8px">レベルカテゴリ</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + ALL_LEVELS.map(function (l) {
        var active = levelSel.indexOf(l) !== -1;
        return '<button onclick="VocabTab.toggleFormLevel(\'' + l + '\')" data-lvl="' + esc(l) + '" style="padding:6px 11px;border-radius:999px;font-size:11.5px;border:1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-neutral-700)') + ';background:' + (active ? 'var(--color-accent-800)' : 'transparent') + ';color:' + (active ? 'var(--color-text)' : 'var(--color-neutral-300)') + '">' + esc(l) + '</button>';
      }).join('') + '</div>'
      + '<div id="vt-form-status" style="font-size:12px;color:var(--color-neutral-400);min-height:16px;margin-top:8px"></div>'
      + '<button class="btn btn-primary btn-block" style="margin-top:8px" onclick="VocabTab.saveWordForm()">保存する</button>';
    el.dataset.formLevels = JSON.stringify(levelSel);
  }
  function field(id, label, val, ph) {
    return '<label style="display:flex;flex-direction:column;gap:4px;margin-top:10px"><span style="font-size:12px;color:var(--color-neutral-400)">' + label + '</span>'
      + '<input class="field" id="vt-f-' + id + '" value="' + esc(val || '') + '" placeholder="' + esc(ph) + '"></label>';
  }
  function fieldArea(id, label, val, ph) {
    return '<label style="display:flex;flex-direction:column;gap:4px;margin-top:10px"><span style="font-size:12px;color:var(--color-neutral-400)">' + label + '</span>'
      + '<textarea class="field" id="vt-f-' + id + '" rows="3" placeholder="' + esc(ph) + '">' + esc(val || '') + '</textarea></label>';
  }
  function toggleFormLevel(l) {
    var el = document.getElementById('tab-vocab');
    var sel = JSON.parse(el.dataset.formLevels || '[]');
    var i = sel.indexOf(l);
    if (i === -1) sel.push(l); else sel.splice(i, 1);
    el.dataset.formLevels = JSON.stringify(sel);
    el.querySelectorAll('button[data-lvl]').forEach(function (b) {
      var active = sel.indexOf(b.getAttribute('data-lvl')) !== -1;
      b.style.borderColor = active ? 'var(--color-accent)' : 'var(--color-neutral-700)';
      b.style.background = active ? 'var(--color-accent-800)' : 'transparent';
      b.style.color = active ? 'var(--color-text)' : 'var(--color-neutral-300)';
    });
  }

  function saveWordForm() {
    var wordVal = (document.getElementById('vt-f-word').value || '').trim();
    var meaningVal = (document.getElementById('vt-f-meaning').value || '').trim();
    var pronVal = (document.getElementById('vt-f-pron').value || '').trim();
    var exampleVal = (document.getElementById('vt-f-example').value || '').trim();
    var usageTipsVal = (document.getElementById('vt-f-usageTips').value || '').trim();
    var collocationsRaw = (document.getElementById('vt-f-collocations').value || '').trim();
    var collocationsVal = collocationsRaw ? collocationsRaw.split(/[\/、,，]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
    var el = document.getElementById('tab-vocab');
    var levelVal = JSON.parse(el.dataset.formLevels || '[]');
    var st = document.getElementById('vt-form-status');
    if (!wordVal) { st.textContent = '単語を入力してください'; return; }

    var needsAI = !meaningVal || !exampleVal;
    var proceed = function (meaning, example, pron, level, usageTips, collocations) {
      if (wordFormMode === 'edit' && wordFormId) {
        var patch = { word: wordVal, meaning: meaning, example: example, pron: pron, level: level.length ? level : levelVal, usageTips: usageTips, collocations: collocations };
        persistWordPatch(wordFormId, patch, st);
      } else {
        submitNewWord(wordVal, meaning, example, pron, level.length ? level : levelVal, usageTips, collocations, st);
      }
    };

    if (needsAI && S.GEM_KEY) {
      st.textContent = 'AIが情報を生成中…';
      var prompt = '以下の英単語/熟語についてビジネス英語学習者向けの情報をJSONのみで返してください。説明文は不要です。\n単語: ' + wordVal + '\n\n'
        + '{"pron":"IPA発音記号","meaning":"日本語の意味（簡潔に）","example":"ビジネスシーンでの英語例文","level":["難易度カテゴリ（ビジネス英語/TOEIC800/TOEIC900+/医療等）"],"usageTips":"使い方のコツ（日本語1文）","collocations":["よく使う表現1","よく使う表現2"]}';
      S.callGeminiText([{ text: prompt }], { temperature: 0.3, maxOutputTokens: 1024 }).then(function (txt) {
        var parsed = S.parseJsonFromModelText(txt);
        proceed(meaningVal || parsed.meaning || '', exampleVal || parsed.example || '', pronVal || parsed.pron || '', parsed.level || [],
          usageTipsVal || parsed.usageTips || '', collocationsVal.length ? collocationsVal : (parsed.collocations || []));
      }).catch(function () { st.textContent = 'AI生成に失敗しました。手動で入力してください。'; });
    } else if (needsAI) {
      st.textContent = '意味・例文が未入力で、GeminiキーもURLにありません。手動で入力してください。';
    } else {
      proceed(meaningVal, exampleVal, pronVal, [], usageTipsVal, collocationsVal);
    }
  }
  function persistWordPatch(id, patch, st) {
    var w = words.find(function (x) { return x.id === id; });
    if (!w) return;
    if (!S.GH_TOKEN) {
      Object.keys(patch).forEach(function (k) { w[k] = patch[k]; });
      App.toast('反映しました（GitHub保存にはトークンが必要です）', 'success');
      wordFormOpen = false; renderList();
      return;
    }
    S.apiPutJson('data/vocab.json', function (obj) {
      var list = (obj && obj.words) || [];
      var target = list.find(function (x) { return x.id === id; });
      if (target) Object.keys(patch).forEach(function (k) { target[k] = patch[k]; });
      return { words: list };
    }, '✏️ 単語更新: ' + patch.word).then(function () {
      Object.keys(patch).forEach(function (k) { w[k] = patch[k]; });
      App.toast('「' + patch.word + '」を更新しました', 'success');
      wordFormOpen = false; renderList();
    }).catch(function () { st.textContent = '保存に失敗しました'; });
  }
  function deleteWord(id) {
    var w = words.find(function (x) { return x.id === id; });
    if (!w) return;
    if (!window.confirm('「' + w.word + '」を削除します。この操作は取り消せません。よろしいですか？')) return;
    var finish = function () {
      words = words.filter(function (x) { return x.id !== id; });
      saveProgressSilent();
      App.toast('「' + w.word + '」を削除しました', 'success');
      wordDetailId = null; renderList();
    };
    if (!S.GH_TOKEN) { finish(); return; }
    S.apiPutJson('data/vocab.json', function (obj) {
      var list = ((obj && obj.words) || []).filter(function (x) { return x.id !== id; });
      return { words: list };
    }, '🗑️ 単語削除: ' + w.word).then(finish).catch(function () { App.toast('削除に失敗しました'); });
  }

  function submitNewWord(wordVal, meaning, example, pron, level, usageTips, collocations, st) {
    var maxId = 0;
    words.forEach(function (w) { var n = parseInt((w.id || '').replace(/\D/g, ''), 10); if (!isNaN(n) && n > maxId) maxId = n; });
    var newWord = { id: 'w' + String(maxId + 1).padStart(3, '0'), word: wordVal, pron: pron, meaning: meaning, example: example, source: '', scriptId: 'custom', added: S.todayStr(),
      level: level, usageTips: usageTips || '', collocations: collocations || [], otherMeanings: [], interval: 1, nextReview: S.todayStr(), reviewCount: 0, streak: 0, missCount: 0, lastMissed: '' };
    if (!S.GH_TOKEN) {
      words.push(newWord); App.toast('追加しました（GitHub保存にはトークンが必要です）', 'success');
      wordFormOpen = false; renderList();
      return;
    }
    S.apiPutJson('data/vocab.json', function (obj) {
      var list = (obj && obj.words) || [];
      list.push(newWord);
      return { words: list };
    }, '📚 単語追加: ' + wordVal).then(function () {
      words.push(newWord);
      App.toast('「' + wordVal + '」を追加しました', 'success');
      wordFormOpen = false; renderList();
    }).catch(function () { st.textContent = '保存に失敗しました'; });
  }

  window.VocabTab = {
    showReview: showReview, showList: showList, setLevel: setLevel, setFilter: setFilter, toggleWeakOnly: toggleWeakOnly, toggleLevelPanel: toggleLevelPanel, setDirection: setDirection, setInteraction: setInteraction, setSort: setSort,
    startSession: startSession, pauseSession: pauseSession, resumeSession: resumeSession, endSession: endSession, resetSession: resetSession, resetQueue: resetQueue,
    flipCard: flipCard, answer: answer, revealMore: revealMore, revealSolve: revealSolve, openDetail: openDetail, closeDetail: closeDetail, speak: speakWord,
    openNewWord: openNewWord, openEditWord: openEditWord, closeWordForm: closeWordForm, toggleFormLevel: toggleFormLevel, saveWordForm: saveWordForm,
    deleteWord: deleteWord,
  };
  App.registerTab('vocab', { onShow: renderList });
})();
