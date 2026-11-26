// 会話 tab. SCRIPTS data + evalRec Japanese-learner rubric prompt + breath-group/highlight
// logic + MediaRecorder flow ported verbatim from shadowing.html (unlocked[] gating,
// PASS_THRESHOLD, showAIFeedback/scriptProgress persistence). Reorder/hide of the business
// list and the mode-selector UI (shadow/readaloud/listen) are new, matching the Nocturne
// design; they wrap the same underlying record→evalRec→showAIFeedback pipeline.
(function () {
  'use strict';
  var S = window.Shared;

var SCRIPTS = [
  {
    id: 'biz-progress-update',
    title: '定例ミーティングでの進捗報告',
    date: '2026-11-24',
    tip: 'verification / acceptance criteria / behind scheduleの発音に注意。結論(on track)を先に言う型を意識。',
    raw: "Thanks everyone for making time today. Let me walk you through where things stand.\n\nOverall, the project is on track. We completed the design verification testing last week, and the results came back within our acceptance criteria. The documentation package is about eighty percent done, and we expect to finish the remaining sections by the end of this month.\n\nThere is one area that's a bit behind schedule: the usability study with the overseas site. Scheduling conflicts on their end pushed it back by about two weeks. It's not blocking the overall timeline yet, but it's something I'm keeping a close eye on.\n\nMy ask today is for your support in confirming the revised usability study dates by this Friday, so we can lock in the vendor and stay on track for the submission deadline.\n\nThat's the summary. Happy to take any questions.",
    breathGroups: [
      "Thanks everyone for making time today.",
      "Let me walk you through",
      "where things stand.",
      "Overall, the project is on track.",
      "We completed the design verification testing last week,",
      "and the results came back",
      "within our acceptance criteria.",
      "The documentation package is about eighty percent done,",
      "and we expect to finish the remaining sections",
      "by the end of this month.",
      "There is one area that's a bit behind schedule:",
      "the usability study with the overseas site.",
      "Scheduling conflicts on their end",
      "pushed it back by about two weeks.",
      "It's not blocking the overall timeline yet,",
      "but it's something I'm keeping a close eye on.",
      "My ask today is for your support",
      "in confirming the revised usability study dates",
      "by this Friday,",
      "so we can lock in the vendor",
      "and stay on track for the submission deadline.",
      "That's the summary.",
      "Happy to take any questions."
    ],
    vocab: [
      {word:'design verification testing', pron:'/dɪˈzaɪn ˌvɛrɪfɪˈkeɪʃən ˈtɛstɪŋ/', meaning:'設計検証試験', example:'We completed the design verification testing last week.'},
      {word:'acceptance criteria', pron:'/əkˈsɛptəns kraɪˈtɪriə/', meaning:'合格基準', example:'The results came back within our acceptance criteria.'},
      {word:'documentation package', pron:'/ˌdɑːkjəmɛnˈteɪʃən ˈpækɪdʒ/', meaning:'申請書類一式', example:'The documentation package is about eighty percent done.'},
      {word:'behind schedule', pron:'/bɪˈhaɪnd ˈskɛdʒuːl/', meaning:'スケジュールより遅れている', example:"There is one area that's a bit behind schedule."},
      {word:'usability study', pron:'/ˌjuːzəˈbɪləti ˈstʌdi/', meaning:'ユーザビリティ試験', example:'We need to finish the usability study with the overseas site.'},
      {word:'keep a close eye on', pron:'/kiːp ə kloʊs aɪ ɒn/', meaning:'注意深く見守る', example:"It's something I'm keeping a close eye on."},
      {word:'lock in', pron:'/lɒk ɪn/', meaning:'(日程・契約などを)確定する', example:'We can lock in the vendor once the dates are confirmed.'}
    ],
    analyzed: {
      sentences: [
        {en:"Thanks everyone for making time today. Let me walk you through where things stand.", ja:"本日はお時間をいただきありがとうございます。現状についてご説明します。"},
        {en:"Overall, the project is on track.", ja:"全体として、プロジェクトは順調に進んでいます。", difficulty:"easy", hint:{words:['on track'],opening:'Overall, the'}, explanation:"on trackは「順調に進んでいる」の定番表現。off trackの反対。進捗報告の冒頭で結論を先に言う型として覚えると便利。", ipa:"/ˌoʊvərˈɔːl ðə ˈprɑːdʒɛkt ɪz ɒn træk/", note:{scene:"進捗報告の冒頭で全体状況を一言でまとめる場面", nuance:"詳細に入る前にまず結論(順調かどうか)を伝える、ビジネス報告の定石", alt:"Overall, we're in good shape.", caution:"on trackは「予定通り」。細部に課題がある時はOverall, we're mostly on trackのように和らげる"}},
        {en:"We completed the design verification testing last week, and the results came back within our acceptance criteria.", ja:"先週、設計検証試験を完了し、結果は合格基準の範囲内でした。"},
        {en:"The documentation package is about eighty percent done, and we expect to finish the remaining sections by the end of this month.", ja:"申請書類一式は約8割完成しており、残りの部分も今月末までに終える見込みです。"},
        {en:"There is one area that's a bit behind schedule: the usability study with the overseas site.", ja:"1つだけ少し遅れている部分があります。海外拠点とのユーザビリティ試験です。", difficulty:"medium", hint:{words:['behind schedule','usability study'],opening:'There is'}, explanation:"behind scheduleは「予定より遅れている」。コロンの後に具体的な内容(the usability study)を置き、何が遅れているかを簡潔に示している。"},
        {en:"Scheduling conflicts on their end pushed it back by about two weeks.", ja:"先方側のスケジュールの都合で、約2週間遅れています。"},
        {en:"It's not blocking the overall timeline yet, but it's something I'm keeping a close eye on.", ja:"全体のスケジュールにはまだ影響していませんが、注意深く見ています。", difficulty:"medium", hint:{words:['keeping a close eye on'],opening:"It's not"}, explanation:"keep a close eye on Xは「Xを注意深く見守る」。blockingは「妨げている」で、not blockingは「まだ支障は出ていない」の意味。"},
        {en:"My ask today is for your support in confirming the revised usability study dates by this Friday, so we can lock in the vendor and stay on track for the submission deadline.", ja:"本日お願いしたいのは、今週金曜までに改訂後のユーザビリティ試験日程を確定いただくことです。そうすればベンダーを確保し、申請期限に間に合わせられます。"},
        {en:"That's the summary.", ja:"以上がサマリーです。"},
        {en:"Happy to take any questions.", ja:"ご質問があればお気軽にどうぞ。", difficulty:"easy", hint:{words:['Happy to','any questions'],opening:'Happy to'}, explanation:"Happy to doの応用形。Happy to take any questionsは報告・プレゼンの締めの定番。Happyの後はto不定詞で、takingのようにingにしない。", ipa:"/ˈhæpi tu teɪk ˈɛni ˈkwɛstʃənz/", note:{scene:"報告や説明の締めくくりで質問を促す場面", nuance:"Any questions?だけより柔らかく、歓迎している姿勢が伝わる", alt:"Please let me know if you have any questions.", caution:"Happyの後はto不定詞(to take)。taking questionsのようにingにしない"}}
      ],
      pronunciationTips: [
        "verification: ver-i-fi-CA-tion。CAにアクセント。",
        "acceptance criteria: ac-CEP-tance cri-TE-ri-a。CEPとTEにアクセント。",
        "usability: u-sa-BIL-i-ty。BILにアクセント。",
        "schedule: 最初のSCHEDにアクセント。日本語の「スケジュール」よりschedの母音を短く。"
      ]
    }
  },
  {
    id: 'biz-issue-escalation',
    title: '課題共有とエスカレーション',
    date: '2026-11-24',
    tip: 'escalate / trade-off / rule outの発音とリズムに注意。問題→影響→依頼の流れを崩さず話す。',
    raw: "I want to flag an issue and get your input.\n\nDuring the stability testing, we found a result that's outside our expected range. The team reviewed it, and we believe it's most likely a measurement error, but we can't fully rule out the product cause yet without repeating the test.\n\nRepeating the test will add about ten days to the schedule, which puts our submission date at risk. If we skip it, we move faster, but we take on risk we don't fully understand yet.\n\nI'd like to escalate this and get a decision by end of day tomorrow, since the vendor needs confirmation to book the test slot. My recommendation is to repeat the test, but I wanted to lay out the trade-off clearly first.\n\nThanks for your time.",
    breathGroups: [
      "I want to flag an issue",
      "and get your input.",
      "During the stability testing,",
      "we found a result",
      "that's outside our expected range.",
      "The team reviewed it,",
      "and we believe it's most likely a measurement error,",
      "but we can't fully rule out the product cause yet",
      "without repeating the test.",
      "Repeating the test will add about ten days to the schedule,",
      "which puts our submission date at risk.",
      "If we skip it,",
      "we move faster,",
      "but we take on risk",
      "we don't fully understand yet.",
      "I'd like to escalate this",
      "and get a decision by end of day tomorrow,",
      "since the vendor needs confirmation",
      "to book the test slot.",
      "My recommendation is to repeat the test,",
      "but I wanted to lay out the trade-off clearly first.",
      "Thanks for your time."
    ],
    vocab: [
      {word:'flag an issue', pron:'/flæg ən ˈɪʃuː/', meaning:'問題を報告する・共有する', example:'I want to flag an issue and get your input.'},
      {word:'outside our expected range', pron:'/aʊtˈsaɪd aʊər ɪkˈspɛktɪd reɪndʒ/', meaning:'想定範囲外', example:"We found a result that's outside our expected range."},
      {word:'rule out', pron:'/ruːl aʊt/', meaning:'(可能性を)排除する', example:"We can't fully rule out the product cause yet."},
      {word:'at risk', pron:'/æt rɪsk/', meaning:'危険にさらされて', example:'This puts our submission date at risk.'},
      {word:'escalate', pron:'/ˈɛskəleɪt/', meaning:'エスカレーションする・上に判断を仰ぐ', example:"I'd like to escalate this and get a decision by end of day tomorrow."},
      {word:'trade-off', pron:'/ˈtreɪd ɔːf/', meaning:'トレードオフ', example:'I wanted to lay out the trade-off clearly first.'},
      {word:'book the test slot', pron:'/bʊk ðə tɛst slɒt/', meaning:'試験の枠を予約する', example:'The vendor needs confirmation to book the test slot.'}
    ],
    analyzed: {
      sentences: [
        {en:"I want to flag an issue and get your input.", ja:"問題を共有して、ご意見をいただきたいです。", difficulty:"easy", hint:{words:['flag an issue','your input'],opening:'I want'}, explanation:"flag an issueは「問題を報告する・共有する」。get your inputのinputは「意見・見解」の意味の名詞。", ipa:"/aɪ wɒnt tu flæg ən ˈɪʃuː ænd ɡɛt jɔːr ˈɪnpʊt/", note:{scene:"問題が見つかった時に上司やチームに最初に切り出す場面", nuance:"「問題です」と重く言うより、意見を求める姿勢とセットにすると角が立ちにくい", alt:"There's something I'd like to bring to your attention.", caution:"flagは動詞で「報告する」の意味。flag upとは言わず、flag an issueで十分"}},
        {en:"During the stability testing, we found a result that's outside our expected range.", ja:"安定性試験の際に、想定範囲外の結果が出ました。"},
        {en:"The team reviewed it, and we believe it's most likely a measurement error, but we can't fully rule out the product cause yet without repeating the test.", ja:"チームで確認したところ、測定誤差の可能性が高いと考えていますが、試験を繰り返さない限り製品側の原因を完全には排除できません。"},
        {en:"Repeating the test will add about ten days to the schedule, which puts our submission date at risk.", ja:"試験を繰り返すとスケジュールに約10日追加となり、申請日程がリスクにさらされます。", difficulty:"medium", hint:{words:['at risk','submission date'],opening:'Repeating the'}, explanation:"put X at riskで「Xを危険にさらす」。ここでは申請日程(submission date)がXにあたる。動名詞Repeating the testが文全体の主語になっている点にも注目。"},
        {en:"If we skip it, we move faster, but we take on risk we don't fully understand yet.", ja:"省略すれば早く進められますが、まだ十分に把握できていないリスクを抱えることになります。"},
        {en:"I'd like to escalate this and get a decision by end of day tomorrow, since the vendor needs confirmation to book the test slot.", ja:"ベンダーが試験枠の確保に確認を必要としているため、明日の終業までにエスカレーションして判断をいただきたいです。"},
        {en:"My recommendation is to repeat the test, but I wanted to lay out the trade-off clearly first.", ja:"私としては試験をやり直すことを推奨しますが、まずトレードオフを明確にお伝えしたいと思いました。"},
        {en:"Thanks for your time.", ja:"お時間いただきありがとうございます。", difficulty:"easy", hint:{words:['Thanks for your time']}, explanation:"Thanks for your timeは相談・報告の締めの定番。Thanks for your patience(お待たせして申し訳ありません系)とセットで覚えると使い分けやすい。", ipa:"/θæŋks fɔːr jɔːr taɪm/", note:{scene:"相談・報告の締めくくりで相手の時間への感謝を伝える場面", nuance:"Thanks for your patienceと並ぶ定番の締め", alt:"I appreciate you taking the time.", caution:"timeは不可算名詞。a timeのようにaを付けない"}}
      ],
      pronunciationTips: [
        "escalate: ES-ca-late。ESにアクセント、エスカレイトと伸ばす。",
        "measurement error: MEA-sure-ment ER-ror。MEAとERにアクセント。",
        "trade-off: TRADE-off。2語ともはっきり、間を区切らず一息で。",
        "rule out: RULE OUT。両方はっきり発音し、ruleのLをしっかり。"
      ]
    }
  },
  {
    id: 'biz-seeking-advice',
    title: '上司・同僚への相談',
    date: '2026-11-24',
    tip: 'critical path / second opinionの発音に注意。相談を切り出す→状況説明→自分の考え→意見を求める、の流れ。',
    raw: "Do you have a few minutes? I'd like to get your advice on something.\n\nWe're getting conflicting feedback from the two regulatory reviewers. One wants us to add more clinical data, and the other says the current data is already sufficient. I'm not sure which direction to prioritize, since both reviewers need to sign off eventually.\n\nMy instinct is to go with the reviewer who's on the critical path for our launch timeline, and circle back to the other one afterward. But I wanted to check your thinking before I commit to that approach.\n\nIs there anything I'm missing here? I'd really appreciate a second opinion.",
    breathGroups: [
      "Do you have a few minutes?",
      "I'd like to get your advice",
      "on something.",
      "We're getting conflicting feedback",
      "from the two regulatory reviewers.",
      "One wants us to add more clinical data,",
      "and the other says",
      "the current data is already sufficient.",
      "I'm not sure which direction to prioritize,",
      "since both reviewers need to sign off eventually.",
      "My instinct is to go with the reviewer",
      "who's on the critical path",
      "for our launch timeline,",
      "and circle back to the other one afterward.",
      "But I wanted to check your thinking",
      "before I commit to that approach.",
      "Is there anything I'm missing here?",
      "I'd really appreciate a second opinion."
    ],
    vocab: [
      {word:'get your advice on something', pron:'/ɡɛt jɔːr ədˈvaɪs ɒn ˈsʌmθɪŋ/', meaning:'〜についてアドバイスをもらう', example:"I'd like to get your advice on something."},
      {word:'conflicting feedback', pron:'/kənˈflɪktɪŋ ˈfiːdbæk/', meaning:'食い違うフィードバック', example:"We're getting conflicting feedback from the two reviewers."},
      {word:'sign off', pron:'/saɪn ɔːf/', meaning:'承認する', example:'Both reviewers need to sign off eventually.'},
      {word:'my instinct is to ~', pron:'/maɪ ˈɪnstɪŋkt ɪz tu/', meaning:'直感的には〜したい', example:'My instinct is to go with the reviewer on the critical path.'},
      {word:'critical path', pron:'/ˈkrɪtɪkəl pæθ/', meaning:'クリティカルパス・最優先事項', example:"He's on the critical path for our launch timeline."},
      {word:'circle back to', pron:'/ˈsɜːrkəl bæk tu/', meaning:'後で〜に戻って対応する', example:"I'll circle back to the other reviewer afterward."},
      {word:'a second opinion', pron:'/ə ˈsɛkənd əˈpɪnjən/', meaning:'第三者の意見・セカンドオピニオン', example:"I'd really appreciate a second opinion."}
    ],
    analyzed: {
      sentences: [
        {en:"Do you have a few minutes?", ja:"少しお時間よろしいですか。", difficulty:"easy", hint:{words:['a few minutes']}, explanation:"Do you have a few minutes?は相談や込み入った話を切り出す前の定番の前置き。いきなり本題に入らず相手の都合を確認する。", ipa:"/du ju hæv ə fjuː ˈmɪnɪts/", note:{scene:"相談を切り出す前に相手の都合を確認する場面", nuance:"いきなり本題に入らず、まず時間があるか尋ねる丁寧な導入", alt:"Have you got a moment?", caution:"a few minutesは「少し」の意味。実際は長くかかりそうな場合はDo you have some time?の方が誠実"}},
        {en:"I'd like to get your advice on something.", ja:"ご相談したいことがあります。"},
        {en:"We're getting conflicting feedback from the two regulatory reviewers.", ja:"2名の薬事レビュアーから、食い違うフィードバックをもらっています。"},
        {en:"One wants us to add more clinical data, and the other says the current data is already sufficient.", ja:"一方は追加の臨床データを求めていて、もう一方は現行データで十分だと言っています。"},
        {en:"I'm not sure which direction to prioritize, since both reviewers need to sign off eventually.", ja:"最終的には両レビュアーの承認が必要なため、どちらを優先すべきか迷っています。", difficulty:"medium", hint:{words:['sign off','prioritize'],opening:"I'm not"}, explanation:"sign offは「承認する」。eventually「最終的には」が、両者の承認が必要という結論を導いている。"},
        {en:"My instinct is to go with the reviewer who's on the critical path for our launch timeline, and circle back to the other one afterward.", ja:"直感的には、ローンチのクリティカルパスに関わるレビュアーを優先し、もう一方には後で対応しようと考えています。"},
        {en:"But I wanted to check your thinking before I commit to that approach.", ja:"ただ、その方針を決める前にお考えを伺いたいと思いました。"},
        {en:"Is there anything I'm missing here?", ja:"何か見落としている点はありますか。"},
        {en:"I'd really appreciate a second opinion.", ja:"ぜひセカンドオピニオンをいただきたいです。", difficulty:"easy", hint:{words:['appreciate','second opinion']}, explanation:"a second opinionは医療の「セカンドオピニオン」と同じ言葉。自分の判断に第三者の視点を求める時の定番表現。", ipa:"/aɪd ˈrɪli əˈpriːʃieɪt ə ˈsɛkənd əˈpɪnjən/", note:{scene:"判断に迷っていて他者の意見を求める場面", nuance:"really appreciateで感謝の気持ちを強調し、一方的な報告ではなく相談だと伝わる", alt:"I'd love to hear your take on this.", caution:"a second opinionは自分の判断に自信がない時に使うと謙虚な印象になる"}}
      ],
      pronunciationTips: [
        "regulatory reviewers: reg-u-la-to-ry re-VIEW-ers。REGとVIEWにアクセント。",
        "conflicting: con-FLICT-ing。FLICTにアクセント。",
        "critical path: CRIT-i-cal PATH。両方はっきりと。",
        "a second opinion: a SEC-ond o-PIN-ion。SECとPINにアクセント。"
      ]
    }
  },
  {
    id: 'biz-smalltalk-coffee',
    title: 'オンライン会議前の雑談・気の利いた応答',
    date: '2026-11-24',
    tip: 'congrats / catch upなどカジュアルな縮約・リズムに注意。相づちと本題への切り替えを自然に。',
    raw: "Hey, good to see you! How was your weekend?\n\nThat sounds really nice, actually — I could use a weekend like that myself. Things have been pretty busy on my end.\n\nBy the way, congrats on getting that report finished. That must have been a lot of work.\n\nAnyway, I think the others are joining now, so let's go ahead and get started. We can catch up more afterward.",
    breathGroups: [
      "Hey, good to see you!",
      "How was your weekend?",
      "That sounds really nice, actually —",
      "I could use a weekend like that myself.",
      "Things have been pretty busy",
      "on my end.",
      "By the way,",
      "congrats on getting that report finished.",
      "That must have been a lot of work.",
      "Anyway,",
      "I think the others are joining now,",
      "so let's go ahead and get started.",
      "We can catch up more afterward."
    ],
    vocab: [
      {word:'good to see you', pron:'/ɡʊd tu siː ju/', meaning:'会えて嬉しいです', example:'Hey, good to see you!'},
      {word:'I could use a ~', pron:'/aɪ kʊd juːz ə/', meaning:'〜があるといいな・欲しいな', example:'I could use a weekend like that myself.'},
      {word:'congrats on ~ing', pron:'/kənˈɡræts ɒn/', meaning:'〜おめでとう', example:'Congrats on getting that report finished.'},
      {word:'that must have been a lot of work', pron:'/ðæt mʌst həv bɪn ə lɒt əv wɜːrk/', meaning:'それは大変でしたね', example:'That must have been a lot of work.'},
      {word:'catch up', pron:'/kætʃ ʌp/', meaning:'近況を話す・話の続きをする', example:'We can catch up more afterward.'},
      {word:'go ahead and ~', pron:'/ɡoʊ əˈhɛd ænd/', meaning:'それでは〜しましょう', example:"Let's go ahead and get started."}
    ],
    analyzed: {
      sentences: [
        {en:"Hey, good to see you!", ja:"やあ、会えて嬉しいです!", difficulty:"easy", hint:{words:['good to see you']}, explanation:"Hi/Helloより一歩踏み込んだ親しみのある挨拶。会議の前の雑談の定番の切り出し。", ipa:"/heɪ ɡʊd tu siː ju/", note:{scene:"オンライン会議の開始前、雑談で声をかける場面", nuance:"Hiより親しみを込めたカジュアルな挨拶。久しぶりの相手にも使える", alt:"Hey, nice to see you!", caution:"初対面にはHey, nice to meet you(seeではなくmeet)を使う"}},
        {en:"How was your weekend?", ja:"週末はどうでしたか。"},
        {en:"That sounds really nice, actually — I could use a weekend like that myself.", ja:"それは本当に良さそうですね。私もそんな週末が欲しいくらいです。"},
        {en:"Things have been pretty busy on my end.", ja:"私の方はかなり忙しくしていました。"},
        {en:"By the way, congrats on getting that report finished.", ja:"ところで、レポートが完成したとのこと、おめでとうございます。"},
        {en:"That must have been a lot of work.", ja:"それは大変でしたね。", difficulty:"easy", hint:{words:['must have been','a lot of work']}, explanation:"must have + 過去分詞は「〜だったに違いない」という過去への推量。相手の苦労に共感する相づちの定番フレーズ。", ipa:"/ðæt mʌst həv bɪn ə lɒt əv wɜːrk/", note:{scene:"相手の頑張りや苦労をねぎらう相づちの場面", nuance:"お疲れ様ですに近い共感の表現。会話を弾ませる一言", alt:"That sounds like it took a lot of effort.", caution:"must have beenは過去の出来事への推量。現在のことにはmust beを使う"}},
        {en:"Anyway, I think the others are joining now, so let's go ahead and get started.", ja:"それでは、他の方々も参加されたようなので、始めましょう。", difficulty:"medium", hint:{words:['go ahead and','joining now'],opening:'Anyway, I'}, explanation:"go ahead and doは「それでは〜しましょう」と行動に移る合図。Anywayは雑談から本題に話を戻す時の定番のつなぎ言葉。"},
        {en:"We can catch up more afterward.", ja:"続きはまた後で話しましょう。"}
      ],
      pronunciationTips: [
        "actually: AC-tu-al-ly。ACにアクセント、4音節で区切って練習。",
        "congrats: con-GRATS。GRATSを強く、カジュアルな短縮形。",
        "catch up: CATCH UP。tの破裂音をしっかり。",
        "go ahead and: andは弱く「ン」に近い音になる。"
      ]
    }
  },
];
  // 2026-11-26: 実際の個人旅行の内容(宿泊先・氏名等)を含むため、データリポジトリ側の
  // data/personal-scripts.json から認証後に取得してこの配列へ追加する(loadPersonalScripts参照)。
  var TRAVEL_SCRIPTS = [];

  var PASS_THRESHOLD = { reading: 65, shadowing: 70 };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var scriptProgress = {};
  var loaded = false;
  var practiceCategory = 'business';
  var editingList = false;
  var businessOrder = JSON.parse(localStorage.getItem('practice_order') || 'null') || SCRIPTS.map(function (s) { return s.id; });
  var businessHidden = JSON.parse(localStorage.getItem('practice_hidden') || '[]');

  // ── detail-sheet state ──
  var openScript = null;
  var practiceMode = 'shadow'; // shadow | readaloud | listen
  var rate = 0.7;
  var showMeaning = false;
  var isRec = false, mediaRec = null, recChunks = [], recMimeType = '';
  var lastRecDataUrl = '';
  var isPlaying = false;
  var synth = window.speechSynthesis;

  function findScript(id) {
    return SCRIPTS.find(function (s) { return s.id === id; }) || TRAVEL_SCRIPTS.find(function (s) { return s.id === id; }) || null;
  }

  // ホームの「今日の1セット」3枠目(発音/リスニング)用(2026-11-22追加)。未練習のスクリプトを
  // 優先、全て練習済みならスコアが低いものを優先する。scriptProgressが未ロードの場合は
  // 単純に先頭を返す(ホームが会話タブより先に表示されるため、まだ読み込めていないことがある)。
  function pickScriptFor(category) {
    var pool = category === 'travel' ? TRAVEL_SCRIPTS : SCRIPTS;
    if (!pool.length) return null;
    var ranked = pool.map(function (s) {
      var sp = scriptProgress[s.id] || {};
      return { id: s.id, title: s.title, practiced: sp.lastScore != null, lastScore: sp.lastScore != null ? sp.lastScore : -1 };
    });
    ranked.sort(function (a, b) {
      if (a.practiced !== b.practiced) return a.practiced ? 1 : -1;
      return a.lastScore - b.lastScore;
    });
    return ranked[0];
  }

  // 2026-11-26: 実際の個人旅行(宿泊先・氏名)や社内の人名を含むスクリプト(sop-status-report、
  // 旅行スクリプト一式)は、ソースコードから分離してdata/personal-scripts.jsonに移し、
  // ログイン後にここで取得してSCRIPTS/TRAVEL_SCRIPTSへ追加する(公開リポジトリ側のJSには
  // 個人情報を含めない)。取得できなくても(未ログイン・ファイル未作成等)空のまま進める。
  // ホームの今日のフレーズ等(会話タブを開く前)でも使えるようモジュール読み込み時点で
  // 先に取得を始めるのと、会話タブを開いた時のloadProgress()の両方から呼ばれるため、
  // Promiseをキャッシュして一度しかfetch・mergeしないようにする。
  var personalScriptsPromise = null;
  function loadPersonalScripts() {
    if (!personalScriptsPromise) {
      personalScriptsPromise = S.apiGetJson('data/personal-scripts.json').then(function (obj) {
        var items = (obj && obj.scripts) || [];
        items.forEach(function (s) {
          if (s.category === 'travel') TRAVEL_SCRIPTS.push(s);
          else SCRIPTS.push(s);
        });
      }).catch(function () {});
    }
    return personalScriptsPromise;
  }
  loadPersonalScripts();
  function loadProgress() {
    return Promise.all([
      S.apiGetJson('data/progress.json').then(function (obj) {
        scriptProgress = (obj && obj.scriptProgress) || {};
      }).catch(function () {}),
      loadPersonalScripts(),
    ]).then(function () { loaded = true; });
  }

  // ── LIST ──
  function scoreLabelFor(s) {
    var sp = scriptProgress[s.id] || {};
    return sp.lastScore != null ? sp.lastScore + '点' : '未挑戦';
  }
  function businessCardHtml(s, editable) {
    var sp = scriptProgress[s.id] || {};
    var badges = (sp.readCleared ? '<span class="tag tag-outline" style="margin-right:4px">音読✓</span>' : '') + (sp.shadCleared ? '<span class="tag tag-outline">シャドー✓</span>' : '');
    if (editable) {
      var hidden = businessHidden.indexOf(s.id) !== -1;
      return '<div style="display:flex;align-items:center;gap:8px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:10px 12px;opacity:' + (hidden ? 0.45 : 1) + '">'
        + '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.title) + '</div></div>'
        + '<div style="display:flex;gap:4px;flex-shrink:0">'
        + '<button class="btn btn-icon btn-ghost" style="width:28px;height:28px" onclick="PracticeTab.moveScript(\'' + s.id + '\',-1)">↑</button>'
        + '<button class="btn btn-icon btn-ghost" style="width:28px;height:28px" onclick="PracticeTab.moveScript(\'' + s.id + '\',1)">↓</button>'
        + '<button class="btn btn-icon btn-ghost" style="width:28px;height:28px" onclick="PracticeTab.toggleHidden(\'' + s.id + '\')">' + S.icon(hidden ? 'eyeOff' : 'eye', 15) + '</button>'
        + '</div></div>';
    }
    return '<button onclick="PracticeTab.openScript(\'' + s.id + '\')" style="display:flex;align-items:center;gap:12px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:14px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;width:100%">'
      + '<div style="flex:1"><div style="font-size:15px;font-weight:500">' + esc(s.title) + '</div><div style="margin-top:4px">' + badges + '</div></div>'
      + '<div style="font-size:13px;color:var(--color-accent-300);font-weight:500;white-space:nowrap">' + scoreLabelFor(s) + '</div></button>';
  }
  function travelCardHtml(s) {
    return '<button onclick="PracticeTab.openScript(\'' + s.id + '\')" style="display:flex;align-items:center;gap:12px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:14px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;width:100%">'
      + '<div style="flex:1"><div style="font-size:15px;font-weight:500">' + esc(s.title) + '</div><div style="font-size:12px;color:var(--color-neutral-400)">' + esc(s.en) + '</div></div>'
      + '<div style="font-size:13px;color:var(--color-accent-300);font-weight:500;white-space:nowrap">' + scoreLabelFor(s) + '</div></button>';
  }

  function renderList() {
    var el = document.getElementById('tab-practice');
    if (!loaded) { el.innerHTML = '<div class="card"><div style="padding:24px;text-align:center;color:var(--color-neutral-400)">読み込み中…</div></div>'; loadProgress().then(renderList); return; }

    var pending = window.App.state.pendingOpenScriptId;
    if (pending) { window.App.state.pendingOpenScriptId = null; openScriptDetail(pending); return; }
    if (openScript) { renderDetail(); return; }

    var pendingCat = window.App.state.pendingPracticeCategory;
    if (pendingCat) { window.App.state.pendingPracticeCategory = null; practiceCategory = pendingCat; }

    var order = businessOrder.filter(function (id) { return SCRIPTS.some(function (s) { return s.id === id; }); });
    SCRIPTS.forEach(function (s) { if (order.indexOf(s.id) === -1) order.push(s.id); });
    var ordered = order.map(function (id) { return SCRIPTS.find(function (s) { return s.id === id; }); }).filter(Boolean);
    var visible = ordered.filter(function (s) { return businessHidden.indexOf(s.id) === -1; });

    var html = '<div style="display:flex;align-items:flex-start;justify-content:space-between">'
      + '<div><div style="font-weight:600;font-size:24px">会話練習</div><div style="font-size:13px;color:var(--color-neutral-400);margin-top:2px">シャドーイング練習</div></div>'
      + (practiceCategory === 'business' ? '<button class="btn btn-secondary" style="flex-shrink:0;padding:6px 12px;font-size:12px" onclick="PracticeTab.toggleEditList()">' + (editingList ? '完了' : '編集') + '</button>' : '')
      + '</div>';

    html += '<div style="display:flex;gap:6px;margin-top:4px">'
      + catChip('business', 'ビジネス英語', SCRIPTS.length) + catChip('travel', '旅行英語', TRAVEL_SCRIPTS.length) + '</div>';

    if (practiceCategory === 'business') {
      html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">'
        + (editingList ? ordered.map(function (s) { return businessCardHtml(s, true); }).join('') : visible.map(function (s) { return businessCardHtml(s, false); }).join(''))
        + '</div>';
    } else {
      if (S.profile && S.profile.nextTripShort) {
        html += '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:4px">' + esc(S.profile.nextTripShort) + '</div>';
      }
      html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">' + TRAVEL_SCRIPTS.map(travelCardHtml).join('') + '</div>';
    }
    el.innerHTML = html;
  }
  function catChip(v, label, n) {
    var active = practiceCategory === v;
    return '<button onclick="PracticeTab.setCategory(\'' + v + '\')" style="display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:999px;font-size:12.5px;border:1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-neutral-700)') + ';background:' + (active ? 'var(--color-accent-800)' : 'transparent') + ';color:' + (active ? 'var(--color-text)' : 'var(--color-neutral-300)') + ';cursor:pointer;white-space:nowrap;font-family:inherit">' + label + ' <span style="font-size:10.5px;color:var(--color-neutral-400)">' + n + '</span></button>';
  }

  function setCategory(v) { practiceCategory = v; editingList = false; renderList(); }
  function toggleEditList() { editingList = !editingList; renderList(); }
  function moveScript(id, dir) {
    var i = businessOrder.indexOf(id);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= businessOrder.length) return;
    var tmp = businessOrder[i]; businessOrder[i] = businessOrder[j]; businessOrder[j] = tmp;
    localStorage.setItem('practice_order', JSON.stringify(businessOrder));
    renderList();
  }
  function toggleHidden(id) {
    var i = businessHidden.indexOf(id);
    if (i === -1) businessHidden.push(id); else businessHidden.splice(i, 1);
    localStorage.setItem('practice_hidden', JSON.stringify(businessHidden));
    renderList();
  }

  // ── DETAIL ──
  function openScriptDetail(id) {
    var s = findScript(id);
    if (!s) { App.toast('スクリプトが見つかりません'); return; }
    openScript = s;
    var pendingMode = window.App.state.pendingPracticeMode;
    window.App.state.pendingPracticeMode = null;
    practiceMode = pendingMode || 'shadow'; showMeaning = false; lastRecDataUrl = ''; isRec = false; isPlaying = false;
    renderList();
  }
  function closeScript() {
    synth.cancel(); isPlaying = false;
    openScript = null;
    renderList();
  }

  function wordSpansHtml(s) {
    var groups = s.breathGroups || [];
    var flatWords = [];
    groups.forEach(function (g, gi) {
      g.split(/\s+/).forEach(function (w) { flatWords.push(w); });
      if (gi < groups.length - 1) flatWords.push('/');
    });
    return flatWords.map(function (w, i) {
      // 2026-11-25(Famiの指摘): --color-neutral-600は背景色に近いダーク/ライト両方で
      // ほぼ見えない配色だった(ダークでは暗すぎ、逆にライトでは薄すぎて同じ理由で
      // 見えない)。本文より控えめだが一目で分かるよう、既存のアクセント系の
      // 控えめトーン(--color-accent-300、リンクや発音記号にも使用)+太めに変更。
      // 前後の余白は広げていたが、Famiの指摘で元のmargin:0 2pxに戻した。
      if (w === '/') return '<span class="word-slash" style="color:var(--color-accent-300);font-weight:600;margin:0 2px">/</span>';
      return '<span class="word" data-i="' + i + '" style="border-radius:4px;padding:0 2px;transition:background .15s">' + esc(w) + '</span>';
    }).join(' ');
  }

  function meaningSectionHtml(s) {
    if (!showMeaning) return '';
    var sents = (s.analyzed && s.analyzed.sentences || []).map(function (x) {
      return '<div style="margin-bottom:8px"><div style="font-size:14px">' + esc(x.en) + '</div><div style="font-size:12px;color:var(--color-neutral-400);margin-top:2px">' + esc(x.ja) + '</div></div>';
    }).join('');
    var voc = (s.vocab || []).map(function (v) {
      return '<div style="margin-bottom:8px"><div style="font-size:13px;font-weight:500">' + esc(v.word) + '</div>'
        + '<div style="font-size:11px;color:var(--color-accent-300)">' + esc(v.pron || '') + '</div>'
        + '<div style="font-size:12px;color:var(--color-neutral-300)">' + esc(v.meaning) + '</div>'
        + (v.example ? '<div style="font-size:11px;color:var(--color-neutral-400);font-style:italic">"' + esc(v.example) + '"</div>' : '') + '</div>';
    }).join('');
    var tips = (s.analyzed && s.analyzed.pronunciationTips || []).map(function (t) { return '<div style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--color-neutral-300);padding:4px 0"><span style="flex-shrink:0;margin-top:1px;color:var(--color-accent-300)">' + S.icon('target', 12) + '</span>' + esc(t) + '</div>'; }).join('');
    return '<div class="card" style="margin-top:10px"><div class="card-kicker">文ごとの日本語訳</div>' + sents
      + '<div class="card-kicker" style="margin-top:10px">重要単語・イディオム</div>' + voc
      + '<div class="card-kicker" style="margin-top:10px">発音ポイント</div>' + tips + '</div>';
  }

  function renderDetail() {
    var el = document.getElementById('tab-practice');
    var s = openScript;
    var sp = scriptProgress[s.id] || {};
    var modeDefs = [{ v: 'shadow', label: 'シャドーイング' }, { v: 'readaloud', label: '音読（録音）' }, { v: 'listen', label: '再生のみ' }];
    var modeHtml = '<div class="seg" style="display:flex">' + modeDefs.map(function (m) {
      return '<button class="seg-opt" data-active="' + (practiceMode === m.v) + '" onclick="PracticeTab.setMode(\'' + m.v + '\')">' + m.label + '</button>';
    }).join('') + '</div>';
    var rateHtml = '<div class="seg" style="display:flex">' + [0.5, 0.7, 1.0, 1.2].map(function (r) {
      return '<button class="seg-opt" data-active="' + (rate === r) + '" onclick="PracticeTab.setRate(' + r + ')">' + r + 'x</button>';
    }).join('') + '</div>';

    var actionBtn;
    if (practiceMode === 'listen') {
      actionBtn = '<button onclick="PracticeTab.togglePlay()" style="width:52px;height:52px;border-radius:50%;border:2px solid var(--color-accent);background:' + (isPlaying ? 'var(--color-accent-800)' : 'transparent') + ';cursor:pointer">' + (isPlaying ? '⏸' : '▶') + '</button>';
    } else {
      actionBtn = '<button onclick="PracticeTab.toggleRec()" style="width:52px;height:52px;border-radius:50%;border:2px solid var(--color-accent);background:' + (isRec ? 'var(--color-accent-800)' : 'transparent') + ';cursor:pointer">' + (isRec ? '⏹' : '●') + '</button>';
    }
    var recordLabel = practiceMode === 'listen' ? (isPlaying ? '再生中…（タップで停止）' : 'タップして再生')
      : (isRec ? '録音中…（タップで停止）' : (practiceMode === 'readaloud' ? 'タップして音読を録音' : '再生と同時に録音（イヤホン推奨）'));

    var html = '<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      + '<div><div style="font-size:18px;font-weight:500">' + esc(s.title) + '</div>'
      + (sp.lastScore != null ? '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:2px">前回スコア ' + sp.lastScore + '点</div>' : '') + '</div>'
      + '<button class="btn btn-icon btn-ghost" onclick="PracticeTab.closeScript()">×</button></div>';

    html += '<button onclick="PracticeTab.toggleMeaning()" style="margin-top:8px;background:none;border:none;color:var(--color-accent-300);font-size:12px;cursor:pointer;padding:0;text-align:left">' + (showMeaning ? '▴ 意味・訳を隠す' : '▾ 意味・訳を見る') + '</button>';
    html += meaningSectionHtml(s);

    html += '<div id="pt-words" class="sel-dict" style="font-size:16px;line-height:2.1;color:var(--color-neutral-200);margin-top:14px">' + wordSpansHtml(s) + '</div>';

    html += '<div id="pt-feedback"></div>';

    html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;padding-top:12px;border-top:1px solid var(--color-neutral-800)">'
      + modeHtml + '<div style="display:flex;align-items:center;gap:12px">' + rateHtml + actionBtn + '</div>'
      + '<div style="font-size:11px;color:var(--color-neutral-400);text-align:center">' + recordLabel + '</div></div>';

    el.innerHTML = html;
  }

  function setMode(m) { synth.cancel(); isPlaying = false; isRec = false; practiceMode = m; document.getElementById('pt-feedback').innerHTML = ''; renderDetail(); }
  function setRate(r) { rate = r; if (isPlaying) { synth.cancel(); isPlaying = false; } renderDetail(); }
  function toggleMeaning() { showMeaning = !showMeaning; renderDetail(); }

  // ── playback + highlight (ported: doSpeak / highlightWord) ──
  function highlightWord(idx) {
    var wels = document.querySelectorAll('#pt-words .word');
    wels.forEach(function (el, i) {
      if (i < idx) { el.style.background = 'transparent'; el.style.color = 'var(--color-neutral-500)'; }
      else if (i === idx) { el.style.background = 'var(--color-accent-700)'; el.style.color = 'var(--color-text)'; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      else { el.style.background = 'transparent'; el.style.color = 'var(--color-neutral-200)'; }
    });
  }
  function doSpeak() {
    if (!openScript) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(openScript.raw);
    u.rate = rate; u.lang = 'en-US';
    var map = [], ci = 0;
    openScript.raw.trim().split(/(\s+)/).forEach(function (token) {
      if (/\S/.test(token)) map.push({ s: ci, e: ci + token.length });
      ci += token.length;
    });
    u.onboundary = function (e) {
      if (e.name && e.name !== 'word') return;
      var idx = 0;
      for (var i = 0; i < map.length; i++) { if (map[i].s <= e.charIndex) idx = i; else break; }
      highlightWord(idx);
    };
    u.onend = function () { isPlaying = false; renderDetail(); };
    synth.speak(u);
    isPlaying = true;
  }
  function togglePlay() {
    if (isPlaying) { synth.cancel(); isPlaying = false; renderDetail(); return; }
    doSpeak(); renderDetail();
  }

  // ── recording (ported: startRec / stopRec / onRecReady / autoSaveRecording) ──
  function toggleRec() { if (isRec) stopRec(); else startRec(); }
  function startRec() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      recChunks = [];
      var types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
      recMimeType = '';
      for (var i = 0; i < types.length; i++) { if (MediaRecorder.isTypeSupported(types[i])) { recMimeType = types[i]; break; } }
      mediaRec = new MediaRecorder(stream, recMimeType ? { mimeType: recMimeType } : {});
      mediaRec.ondataavailable = function (e) { if (e.data && e.data.size > 0) recChunks.push(e.data); };
      mediaRec.onstop = function () { stream.getTracks().forEach(function (t) { t.stop(); }); setTimeout(onRecReady, 300); };
      // 2026-11-25: 瞬発力ドリルの音声採点がiOS実機で応答なしになった調査の一環で、
      // start()のtimeslice指定(分割録音→チャンク結合)がiOS WebKitのaudio/mp4で
      // メタデータ破損の原因になり得ることが分かったため、ここも.stop()時に1回だけ
      // 完全なBlobを受け取る形に合わせて統一した。
      mediaRec.start();
      isRec = true;
      renderDetail();
      if (practiceMode === 'shadow' && !isPlaying) doSpeak();
    }).catch(function () { App.toast('マイクへのアクセスを許可してください'); });
  }
  function stopRec() {
    if (mediaRec && isRec) {
      // requestData()の事前呼び出しは、start()のtimeslice指定と同じ理由で
      // ファイル断片化を招きうるため削除。stop()自体が最後にdataavailableを
      // 1回発火させるので、完全な1個のBlobだけを受け取る。
      mediaRec.stop();
      isRec = false;
      renderDetail();
    }
  }
  function onRecReady() {
    var totalSize = recChunks.reduce(function (s, c) { return s + c.size; }, 0);
    var fb = document.getElementById('pt-feedback');
    if (!fb) return;
    if (totalSize === 0) { fb.innerHTML = '<div class="card" style="margin-top:10px;color:var(--color-error);font-size:13px">録音データが空です。もう一度録音してください。</div>'; return; }
    var mtype = recMimeType || 'audio/webm';
    var blob = new Blob(recChunks, { type: mtype });
    var reader = new FileReader();
    reader.onload = function () {
      lastRecDataUrl = reader.result;
      var evalMode = practiceMode === 'shadow' ? 'shadowing' : 'reading';
      fb.innerHTML = '<div class="card" style="margin-top:10px">'
        + '<audio controls style="width:100%;height:36px" src="' + lastRecDataUrl + '"></audio>'
        + '<div style="display:flex;gap:8px;margin-top:8px">'
        + '<button class="btn btn-secondary" style="flex:1" onclick="PracticeTab.retryRec()">録り直す</button>'
        + '<button class="btn btn-primary" style="flex:1" onclick="PracticeTab.evalRec(\'' + evalMode + '\')">AI評価する</button>'
        + '</div></div>';
      autoSaveRecording(evalMode);
    };
    reader.readAsDataURL(blob);
  }
  function retryRec() { recChunks = []; document.getElementById('pt-feedback').innerHTML = ''; }
  function autoSaveRecording(mode) {
    if (!S.GH_TOKEN) return;
    var totalSize = recChunks.reduce(function (s, c) { return s + c.size; }, 0);
    if (totalSize === 0) return;
    var mtype = recMimeType || 'audio/webm';
    var blob = new Blob(recChunks, { type: mtype });
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var ext = mtype.indexOf('mp4') !== -1 ? 'm4a' : mtype.indexOf('ogg') !== -1 ? 'ogg' : 'webm';
    var fname = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '-' + pad(now.getHours()) + '-' + pad(now.getMinutes()) + '-' + openScript.id + '-' + mode + '.' + ext;
    var reader = new FileReader();
    reader.onload = function () {
      var b64 = reader.result.split(',')[1];
      S.apiPutBinary('recordings/' + fname, b64, '🎤 録音: ' + fname).catch(function () {});
    };
    reader.readAsDataURL(blob);
  }

  function selfEvalButtonsHtml(mode) {
    return '<button class="btn btn-secondary" style="flex:1;font-size:12.5px;font-weight:600;gap:6px" onclick="PracticeTab.selfEval(\'bad\',\'' + mode + '\')">' + S.icon('frown', 19, '', 2.2) + '難しい</button>'
      + '<button class="btn btn-secondary" style="flex:1;font-size:12.5px;font-weight:600;gap:6px" onclick="PracticeTab.selfEval(\'ok\',\'' + mode + '\')">' + S.icon('meh', 19, '', 2.2) + 'まあまあ</button>'
      + '<button class="btn btn-primary" style="flex:1;font-size:12.5px;font-weight:600;gap:6px" onclick="PracticeTab.selfEval(\'good\',\'' + mode + '\')">' + S.icon('smile', 19, '', 2.2) + 'できた</button>';
  }

  // ── AI evaluation (ported verbatim: evalRec prompt / showAIFeedback) ──
  function evalRec(mode) {
    var fb = document.getElementById('pt-feedback');
    if (!S.GEM_KEY) {
      fb.innerHTML = '<div class="card" style="margin-top:10px">'
        + '<div style="font-size:12px;color:var(--color-warning);margin-bottom:8px">GeminiキーがURLにありません（自己評価で記録します）</div>'
        + '<div style="display:flex;gap:8px">' + selfEvalButtonsHtml(mode)
        + '</div></div>';
      return;
    }
    fb.innerHTML = '<div class="card" style="margin-top:10px;text-align:center;color:var(--color-neutral-400);font-size:13px">Gemini AI評価中…</div>';
    var mtype = recMimeType || 'audio/webm';
    var blob = new Blob(recChunks, { type: mtype });
    var reader = new FileReader();
    reader.onload = function () {
      var b64 = reader.result.split(',')[1];
      var scriptText = openScript.raw;
      var promptText = 'You are an English pronunciation coach evaluating a Japanese English learner.\n'
        + 'This speaker is a Japanese native learning practical English (business or travel context).\n'
        + 'Mode: ' + mode + '. Full script text the speaker is reading/shadowing:\n"' + scriptText + '"\n\n'
        + 'Scoring criteria for Japanese learners (anchor on intelligibility, not native-level polish):\n'
        + '- 85+: Excellent, near-native rhythm and pronunciation\n'
        + '- 70-84: Good — message is clear and understandable, even with a noticeable Japanese accent or 1-3 recurring sound substitutions (e.g. th/v/r/l). This should be the typical/expected range for an intelligible reading, not a rare high score.\n'
        + '- 55-69: Some effort needed to follow — several recurring issues, but the message still gets across overall\n'
        + '- Below 55: A listener without the script would struggle to follow\n\n'
        + 'Do NOT penalize for Japanese accent or for 1-3 recurring sound substitutions if the message is otherwise clear.\n'
        + 'Consistency check (important): your score MUST match your own strengths text. '
        + 'If anything in strengths says the speech is clear/easy to understand/good pace, the score must be 70 or above. '
        + 'Never write positive strengths and then give a below-70 score — pick language and score that agree with each other.\n\n'
        + 'Return ONLY valid JSON, no markdown:\n'
        + '{"score":0,"passed":false,"scoreLabel":"Good","strengths":["具体的な良かった点（スクリプトの単語を引用）"],"improvements":["具体的な改善点（どの単語をどう直すか。音節表記例: eu-RO-pe-an）","改善点2"],"nextStepAdvice":"次の練習で1つだけ意識すること","canAdvance":false}\n\n'
        + '- score: REQUIRED. Must be a JSON number (not a string, not null, never omitted), an integer 0-100 per the criteria above\n'
        + '- passed=true and canAdvance=true if score>=65(reading) or score>=70(shadowing)\n'
        + '- Write ALL values in Japanese except score/passed/canAdvance which are number/boolean\n'
        + '- For pronunciation improvements: word: syl-LA-ble (uppercase = stress). Example: "European: eu-RO-pe-an。ROに強勢。"\n'
        + '- Katakana-only explanations are forbidden; pairing with syllable notation is OK\n'
        + '- Never write comparisons like "AではなくA" where both sides are identical';
      var payload = { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: mtype, data: b64 } }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } } };
      S.callGeminiWithFallback(payload).then(function (data) {
        if (data.error) throw new Error(data.error.message || 'Gemini error');
        if (!data.candidates || !data.candidates[0]) throw new Error('レスポンスなし');
        var txt = data.candidates[0].content.parts[0].text || '';
        var result = S.parseJsonFromModelText(txt);
        if (!result || typeof result.score !== 'number') throw new Error('AIの応答が不完全でした（スコアなし）');
        result.passed = result.score >= PASS_THRESHOLD[mode];
        result.canAdvance = result.passed;
        showAIFeedback(result, mode);
      }).catch(function (e) {
        fb.innerHTML = '<div class="card" style="margin-top:10px">'
          + '<div style="display:flex;align-items:flex-start;gap:6px;font-size:13px;color:var(--color-error);margin-bottom:8px"><span style="flex-shrink:0;margin-top:1px">' + S.icon('alertTriangle', 14) + '</span>AI評価エラー: ' + esc(e.message || '不明なエラー') + '</div>'
          + '<div style="display:flex;gap:8px">' + selfEvalButtonsHtml(mode)
          + '</div></div>';
      });
    };
    reader.readAsDataURL(blob);
  }
  function selfEval(lv, mode) {
    var score = lv === 'good' ? 85 : lv === 'ok' ? 65 : 45;
    var passed = lv !== 'bad';
    showAIFeedback({
      score: score, passed: passed, scoreLabel: lv === 'good' ? 'Great!' : lv === 'ok' ? 'Good' : 'Keep Going',
      strengths: [lv === 'good' ? 'スムーズに話せました' : lv === 'ok' ? '概ね理解しながら話せました' : '基礎を固めましょう'],
      improvements: [lv === 'good' ? 'さらに速度を上げてみましょう' : lv === 'ok' ? 'もう数回繰り返して定着させましょう' : '意味確認に戻って再度練習しましょう'],
      nextStepAdvice: lv === 'good' ? '次のスクリプトか速度アップに挑戦！' : 'もう2〜3回練習してから次へ進みましょう',
      canAdvance: passed,
    }, mode);
  }
  function showAIFeedback(r, mode) {
    var fb = document.getElementById('pt-feedback');
    var col = r.score >= 75 ? 'var(--color-success)' : r.score >= 55 ? 'var(--color-warning)' : 'var(--color-error)';
    // Improvements get a left accent bar rather than full-line color — text color there
    // (green/amber/red) already means pass/borderline/fail for scores elsewhere in the
    // app, so coloring the whole sentence the same way reads as a score judgment.
    var str = (r.strengths || []).map(function (s) { return '<li style="display:flex;gap:5px;align-items:flex-start"><span style="flex-shrink:0;margin-top:2px;color:var(--color-success)">' + S.icon('check', 12) + '</span>' + esc(s) + '</li>'; }).join('');
    var imp = (r.improvements || []).map(function (s) { return '<li style="list-style:none;margin-left:-18px;padding:2px 0 2px 10px;border-left:3px solid var(--color-accent);display:flex;gap:5px;align-items:flex-start"><span style="flex-shrink:0;margin-top:2px;color:var(--color-accent-300)">' + S.icon('lightbulb', 12) + '</span>' + esc(s) + '</li>'; }).join('');
    var advance = r.canAdvance ? '<div style="display:flex;align-items:center;gap:6px;color:var(--color-success);font-size:13px;font-weight:500;margin-top:8px">' + S.icon('star', 15) + 'クリア！</div>' : '<div style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--color-neutral-400);margin-top:8px"><span style="flex-shrink:0;margin-top:1px">' + S.icon('arrowRight', 13) + '</span>' + esc(r.nextStepAdvice || '') + '</div>';
    fb.innerHTML = '<div class="card" style="margin-top:10px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:44px;height:44px;border-radius:50%;background:' + col + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600">' + r.score + '</div>'
      + '<div><div style="font-weight:500">' + esc(r.scoreLabel || '') + '</div><div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--color-neutral-400)">' + (r.passed ? S.icon('check', 12) + 'クリア' : '練習を続けましょう') + '</div></div></div>'
      + '<ul style="font-size:12px;line-height:1.8;padding-left:18px;margin:10px 0 0">' + str + imp + '</ul>' + advance + '</div>';

    if (r.passed) {
      if (!scriptProgress[openScript.id]) scriptProgress[openScript.id] = {};
      var sp = scriptProgress[openScript.id];
      sp.lastScore = r.score; sp.lastDate = S.todayStr();
      if (mode === 'reading') sp.readCleared = true;
      if (mode === 'shadowing') sp.shadCleared = true;
      sp.readOk = (sp.readOk || 0) + (mode === 'reading' ? 1 : 0);
      sp.shadOk = (sp.shadOk || 0) + (mode === 'shadowing' ? 1 : 0);
      if (S.GH_TOKEN) {
        S.apiPutJson('data/progress.json', function (obj) {
          obj = obj || {}; obj.scriptProgress = scriptProgress; return obj;
        }, '📊 progress: ' + S.todayStr()).then(function () { markDailyTask('shadowing'); }).catch(function () {});
      }
    }
  }
  function markDailyTask(key) {
    if (!S.GH_TOKEN) return;
    var today = S.todayStr();
    S.apiPutJson('data/progress.json', function (obj) {
      obj = obj || {};
      if (!obj.dailyTasks) obj.dailyTasks = {};
      if (!obj.dailyTasks[today]) obj.dailyTasks[today] = {};
      obj.dailyTasks[today][key] = true;
      return obj;
    }, '✅ タスク完了: ' + key).catch(function () {});
  }

  // ホームの瞬発力ミニドリル向け、短い日常/仕事フレーズ(2026-11-22追加)。
  // 単語帳の既習語レベルを前提にした「やさしい」難度専用の出題。会話タブの
  // シャドーイング対象スクリプトではないため、SCRIPTS/TRAVEL_SCRIPTSには含めない。
  var EASY_DRILL_SENTENCES = [
    { en: "I'll send you the file by tomorrow.", ja: "明日までにファイルをお送りします。", difficulty: 'easy',
      hint: { words: ['send', 'file', 'tomorrow'], opening: "I'll send" },
      explanation: "by tomorrowは「明日までに」という締め切りを表す。send A B(Aに人、Bに物)の形。日本語の「〜を送ります」はsend the file to youとしがちだが、口語では人を先に置く形の方が自然。",ipa:"/aɪl sɛnd ju ðə faɪl baɪ təˈmorəʊ/",note:{"scene":"仕事の約束・締め切りを伝える場面","nuance":"byで「それまでに」を示し、期限を守る姿勢が伝わる","alt":"I'll get the file to you by tomorrow.","caution":"by tomorrowとuntil tomorrowを混同しない(untilは「続ける」の意味)"} },
    { en: 'Could you check this when you have a moment?', ja: 'お手すきの際にご確認いただけますか。', difficulty: 'easy',
      hint: { words: ['check', 'moment'], opening: 'Could you check' },
      explanation: 'when you have a momentは「お手すきの際に」にあたる柔らかい依頼表現。Could you ~?の丁寧な依頼と組み合わせ、「今すぐでなくて良い」というニュアンスを伝える決まり文句。',ipa:"/kʊd ju tʃɛk ðɪs wɛn ju hæv ə ˈmoʊmənt/",note:{"scene":"急ぎでない依頼を柔らかく伝えたい時","nuance":"相手の都合を尊重する丁寧な依頼","alt":"Whenever you get a chance, could you take a look at this?","caution":"急ぎの場合は使わず、ASAP/as soon as possibleを使う"} },
    { en: 'I think we should align on the schedule first.', ja: 'まずスケジュールについて認識を合わせるべきだと思います。', difficulty: 'easy',
      hint: { words: ['align', 'schedule', 'first'], opening: 'I think we' },
      explanation: 'align on Xは「Xについて認識を合わせる」。ビジネスで頻出。日本語の「合わせる」はmatchやadjustにしがちだが、意見や方針の一致にはalignが自然。',ipa:"/aɪ θɪŋk wi ʃʊd əˈlaɪn ɒn ðə ˈʃɛdjuːl fɜːrst/",note:{"scene":"会議で進める前に意見を合わせたい場面","nuance":"一方的な指示ではなく柔らかい提案として伝わる","alt":"Let's make sure we're on the same page about the schedule.","caution":"alignは自動詞でalign onの形。align the scheduleとはしない"} },
    { en: 'Let me get back to you by end of day.', ja: '今日中に折り返しご連絡します。', difficulty: 'easy',
      hint: { words: ['get back', 'end of day'], opening: 'Let me get' },
      explanation: 'get back to youは「折り返し連絡する」の定番表現。by end of day(EOD)は「今日中に」。I will contact you againより短く自然。',ipa:"/lɛt mi gɛt bæk tu ju baɪ ɛnd ɒv deɪ/",note:{"scene":"すぐ答えられない時に期限を示して保留する場面","nuance":"誠実に対応している印象を与える","alt":"I'll follow up with you by EOD.","caution":"end of dayは自分のタイムゾーン基準。時差がある相手には明示する"} },
    { en: 'That sounds good to me.', ja: 'それで良いと思います。', difficulty: 'easy',
      hint: { words: ['sounds good'], opening: 'That sounds' },
      explanation: 'sounds goodは「良さそうだ」という同意の決まり文句。I think that is goodより短くカジュアルで、会議でよく使う。',ipa:"/ðæt saʊndz gʊd tu mi/",note:{"scene":"提案や予定に賛同する場面","nuance":"カジュアルだが会議でも自然に使える同意表現","alt":"Works for me.","caution":"soundsを忘れてThat good to me.としない(文法的に不完全)"} },
    { en: 'Sorry, could you say that again?', ja: 'すみません、もう一度言っていただけますか。', difficulty: 'easy',
      hint: { words: ['say that again'], opening: 'Sorry, could' },
      explanation: '聞き取れなかった時の定番フレーズ。Please repeatより柔らかい。Sorryを先に置き、聞き返す際の印象を和らげる。',ipa:"/ˈsɒri kʊd ju seɪ ðæt əˈgɛn/",note:{"scene":"聞き取れなかった時に聞き返す場面","nuance":"Sorryを添えることで聞き返す際の印象を和らげる","alt":"Sorry, I didn't catch that.","caution":"Whatだけで聞き返すのは唐突で失礼に響くので避ける"} },
    { en: "I'm not sure, let me double-check.", ja: '確信が持てないので、確認させてください。', difficulty: 'easy',
      hint: { words: ['not sure', 'double-check'], opening: "I'm not" },
      explanation: 'double-checkは「再確認する」。分からないことを正直に伝えてから確認する、という誠実な印象を与える定番の流れ。',ipa:"/aɪm nɒt ʃʊr lɛt mi ˈdʊbəl tʃɛk/",note:{"scene":"即答できない質問に正直に答える場面","nuance":"わからないことを隠さず、確認する姿勢を示す","alt":"Let me verify that and get back to you.","caution":"checkだけだと「初めて確認する」意味になりニュアンスが変わる"} },
    { en: 'It depends on the budget.', ja: '予算次第です。', difficulty: 'easy',
      hint: { words: ['depends', 'budget'], opening: 'It depends' },
      explanation: 'It depends on Xは「Xによる、X次第」。日本語の「〜次第です」はdepends onで表すのが最も自然。',ipa:"/ɪt dɪˈpɛndz ɒn ðə ˈbʊdʒɪt/",note:{"scene":"条件次第で答えが変わることを伝える場面","nuance":"即答を避けつつ誠実に状況を説明する言い方","alt":"It really comes down to the budget.","caution":"depend onのonを忘れない(dependsだけでは不完全)"} },
    { en: 'Thanks for your patience.', ja: 'お待たせして申し訳ありません。', difficulty: 'easy',
      hint: { words: ['patience'], opening: 'Thanks for' },
      explanation: '待たせた相手への感謝・詫びの定番表現。Sorry for the waitより前向きなニュアンスで、ビジネスメールや会議の締めによく使う。',ipa:"/θæŋks fɔːr jɔːr ˈpeɪʃəns/",note:{"scene":"相手を待たせた後の感謝・締めの一言","nuance":"Sorryより前向きで、対応が丁寧という印象を与える","alt":"I appreciate your patience.","caution":"発音は「ペイシェンス」。patient(忍耐強い/患者)と混同しない"} },
    { en: "Let's touch base again next week.", ja: '来週また状況を確認しましょう。', difficulty: 'easy',
      hint: { words: ['touch base', 'next week'], opening: "Let's touch" },
      explanation: 'touch baseは「軽く連絡を取り合う、状況確認する」。contact againより自然でカジュアルなビジネス表現。',ipa:"/lɛts tʊtʃ beɪs əˈgɛn nɛkst wiːk/",note:{"scene":"定期的な進捗確認の約束をする場面","nuance":"軽くカジュアルだがビジネスでも自然に使われる","alt":"Let's check in again next week.","caution":"touch baseはtheを入れない(touch the baseとはしない)"} },
  ];
  // ホームの瞬発力ミニドリル向け。会話タブの既存スクリプトの日英対訳
  // (analyzed.sentences、difficulty/chunks/hint/explanationが付与済みのものを優先)
  // +上記の短文バンクをまとめて返す。difficulty未設定の古い文は'hard'扱い、
  // chunks未設定なら文全体を1チャンクとして扱う(呼び出し側で補完)。
  function getSentencePool() {
    var fromScripts = SCRIPTS.concat(TRAVEL_SCRIPTS).reduce(function (acc, s) {
      var sents = (s.analyzed && s.analyzed.sentences) || [];
      sents.forEach(function (x) {
        acc.push({
          en: x.en, ja: x.ja, scriptId: s.id,
          difficulty: x.difficulty || 'hard',
          chunks: x.chunks || null,
          hint: x.hint || null,
          explanation: x.explanation || null,
          ipa: x.ipa || null,
          note: x.note || null,
        });
      });
      return acc;
    }, []);
    var fromEasyBank = EASY_DRILL_SENTENCES.map(function (x) {
      return { en: x.en, ja: x.ja, scriptId: 'custom', difficulty: x.difficulty, chunks: null, hint: x.hint || null, explanation: x.explanation || null, ipa: x.ipa || null, note: x.note || null };
    });
    return fromScripts.concat(fromEasyBank);
  }

  window.PracticeTab = {
    setCategory: setCategory, toggleEditList: toggleEditList, moveScript: moveScript, toggleHidden: toggleHidden,
    openScript: openScriptDetail, closeScript: closeScript, setMode: setMode, setRate: setRate, toggleMeaning: toggleMeaning,
    togglePlay: togglePlay, toggleRec: toggleRec, retryRec: retryRec, evalRec: evalRec, selfEval: selfEval,
    getSentencePool: getSentencePool, pickScriptFor: pickScriptFor,
  };
  App.registerTab('practice', { onShow: renderList });
})();
