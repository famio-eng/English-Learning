// マイページ tab. Mostly new, lightweight config (no equivalent screen existed before).
// Fixed-session weekday is a new preference — stored in localStorage per plan decision #6
// (no GitHub schema change).
(function () {
  'use strict';
  var S = window.Shared;
  var dayPickerOpen = false;
  var DAYS = ['日', '月', '火', '水', '木', '金', '土'];
  // 2026-11-27(Anuvilia経由のFami依頼): Geminiキーをアプリ内で設定・差し替えできる
  // ようにする。キーの値はrender()のHTML生成時以外には一切保持せず、入力欄の
  // DOM要素から都度読み取るだけにする(変数にも、ログにも残さない)。
  var geminiKeyFormOpen = false;
  var geminiKeySaving = false;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function fixedDay() { return localStorage.getItem('fixed_session_day') || '土'; }
  function setFixedDay(d) { localStorage.setItem('fixed_session_day', d); dayPickerOpen = false; render(); }

  function rowHtml(label, value, opts) {
    opts = opts || {};
    var onclick = opts.onclick ? ' onclick="' + opts.onclick + '"' : '';
    var cursor = opts.onclick ? 'pointer' : 'default';
    return '<button' + onclick + ' style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-neutral-700);width:100%;background:none;border-left:none;border-right:none;border-top:none;cursor:' + cursor + ';text-align:left;color:inherit;font-family:inherit">'
      + '<div style="font-size:14px;color:var(--color-neutral-300)">' + esc(label) + '</div>'
      + '<div style="display:flex;align-items:center;gap:6px"><div style="font-size:14px;color:var(--color-text)">' + esc(value) + '</div>'
      + (opts.onclick ? '<span style="font-size:14px;color:var(--color-neutral-500)">›</span>' : '') + '</div></button>';
  }

  // Geminiキーの設定/差し替えカード。キーの値はDOM(入力欄)にしか存在させず、
  // 保存成功後は入力欄ごと破棄する(JSの変数・ログには一切残さない)。
  function geminiKeyCardHtml() {
    var hasKey = !!S.GEM_KEY;
    var showForm = !hasKey || geminiKeyFormOpen;
    var body;
    if (showForm) {
      body = '<input type="password" id="gemini-key-input" autocomplete="off" class="field" placeholder="Geminiキーを入力" style="width:100%;margin-top:8px;box-sizing:border-box">'
        + '<button class="btn btn-primary btn-block" style="margin-top:8px"' + (geminiKeySaving ? ' disabled' : '') + ' onclick="ProfileTab.saveGeminiKey()">' + (geminiKeySaving ? '保存中…' : '保存') + '</button>'
        + (hasKey ? '<button class="btn btn-ghost btn-block" style="margin-top:6px"' + (geminiKeySaving ? ' disabled' : '') + ' onclick="ProfileTab.cancelGeminiKeyEdit()">キャンセル</button>' : '');
    } else {
      body = '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">'
        + '<span style="font-size:13px;color:var(--color-success)">設定済み</span>'
        + '<button class="btn btn-secondary" style="font-size:12px;padding:6px 12px" onclick="ProfileTab.openGeminiKeyEdit()">変更する</button></div>';
    }
    return '<div class="card" style="margin-top:10px"><div class="card-kicker">Geminiキー</div>'
      + '<div style="font-size:11.5px;color:var(--color-neutral-500);margin-top:2px">AI採点・週次レポート等で使用します。値はこの端末にもログにも残さず、非公開のデータリポジトリにのみ保存します。</div>'
      + body + '</div>';
  }

  function render() {
    var el = document.getElementById('tab-profile');
    var userName = localStorage.getItem('profile_name') || 'Fami';
    // 2026-11-26: 実際のTOEICスコア・旅行先はソースコードに直接書かず、ログイン後に
    // data/profile-config.json(非公開データリポジトリ側)から取得したものを使う。
    // 未ログイン・未設定の場合は汎用的な表示にする。
    var level = localStorage.getItem('onb_level') || (S.profile && S.profile.level) || '未設定';

    var html = '<div style="font-weight:600;font-size:24px">マイページ</div>';
    html += '<div style="background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);overflow:hidden">'
      + rowHtml('表示名', userName)
      + rowHtml('現在のレベル', level)
      + rowHtml('次の旅行予定', (S.profile && S.profile.nextTrip) || '未設定')
      + rowHtml('週1回の固定セッション', '毎週' + fixedDay() + '曜', { onclick: 'ProfileTab.openDayPicker()' })
      + rowHtml('連携状態', S.GH_TOKEN ? 'GitHub連携済み' : '未連携（?gh=トークンが必要）')
      + rowHtml('ヘルプ', 'LEARNING_PLAN.md参照')
      + '</div>';
    html += geminiKeyCardHtml();

    html += '<button class="btn btn-ghost btn-block" style="margin-top:4px" onclick="ProfileTab.logout()">ログアウト</button>';

    if (dayPickerOpen) {
      html += '<div class="sheet-backdrop" id="dp-backdrop"></div>'
        + '<div class="sheet"><div style="font-size:16px;font-weight:500;padding:18px 18px 10px">固定セッションの曜日</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;padding:0 18px 20px">'
        + DAYS.map(function (d) {
          var active = fixedDay() === d;
          return '<button class="btn" style="justify-content:flex-start;text-align:left;border-color:' + (active ? 'var(--color-accent)' : 'var(--color-neutral-700)') + ';color:' + (active ? 'var(--color-text)' : 'var(--color-neutral-300)') + ';background:' + (active ? 'var(--color-accent-800)' : 'transparent') + '" onclick="ProfileTab.setFixedDay(\'' + d + '\')">毎週' + d + '曜</button>';
        }).join('') + '</div></div>';
    }
    el.innerHTML = html;
    if (dayPickerOpen) document.getElementById('dp-backdrop').onclick = function () { dayPickerOpen = false; render(); };
  }

  function logout() {
    if (!confirm('ログアウトしますか？（保存したトークンを削除して再読み込みします）')) return;
    S.clearStoredToken();
    location.href = location.pathname;
  }

  function openGeminiKeyEdit() { geminiKeyFormOpen = true; render(); }
  function cancelGeminiKeyEdit() { geminiKeyFormOpen = false; render(); }
  function saveGeminiKey() {
    var el = document.getElementById('gemini-key-input');
    var key = el ? el.value.trim() : '';
    if (!key) return;
    geminiKeySaving = true; render();
    S.saveGeminiKey(key).then(function () {
      geminiKeySaving = false; geminiKeyFormOpen = false;
      App.toast('Geminiキーを保存しました', 'success');
      render();
    }).catch(function (err) {
      geminiKeySaving = false;
      App.toast('保存に失敗しました(' + ((err && err.message) ? String(err.message).slice(0, 40) : '不明なエラー') + ')');
      render();
    });
  }

  window.ProfileTab = {
    openDayPicker: function () { dayPickerOpen = true; render(); }, setFixedDay: setFixedDay, logout: logout,
    openGeminiKeyEdit: openGeminiKeyEdit, cancelGeminiKeyEdit: cancelGeminiKeyEdit, saveGeminiKey: saveGeminiKey,
  };
  App.registerTab('profile', { onShow: render });
})();
