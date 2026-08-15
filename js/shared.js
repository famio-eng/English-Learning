// Shared auth/GitHub/Gemini helpers, extracted from dashboard.html / shadowing.html /
// vocab.html / dialogue.html (each had its own copy of this exact logic).
(function (global) {
  'use strict';

  var _qs = new URLSearchParams(window.location.search);
  var GH_TOKEN = _qs.get('gh') || '';
  var GEM_KEY = _qs.get('k') || '';
  var GH_OWNER = 'famio-eng';
  var GH_REPO = 'English-Learning';
  var GH_API = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/';
  var GEM_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var GEM_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'];

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

  // Public raw read (no auth needed, cache-busted) — used for data/vocab.json.
  function rawGetJson(path) {
    var url = 'https://raw.githubusercontent.com/' + GH_OWNER + '/' + GH_REPO + '/main/' + path + '?t=' + Date.now();
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('raw GET ' + path + ' failed: ' + res.status);
      return res.json();
    });
  }

  // Calls Gemini, retrying across GEM_MODELS on quota/availability errors (429/503/404,
  // or messages containing quota/unavailable/overloaded/not found/not supported/deprecated).
  function callGeminiWithFallback(payload) {
    var RETRYABLE = /quota|unavailable|overloaded|not found|not supported|deprecated/i;
    function attempt(i) {
      if (i >= GEM_MODELS.length) return Promise.reject(new Error('全モデルで失敗しました'));
      var model = GEM_MODELS[i];
      return fetch(GEM_BASE + model + ':generateContent?key=' + GEM_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (res) {
        if (res.status === 429 || res.status === 503 || res.status === 404) {
          return new Promise(function (resolve) { setTimeout(resolve, 2000); }).then(function () {
            return attempt(i + 1);
          });
        }
        return res.json().then(function (json) {
          if (json.error && RETRYABLE.test(json.error.message || '')) {
            return new Promise(function (resolve) { setTimeout(resolve, 2000); }).then(function () {
              return attempt(i + 1);
            });
          }
          if (json.error) throw new Error(json.error.message || 'Gemini error');
          return json;
        });
      }).catch(function (err) {
        if (i + 1 < GEM_MODELS.length) {
          return new Promise(function (resolve) { setTimeout(resolve, 2000); }).then(function () {
            return attempt(i + 1);
          });
        }
        throw err;
      });
    }
    return attempt(0);
  }

  function callGeminiText(parts, opts) {
    var payload = {
      contents: [{ parts: parts }],
      generationConfig: Object.assign({ temperature: 0.4, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } }, opts || {}),
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

  global.Shared = {
    GH_TOKEN: GH_TOKEN,
    GEM_KEY: GEM_KEY,
    GH_OWNER: GH_OWNER,
    GH_REPO: GH_REPO,
    b64EncodeUtf8: b64EncodeUtf8,
    b64DecodeUtf8: b64DecodeUtf8,
    apiGet: apiGet,
    apiGetJson: apiGetJson,
    apiPutJson: apiPutJson,
    apiPutBinary: apiPutBinary,
    apiListDir: apiListDir,
    rawGetJson: rawGetJson,
    callGeminiWithFallback: callGeminiWithFallback,
    callGeminiText: callGeminiText,
    parseJsonFromModelText: parseJsonFromModelText,
    todayStr: todayStr,
  };
})(window);
