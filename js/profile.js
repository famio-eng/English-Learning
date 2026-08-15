// マイページ tab. Mostly new, lightweight config (no equivalent screen existed before).
// Fixed-session weekday is a new preference — stored in localStorage per plan decision #6
// (no GitHub schema change).
(function () {
  'use strict';
  var S = window.Shared;
  var dayPickerOpen = false;
  var DAYS = ['日', '月', '火', '水', '木', '金', '土'];

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

  function render() {
    var el = document.getElementById('tab-profile');
    var userName = localStorage.getItem('profile_name') || 'Fami';
    var level = localStorage.getItem('onb_level') || 'TOEIC750（5年前）';

    var html = '<div style="font-weight:600;font-size:24px">マイページ</div>';
    html += '<div style="background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);overflow:hidden">'
      + rowHtml('表示名', userName)
      + rowHtml('現在のレベル', level)
      + rowHtml('次の旅行予定', '2026年9月12日〜20日（ローマ・バルセロナ）')
      + rowHtml('週1回の固定セッション', '毎週' + fixedDay() + '曜', { onclick: 'ProfileTab.openDayPicker()' })
      + rowHtml('連携状態', S.GH_TOKEN ? 'GitHub連携済み' : '未連携（?gh=トークンが必要）')
      + rowHtml('ヘルプ', 'LEARNING_PLAN.md参照')
      + '</div>';
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
    if (!confirm('ログアウトしますか？（トークンをURLから外して再読み込みします）')) return;
    location.href = location.pathname;
  }

  window.ProfileTab = { openDayPicker: function () { dayPickerOpen = true; render(); }, setFixedDay: setFixedDay, logout: logout };
  App.registerTab('profile', { onShow: render });
})();
