#!/usr/bin/env node
/**
 * Analyze unprocessed recordings from recordings/ via Gemini API
 * and save results to records/ on GitHub.
 *
 * Usage: node scripts/analyze-recordings.js [GH_TOKEN] [GEM_KEY]
 * Or set environment variables: GH_TOKEN, GEM_KEY
 */
'use strict';
const https = require('https');

const GH_TOKEN = process.argv[2] || process.env.GH_TOKEN || '';
const GEM_KEY  = process.argv[3] || process.env.GEM_KEY  || '';
const GH_OWNER = 'famio-eng';
const GH_REPO  = 'English-Learning';
const GH_BRANCH = 'main';

if (!GH_TOKEN || !GEM_KEY) {
  console.error('Usage: node scripts/analyze-recordings.js <GH_TOKEN> <GEM_KEY>');
  process.exit(1);
}

// ============================================================
// Script raw texts (from shadowing.html)
// ============================================================
var SCRIPTS = {
  'short': {
    title: '自己紹介 ショート版（1分）',
    raw: "Hi, I'm Fami. I've been with the company for about ten years, but I'm relatively new to product development as a project manager—just two years into this role. I'm currently leading a project for an electrosurgical generator used in endoscopic surgery. We're at an exciting stage right now, about to submit applications for regulatory approval across multiple countries. I got my PMP certification earlier this year, so I'm looking forward to taking on more responsibility and driving projects forward. Happy to work with you all."
  },
  'casual': {
    title: '自己紹介 カジュアル版（2分）',
    raw: "Thanks for having me. My name is Fami. I've been with the medical device company for ten years, but I want to be honest—my journey into product development is still relatively new. I spent most of my career in other areas, and this current project is actually my first real experience leading a major development initiative. It's been a challenging but rewarding two years.\n\nRight now, I'm managing a project for an electrosurgical generator—basically, it controls the power output of an electric scalpel used in minimally invasive endoscopic surgery. The technology is complex, and there's a lot to learn about regulatory pathways, but I'm genuinely excited about what we're building and where we're headed.\n\nWe're at a critical milestone. After two years of development, we're getting ready to move into regulatory submissions. That's no small feat in the medical device world, and I'm proud of what the team has accomplished so far. I recently earned my PMP certification, which has given me a much clearer framework for managing all the moving parts of this project.\n\nLooking forward to collaborating with all of you."
  },
  'formal': {
    title: '自己紹介 フォーマル版（3〜4分）',
    raw: "Good morning, everyone. My name is Fami, and I'm the project manager for our electrosurgical generator development initiative.\n\nI'd like to give you a brief background on my journey here. I've been with the medical device company for approximately ten years. However, I want to be transparent: my direct experience in product development is more limited. For most of my tenure, I worked in other functions within the organization. This current project represents my first substantive leadership role in a full-scale medical device development program.\n\nWhat we're developing is an electrosurgical generator—a device that controls the power output of an electric surgical knife, or electroscalpel, used in endoscopic procedures. These are minimally invasive surgeries, which is why precision in power delivery is critical. The regulatory landscape for such devices is demanding, which has been an important learning curve for me.\n\nThe project itself is now in its second year. We've made significant progress through the development and clinical validation phases. As of now, we're preparing to move into regulatory submissions across multiple countries—a major milestone. This involves coordinating with various regulatory bodies, ensuring compliance with their specific requirements, and managing a complex timeline.\n\nTo strengthen my capabilities as a project manager, I completed my PMP certification earlier this year. That credential has given me a more rigorous framework for managing scope, schedule, cost, and stakeholder communication—all critical elements as we navigate the regulatory phase ahead.\n\nI'm committed to bringing both technical diligence and collaborative leadership to this team. I recognize that I'm still building my expertise in the medical device domain, but I'm also bringing a growth mindset and a willingness to learn from all of you. I look forward to working together."
  },
  'sop-status-report': {
    title: 'SOP対応課題の状況報告',
    raw: "Recently, our project reached an important decision: to move forward with the European Declaration of Conformity process without waiting for full SOP compliance. This was supported by our confirmation that this project meets the exclusion criteria outlined in the SOP. Thank you all for your support in reaching this decision.\n\nAt the same time, Rob has recommended that we proceed in parallel with the SOP compliance work specifically related to risk management. We have already started working with the team to estimate the scope of that effort. We will share the results separately, and I'd like to discuss the details further when Rob visits Japan.\n\nRegarding the additional verification test with increased sample size, also recommended by Rob, we are currently preparing the test protocol with Rob's support.\n\nHowever, there is one concern I'd like to raise. According to our team members, if we proceed with the risk management-related SOP compliance, the approach to sample size may need to be reconsidered. This means we may need to incorporate the SOP requirements into the additional test protocol as well.\n\nFurthermore, since this SOP compliance work may result in changes to design documents, there is a possibility that we will need to go through the European Declaration of Conformity process once more in the future. However, our current thinking is that this could be addressed in the sustaining phase rather than within the current project timeline.\n\nThat covers the current status and key challenges. Please feel free to share any questions or comments."
  }
};

// ============================================================
// Helpers
// ============================================================
function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function httpsRequest(options, body) {
  return new Promise(function(resolve, reject) {
    var req = https.request(options, function(res) {
      var chunks = [];
      res.on('data', function(d) { chunks.push(d); });
      res.on('end', function() {
        var buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buf });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function ghGet(path) {
  var options = {
    hostname: 'api.github.com',
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'analyze-recordings',
      'Authorization': 'Bearer ' + GH_TOKEN,
      'Accept': 'application/vnd.github.v3+json'
    }
  };
  return httpsRequest(options, null).then(function(r) {
    return { status: r.status, data: JSON.parse(r.body.toString('utf8')) };
  });
}

function ghPut(path, bodyObj) {
  var bodyStr = JSON.stringify(bodyObj);
  var options = {
    hostname: 'api.github.com',
    path: path,
    method: 'PUT',
    headers: {
      'User-Agent': 'analyze-recordings',
      'Authorization': 'Bearer ' + GH_TOKEN,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr)
    }
  };
  return httpsRequest(options, bodyStr).then(function(r) {
    try {
      return { status: r.status, data: JSON.parse(r.body.toString('utf8')) };
    } catch(e) {
      return { status: r.status, data: r.body.toString('utf8') };
    }
  });
}

function downloadBinary(url) {
  return new Promise(function(resolve, reject) {
    var urlObj = new URL(url);
    var options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'User-Agent': 'analyze-recordings' }
    };
    https.get(options, function(res) {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBinary(res.headers.location).then(resolve).catch(reject);
      }
      var chunks = [];
      res.on('data', function(d) { chunks.push(d); });
      res.on('end', function() {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error('Download failed: HTTP ' + res.statusCode));
        }
      });
    }).on('error', reject);
  });
}

function callGemini(base64Audio, prompt) {
  var requestBody = JSON.stringify({
    contents: [{ parts: [
      { text: prompt },
      { inline_data: { mime_type: 'audio/mp4', data: base64Audio } }
    ]}],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
  });
  var options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEM_KEY,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    }
  };
  return httpsRequest(options, requestBody).then(function(r) {
    try {
      return { status: r.status, data: JSON.parse(r.body.toString('utf8')) };
    } catch(e) {
      return { status: r.status, data: r.body.toString('utf8') };
    }
  });
}

function buildPrompt(mode, scriptTitle, scriptRaw) {
  return 'You are an English pronunciation and fluency evaluator. Listen carefully to this audio recording.\n\n' +
    'Mode: ' + mode + ' (' + (mode === 'reading' ? 'reading the script aloud' : 'shadowing: repeating after the model speech') + ')\n' +
    'Script title: ' + scriptTitle + '\n\n' +
    'Reference script:\n"""\n' + scriptRaw + '\n"""\n\n' +
    'Evaluate the recording. Respond ONLY with a valid JSON object — no markdown fences, no explanation:\n' +
    '{\n' +
    '  "score": <integer 0-100>,\n' +
    '  "passed": <true if score >= 80, else false>,\n' +
    '  "scoreLabel": <"Excellent" if >=90, "Good" if >=75, "Fair" if >=60, "Needs Work" if <60>,\n' +
    '  "strengths": [<1-3 specific strengths>],\n' +
    '  "improvements": [<1-3 specific areas to improve>],\n' +
    '  "nextStepAdvice": "<one actionable sentence>",\n' +
    '  "canAdvance": <true if score >= 80>\n' +
    '}\n\n' +
    'Criteria: pronunciation accuracy, natural rhythm/intonation, pacing, smooth delivery, completeness.';
}

function parseGeminiResponse(data) {
  var parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  if (!parts) throw new Error('No candidates in Gemini response');
  var text = '';
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].text) text += parts[i].text;
  }
  var m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON found in Gemini response text: ' + text.substring(0, 300));
  return JSON.parse(m[0]);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('=== 録音分析スクリプト開始 ===\n');

  // 1. List recordings
  console.log('recordings/ フォルダを取得中...');
  var recRes = await ghGet('/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/recordings?ref=' + GH_BRANCH);
  var recordings = [];
  if (recRes.status === 200 && Array.isArray(recRes.data)) {
    recordings = recRes.data.filter(function(f) { return f.name.endsWith('.m4a'); });
  } else if (recRes.status === 404) {
    console.log('recordings/ フォルダが存在しません。');
    return;
  }
  console.log('録音ファイル: ' + recordings.length + ' 件');

  // 2. List existing records
  console.log('records/ フォルダを取得中...');
  var recJRes = await ghGet('/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/records?ref=' + GH_BRANCH);
  var existingSet = new Set();
  if (recJRes.status === 200 && Array.isArray(recJRes.data)) {
    recJRes.data.filter(function(f) { return f.name.endsWith('.json'); }).forEach(function(f) {
      existingSet.add(f.name.replace('.json', ''));
    });
  }
  console.log('既存レコード: ' + existingSet.size + ' 件\n');

  // 3. Find unanalyzed — sort newest first so today's recordings are prioritized
  var unanalyzed = recordings.filter(function(f) {
    return !existingSet.has(f.name.replace('.m4a', ''));
  }).sort(function(a, b) {
    return b.name.localeCompare(a.name);
  });
  console.log('未分析ファイル: ' + unanalyzed.length + ' 件');
  unanalyzed.forEach(function(f) { console.log('  - ' + f.name); });

  if (unanalyzed.length === 0) {
    console.log('\n全ファイル分析済みです。');
    return;
  }

  // 4. Process each file
  for (var i = 0; i < unanalyzed.length; i++) {
    var file = unanalyzed[i];
    console.log('\n[' + (i+1) + '/' + unanalyzed.length + '] ' + file.name);

    try {
      // Parse filename: YYYY-MM-DD-HH-MM-{scriptId}-{mode}.m4a
      var base = file.name.replace('.m4a', '');
      var parts = base.split('-');
      var date = parts[0] + '-' + parts[1] + '-' + parts[2];
      var time = parts[3] + ':' + parts[4];
      var mode = parts[parts.length - 1];
      var scriptId = parts.slice(5, parts.length - 1).join('-');

      console.log('  date=' + date + ' time=' + time + ' script=' + scriptId + ' mode=' + mode);

      var scriptInfo = SCRIPTS[scriptId];
      if (!scriptInfo) {
        console.log('  スクリプト "' + scriptId + '" が未定義。スキップ。');
        continue;
      }

      // Download
      var rawUrl = 'https://raw.githubusercontent.com/' + GH_OWNER + '/' + GH_REPO + '/main/recordings/' + file.name;
      console.log('  ダウンロード中...');
      var audioBuf = await downloadBinary(rawUrl);
      console.log('  ' + Math.round(audioBuf.length / 1024) + ' KB');
      var base64Audio = audioBuf.toString('base64');

      // Gemini
      console.log('  Gemini 分析中...');
      var prompt = buildPrompt(mode, scriptInfo.title, scriptInfo.raw);
      var gemRes;
      var retries = 0;
      while (retries < 3) {
        gemRes = await callGemini(base64Audio, prompt);
        if (gemRes.status === 503) {
          console.log('  503 エラー。30秒待機してリトライ (' + (retries+1) + '/3)...');
          await sleep(30000);
          retries++;
        } else if (gemRes.status === 429) {
          console.log('  429 レート制限。60秒待機してリトライ (' + (retries+1) + '/3)...');
          await sleep(60000);
          retries++;
        } else {
          break;
        }
      }

      if (gemRes.status !== 200) {
        var errMsg = typeof gemRes.data === 'object' ? JSON.stringify(gemRes.data) : String(gemRes.data);
        console.log('  Gemini エラー (' + gemRes.status + '): ' + errMsg.substring(0, 300));
        continue;
      }

      var evaluation;
      try {
        evaluation = parseGeminiResponse(gemRes.data);
      } catch(e) {
        console.log('  パース失敗: ' + e.message);
        continue;
      }
      console.log('  スコア: ' + evaluation.score + ' (' + evaluation.scoreLabel + ') 合格: ' + evaluation.passed);

      // Build record
      var record = {
        date: date,
        time: time,
        scriptId: scriptId,
        scriptTitle: scriptInfo.title,
        mode: mode,
        score: evaluation.score,
        scoreLabel: evaluation.scoreLabel,
        passed: evaluation.passed,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        nextStepAdvice: evaluation.nextStepAdvice,
        canAdvance: evaluation.canAdvance,
        recordingUrl: rawUrl
      };

      var recordPath = 'records/' + base + '.json';
      var content = Buffer.from(JSON.stringify(record, null, 2), 'utf8').toString('base64');

      console.log('  ' + recordPath + ' を保存中...');
      var putRes = await ghPut('/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + recordPath, {
        message: 'Add analysis: ' + base,
        content: content,
        branch: GH_BRANCH
      });

      if (putRes.status === 201) {
        console.log('  保存完了!');
      } else {
        var putErr = typeof putRes.data === 'object' ? JSON.stringify(putRes.data) : String(putRes.data);
        console.log('  保存失敗 (' + putRes.status + '): ' + putErr.substring(0, 200));
      }

    } catch(e) {
      console.log('  エラー: ' + e.message);
    }

    if (i < unanalyzed.length - 1) {
      console.log('  10秒待機...');
      await sleep(10000);
    }
  }

  console.log('\n=== 分析完了 ===');
}

main().catch(function(e) {
  console.error('致命的エラー:', e.message);
  process.exit(1);
});
