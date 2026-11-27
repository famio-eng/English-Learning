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
  // デフォルトは登録日の新しい順(旧vocab.htmlの既定・永続化設定{col:'added',dir:'desc'}に合わせた)。
  // key: null(登録順・配列の並びそのまま) | 'word' | 'level' | 'added' | 'status'
  var vocabSort = { key: 'added', dir: 'desc' };

  // 1日の上限(2026-11-25、Famiの依頼: 「94問って表示されてるけど何をしたら完了？」
  // への対応)。復習期限の来た語が全部で94あっても、1日にやるのはこの件数だけで
  // よいことにし、残りは翌日以降に少しずつ消化する。新しい語(一度も復習していない語)
  // の導入数は別枠で上限を設け、復習が溜まっている時に新語まで増やさないようにする。
  var VOCAB_DAILY_CAP_DEFAULT = 20, VOCAB_NEW_CAP_DEFAULT = 5;
  function getVocabCap() { var n = parseInt(localStorage.getItem('vocab_daily_cap') || '', 10); return n > 0 ? n : VOCAB_DAILY_CAP_DEFAULT; }
  function setVocabCap(n) { try { localStorage.setItem('vocab_daily_cap', String(n)); } catch (e) {} }
  function getVocabNewCap() { var n = parseInt(localStorage.getItem('vocab_new_cap') || '', 10); return n >= 0 && !isNaN(n) ? n : VOCAB_NEW_CAP_DEFAULT; }
  function setVocabNewCap(n) { try { localStorage.setItem('vocab_new_cap', String(n)); } catch (e) {} }

  var queue = [], qIdx = 0, flipped = false;
  var queueCapped = false; // 今のqueueが1日の上限で絞られたものか(trueなら一周後に「続けますか？」を出す)
  var goalTotal = 0; // 2026-11-26(Famiの依頼: 学習中に残り問数が見えない): 今回のセットの目標語数。
  // queue.lengthは「もっと続ける」で増えるためそのまま使わず、進捗表示の分母はこの値を使う。
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
    return S.apiGetJson('data/vocab.json').then(function (data) {
      var progress = getProgress();
      words = ((data && data.words) || []).map(function (w) {
        var p = progress[w.id] || {};
        return {
          id: w.id, word: w.word, pron: w.pron, pos: w.pos || '', meaning: w.meaning, example: w.example,
          exampleJa: w.exampleJa || '', contrast: w.contrast || '', pitfall: w.pitfall || '', personalNote: w.personalNote || '',
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
  function sortForQueue(list) {
    var today = S.todayStr();
    return list.slice().sort(function (a, b) {
      var am = a.lastMissed === today ? 0 : 1, bm = b.lastMissed === today ? 0 : 1;
      if (am !== bm) return am - bm;
      var ad = a.nextReview || '', bd = b.nextReview || '';
      if (ad !== bd) return ad < bd ? -1 : 1;
      return (b.missCount || 0) - (a.missCount || 0);
    });
  }
  function toQueueItems(list, dir) {
    return list.map(function (w) { return { word: w, dir: dir === 'random' ? (Math.random() < 0.5 ? 'en2ja' : 'ja2en') : dir }; });
  }
  function isNewWord(w) { return !w.reviewCount; }
  // 復習期限が来た語のうち、既習(一度は復習済み)のものと、一度も復習していない新語を
  // 分けて数える。94問のように大きな数字が全部「今日やる分」に見えてFamiを驚かせて
  // いた反省から、ホーム表示・セッション開始とも「今日の計画」はこの関数の結果を使う。
  function buildTodayPlan(pool) {
    var today = S.todayStr();
    var due = pool.filter(function (w) { return !w.nextReview || w.nextReview <= today; });
    var overdue = due.filter(function (w) { return !isNewWord(w); });
    var fresh = due.filter(isNewWord);
    var cap = getVocabCap(), newCap = getVocabNewCap();
    var reviewPart = sortForQueue(overdue).slice(0, cap);
    var remaining = Math.max(0, cap - reviewPart.length);
    var newPart = sortForQueue(fresh).slice(0, Math.min(newCap, remaining));
    return {
      planned: reviewPart.concat(newPart),
      dueTotal: due.length, overdueTotal: overdue.length, freshTotal: fresh.length,
      cap: cap, newCap: newCap,
    };
  }
  // capped=trueの時だけ1日の上限を適用する(ホームの「今日の1セット」からの開始、
  // および通常のStart/Againが対象)。「もっと続ける」はcapped=falseで呼び、
  // 残り全件をそのままキューにする(その回はもう上限を気にせず最後まで進める)。
  function buildQueue(targetWords, dir, capped) {
    var source = targetWords;
    queueCapped = false;
    if (capped) {
      var plan = buildTodayPlan(targetWords);
      source = plan.planned;
      queueCapped = plan.planned.length < plan.dueTotal;
    }
    queue = toQueueItems(sortForQueue(source), dir);
    qIdx = 0; flipped = false; revealCount = 1; revealSolved = false; sessionReviewed = 0;
    goalTotal = queue.length;
  }
  // 上限で止まった後に「もっと続ける」を選んだ時だけ呼ぶ。既にqueueにある語を除いた
  // 残りの期限切れ分を追記する(qIdx/sessionReviewed/タイマーには触れず、セッションを
  // 継続したまま続けられるようにする)。
  function continueBeyondCap() {
    var today = S.todayStr();
    var queuedIds = {};
    queue.forEach(function (it) { queuedIds[it.word.id] = true; });
    var rest = poolByLevelAndScript().filter(function (w) {
      return (!w.nextReview || w.nextReview <= today) && !queuedIds[w.id];
    });
    toQueueItems(sortForQueue(rest), vocabDirection).forEach(function (it) { queue.push(it); });
    queueCapped = false;
    goalTotal = queue.length;
    renderReview();
  }

  function levelsOf(w) { return w.level || []; }
  function scriptLabelFor(id) { return scriptTitles[id] || id; }
  function poolByLevel() { return vocabLevel === 'all' ? words : words.filter(function (w) { return levelsOf(w).indexOf(vocabLevel) !== -1; }); }
  function poolByLevelAndScript() {
    var byLevel = poolByLevel();
    var byScript = vocabFilter === 'all' ? byLevel : byLevel.filter(function (w) { return w.scriptId === vocabFilter; });
    return vocabWeakOnly ? byScript.filter(function (w) { return (w.missCount || 0) > 0; }) : byScript;
  }
  // ── GitHub persistence (ported verbatim: saveToGitHub / saveStatsToGitHub) ──
  function saveToGitHub() {
    if (!S.GH_TOKEN) return Promise.resolve();
    var vocabData = { words: words.map(function (w) {
      return { id: w.id, word: w.word, pron: w.pron, pos: w.pos || '', meaning: w.meaning, example: w.example,
        exampleJa: w.exampleJa || '', contrast: w.contrast || '', pitfall: w.pitfall || '', personalNote: w.personalNote || '',
        source: w.source, scriptId: w.scriptId, added: w.added,
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
    return '<button onclick="VocabTab.toggleWeakOnly()" style="display:flex;align-items:center;gap:5px;flex-shrink:0;padding:6px 12px;border-radius:999px;font-size:12px;border:1px solid ' + (active ? 'var(--color-warning)' : 'var(--color-neutral-700)') + ';background:' + (active ? 'rgba(245,158,11,.15)' : 'transparent') + ';color:' + (active ? 'var(--color-warning)' : 'var(--color-neutral-300)') + ';cursor:pointer;white-space:nowrap">' + S.icon('flame', 13) + '苦手だけ <span style="font-size:10px">' + weakCount + '</span></button>';
  }
  // 成長段階の自作イラスト。「たね→双葉→(復習期限=同じ双葉が傾いて枯れる)→満開」
  // という一本のストーリーで揃え、フラットな線と塗りだけで構成する(顔や擬人化なし)。
  // wiltはsproutと全く同じ葉の形を回転+褐色化しただけ — 「同じ苗が萎れた」と一目で
  // わかるように、無関係な形を新しく作らずあえて再利用している。
  var GROWTH_ICON_PATHS = {
    seed: '<path d="M6 19h12" stroke="#8a5a34" stroke-width="1.2" stroke-linecap="round" opacity=".35"/>'
      + '<ellipse cx="10.3" cy="13.5" rx="2.6" ry="4" fill="#4a4238" transform="rotate(-18 10.3 13.5)"/>'
      + '<path d="M10.3 10.2v6.6" stroke="#efe9df" stroke-width=".6" opacity=".55" transform="rotate(-18 10.3 13.5)"/>'
      + '<ellipse cx="14.4" cy="14.6" rx="2.3" ry="3.5" fill="#8a6a3f" transform="rotate(14 14.4 14.6)"/>'
      + '<path d="M14.4 11.6v6" stroke="#efe9df" stroke-width=".6" opacity=".55" transform="rotate(14 14.4 14.6)"/>',
    sprout: '<path d="M6 19h12" stroke="#4d7a3a" stroke-width="1.2" stroke-linecap="round" opacity=".3"/>'
      + '<path d="M12 19v-4.2" stroke="#5a9c4f" stroke-width="1.6" stroke-linecap="round"/>'
      + '<path d="M12 14.8c0-3.4-2.6-5-5.2-4.6-.4 3.2 2 5 5.2 4.6z" fill="#7bc96f"/>'
      + '<path d="M12 14.8c0-3.4 2.6-5 5.2-4.6.4 3.2-2 5-5.2 4.6z" fill="#5a9c4f"/>',
    // 直立した双葉を回転させただけだと「傾いた」だけに見えたため、自重で先端が
    // 巻き込む"シェパーズフック"型の曲線1本+先端の垂れ下がった葉で表現し直した。
    wilt: '<path d="M6 19h12" stroke="#5c4a30" stroke-width="1.2" stroke-linecap="round" opacity=".3"/>'
      + '<path d="M12 19c0-4 .8-7 3.2-7.4c2-.3 2.7 1.2 1.6 2.6c-.9 1.1-2.6 1.3-3.6.5" stroke="#a8875a" stroke-width="1.6" stroke-linecap="round" fill="none"/>'
      + '<path d="M15.8 12.4c.2 1.8-.4 3.2-1.7 3.5-.4-1.8.3-3.2 1.7-3.5z" fill="#c9a86a"/>',
    bloom: '<path d="M5 19h14" stroke="#2f6b3a" stroke-width="1.2" stroke-linecap="round" opacity=".3"/>'
      + '<path d="M12 19v-12.4" stroke="#4f8f42" stroke-width="1.7" stroke-linecap="round"/>'
      + '<path d="M12 15.5c0-2.4-2.2-3.2-3.8-2.6.4 2.2 2.2 3 3.8 2.6z" fill="#6bbd5f"/>'
      + '<path d="M12 15c0-2.6 2.4-3.4 4-2.8-.6 2.4-2.4 3.2-4 2.8z" fill="#4f8f42"/>'
      + '<g fill="#f6a5c0">'
      + '<ellipse cx="12" cy="4.2" rx="1.3" ry="2.2"/>'
      + '<ellipse cx="12" cy="4.2" rx="1.3" ry="2.2" transform="rotate(72 12 6.6)"/>'
      + '<ellipse cx="12" cy="4.2" rx="1.3" ry="2.2" transform="rotate(144 12 6.6)"/>'
      + '<ellipse cx="12" cy="4.2" rx="1.3" ry="2.2" transform="rotate(216 12 6.6)"/>'
      + '<ellipse cx="12" cy="4.2" rx="1.3" ry="2.2" transform="rotate(288 12 6.6)"/>'
      + '</g>'
      + '<circle cx="12" cy="6.6" r="1.5" fill="#fcd34d"/>',
  };
  function growthIcon(stage, size, extraStyle) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;flex-shrink:0' + (extraStyle ? ';' + extraStyle : '') + '">' + GROWTH_ICON_PATHS[stage] + '</svg>';
  }
  // status/level ranks are shared by the row renderer and the sort comparator so the
  // "状態"/"カテゴリ" columns sort by the same notion they display, not a re-derived one.
  function wordStatus(w, today) {
    var due = !w.nextReview || w.nextReview <= today;
    var label = w.reviewCount === 0 ? '未学習' : (due ? '復習期限' : (w.streak >= 3 && w.interval >= 4 ? '習得済み' : '学習中'));
    var color = label === '習得済み' ? 'var(--color-success)' : label === '復習期限' ? 'var(--color-warning)' : label === '学習中' ? 'var(--color-info)' : 'var(--color-neutral-400)';
    var rank = label === '復習期限' ? 0 : label === '未学習' ? 1 : label === '学習中' ? 2 : 3;
    var stage = label === '習得済み' ? 'bloom' : label === '復習期限' ? 'wilt' : label === '学習中' ? 'sprout' : 'seed';
    return { label: label, color: color, rank: rank, stage: stage };
  }
  // 一覧の状態ドットが何色=何を意味するかの凡例(2026-11-22追加: ドットだけでは
  // 意味が伝わらないとの指摘のため)。
  function statusLegendHtml() {
    var items = [
      { label: '未学習', color: 'var(--color-neutral-400)' },
      { label: '復習期限', color: 'var(--color-warning)' },
      { label: '学習中', color: 'var(--color-info)' },
      { label: '習得済み', color: 'var(--color-success)' },
    ];
    return '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;padding:0 2px">' + items.map(function (it) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--color-neutral-400)"><span style="width:8px;height:8px;border-radius:50%;background:' + it.color + ';flex-shrink:0"></span>' + it.label + '</span>';
    }).join('') + '</div>';
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
    return '<div style="display:flex;align-items:center;gap:10px;background:var(--color-neutral-800);border-bottom:1px solid var(--color-neutral-700);padding:7px 8px">'
      + col('word', '単語', 'flex:1;min-width:0;')
      + '<div style="display:flex;gap:8px;flex-shrink:0">' + col('level', 'カテゴリ') + col('added', '登録日') + '</div>'
      + col('status', '状態', 'width:16px;flex-shrink:0;text-align:center;')
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
      var subText = (lvls.length ? esc(lvls[0]) + (lvls.length > 1 ? '+' + (lvls.length - 1) : '') : '—') + '　·　' + esc(w.added || '—');
      return '<button onclick="VocabTab.openDetail(\'' + w.id + '\')" style="display:flex;align-items:center;gap:10px;width:100%;background:var(--color-neutral-800);border:none;border-top:1px solid var(--color-neutral-700);cursor:pointer;text-align:left;color:inherit;padding:10px 8px">'
        + '<div style="flex:1;min-width:0">'
        + '<div style="display:flex;align-items:baseline;gap:5px;min-width:0">'
        + '<div style="font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(w.word) + '</div>'
        + (w.pos ? '<span class="tag tag-neutral" style="font-size:9px;flex-shrink:0">' + esc(w.pos) + '</span>' : '')
        + '</div>'
        + '<div style="font-size:12.5px;color:var(--color-neutral-300);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px">' + esc(w.meaning) + '</div>'
        + '<div style="font-size:10.5px;color:var(--color-neutral-500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">' + subText + '</div>'
        + '</div>'
        + '<div style="flex-shrink:0;width:16px;height:16px;border-radius:50%;background:' + st.color + '" title="' + esc(st.label) + '"></div>'
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
    // ホームの「今日の1セット」から1タップで来た場合、復習セッションを自動開始する。
    if (window.App.state.pendingStartVocabSession) {
      window.App.state.pendingStartVocabSession = false;
      showReview();
      startSession();
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
    top += statusLegendHtml();

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
  // 1日の上限設定(2026-11-25追加)。プリセットのチップから選ぶだけのシンプルな形。
  function capOptionsHtml() {
    var cur = getVocabCap();
    return [10, 20, 30, 50].map(function (n) {
      return '<button class="seg-opt" data-active="' + (cur === n) + '" onclick="VocabTab.setCapOption(' + n + ')">' + n + '問</button>';
    }).join('');
  }
  function newCapOptionsHtml() {
    var cur = getVocabNewCap();
    return [0, 3, 5, 10].map(function (n) {
      return '<button class="seg-opt" data-active="' + (cur === n) + '" onclick="VocabTab.setNewCapOption(' + n + ')">' + n + '語</button>';
    }).join('');
  }
  function setCapOption(n) { setVocabCap(n); renderReview(); }
  function setNewCapOption(n) { setVocabNewCap(n); renderReview(); }
  function fmtMs(ms) {
    var s = Math.floor(ms / 1000);
    var p2 = function (n) { return String(n).padStart(2, '0'); };
    return p2(Math.floor(s / 3600)) + ':' + p2(Math.floor(s / 60) % 60) + ':' + p2(s % 60);
  }
  function currentSessionMs() { return sessionElapsed + (sessionState === 'running' && sessionStartedAt ? Date.now() - sessionStartedAt : 0); }

  // 2026-11-26(Famiの依頼: 学習中に「あと何問で今日のノルマ達成か」が見えない):
  // 分母はgoalTotal(buildQueue/continueBeyondCapで設定した今回のセットの目標語数)、
  // 分子はqIdx(1問ごとに必ず進む内部カウンタ)。Againで戻した語は同じqIdxの位置に
  // 戻ってくるだけでqueue.lengthが増えないため、「何周したか」ではなく「対象の語を
  // 一通り終えたか」を正しく表す。queueCappedがtrueの間(=1日の上限内)だけ「今日の
  // ノルマ」という言い方にし、もっと続ける/Again後の周回ではただの進捗(x/y)として
  // 表示する(上限判定とずれた言い方にならないように)。
  function progressBarHtml() {
    if (!goalTotal) return '';
    var remain = Math.max(0, goalTotal - qIdx);
    var pct = Math.min(100, Math.round(qIdx / goalTotal * 100));
    var label = queueCapped
      ? (remain > 0 ? 'あと<b style="color:var(--color-text)">' + remain + '問</b>で今日のノルマ達成'
        : '<span style="display:inline-flex;align-items:center;gap:4px;color:var(--color-success)">' + S.icon('checkCircle', 13) + '今日のノルマ達成</span>')
      : qIdx + ' / ' + goalTotal + '問';
    return '<div style="margin-top:8px;padding:0 2px">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px;color:var(--color-neutral-400)"><span>' + label + '</span><span>' + qIdx + '/' + goalTotal + '</span></div>'
      + '<div style="height:6px;border-radius:3px;background:var(--color-neutral-700);margin-top:5px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:var(--color-accent);border-radius:3px;transition:width .3s ease"></div></div>'
      + '</div>';
  }

  function renderReview() {
    var el = document.getElementById('tab-vocab');
    var html = '<div style="display:flex;align-items:baseline;justify-content:space-between"><div style="font-weight:600;font-size:24px">単語帳</div>'
      + '<button onclick="VocabTab.showList()" style="background:none;border:none;color:var(--color-accent-300);font-size:12px;cursor:pointer">Back</button></div>';

    if (sessionState === 'idle') {
      var pool = poolByLevelAndScript();
      var plan = buildTodayPlan(pool);
      var remainAfterToday = Math.max(0, plan.dueTotal - plan.planned.length);
      var planLine = plan.planned.length
        ? '今日の分 <b style="color:var(--color-text)">' + plan.planned.length + '語</b>' + (remainAfterToday > 0 ? '（残り期限切れ' + remainAfterToday + '）' : '')
        : '今日の期限切れはありません';
      html += '<div class="card"><div class="card-kicker">学習セッションの設定</div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">レベルカテゴリ</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + levelChipsHtml() + '</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">ダイアグラム</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + weakChipHtml() + filterChipsHtml() + '</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">出題方向</div><div class="seg" style="display:flex;margin-top:6px">' + directionOptionsHtml() + '</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">出題スタイル</div><div class="seg" style="display:flex;margin-top:6px">' + interactionOptionsHtml() + '</div>'
        + '<div style="font-size:11px;color:var(--color-neutral-500);margin-top:4px">部分ヒント式は「日→英」出題のときだけ有効です</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">1日の上限（復習）</div><div class="seg" style="display:flex;margin-top:6px">' + capOptionsHtml() + '</div></div>'
        + '<div style="margin-top:10px"><div style="font-size:12px;color:var(--color-neutral-400)">1日の上限（新しい語）</div><div class="seg" style="display:flex;margin-top:6px">' + newCapOptionsHtml() + '</div></div>'
        + '<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--color-neutral-700);font-size:12px;color:var(--color-accent-300)">' + planLine + '</div>'
        + '<div style="font-size:11px;color:var(--color-neutral-500);margin-top:2px">' + pool.length + '語が対象（うち期限切れ' + plan.dueTotal + '）。溜まった分は翌日以降に少しずつ消化します</div>'
        + '<button class="btn btn-primary btn-block" style="margin-top:10px" onclick="VocabTab.startSession()">Start</button></div>';
    } else if (sessionState === 'ended') {
      html += '<div class="card" style="margin-top:16px"><div style="display:flex;flex-direction:column;gap:14px;padding:16px 4px;align-items:center;text-align:center">'
        + '<div style="font-size:16px;font-weight:500">学習を終了しました</div>'
        + '<div style="display:flex;gap:10px;width:100%">'
        + '<div style="flex:1;text-align:center;padding:12px 6px;border-radius:var(--radius-sm);background:var(--color-neutral-900);border:1px solid var(--color-neutral-700)"><div style="font-size:19px;font-weight:500">' + fmtMs(sessionElapsed) + '</div><div style="font-size:11px;color:var(--color-neutral-400)">学習時間</div></div>'
        + '<div style="flex:1;text-align:center;padding:12px 6px;border-radius:var(--radius-sm);background:var(--color-neutral-900);border:1px solid var(--color-neutral-700)"><div style="font-size:19px;font-weight:500">' + sessionReviewed + '語</div><div style="font-size:11px;color:var(--color-neutral-400)">復習した語数</div></div></div>'
        + '<button class="btn btn-primary btn-block" onclick="VocabTab.resetSession()">Again</button>'
        + '<button class="btn btn-ghost btn-block" onclick="VocabTab.showList()">Back</button></div></div>';
    } else {
      // running | paused
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-md);background:var(--color-neutral-800);border:1px solid var(--color-neutral-700)">'
        + '<div style="width:7px;height:7px;border-radius:50%;background:' + (sessionState === 'paused' ? 'var(--color-warning)' : 'var(--color-success)') + '"></div>'
        + '<div style="flex:1"><div id="vt-timer" style="font-size:19px;font-weight:500">' + fmtMs(currentSessionMs()) + '</div><div style="font-size:10.5px;color:var(--color-neutral-400)">' + (sessionState === 'paused' ? '中断中' : '学習中') + '</div></div>'
        + (sessionState === 'running'
          ? '<button onclick="VocabTab.pauseSession()" style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-neutral-600);background:transparent;color:var(--color-neutral-200);font-size:12px">Pause</button>'
          : '<button onclick="VocabTab.resumeSession()" style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-accent);background:var(--color-accent-800);color:var(--color-text);font-size:12px">Resume</button>')
        + '<button onclick="VocabTab.endSession()" style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-neutral-600);background:transparent;color:var(--color-neutral-400);font-size:12px">End</button></div>';
      html += progressBarHtml();

      if (qIdx >= queue.length) {
        // 2026-11-25: 1日の上限で区切られた状態(queueCapped)なら、単なる「一周した」
        // ではなく「今日のノルマを達成した」ことを伝え、続けるかどうかを選べるようにする。
        if (queueCapped) {
          html += '<div class="card" style="margin-top:16px;text-align:center;padding:24px"><div style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:16px;font-weight:500;color:var(--color-success)">' + S.icon('checkCircle', 19) + '今日の分は完了しました</div>'
            + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:6px">' + sessionReviewed + '語を復習しました。残りは明日以降に少しずつ進めます</div>'
            + '<div style="font-size:13px;color:var(--color-text);margin-top:10px">続けますか？</div>'
            + '<button class="btn btn-primary" style="margin-top:8px" onclick="VocabTab.endSession()">今日はここまで</button>'
            + '<button class="btn btn-ghost" style="margin-top:6px" onclick="VocabTab.continueBeyondCap()">もっと続ける</button></div>';
        } else {
          html += '<div class="card" style="margin-top:16px;text-align:center;padding:24px"><div style="font-size:16px;font-weight:500">このカテゴリを一周しました</div>'
            + '<div style="font-size:13px;color:var(--color-neutral-400);margin-top:6px">' + sessionReviewed + '語を復習しました（計測は継続中）</div>'
            + '<button class="btn btn-primary" style="margin-top:10px" onclick="VocabTab.endSession()">End</button>'
            + '<button class="btn btn-ghost" style="margin-top:6px" onclick="VocabTab.resetQueue()">Again</button></div>';
        }
      } else {
        var item = queue[qIdx];
        var w = item.word;
        var askJa = item.dir === 'ja2en';
        var useReveal = vocabInteraction === 'reveal' && askJa;
        if (useReveal) {
          html += revealCardHtml(item);
          if (revealSolved) {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:14px">'
              + ratingBtn(0, 'Again') + ratingBtn(1, 'Hard') + ratingBtn(2, 'OK') + ratingBtn(3, 'Perfect') + '</div>';
          }
        } else {
          var wEsc = esc(w.word).replace(/'/g, "\\'");
          // pointerdown/upもstopPropagationすること: 親のvt-flip-cardがpointerdown/upで
          // タップめくりを判定しているため、ここで止めないと発音ボタンを押すたびカードも
          // めくれてしまう(clickのstopPropagationだけでは間に合わない)。
          var speakBtn = function (text) { return '<button class="btn btn-sound" aria-label="発音を再生" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation()" onclick="event.stopPropagation();VocabTab.speak(\'' + text + '\')">' + S.icon('volume2', 18) + '</button>'; };
          // 2026-11-22(Famiの指摘): 3D反転(preserve-3d/backface-visibility)しているカード面は
          // iOS Safariで長押し選択(「調べる」等)が働かないことがある。カード面はuser-select:text
          // を明示し、タップでめくるハンドラ(flipCard)側は選択中なら何もしない形で両立させる。
          var faceSelectable = 'user-select:text;-webkit-user-select:text;-webkit-touch-callout:default';
          // アプリ内辞書(.sel-dict)は答えを見る前の表面には付けない(2026-11-22、
          // Famiの指摘: 答えを見るまではネイティブの選択メニューのままにしたい)。
          // カードをめくった後の裏面だけに付ける。
          // カードを画面の残り高さいっぱいに広げ、評価ボタンは下部ナビの直上に来るように
          // する(2026-11-23、Famiの指摘: 「評価ボタンの下に大きな空きがある」)。
          // #tab-vocab(.tab-panel)は既にdisplay:flex;flex-direction:columnなので、
          // その直接の子であるこのラッパーにflex:1を与えるだけで残り高さを埋められる。
          // #vt-flip-card自体はheight:100%にして、絶対配置の表裏両面(inset:0)に
          // このラッパーの実際の高さを伝える。
          // 2026-11-27(Famiの指摘が再発): 上の対応だけでは、.tab-panel自体が持つ
          // 固定100pxの下余白(app.html)がそのまま使われない空白になっていた
          // (flex:1はその余白を除いた残りを正しく埋めていたが、余白自体が大きすぎた)。
          // app.html側で.tab-panelの余白を20pxへ減らし、こちらは横向き(高さが
          // 極端に低い)の時にカードが最低220pxを確保しようとして画面からはみ出さない
          // よう、min-height自体もmin(220px,35vh)にして画面に応じて縮むようにした。
          html += '<div id="vt-active-card" style="margin-top:12px;perspective:1200px;flex:1;min-height:min(220px,35vh);display:flex"><div id="vt-flip-card" style="position:relative;width:100%;height:100%;-webkit-transform-style:preserve-3d;transform-style:preserve-3d;transition:transform .5s ease;transform:' + (flipped ? 'rotateY(180deg)' : 'rotateY(0)') + ';cursor:pointer" onpointerdown="VocabTab.flipPointerDown(event)" onpointerup="VocabTab.flipPointerUp(event)">'
            + '<div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-lg);padding:26px 20px;display:flex;flex-direction:column;justify-content:center;gap:10px;box-sizing:border-box;' + faceSelectable + '">'
            + (askJa
              ? '<div style="font-weight:600;font-size:20px;line-height:1.5">' + esc(w.meaning) + '</div><div style="font-size:12px;color:var(--color-neutral-400)">英語で言ってみましょう</div>'
              : '<div style="display:flex;align-items:center;gap:8px"><div style="font-weight:600;font-size:26px">' + esc(w.word) + '</div>' + speakBtn(wEsc) + '</div><div style="font-size:13px;color:var(--color-accent-300)">' + esc(w.pron || '') + '</div>')
            + '</div>'
            // 答え(=askJaなら単語、en2jaなら意味)を出題の英語と同じくらいの大きさに
            // (2026-11-22、Famiの指摘: 「答えの文字が小さい、何が答えかすぐわかる
            // ように」)。質問側に出していた方は小さく添えるだけにする。品詞→例文+訳
            // →解説→よく使う表現、の順に拡充(同、「答え面の情報が少ない」への対応)。
            // 情報量が増えたため、答え面はjustify-content:flex-start+overflow-y:auto
            // にして縦に並べ、収まらない分はこの面の中だけでスクロールできるようにする。
            // 2026-11-25(Famiの指摘: 内容の多い語で最後までスクロールできない、iOS
            // Chrome): overflow-y:autoを、3D回転(preserve-3d/rotateY)がかかった要素
            // そのものに直接付けていたのが原因。iOS WebKitは、transformが適用された
            // 要素自身の上でのタッチスクロールが正しく効かないことがある(長押し選択が
            // 効かない問題と同根のWebKitの既知挙動)。そのため、回転・背景・角丸・
            // backface-visibilityを持つ「面」用の外側divと、overflow-y:autoだけを持つ
            // 回転なしの内側divに分離し、実際にスクロールする要素には一切transformが
            // かからないようにした。
            + '<div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;transform:rotateY(180deg);background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-lg);box-sizing:border-box;overflow:hidden">'
            + '<div class="sel-dict" style="width:100%;height:100%;padding:20px 20px 24px;display:flex;flex-direction:column;justify-content:flex-start;overflow-y:auto;box-sizing:border-box;' + faceSelectable + '">'
            + '<div style="display:flex;align-items:center;gap:8px"><div style="font-size:' + (askJa ? '24px' : '16px') + ';font-weight:' + (askJa ? '700' : '500') + '">' + esc(w.word) + '</div>' + speakBtn(wEsc) + '</div>'
            + '<div style="font-size:' + (askJa ? '13px' : '19px') + ';font-weight:' + (askJa ? '400' : '700') + ';color:var(--color-neutral-200);margin-top:2px">' + esc(w.meaning) + '</div>'
            + wordExplanationHtml(w, speakBtn)
            + '</div></div></div></div>';
          html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:14px">'
            + ratingBtn(0, 'Again') + ratingBtn(1, 'Hard') + ratingBtn(2, 'OK') + ratingBtn(3, 'Perfect') + '</div>';
        }
      }
    }
    el.innerHTML = html;
  }
  // プログレッシブリビール(部分ヒント)方式: 最初の1文字だけ見せ、「もう1文字」で
  // 少しずつ開示。フリップの代わりに「答えを見る」で全体を出して評価ボタンに進む。
  // 答え面の拡充(2026-11-22、Famiの依頼#2): 品詞→例文+訳→解説(ニュアンス/
  // 似た語との違い/間違えやすい点)→よく使う表現、の順で表示する共通部分。
  // フリップカード・プログレッシブリビールどちらの答え面からも使う。
  function wordExplanationHtml(w, speakFn) {
    var exEsc = w.example ? esc(w.example).replace(/'/g, "\\'") : '';
    var posRow = w.pos ? '<div style="margin-top:6px;text-align:left"><span class="tag tag-neutral" style="font-size:10px">' + esc(w.pos) + '</span></div>' : '';
    var exampleBlock = w.example
      ? '<div style="margin-top:10px;text-align:left">'
        + '<div style="display:flex;align-items:flex-start;gap:6px"><div style="font-size:13px;color:var(--color-neutral-200);font-style:italic;flex:1">"' + esc(w.example) + '"</div>' + (speakFn ? speakFn(exEsc) : '') + '</div>'
        + (w.exampleJa ? '<div style="font-size:11.5px;color:var(--color-neutral-400);margin-top:2px">' + esc(w.exampleJa) + '</div>' : '')
        + '</div>'
      : '';
    var explainLines = [];
    if (w.usageTips) explainLines.push(esc(w.usageTips));
    if (w.contrast) explainLines.push('<b style="color:var(--color-neutral-200)">似た語との違い: </b>' + esc(w.contrast));
    if (w.pitfall) explainLines.push('<b style="color:var(--color-neutral-200)">間違えやすい点: </b>' + esc(w.pitfall));
    var explainBlock = explainLines.length
      ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--color-neutral-700);text-align:left;font-size:11.5px;color:var(--color-neutral-400);line-height:1.6">'
        + explainLines.map(function (l) { return '<div style="margin-top:4px">' + l + '</div>'; }).join('')
        + '</div>'
      : '';
    var collocBlock = (w.collocations && w.collocations.length)
      ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--color-neutral-700);text-align:left">'
        + '<div class="card-kicker" style="font-size:9.5px">よく使う表現</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' + w.collocations.map(function (c) { return '<span class="tag tag-outline" style="font-size:10px">' + esc(c) + '</span>'; }).join('') + '</div>'
        + '</div>'
      : '';
    // Famiが自分で書いたメモ(2026-11-22、解説拡充の際に消してしまった分を復元)。
    // 新しい解説とは別枠で、ひと目でFami自身のメモだとわかるように区別して表示する。
    var noteBlock = w.personalNote
      ? '<div style="margin-top:10px;padding:8px 10px;background:rgba(var(--color-accent-rgb),.1);border-radius:var(--radius-sm);text-align:left">'
        + '<div class="card-kicker" style="font-size:9.5px;color:var(--color-accent)">自分のメモ</div>'
        + '<div style="font-size:11.5px;color:var(--color-neutral-300);line-height:1.6;margin-top:2px">' + esc(w.personalNote).replace(/\n/g, '<br>') + '</div>'
        + '</div>'
      : '';
    return posRow + exampleBlock + explainBlock + collocBlock + noteBlock;
  }
  function revealCardHtml(item) {
    var w = item.word;
    var letters = w.word.replace(/ /g, '').length;
    var shown = w.word.split('').map(function (ch, i) {
      if (ch === ' ') return '&nbsp;&nbsp;';
      var idx = w.word.slice(0, i).replace(/ /g, '').length;
      return (revealSolved || idx < revealCount) ? esc(ch) : '_';
    }).join(' ');
    var canRevealMore = revealCount < letters;
    var speakBtn = function (text) { return '<button class="btn btn-sound" aria-label="発音を再生" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation()" onclick="event.stopPropagation();VocabTab.speak(\'' + text + '\')">' + S.icon('volume2', 18) + '</button>'; };
    // アプリ内辞書(.sel-dict)は答えを見る前(revealSolved===false)には付けない
    // (2026-11-22、Famiの指摘: 答えを見るまではネイティブの選択メニューのままにしたい)。
    // カードを画面の残り高さいっぱいに広げ、収まらない分はカード内でスクロール
    // できるようにする(2026-11-23、Famiの指摘: 「評価ボタンの下に大きな空きがある」)。
    var html = '<div id="vt-active-card" class="card' + (revealSolved ? ' sel-dict' : '') + '" style="margin-top:12px;padding:26px 20px;text-align:center;flex:1;min-height:min(220px,35vh);overflow-y:auto;box-sizing:border-box">'
      + '<div style="font-weight:600;font-size:18px;line-height:1.5">' + esc(w.meaning) + '</div>'
      + '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:4px">英語で言ってみましょう（ヒントを見ながらでもOK）</div>'
      + '<div style="font-family:ui-monospace,Menlo,monospace;font-size:22px;letter-spacing:2px;margin-top:18px;min-height:32px;color:' + (revealSolved ? 'var(--color-accent-300)' : 'var(--color-text)') + '">' + shown + '</div>';
    if (revealSolved) {
      // 品詞→例文+訳→解説→よく使う表現、の拡充(2026-11-22、Famiの依頼#2)。
      html += (w.pron ? '<div style="font-size:13px;color:var(--color-neutral-300);margin-top:10px">' + esc(w.pron) + '</div>' : '')
        + wordExplanationHtml(w, speakBtn);
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
  // 2026-11-22(Famiの指摘): 「?」を開いている間、評価ボタンが押せないことがあった
  // (タイマーの毎秒再描画と開閉トグルの組み合わせが影響していたとみられる)。
  // トグル自体をなくし、各ボタンの下には次回間隔ではなく評価の意味を常時表示する
  // ことで、「?」を開く操作自体が不要になるようにした。
  var RATING_DESC = { Again: '思い出せない', Hard: '時間がかかった', OK: '少し考えた', Perfect: '即答' };
  function ratingBtn(q, label) {
    var style = q >= 2 ? 'background:var(--color-accent-800);border:1px solid var(--color-accent-600);color:var(--color-text)' : 'background:var(--color-neutral-800);border:1px solid var(--color-neutral-600);color:var(--color-neutral-200)';
    var desc = RATING_DESC[label] || '';
    return '<button onclick="VocabTab.answer(' + q + ')" style="' + style + ';border-radius:var(--radius-sm);padding:9px 4px;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:3px;line-height:1.2">'
      + '<span>' + esc(label) + '</span>'
      + (desc ? '<span style="font-size:9.5px;font-weight:400;opacity:.75">' + esc(desc) + '</span>' : '')
      + '</button>';
  }

  // 2026-11-25(Famiの指摘「答え面のスクロールが最後まで届かない」の根本原因):
  // 毎秒renderReview()をまるごと呼んでいたため、el.innerHTML=htmlでカード全体が
  // 毎秒作り直され、ユーザーがスクロールした位置も毎秒scrollTop=0に戻っていた
  // (3D回転した要素のタッチスクロールのiOS固有の問題とは別に、どの環境でも
  // 必ず効いていたより大きな原因)。1秒ごとに本当に必要なのは経過時間の表示
  // 更新だけなので、#vt-timerのテキストだけを直接書き換える方式に変更し、
  // カード全体の再描画(=スクロール位置のリセット)を止めた。
  function tickTimerOnly() {
    var timerEl = document.getElementById('vt-timer');
    if (timerEl) timerEl.textContent = fmtMs(currentSessionMs());
  }
  function startSessionTick() { clearInterval(sessionTimer); sessionTimer = setInterval(tickTimerOnly, 1000); }
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
    buildQueue(poolByLevelAndScript(), vocabDirection, true);
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
  function resetQueue() { buildQueue(poolByLevelAndScript(), vocabDirection, false); renderReview(); }
  // 2026-11-22(Famiの指摘): カード全体にonclickでタップめくりを付けていたため、iOS Safariで
  // 長押し選択(「調べる」等)のジェスチャーと競合していた。clickイベント＋選択の有無チェックは
  // タイミング上あてにならない(ブラウザがmousedown時点で既存の選択を解除してしまうため)。
  // pointerdown/upの時間差と移動量で「素早いタップ」だけを判定し、長押しや選択のドラッグでは
  // めくらないようにする。
  var flipGesture = { downAt: 0, downX: 0, downY: 0 };
  function flipPointerDown(ev) {
    flipGesture.downAt = Date.now();
    flipGesture.downX = ev.clientX; flipGesture.downY = ev.clientY;
  }
  function flipPointerUp(ev) {
    var dt = Date.now() - flipGesture.downAt;
    var dx = Math.abs(ev.clientX - flipGesture.downX), dy = Math.abs(ev.clientY - flipGesture.downY);
    if (dt < 400 && dx < 10 && dy < 10) flipCard();
  }
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
      + '<button class="btn btn-sound" aria-label="発音を再生" onclick="VocabTab.speak(\'' + esc(w.word).replace(/'/g, "\\'") + '\')">' + S.icon('volume2', 18) + '</button></div>'
      + (w.pos ? '<span class="tag tag-neutral" style="margin-top:4px;display:inline-flex;align-self:flex-start">' + esc(w.pos) + '</span>' : '')
      + '<div style="font-size:13px;color:var(--color-accent-300)">' + esc(w.pron || '') + '</div>'
      + '<div style="font-size:14px;color:var(--color-neutral-200)">' + esc(w.meaning) + '</div>'
      + (w.example ? '<div style="font-size:13px;color:var(--color-neutral-400);font-style:italic">"' + esc(w.example) + '"</div>' : '')
      + '<div style="margin-top:4px;display:flex;align-items:center;flex-wrap:wrap;gap:4px">' + badges + '<span class="tag" style="display:inline-flex;align-items:center;gap:3px;color:' + st.color + ';border-color:' + st.color + '">' + growthIcon(st.stage, 15) + esc(st.label) + '</span>' + (w.missCount ? '<span class="tag tag-outline" style="display:inline-flex;align-items:center;gap:3px">' + S.icon('flame', 12) + w.missCount + '回ミス</span>' : '') + '</div>'
      + (w.usageTips ? '<div class="card" style="margin-top:8px"><div class="card-kicker">使い方のコツ</div><div style="font-size:13px;margin-top:4px">' + esc(w.usageTips) + '</div></div>' : '')
      + (w.collocations && w.collocations.length ? '<div class="card" style="margin-top:8px"><div class="card-kicker">よく使う表現</div><div style="font-size:13px;margin-top:4px">' + esc(w.collocations.join(' / ')) + '</div></div>' : '')
      + (w.personalNote ? '<div class="card" style="margin-top:8px;background:rgba(var(--color-accent-rgb),.1)"><div class="card-kicker" style="color:var(--color-accent)">自分のメモ</div><div style="font-size:13px;margin-top:4px;line-height:1.6">' + esc(w.personalNote).replace(/\n/g, '<br>') + '</div></div>' : '')
      + '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-secondary" style="flex:1" onclick="VocabTab.openEditWord(\'' + w.id + '\')">Edit</button>'
      + '<button class="btn btn-ghost" style="flex:1" onclick="VocabTab.closeDetail()">Close</button></div>'
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
      + '<button class="btn btn-icon btn-ghost" onclick="VocabTab.closeWordForm()">×</button></div>'
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
    // pos/exampleJa/contrast/pitfallは手動フォームに入力欄がないため、AI生成時のみ
    // 埋める(2026-11-22、Famiの依頼#5: 今後追加される語にも同じ形式を)。
    var proceed = function (meaning, example, pron, level, usageTips, collocations, pos, exampleJa, contrast, pitfall) {
      if (wordFormMode === 'edit' && wordFormId) {
        var patch = { word: wordVal, meaning: meaning, example: example, pron: pron, level: level.length ? level : levelVal, usageTips: usageTips, collocations: collocations };
        if (pos) patch.pos = pos;
        if (exampleJa) patch.exampleJa = exampleJa;
        if (contrast) patch.contrast = contrast;
        if (pitfall) patch.pitfall = pitfall;
        persistWordPatch(wordFormId, patch, st);
      } else {
        submitNewWord(wordVal, meaning, example, pron, level.length ? level : levelVal, usageTips, collocations, st, pos, exampleJa, contrast, pitfall);
      }
    };

    if (needsAI && S.GEM_KEY) {
      st.textContent = 'AIが情報を生成中…';
      var prompt = '以下の英単語/熟語についてビジネス英語学習者向けの情報をJSONのみで返してください。説明文は不要です。\n単語: ' + wordVal + '\n\n'
        + '{"pron":"IPA発音記号","pos":"品詞(名詞/動詞/形容詞/副詞/熟語 等、短く)","meaning":"日本語の意味（簡潔に）","example":"ビジネスシーンでの英語例文","exampleJa":"その例文の日本語訳","level":["難易度カテゴリ（ビジネス英語/TOEIC800/TOEIC900+/医療等）"],"usageTips":"使い方のコツ（日本語1文）","collocations":["よく使う表現1","よく使う表現2"],"contrast":"似た語との違い(自然な比較対象があれば1文、無ければ空文字)","pitfall":"間違えやすい点(あれば1文、無ければ空文字)"}';
      S.callGeminiText([{ text: prompt }], { temperature: 0.3, maxOutputTokens: 1024 }).then(function (txt) {
        var parsed = S.parseJsonFromModelText(txt);
        proceed(meaningVal || parsed.meaning || '', exampleVal || parsed.example || '', pronVal || parsed.pron || '', parsed.level || [],
          usageTipsVal || parsed.usageTips || '', collocationsVal.length ? collocationsVal : (parsed.collocations || []),
          parsed.pos || '', parsed.exampleJa || '', parsed.contrast || '', parsed.pitfall || '');
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

  function nextWordId(list) {
    var maxId = 0;
    list.forEach(function (w) { var n = parseInt((w.id || '').replace(/\D/g, ''), 10); if (!isNaN(n) && n > maxId) maxId = n; });
    return 'w' + String(maxId + 1).padStart(3, '0');
  }
  function submitNewWord(wordVal, meaning, example, pron, level, usageTips, collocations, st, pos, exampleJa, contrast, pitfall) {
    var newWord = { id: null, word: wordVal, pron: pron, pos: pos || '', meaning: meaning, example: example,
      exampleJa: exampleJa || '', contrast: contrast || '', pitfall: pitfall || '',
      source: '', scriptId: 'custom', added: S.todayStr(),
      level: level, usageTips: usageTips || '', collocations: collocations || [], otherMeanings: [], interval: 1, nextReview: S.todayStr(), reviewCount: 0, streak: 0, missCount: 0, lastMissed: '' };
    if (!S.GH_TOKEN) {
      newWord.id = nextWordId(words);
      words.push(newWord); App.toast('追加しました（GitHub保存にはトークンが必要です）', 'success');
      wordFormOpen = false; renderList();
      return;
    }
    S.apiPutJson('data/vocab.json', function (obj) {
      var list = (obj && obj.words) || [];
      // IDは採番せず保持していたページ読み込み時点の単語一覧ではなく、ここで取得した
      // 最新データから採番する。他端末/他セッションが先に単語を追加していても
      // ID重複が起きないようにするため(過去に2語が同じIDになった不具合の原因)。
      newWord.id = nextWordId(list);
      list.push(newWord);
      return { words: list };
    }, '📚 単語追加: ' + wordVal).then(function () {
      words.push(newWord);
      App.toast('「' + wordVal + '」を追加しました', 'success');
      wordFormOpen = false; renderList();
    }).catch(function () { st.textContent = '保存に失敗しました'; });
  }

  // ── アプリ内辞書ポップアップ(2026-11-22、Famiの依頼) ──
  // iPhoneのChromeは文字選択メニューの先頭に「調べる」が出ず検索が優先されるため、
  // アプリ内(単語帳の復習カード・瞬発力ドリル・会話スクリプト・今日のフレーズ等、
  // .sel-dictを付けたコンテナ)で英単語/フレーズを選択すると、近くに小さな
  // ポップアップで意味・発音・例文・解説を出す。vocab.jsはタブに関わらずページ
  // 読み込み時に一度だけ実行されるため、documentへのグローバルリスナーをここに
  // 置くことで、どのタブを表示中でも動作する。
  var DICT_CACHE_KEY = 'dict_cache_v1';
  var DICT_CACHE_MAX = 300; // 肥大化防止
  var dictPopupEl = null;
  var dictLastSelKey = '';
  // ポップアップ内の解説文からさらに別の単語を選んで調べられるようにする
  // (2026-11-22、Famiの依頼)。dictHistoryは「← 戻る」で再取得なしに戻るための
  // 直前の表示状態のスタック、dictCurrentStateは現在表示中の状態。
  var dictHistory = [];
  var dictCurrentState = null;

  function dictCacheGet(key) {
    try { var c = JSON.parse(localStorage.getItem(DICT_CACHE_KEY) || '{}'); return c[key] || null; } catch (e) { return null; }
  }
  function dictCacheSet(key, data) {
    try {
      var c = JSON.parse(localStorage.getItem(DICT_CACHE_KEY) || '{}');
      c[key] = data;
      var keys = Object.keys(c);
      if (keys.length > DICT_CACHE_MAX) keys.slice(0, keys.length - DICT_CACHE_MAX).forEach(function (k) { delete c[k]; });
      localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(c));
    } catch (e) {}
  }
  function closestDictContainer(node) {
    var el = node && node.nodeType === 3 ? node.parentElement : node;
    while (el) { if (el.classList && el.classList.contains('sel-dict')) return el; el = el.parentElement; }
    return null;
  }
  function findExistingWord(text) {
    var low = text.toLowerCase();
    return words.find(function (w) { return w.word && w.word.toLowerCase() === low; }) || null;
  }
  function dictContextFor(container, text) {
    var full = (container.innerText || '').replace(/\s+/g, ' ').trim();
    if (full.length <= 280) return full;
    var idx = full.toLowerCase().indexOf(text.toLowerCase());
    if (idx === -1) return full.slice(0, 280);
    var start = Math.max(0, idx - 120), end = Math.min(full.length, idx + text.length + 120);
    return (start > 0 ? '…' : '') + full.slice(start, end) + (end < full.length ? '…' : '');
  }
  function closeDictPopup() {
    if (dictPopupEl && dictPopupEl.parentNode) dictPopupEl.parentNode.removeChild(dictPopupEl);
    dictPopupEl = null;
    dictLastSelKey = '';
    dictHistory = [];
    dictCurrentState = null;
  }
  function positionDictPopup(el, rect) {
    var margin = 10, vw = window.innerWidth, vh = window.innerHeight, estHeight = 220, width = Math.min(320, vw - 2 * margin);
    var top = (rect.bottom + margin + estHeight < vh) ? rect.bottom + margin
      : (rect.top - margin - estHeight > 0) ? Math.max(margin, rect.top - margin - estHeight)
      : Math.max(margin, vh - estHeight - margin);
    var left = Math.min(Math.max(margin, rect.left), vw - width - margin);
    el.style.width = width + 'px';
    el.style.top = top + 'px';
    el.style.left = Math.max(margin, left) + 'px';
  }
  function renderDictPopup(el, state) {
    dictCurrentState = state;
    var backBtn = dictHistory.length
      ? '<button class="btn btn-icon btn-ghost" style="width:28px;height:28px;flex-shrink:0" onclick="VocabTab.dictGoBack()" aria-label="戻る">' + S.icon('arrowLeft', 16) + '</button>'
      : '';
    var head = '<div style="display:flex;align-items:center;gap:8px">'
      + backBtn
      + '<div style="font-size:16px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(state.text) + '</div>'
      + '<button class="btn btn-sound" style="width:36px;height:36px" aria-label="発音を再生" onclick="VocabTab.speak(\'' + esc(state.text).replace(/'/g, "\\'") + '\')">' + S.icon('volume2', 16) + '</button>'
      + '<button class="btn btn-icon btn-ghost" style="width:28px;height:28px" onclick="VocabTab.closeDictPopup()" aria-label="閉じる">×</button>'
      + '</div>';
    var searchLink = '<a href="https://www.google.com/search?q=' + encodeURIComponent(state.text) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:12.5px">Googleで検索 →</a>';
    var body;
    if (state.status === 'loading') {
      body = '<div style="font-size:12.5px;color:var(--color-neutral-400);margin-top:10px">調べています…</div>';
    } else if (state.status === 'nokey') {
      body = (state.existing
        ? '<div class="tag tag-accent" style="margin-top:10px;display:inline-flex">単語帳に登録済み</div>'
        : '<div style="font-size:12.5px;color:var(--color-neutral-400);margin-top:8px">Geminiキーがない環境のため自動取得はできません</div>' + searchLink);
    } else if (state.status === 'error') {
      body = '<div style="font-size:12.5px;color:var(--color-warning);margin-top:8px">取得に失敗しました</div>' + searchLink;
    } else {
      var d = state.data || {};
      // 選択語が熟語/フレーズの一部だとGeminiが判断した場合、d.phraseにその全体が
      // 入る(2026-11-22、Famiの依頼: take into accountの一部の"take"だけ選んでも
      // 熟語として説明・登録できるように)。表示も単語帳への追加もphrase優先。
      var hasPhrase = d.phrase && d.phrase.trim() && d.phrase.trim().toLowerCase() !== state.text.toLowerCase();
      var registerWord = hasPhrase ? d.phrase.trim() : state.text;
      body = (hasPhrase ? '<div class="tag tag-outline" style="margin-top:6px;display:inline-flex">熟語: ' + esc(d.phrase.trim()) + ' として</div>' : '')
        + ((d.pron || d.pos) ? '<div style="display:flex;align-items:center;gap:6px;margin-top:6px">'
          + (d.pos ? '<span class="tag tag-neutral" style="font-size:9.5px">' + esc(d.pos) + '</span>' : '')
          + (d.pron ? '<span style="font-size:12.5px;color:var(--color-accent-300)">/' + esc(String(d.pron).replace(/^\/|\/$/g, '')) + '/</span>' : '')
          + '</div>' : '')
        + (d.meaning ? '<div style="font-size:14.5px;margin-top:6px">' + esc(d.meaning) + '</div>' : '')
        + (d.example ? '<div style="font-size:12.5px;color:var(--color-neutral-300);font-style:italic;margin-top:8px">"' + esc(d.example) + '"</div>' : '')
        + (d.exampleJa ? '<div style="font-size:11.5px;color:var(--color-neutral-400);margin-top:2px">' + esc(d.exampleJa) + '</div>' : '')
        + (d.note ? '<div style="font-size:11.5px;color:var(--color-neutral-400);margin-top:8px;padding-top:8px;border-top:1px solid var(--color-neutral-700)">' + esc(d.note) + '</div>' : '')
        + (state.existing
          ? '<div class="tag tag-accent" style="margin-top:10px;display:inline-flex">単語帳に登録済み</div>'
          : '<button id="dict-add-btn" class="btn btn-primary btn-block" style="margin-top:10px;font-size:12.5px" onclick="VocabTab.dictAddToVocab(\'' + esc(state.text).replace(/'/g, "\\'") + '\',\'' + esc(registerWord).replace(/'/g, "\\'") + '\')">+ 単語帳に追加（' + esc(registerWord) + '）</button>');
    }
    el.innerHTML = head + body;
  }
  // containerが現在開いているポップアップ自身の場合、その解説文の中からさらに
  // 別語を選んだ「入れ子の再検索」とみなし、ポップアップは作り直さず中身だけ
  // 差し替える(位置がジャンプしないように)。現在の表示はdictHistoryに積んで
  // 「← 戻る」で再取得なしに戻れるようにする。
  function openDictPopup(text, container, rect) {
    var nested = dictPopupEl && container === dictPopupEl;
    var el;
    if (nested) {
      if (dictCurrentState) dictHistory.push(dictCurrentState);
      el = dictPopupEl;
    } else {
      closeDictPopup();
      el = document.createElement('div');
      el.id = 'dict-popup';
      el.className = 'card sel-dict';
      el.style.cssText = 'position:fixed;z-index:50;box-shadow:0 10px 32px rgba(0,0,0,.35);max-height:60vh;overflow:auto;user-select:text;-webkit-user-select:text';
      document.body.appendChild(el);
      positionDictPopup(el, rect);
      dictPopupEl = el;
    }
    var context = dictContextFor(container, text);
    var existing = findExistingWord(text);
    renderDictPopup(el, { status: 'loading', text: text, existing: existing });

    var cacheKey = text.toLowerCase();
    var cached = dictCacheGet(cacheKey);
    if (cached) { renderDictPopup(el, { status: 'ready', text: text, data: cached, existing: existing }); return; }
    if (existing && (existing.meaning || existing.example)) {
      renderDictPopup(el, { status: 'ready', text: text, data: { meaning: existing.meaning, pron: existing.pron, pos: existing.pos || '', example: existing.example, note: existing.usageTips || '' }, existing: existing });
      return;
    }
    if (!S.GEM_KEY) { renderDictPopup(el, { status: 'nokey', text: text, existing: existing }); return; }
    var prompt = '英語学習者向けの簡易辞書として、次の英単語/フレーズをJSON形式のみで説明してください(説明文やマークダウン不要)。\n'
      + '対象: "' + text + '"\n文脈(前後の文章。対象に合う意味を優先して解釈すること): "' + context + '"\n\n'
      + '対象が、文脈中でより大きな熟語・句動詞・コロケーション(例: keep up with, take into account)の'
      + '一部(先頭の1語だけ選ばれている等)だと判断できる場合は、phraseにその熟語全体を入れてください'
      + '(例: 対象が"take"で文脈が"...take into account..."ならphraseは"take into account")。'
      + '対象がそれ自体で単語/フレーズとして完結している場合はphraseを空文字にしてください。\n\n'
      + '{"phrase":"","pos":"品詞(名詞/動詞/形容詞/副詞/前置詞/熟語 等、短く)","meaning":"日本語の意味(文脈に合うものを優先、簡潔に。phraseがあればその意味)","pron":"IPA発音記号","example":"短い英語例文(対象またはphraseを使った自然な文)","exampleJa":"その例文の日本語訳","note":"ニュアンスや使い方のひとこと解説(日本語1文)","contrast":"似た語との違い(自然に思いつく比較対象があれば1文、無理にひねり出さず無ければ空文字)","pitfall":"間違えやすい点(前置詞・可算/不可算・語順など、あれば1文、無ければ空文字)"}';
    S.callGeminiText([{ text: prompt }], { temperature: 0.3, maxOutputTokens: 512 }).then(function (txt) {
      var data = S.parseJsonFromModelText(txt);
      dictCacheSet(cacheKey, data);
      // 熟語が検出された場合、熟語そのものが既に単語帳にあるかも確認する(選択した
      // 1語だけでなく、登録しようとしている見出し語で二重登録を防ぐ)。
      var effectiveExisting = existing || (data.phrase && data.phrase.trim() ? findExistingWord(data.phrase.trim()) : null);
      if (dictPopupEl === el) renderDictPopup(el, { status: 'ready', text: text, data: data, existing: effectiveExisting });
    }).catch(function () {
      if (dictPopupEl === el) renderDictPopup(el, { status: 'error', text: text, existing: existing });
    });
  }
  // cacheKeyは実際に選択した語(キャッシュを引く時の正しいキー)、wordToRegisterは
  // 単語帳に登録する見出し語(熟語が検出されていればその全体、なければcacheKeyと同じ)。
  function dictAddToVocab(cacheKey, wordToRegister) {
    wordToRegister = wordToRegister || cacheKey;
    var btn = document.getElementById('dict-add-btn');
    if (btn) { btn.disabled = true; btn.textContent = '追加中…'; }
    var cached = dictCacheGet(cacheKey.toLowerCase()) || {};
    submitNewWord(wordToRegister, cached.meaning || '', cached.example || '', cached.pron || '', [], cached.note || '', [], null, cached.pos || '', cached.exampleJa || '', cached.contrast || '', cached.pitfall || '');
    App.toast('単語帳に追加しました', 'success');
    closeDictPopup();
  }
  function dictGoBack() {
    if (!dictHistory.length || !dictPopupEl) return;
    renderDictPopup(dictPopupEl, dictHistory.pop());
  }
  function onDictSelectionUp() {
    setTimeout(function () {
      var sel = window.getSelection();
      var raw = sel && sel.toString().trim();
      if (!raw) { return; }
      // 単語の前後の句読点(ピリオド・カンマ等)は選択に含まれがちなので切り落とす。
      // 内部のアポストロフィ・ハイフン・スペースは残す(don't / non-disclosure等)。
      var text = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
      if (!text || !/^[A-Za-z][A-Za-z '’-]{0,59}$/.test(text)) return; // 単語/短いフレーズのみ対象
      var container = closestDictContainer(sel.anchorNode);
      if (!container) return;
      var key = text.toLowerCase();
      if (key === dictLastSelKey && dictPopupEl) return; // 同じ語の選び直しでは出し直さない
      dictLastSelKey = key;
      var range = sel.getRangeAt(0);
      openDictPopup(text, container, range.getBoundingClientRect());
    }, 60);
  }
  document.addEventListener('pointerup', function (ev) {
    if (dictPopupEl && dictPopupEl.contains(ev.target)) return;
    onDictSelectionUp();
  });
  document.addEventListener('pointerdown', function (ev) {
    if (dictPopupEl && !dictPopupEl.contains(ev.target)) closeDictPopup();
  });
  // 2026-11-22(Famiの指摘): 「moving parts」のような2語以上の熟語が調べられない
  // ことがあった。原因はモバイルで2語目まで選択範囲を広げる操作(1語選択後に
  // 選択ハンドルをドラッグして拡張する)が、通常のpointerup上では起きず
  // (ハンドルのドラッグはOSが処理するため、このページのpointer/mouseイベントが
  // 発火しないことがある)selectionchangeしか飛ばないこと。pointerupだけでなく
  // selectionchangeもデバウンスして拾うことで、ハンドルドラッグでの拡張にも
  // 対応する(dictLastSelKeyの仕組みで同じ語の重複表示は防げる)。
  var selChangeTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(selChangeTimer);
    selChangeTimer = setTimeout(onDictSelectionUp, 350);
  });
  loadWords(); // 他タブから辞書ポップアップを開いた時も「登録済み」判定が効くよう先読みしておく

  window.VocabTab = {
    showReview: showReview, showList: showList, setLevel: setLevel, setFilter: setFilter, toggleWeakOnly: toggleWeakOnly, toggleLevelPanel: toggleLevelPanel, setDirection: setDirection, setInteraction: setInteraction, setSort: setSort,
    startSession: startSession, pauseSession: pauseSession, resumeSession: resumeSession, endSession: endSession, resetSession: resetSession, resetQueue: resetQueue,
    continueBeyondCap: continueBeyondCap, setCapOption: setCapOption, setNewCapOption: setNewCapOption,
    flipCard: flipCard, flipPointerDown: flipPointerDown, flipPointerUp: flipPointerUp, answer: answer, revealMore: revealMore, revealSolve: revealSolve, openDetail: openDetail, closeDetail: closeDetail, speak: speakWord,
    openNewWord: openNewWord, openEditWord: openEditWord, closeWordForm: closeWordForm, toggleFormLevel: toggleFormLevel, saveWordForm: saveWordForm,
    deleteWord: deleteWord, closeDictPopup: closeDictPopup, dictAddToVocab: dictAddToVocab, dictGoBack: dictGoBack,
  };
  App.registerTab('vocab', { onShow: renderList });
})();
