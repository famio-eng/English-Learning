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
    id: 'short',
    title: '自己紹介 ショート版（1分）',
    date: '2026-05-24',
    tip: 'regulatory / endoscopic の発音を正確に。リズムを崩さず話す。',
    raw: "Hi, I'm Fami. I've been with the company for about ten years, but I'm relatively new to product development as a project manager\u2014just two years into this role. I'm currently leading a project for an electrosurgical generator used in endoscopic surgery. We're at an exciting stage right now, about to submit applications for regulatory approval across multiple countries. I got my PMP certification earlier this year, so I'm looking forward to taking on more responsibility and driving projects forward. Happy to work with you all.",
    breathGroups: ["Hi, I'm Fami.","I've been with the company","for about ten years,","but I'm relatively new","to product development","as a project manager\u2014","just two years into this role.","I'm currently leading a project","for an electrosurgical generator","used in endoscopic surgery.","We're at an exciting stage right now,","about to submit applications","for regulatory approval","across multiple countries.","I got my PMP certification","earlier this year,","so I'm looking forward","to taking on more responsibility","and driving projects forward.","Happy to work with you all."],
    vocab: [
      {word:'electrosurgical generator',pron:'/\u026a\u02ccl\u025bktro\u028a\u02c8s\u025c\u02d0rd\u0292\u026ak\u0259l \u02c8d\u0292\u025bn\u0259re\u026at\u0259r/',meaning:'\u96fb\u6c17\u5916\u79d1\u7528\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc',example:'We are developing an electrosurgical generator for minimally invasive surgery.'},
      {word:'endoscopic surgery',pron:'/\u02cc\u025bnd\u0259\u02c8sk\u0252p\u026ak \u02c8s\u025c\u02d0rd\u0292\u0259ri/',meaning:'\u5185\u8996\u93e1\u624b\u8853',example:'Endoscopic surgery requires precision instruments.'},
      {word:'regulatory approval',pron:'/\u02ccr\u025b\u0261j\u028al\u0259t\u0254\u02d0ri \u0259\u02c8pru\u02d0v\u0259l/',meaning:'\u898f\u5236\u5f53\u5c40\u306e\u627f\u8a8d',example:'We are preparing for regulatory approval across multiple countries.'},
      {word:'PMP certification',pron:'/s\u025c\u02d0rt\u026af\u026a\u02c8ke\u026a\u0283\u0259n/',meaning:'\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u30de\u30cd\u30b8\u30e1\u30f3\u30c8\u8cc7\u683c\uff08PMP\uff09',example:'I obtained my PMP certification to strengthen my skills.'},
      {word:'driving projects forward',pron:'/\u02c8dra\u026av\u026a\u014b \u02c8pr\u0252d\u0292\u025bkts \u02c8f\u0254\u02d0rw\u0259rd/',meaning:'\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u524d\u9032\u3055\u305b\u308b',example:'Our team is committed to driving the project forward.'},
      {word:'relatively new to',pron:'/\u02c8r\u025bl\u0259t\u026avli nju\u02d0 tu\u02d0/',meaning:'\u301c\u306b\u6bd4\u8f03\u7684\u6163\u308c\u3066\u3044\u306a\u3044',example:'I am relatively new to this industry but eager to learn.'},
      {word:'submit applications',pron:'/s\u0259b\u02c8m\u026at \u02cc\u00e6pl\u026a\u02c8ke\u026a\u0283\u0259nz/',meaning:'\u7533\u8acb\u3092\u63d0\u51fa\u3059\u308b',example:'We plan to submit applications to regulatory bodies next quarter.'}
    ],
    analyzed: {
      sentences: [
        {en:"Hi, I'm Fami.",ja:"\u3053\u3093\u306b\u3061\u306f\u3001Fami\u3068\u7533\u3057\u307e\u3059\u3002"},
        {en:"I've been with the company for about ten years, but I'm relatively new to product development as a project manager\u2014just two years into this role.",ja:"\u5165\u793e\u3057\u3066\u7d0410\u5e74\u306b\u306a\u308a\u307e\u3059\u304c\u3001PM\u3068\u3057\u3066\u306e\u88fd\u54c1\u958b\u767a\u306f\u307e\u3060\u30022\u5e74\u3068\u3001\u6bd4\u8f03\u7684\u65b0\u3057\u3044\u30dd\u30b8\u30b7\u30e7\u30f3\u3067\u3059\u3002"},
        {en:"I'm currently leading a project for an electrosurgical generator used in endoscopic surgery.",ja:"\u73fe\u5728\u3001\u5185\u8996\u93e1\u624b\u8853\u3067\u4f7f\u7528\u3059\u308b\u96fb\u6c17\u5916\u79d1\u7528\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u30ea\u30fc\u30c9\u3057\u3066\u3044\u307e\u3059\u3002"},
        {en:"We're at an exciting stage right now, about to submit applications for regulatory approval across multiple countries.",ja:"\u73fe\u5728\u3001\u8907\u6570\u306e\u56fd\u3067\u898f\u5236\u627f\u8a8d\u7533\u8acb\u3092\u63a7\u3048\u305f\u3001\u975e\u5e38\u306b\u30a8\u30ad\u30b5\u30a4\u30c6\u30a3\u30f3\u30b0\u306a\u6bb5\u968e\u306b\u3042\u308a\u307e\u3059\u3002"},
        {en:"I got my PMP certification earlier this year, so I'm looking forward to taking on more responsibility and driving projects forward.",ja:"\u4eca\u5e74\u521dPMP\u8cc7\u683c\u3092\u53d6\u5f97\u3057\u307e\u3057\u305f\u306e\u3067\u3001\u3088\u308a\u591a\u304f\u306e\u8cac\u4efb\u3092\u62c5\u3044\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u63a8\u9032\u3057\u3066\u3044\u304f\u3053\u3068\u3092\u697d\u3057\u307f\u306b\u3057\u3066\u3044\u307e\u3059\u3002"},
        {en:"Happy to work with you all.",ja:"\u7686\u3055\u3093\u3068\u4e00\u7dd2\u306b\u50cd\u3051\u308b\u3053\u3068\u3092\u5acc\u3057\u304f\u601d\u3044\u307e\u3059\u3002"}
      ],
      pronunciationTips: [
        "regulatory: REG-yu-la-to-ry\u3002\u6700\u521d\u306eREG\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "electrosurgical: el-ec-tro-SUR-gi-cal\u30026\u97f3\u7bc0\u3002SUR\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "endoscopic: en-do-SCOP-ic\u3002SCOP\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "certification: ser-tif-i-CA-tion\u3002CA\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002"
      ]
    }
  },
  {
    id: 'casual',
    title: '\u81ea\u5df1\u7d39\u4ecb \u30ab\u30b8\u30e5\u30a2\u30eb\u7248\uff082\u5206\uff09',
    date: '2026-05-24',
    tip: '\u30d5\u30a3\u30e9\u30fc\u3092\u4f7f\u308f\u305a\u81ea\u7136\u306a\u30ea\u30ba\u30e0\u3067\u3002minimally invasive \u306e\u767a\u97f3\u3002',
    raw: "Thanks for having me. My name is Fami. I've been with the medical device company for ten years, but I want to be honest\u2014my journey into product development is still relatively new. I spent most of my career in other areas, and this current project is actually my first real experience leading a major development initiative. It's been a challenging but rewarding two years.\n\nRight now, I'm managing a project for an electrosurgical generator\u2014basically, it controls the power output of an electric scalpel used in minimally invasive endoscopic surgery. The technology is complex, and there's a lot to learn about regulatory pathways, but I'm genuinely excited about what we're building and where we're headed.\n\nWe're at a critical milestone. After two years of development, we're getting ready to move into regulatory submissions. That's no small feat in the medical device world, and I'm proud of what the team has accomplished so far. I recently earned my PMP certification, which has given me a much clearer framework for managing all the moving parts of this project.\n\nLooking forward to collaborating with all of you.",
    breathGroups: ["Thanks for having me.","My name is Fami.","I've been with the medical device company","for ten years,","but I want to be honest\u2014","my journey into product development","is still relatively new.","I spent most of my career","in other areas,","and this current project","is actually my first real experience","leading a major development initiative.","It's been a challenging","but rewarding two years.","Right now,","I'm managing a project","for an electrosurgical generator\u2014","basically, it controls the power output","of an electric scalpel","used in minimally invasive endoscopic surgery.","The technology is complex,","and there's a lot to learn","about regulatory pathways,","but I'm genuinely excited","about what we're building","and where we're headed.","We're at a critical milestone.","After two years of development,","we're getting ready to move","into regulatory submissions.","That's no small feat","in the medical device world,","and I'm proud","of what the team has accomplished so far.","I recently earned my PMP certification,","which has given me","a much clearer framework","for managing all the moving parts","of this project.","Looking forward","to collaborating with all of you."],
    vocab: [
      {word:'rewarding',pron:'/r\u026a\u02c8w\u0254\u02d0rd\u026a\u014b/',meaning:'\u5145\u5b9f\u611f\u306e\u3042\u308b',example:"It's been a challenging but rewarding experience."},
      {word:'minimally invasive',pron:'/\u02c8m\u026an\u026am\u0259li \u026an\u02c8ve\u026as\u026av/',meaning:'\u4f4e\u4fb5\u8972\u306e',example:'Minimally invasive surgery reduces recovery time.'},
      {word:'regulatory pathways',pron:'/\u02ccr\u025b\u0261j\u028al\u0259t\u0254\u02d0ri \u02c8p\u00e6\u03b8we\u026az/',meaning:'\u898f\u5236\u627f\u8a8d\u306e\u30d7\u30ed\u30bb\u30b9',example:'Understanding regulatory pathways is essential.'},
      {word:'critical milestone',pron:'/\u02c8kr\u026at\u026ak\u0259l \u02c8ma\u026alsto\u028an/',meaning:'\u91cd\u8981\u306a\u30de\u30a4\u30eb\u30b9\u30c8\u30fc\u30f3',example:'Completing the design phase was a critical milestone.'},
      {word:'no small feat',pron:'/no\u028a smo\u028al fi\u02d0t/',meaning:'\u5927\u3057\u305f\u3082\u306e\u3060\u30fb\u5bb9\u6613\u3067\u306f\u306a\u3044',example:'Getting FDA approval is no small feat.'},
      {word:'moving parts',pron:'/\u02c8mu\u02d0v\u026a\u014b p\u0251\u02d0rts/',meaning:'\u8907\u96d1\u306a\u8981\u7d20\uff08\u6bd4\u55a9\uff09',example:'Managing all the moving parts requires strong leadership.'},
      {word:'development initiative',pron:'/d\u026a\u02c8v\u025bl\u0259pm\u0259nt \u026a\u02c8n\u026a\u0283\u0259t\u026av/',meaning:'\u958b\u767a\u30d7\u30ed\u30b8\u30a7\u30af\u30c8',example:'This is our biggest development initiative in five years.'}
    ],
    analyzed: {
      sentences: [
        {en:"Thanks for having me. My name is Fami.",ja:"\u3054\u7d39\u4ecb\u3044\u305f\u3060\u304d\u3042\u308a\u304c\u3068\u3046\u3054\u3056\u3044\u307e\u3059\u3002Fami\u3068\u7533\u3057\u307e\u3059\u3002"},
        {en:"I've been with the medical device company for ten years, but I want to be honest\u2014my journey into product development is still relatively new.",ja:"\u533b\u7642\u6a5f\u5668\u4f1a\u793e\u306b10\u5e74\u52e4\u3081\u3066\u3044\u307e\u3059\u304c\u3001\u88fd\u54c1\u958b\u767a\u3078\u306e\u95a2\u308f\u308a\u306f\u307e\u3060\u6bd4\u8f03\u7684\u65b0\u3057\u3044\u3067\u3059\u3002"},
        {en:"I spent most of my career in other areas, and this current project is actually my first real experience leading a major development initiative.",ja:"\u30ad\u30e3\u30ea\u30a2\u306e\u307b\u3068\u3093\u3069\u3092\u4ed6\u306e\u5206\u91ce\u3067\u904e\u3054\u3057\u3066\u304d\u307e\u3057\u305f\u3002\u73fe\u5728\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u304c\u5927\u898f\u6a21\u958b\u767a\u3092\u30ea\u30fc\u30c9\u3059\u308b\u521d\u3081\u3066\u306e\u672c\u683c\u7684\u306a\u7d4c\u9a13\u3067\u3059\u3002"},
        {en:"It's been a challenging but rewarding two years.",ja:"\u6311\u6226\u7684\u3067\u3057\u305f\u304c\u3001\u975e\u5e38\u306b\u5145\u5b9f\u3057\u305f2\u5e74\u9593\u3067\u3057\u305f\u3002"},
        {en:"Right now, I'm managing a project for an electrosurgical generator\u2014basically, it controls the power output of an electric scalpel used in minimally invasive endoscopic surgery.",ja:"\u73fe\u5728\u3001\u96fb\u6c17\u5916\u79d1\u7528\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u62c5\u5f53\u3057\u3066\u3044\u307e\u3059\u3002\u4f4e\u4fb5\u8972\u5185\u8996\u93e1\u624b\u8853\u3067\u4f7f\u3046\u96fb\u6c17\u30e1\u30b9\u306e\u51fa\u529b\u3092\u5236\u5fa1\u3059\u308b\u88c5\u7f6e\u3067\u3059\u3002"},
        {en:"The technology is complex, and there's a lot to learn about regulatory pathways, but I'm genuinely excited about what we're building and where we're headed.",ja:"\u6280\u8853\u306f\u8907\u96d1\u3067\u898f\u5236\u627f\u8a8d\u306e\u30d7\u30ed\u30bb\u30b9\u3082\u5b66\u3076\u3053\u3068\u304c\u591a\u3044\u3067\u3059\u304c\u3001\u79c1\u305f\u3061\u304c\u4f5c\u3063\u3066\u3044\u308b\u3082\u306e\u306b\u5fc3\u304b\u3089\u30ef\u30af\u30ef\u30af\u3057\u3066\u3044\u307e\u3059\u3002"},
        {en:"We're at a critical milestone. After two years of development, we're getting ready to move into regulatory submissions.",ja:"\u91cd\u8981\u306a\u30de\u30a4\u30eb\u30b9\u30c8\u30fc\u30f3\u306b\u3044\u307e\u3059\u3002\u30022\u5e74\u9593\u306e\u958b\u767a\u3092\u7d4c\u3066\u3001\u898f\u5236\u7533\u8acb\u306e\u6bb5\u968e\u3078\u9032\u3080\u6e96\u5099\u3092\u6574\u3048\u3066\u3044\u307e\u3059\u3002"},
        {en:"That's no small feat in the medical device world, and I'm proud of what the team has accomplished so far.",ja:"\u533b\u7642\u6a5f\u5668\u306e\u4e16\u754c\u3067\u306f\u4e26\u5927\u62b5\u306e\u3053\u3068\u3067\u306f\u306a\u304f\u3001\u30c1\u30fc\u30e0\u304c\u3053\u3053\u307e\u3067\u6210\u3057\u9042\u3052\u305f\u3053\u3068\u3092\u8a87\u308a\u306b\u601d\u3063\u3066\u3044\u307e\u3059\u3002"},
        {en:"I recently earned my PMP certification, which has given me a much clearer framework for managing all the moving parts of this project.",ja:"\u6700\u8fd1PMP\u8cc7\u683c\u3092\u53d6\u5f97\u3057\u3001\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306e\u8907\u96d1\u306a\u8981\u7d20\u3092\u7ba1\u7406\u3059\u308b\u305f\u3081\u306e\u3088\u308a\u660e\u78ba\u306a\u67a0\u7d44\u307f\u304c\u5f97\u3089\u308c\u307e\u3057\u305f\u3002"},
        {en:"Looking forward to collaborating with all of you.",ja:"\u7686\u3055\u3093\u3068\u5354\u529b\u3057\u3066\u5c45\u3051\u308b\u3053\u3068\u3092\u697d\u3057\u307f\u306b\u3057\u3066\u3044\u307e\u3059\u3002"}
      ],
      pronunciationTips: [
        "rewarding: re-WARD-ing\u3002WARD\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "minimally invasive: MIN-i-mal-ly in-VAY-siv\u3002VAY\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "regulatory pathways: \u9014\u4e2d\u3067\u606f\u3092\u3064\u304b\u305a\u4e00\u6c17\u306b\u8a00\u3048\u308b\u3088\u3046\u306b\u7df4\u7fd2\u3002",
        "no small feat: feat\u306f\u300cfi\u02d0t\u300d\u3002\u6155\u8a9e\u3068\u3057\u3066\u4e00\u6c17\u306b\u3002"
      ]
    }
  },
  {
    id: 'formal',
    title: '\u81ea\u5df1\u7d39\u4ecb \u30d5\u30a9\u30fc\u30de\u30eb\u7248\uff083\u30014\u5206\uff09',
    date: '2026-05-24',
    tip: '\u9577\u3044\u6587\u3067\u3082\u606f\u7d99\u304e\u3092\u610f\u8b58\u3002diligence / stakeholder \u306e\u767a\u97f3\u3002',
    raw: "Good morning, everyone. My name is Fami, and I'm the project manager for our electrosurgical generator development initiative.\n\nI'd like to give you a brief background on my journey here. I've been with the medical device company for approximately ten years. However, I want to be transparent: my direct experience in product development is more limited. For most of my tenure, I worked in other functions within the organization. This current project represents my first substantive leadership role in a full-scale medical device development program.\n\nWhat we're developing is an electrosurgical generator\u2014a device that controls the power output of an electric surgical knife, or electroscalpel, used in endoscopic procedures. These are minimally invasive surgeries, which is why precision in power delivery is critical. The regulatory landscape for such devices is demanding, which has been an important learning curve for me.\n\nThe project itself is now in its second year. We've made significant progress through the development and clinical validation phases. As of now, we're preparing to move into regulatory submissions across multiple countries\u2014a major milestone. This involves coordinating with various regulatory bodies, ensuring compliance with their specific requirements, and managing a complex timeline.\n\nTo strengthen my capabilities as a project manager, I completed my PMP certification earlier this year. That credential has given me a more rigorous framework for managing scope, schedule, cost, and stakeholder communication\u2014all critical elements as we navigate the regulatory phase ahead.\n\nI'm committed to bringing both technical diligence and collaborative leadership to this team. I recognize that I'm still building my expertise in the medical device domain, but I'm also bringing a growth mindset and a willingness to learn from all of you. I look forward to working together.",
    breathGroups: ["Good morning, everyone.","My name is Fami,","and I'm the project manager","for our electrosurgical generator","development initiative.","I'd like to give you a brief background","on my journey here.","I've been with the medical device company","for approximately ten years.","However,","I want to be transparent:","my direct experience in product development","is more limited.","For most of my tenure,","I worked in other functions","within the organization.","This current project represents","my first substantive leadership role","in a full-scale medical device","development program.","What we're developing","is an electrosurgical generator\u2014","a device that controls","the power output","of an electric surgical knife,","or electroscalpel,","used in endoscopic procedures.","These are minimally invasive surgeries,","which is why precision","in power delivery is critical.","The regulatory landscape","for such devices is demanding,","which has been an important","learning curve for me.","The project itself","is now in its second year.","We've made significant progress","through the development","and clinical validation phases.","As of now,","we're preparing to move","into regulatory submissions","across multiple countries\u2014","a major milestone.","This involves coordinating","with various regulatory bodies,","ensuring compliance","with their specific requirements,","and managing a complex timeline.","To strengthen my capabilities","as a project manager,","I completed my PMP certification","earlier this year.","That credential has given me","a more rigorous framework","for managing scope, schedule, cost,","and stakeholder communication\u2014","all critical elements","as we navigate","the regulatory phase ahead.","I'm committed to bringing","both technical diligence","and collaborative leadership","to this team.","I recognize","that I'm still building my expertise","in the medical device domain,","but I'm also bringing","a growth mindset","and a willingness to learn","from all of you.","I look forward to working together."],
    vocab: [
      {word:'transparent',pron:'/tr\u00e6n\u02c8sp\u025br\u0259nt/',meaning:'\u6b63\u76f4\u306a\u30fb\u900f\u660e\u6027\u306e\u3042\u308b',example:'I want to be transparent about my experience level.'},
      {word:'substantive',pron:'/\u02c8s\u028cbst\u0259nt\u026av/',meaning:'\u5b9f\u8cea\u7684\u306a',example:'This is my first substantive leadership role.'},
      {word:'regulatory landscape',pron:'/\u02ccr\u025b\u0261j\u028al\u0259t\u0254\u02d0ri \u02c8l\u00e6ndske\u026ap/',meaning:'\u898f\u5236\u74b0\u5883\u30fb\u898f\u5236\u306e\u5168\u4f53\u50cf',example:'The regulatory landscape for medical devices varies by country.'},
      {word:'clinical validation',pron:'/\u02c8kl\u026an\u026ak\u0259l \u02ccv\u00e6l\u026a\u02c8de\u026a\u0283\u0259n/',meaning:'\u81e8\u5e8a\u691c\u8a3c',example:'Clinical validation is required before regulatory submission.'},
      {word:'scope, schedule, cost',pron:'/sko\u028ap \u02c8sk\u025bd\u0292\u028al k\u0254st/',meaning:'\u30b9\u30b3\u30fc\u30d7\u30fb\u30b9\u30b1\u30b8\u30e5\u30fc\u30eb\u30fb\u30b3\u30b9\u30c8\uff08PMP\u7ba1\u7406\u306e3\u8981\u7d20\uff09',example:'A PMP framework helps manage scope, schedule, and cost.'},
      {word:'stakeholder communication',pron:'/\u02c8ste\u026akh\u0259\u028ald\u0259r k\u0259\u02ccmju\u02d0n\u026a\u02c8ke\u026a\u0283\u0259n/',meaning:'\u30b9\u30c6\u30fc\u30af\u30db\u30eb\u30c0\u30fc\u3068\u306e\u30b3\u30df\u30e5\u30cb\u30b1\u30fc\u30b7\u30e7\u30f3',example:'Clear stakeholder communication is key to project success.'},
      {word:'growth mindset',pron:'/\u0261ro\u028a\u03b8 \u02c8ma\u026andset/',meaning:'\u6210\u9577\u5fd7\u5411\u30fb\u5b66\u3073\u7d9a\u3051\u308b\u59ff\u52e4',example:'I bring a growth mindset to this team.'},
      {word:'diligence',pron:'/\u02c8d\u026al\u026ad\u0292\u0259ns/',meaning:'\u52e4\u52c9\u30fb\u4e01\u5be7\u3055',example:'Technical diligence is essential in medical device development.'}
    ],
    analyzed: {
      sentences: [
        {en:"Good morning, everyone. My name is Fami, and I'm the project manager for our electrosurgical generator development initiative.",ja:"\u304a\u306f\u3088\u3046\u3054\u3056\u3044\u307e\u3059\u3002Fami\u3068\u7533\u3057\u307e\u3059\u3002\u5f4a\u793e\u306e\u96fb\u6c17\u5916\u79d1\u7528\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u958b\u767a\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306ePM\u3092\u52d9\u3081\u3066\u304a\u308a\u307e\u3059\u3002"},
        {en:"I'd like to give you a brief background on my journey here. I've been with the medical device company for approximately ten years.",ja:"\u79c1\u306e\u30ad\u30e3\u30ea\u30a2\u306b\u3064\u3044\u3066\u7c21\u5358\u306b\u3054\u7d39\u4ecb\u3055\u305b\u3066\u304f\u3060\u3055\u3044\u3002\u533b\u7642\u6a5f\u5668\u30e1\u30fc\u30ab\u30fc\u306b\u52e4\u3081\u3066\u304a\u3088\u305910\u5e74\u306b\u306a\u308a\u307e\u3059\u3002"},
        {en:"However, I want to be transparent: my direct experience in product development is more limited.",ja:"\u305f\u3060\u3057\u3001\u6b63\u76f4\u306b\u7533\u3057\u307e\u3059\u3068\u3001\u88fd\u54c1\u958b\u767a\u306b\u304a\u3051\u308b\u76f4\u63a5\u7684\u306a\u7d4c\u9a13\u306f\u307e\u3060\u9650\u3089\u308c\u3066\u3044\u307e\u3059\u3002"},
        {en:"For most of my tenure, I worked in other functions within the organization. This current project represents my first substantive leadership role in a full-scale medical device development program.",ja:"\u5728\u7c4d\u306e\u307b\u3068\u3093\u3069\u306f\u4ed6\u306e\u6a5f\u80fd\u3067\u52e4\u52d9\u3057\u3066\u3044\u307e\u3057\u305f\u3002\u73fe\u5728\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u304c\u533b\u7642\u6a5f\u5668\u958b\u767a\u3067\u521d\u3081\u3066\u62c5\u3046\u672c\u683c\u7684\u306a\u30ea\u30fc\u30c0\u30fc\u30b7\u30c3\u30d7\u5f79\u5272\u3067\u3059\u3002"},
        {en:"What we're developing is an electrosurgical generator\u2014a device that controls the power output of an electric surgical knife, or electroscalpel, used in endoscopic procedures.",ja:"\u958b\u767a\u3057\u3066\u3044\u308b\u306e\u306f\u96fb\u6c17\u5916\u79d1\u7528\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u3067\u3059\u3002\u5185\u8996\u93e1\u624b\u8853\u3067\u4f7f\u7528\u3059\u308b\u96fb\u6c17\u30e1\u30b9\u306e\u51fa\u529b\u3092\u5236\u5fa1\u3059\u308b\u88c5\u7f6e\u3067\u3059\u3002"},
        {en:"These are minimally invasive surgeries, which is why precision in power delivery is critical. The regulatory landscape for such devices is demanding, which has been an important learning curve for me.",ja:"\u4f4e\u4fb5\u8972\u624b\u8853\u306a\u306e\u3067\u96fb\u529b\u51fa\u529b\u306e\u7cbe\u5bc6\u5ea6\u304c\u975e\u5e38\u306b\u91cd\u8981\u3067\u3059\u3002\u3053\u306e\u8a2d\u5099\u306e\u898f\u5236\u74b0\u5883\u306f\u53b3\u3057\u304f\u3001\u79c1\u306b\u3068\u3063\u3066\u5927\u304d\u306a\u5b66\u3073\u306e\u5834\u3068\u306a\u3063\u3066\u3044\u307e\u3059\u3002"},
        {en:"The project itself is now in its second year. We've made significant progress through the development and clinical validation phases.",ja:"\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306f2\u5e74\u76ee\u306b\u5165\u308a\u307e\u3057\u305f\u3002\u958b\u767a\u30d5\u30a7\u30fc\u30ba\u304a\u3088\u3073\u81e8\u5e8a\u691c\u8a3c\u30d5\u30a7\u30fc\u30ba\u3067\u5927\u304d\u306a\u9032\u6357\u3092\u906d\u3052\u3066\u3044\u307e\u3059\u3002"},
        {en:"As of now, we're preparing to move into regulatory submissions across multiple countries\u2014a major milestone.",ja:"\u73fe\u5728\u3001\u8907\u6570\u56fd\u3067\u306e\u898f\u5236\u7533\u8acb\u3078\u306e\u79fb\u884c\u3092\u6e96\u5099\u3057\u3066\u304a\u308a\u3001\u5927\u304d\u306a\u30de\u30a4\u30eb\u30b9\u30c8\u30fc\u30f3\u3067\u3059\u3002"},
        {en:"To strengthen my capabilities as a project manager, I completed my PMP certification earlier this year.",ja:"PM\u3068\u3057\u3066\u306e\u80fd\u529b\u3092\u5f37\u5316\u3059\u308b\u305f\u3081\u3001\u4eca\u5e74\u521dPMP\u8cc7\u683c\u3092\u53d6\u5f97\u3057\u307e\u3057\u305f\u3002"},
        {en:"That credential has given me a more rigorous framework for managing scope, schedule, cost, and stakeholder communication\u2014all critical elements as we navigate the regulatory phase ahead.",ja:"\u3053\u306e\u8cc7\u683c\u306b\u3088\u308a\u3001\u30b9\u30b3\u30fc\u30d7\u30fb\u30b9\u30b1\u30b8\u30e5\u30fc\u30eb\u30fb\u30b3\u30b9\u30c8\u30fb\u30b9\u30c6\u30fc\u30af\u30db\u30eb\u30c0\u30fc\u30b3\u30df\u30e5\u30cb\u30b1\u30fc\u30b7\u30e7\u30f3\u3092\u7ba1\u7406\u3059\u308b\u3088\u308a\u53b3\u5bc6\u306a\u67a0\u7d44\u307f\u304c\u5f97\u3089\u308c\u307e\u3057\u305f\u3002"},
        {en:"I'm committed to bringing both technical diligence and collaborative leadership to this team.",ja:"\u6280\u8853\u7684\u306a\u4e01\u5be7\u3055\u3068\u5354\u8abf\u7684\u306a\u30ea\u30fc\u30c0\u30fc\u30b7\u30c3\u30d7\u306e\u4e21\u65b9\u3092\u3053\u306e\u30c1\u30fc\u30e0\u306b\u3082\u305f\u3089\u3059\u3053\u3068\u3092\u7d04\u675f\u3057\u307e\u3059\u3002"},
        {en:"I recognize that I'm still building my expertise in the medical device domain, but I'm also bringing a growth mindset and a willingness to learn from all of you. I look forward to working together.",ja:"\u533b\u7642\u6a5f\u5668\u5206\u91ce\u306e\u5c02\u9580\u6027\u306f\u307e\u3060\u767a\u5c55\u9014\u4e2d\u3067\u3059\u304c\u3001\u6210\u9577\u5fd7\u5411\u3068\u7686\u3055\u3093\u304b\u3089\u5b66\u3076\u610f\u6b32\u3092\u6301\u3063\u3066\u3044\u307e\u3059\u3002\u3069\u3046\u305e\u3088\u308d\u3057\u304f\u304a\u9858\u3044\u3057\u307e\u3059\u3002"}
      ],
      pronunciationTips: [
        "transparent: trans-PAIR-ent\u3002PAIR\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "substantive: SUB-stan-tiv\u3002SUB\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "diligence: DIL-i-jence\u3002DIL\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002\u300cg\u300d\u306f\u300cj\u300d\u306e\u97f3\u3002",
        "stakeholder: STAKE-hold-er\u3002STAKE\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002"
      ]
    }
  }
  ,
  {
    id: 'sop-status-report',
    title: 'SOP\u5bfe\u5fdc\u8ab2\u984c\u306e\u72b6\u6cc1\u5831\u544a',
    date: '2026-05-25',
    tip: 'Declaration of Conformity / exclusion criteria / sustaining phase \u306e\u767a\u97f3\u3092\u6b63\u78ba\u306b\u3002\u5831\u544a\u2192\u8ab2\u984c\u2192\u65b9\u91dd\u306e\u6d41\u308c\u3092\u5d29\u3055\u305a\u8a71\u3059\u3002',
    raw: "Recently, our project reached an important decision: to move forward with the European Declaration of Conformity process without waiting for full SOP compliance. This was supported by our confirmation that this project meets the exclusion criteria outlined in the SOP. Thank you all for your support in reaching this decision.\n\nAt the same time, Rob has recommended that we proceed in parallel with the SOP compliance work specifically related to risk management. We have already started working with the team to estimate the scope of that effort. We will share the results separately, and I'd like to discuss the details further when Rob visits Japan.\n\nRegarding the additional verification test with increased sample size, also recommended by Rob, we are currently preparing the test protocol with Rob's support.\n\nHowever, there is one concern I'd like to raise. According to our team members, if we proceed with the risk management-related SOP compliance, the approach to sample size may need to be reconsidered. This means we may need to incorporate the SOP requirements into the additional test protocol as well.\n\nFurthermore, since this SOP compliance work may result in changes to design documents, there is a possibility that we will need to go through the European Declaration of Conformity process once more in the future. However, our current thinking is that this could be addressed in the sustaining phase rather than within the current project timeline.\n\nThat covers the current status and key challenges. Please feel free to share any questions or comments.",
    breathGroups: [
      "Recently, our project reached an important decision:",
      "to move forward",
      "with the European Declaration of Conformity process",
      "without waiting for full SOP compliance.",
      "This was supported by our confirmation",
      "that this project meets the exclusion criteria",
      "outlined in the SOP.",
      "Thank you all for your support",
      "in reaching this decision.",
      "At the same time,",
      "Rob has recommended",
      "that we proceed in parallel",
      "with the SOP compliance work",
      "specifically related to risk management.",
      "We have already started working with the team",
      "to estimate the scope of that effort.",
      "We will share the results separately,",
      "and I'd like to discuss the details further",
      "when Rob visits Japan.",
      "Regarding the additional verification test",
      "with increased sample size,",
      "also recommended by Rob,",
      "we are currently preparing the test protocol",
      "with Rob's support.",
      "However,",
      "there is one concern I'd like to raise.",
      "According to our team members,",
      "if we proceed with the risk management-related SOP compliance,",
      "the approach to sample size",
      "may need to be reconsidered.",
      "This means we may need to incorporate",
      "the SOP requirements",
      "into the additional test protocol as well.",
      "Furthermore,",
      "since this SOP compliance work",
      "may result in changes to design documents,",
      "there is a possibility",
      "that we will need to go through",
      "the European Declaration of Conformity process",
      "once more in the future.",
      "However,",
      "our current thinking is",
      "that this could be addressed in the sustaining phase",
      "rather than within the current project timeline.",
      "That covers the current status and key challenges.",
      "Please feel free to share any questions or comments."
    ],
    vocab: [
      {word:'Declaration of Conformity', pron:'/\u02ccd\u025bkl\u0259\u02c8re\u026a\u0283\u0259n \u0259v k\u0259n\u02c8f\u0254\u02d0rm\u026ati/', meaning:'\u9069\u5408\u5ba3\u8a00', example:'We are moving forward with the European Declaration of Conformity process.'},
      {word:'exclusion criteria', pron:'/\u026ak\u02c8sklu\u02d0\u0292\u0259n kra\u026a\u02c8t\u026a\u0259ri\u0259/', meaning:'\u9664\u5916\u57fa\u6e96', example:'This project meets the exclusion criteria outlined in the SOP.'},
      {word:'proceed in parallel', pron:'/pr\u0259\u02c8si\u02d0d \u026an \u02c8p\u00e6r\u0259lel/', meaning:'\u4e26\u884c\u3057\u3066\u9032\u3081\u308b', example:'We will proceed in parallel with the compliance work.'},
      {word:'estimate the scope', pron:'/\u02c8\u025bst\u026am\u026at \u00f0\u0259 sko\u028ap/', meaning:'\u30b9\u30b3\u30fc\u30d7\u3092\u898b\u7a4d\u3082\u308b', example:'We have started to estimate the scope of that effort.'},
      {word:'incorporate', pron:'/\u026an\u02c8k\u0254\u02d0rp\u0259re\u026at/', meaning:'\u53d6\u308a\u8fbc\u3080\u30fb\u7d44\u307f\u8fbc\u3080', example:'We may need to incorporate the SOP requirements into the test protocol.'},
      {word:'sustaining phase', pron:'/s\u0259\u02c8ste\u026an\u026a\u014b fe\u026az/', meaning:'\u30b5\u30b9\u30c6\u30a4\u30cb\u30f3\u30b0\u30d5\u30a7\u30fc\u30ba', example:'This could be addressed in the sustaining phase.'},
      {word:'test protocol', pron:'/t\u025bst \u02c8pro\u028at\u0259k\u0252l/', meaning:'\u30c6\u30b9\u30c8\u30d7\u30ed\u30c8\u30b3\u30eb\uff08\u8a66\u9a13\u624b\u9806\u66f8\uff09', example:'We are currently preparing the test protocol.'},
      {word:'Please feel free to share', pron:'/pli\u02d0z fi\u02d0l fri\u02d0 t\u0259 \u0283\u025br/', meaning:'\u9060\u616e\u306a\u304f\u304a\u805e\u304b\u305b\u304f\u3060\u3055\u3044', example:'Please feel free to share any questions or comments.'}
    ],
    analyzed: {
      sentences: [
        {en:"Recently, our project reached an important decision: to move forward with the European Declaration of Conformity process without waiting for full SOP compliance.", ja:"\u6700\u8fd1\u3001\u79c1\u305f\u3061\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306f\u91cd\u8981\u306a\u6c7a\u5b9a\u306b\u81f3\u308a\u307e\u3057\u305f\u3002SOP\u3078\u306e\u5b8c\u5168\u6e96\u62e0\u3092\u5f85\u305f\u305a\u306b\u3001\u6b27\u5dde\u9069\u5408\u5ba3\u8a00\u30d7\u30ed\u30bb\u30b9\u3092\u9032\u3081\u308b\u3068\u3044\u3046\u3082\u306e\u3067\u3059\u3002"},
        {en:"This was supported by our confirmation that this project meets the exclusion criteria outlined in the SOP.", ja:"\u3053\u308c\u306f\u3001\u672c\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u304cSOP\u306b\u5b9a\u3081\u3089\u308c\u305f\u9664\u5916\u57fa\u6e96\u3092\u6e80\u305f\u3059\u3053\u3068\u306e\u78ba\u8a8d\u306b\u3088\u3063\u3066\u88cf\u4ed8\u3051\u3089\u308c\u307e\u3057\u305f\u3002"},
        {en:"Thank you all for your support in reaching this decision.", ja:"\u3053\u306e\u6c7a\u5b9a\u306b\u81f3\u308b\u306b\u3042\u305f\u308a\u3001\u7686\u3055\u3093\u306e\u3054\u652f\u63f4\u306b\u611f\u8b1d\u3057\u307e\u3059\u3002"},
        {en:"At the same time, Rob has recommended that we proceed in parallel with the SOP compliance work specifically related to risk management.", ja:"\u540c\u6642\u306b\u3001Rob\u304b\u3089\u30ea\u30b9\u30af\u30de\u30cd\u30b8\u30e1\u30f3\u30c8\u306b\u95a2\u9023\u3059\u308bSOP\u6e96\u62e0\u4f5c\u696d\u3092\u4e26\u884c\u3057\u3066\u9032\u3081\u308b\u3088\u3046\u63d0\u6848\u304c\u3042\u308a\u307e\u3057\u305f\u3002"},
        {en:"We have already started working with the team to estimate the scope of that effort.", ja:"\u3059\u3067\u306b\u30c1\u30fc\u30e0\u3068\u3068\u3082\u306b\u305d\u306e\u4f5c\u696d\u7bc4\u56f2\u306e\u898b\u7a4d\u3082\u308a\u3092\u958b\u59cb\u3057\u3066\u3044\u307e\u3059\u3002"},
        {en:"We will share the results separately, and I'd like to discuss the details further when Rob visits Japan.", ja:"\u7d50\u679c\u306f\u5225\u9014\u5171\u6709\u3057\u3001Rob\u306eJapan\u8a2a\u554f\u6642\u306b\u8a73\u7d30\u3092\u8b70\u8ad6\u3057\u305f\u3044\u3068\u601d\u3044\u307e\u3059\u3002"},
        {en:"Regarding the additional verification test with increased sample size, also recommended by Rob, we are currently preparing the test protocol with Rob's support.", ja:"Rob\u304b\u3089\u63d0\u6848\u306e\u3042\u3063\u305f\u30b5\u30f3\u30d7\u30eb\u30b5\u30a4\u30ba\u5897\u52a0\u3092\u4f34\u3046\u8ffd\u52a0\u691c\u8a3c\u8a66\u9a13\u306b\u3064\u3044\u3066\u3082\u3001Rob\u306e\u30b5\u30dd\u30fc\u30c8\u306e\u3082\u3068\u30c6\u30b9\u30c8\u30d7\u30ed\u30c8\u30b3\u30eb\u3092\u73fe\u5728\u6e96\u5099\u4e2d\u3067\u3059\u3002"},
        {en:"However, there is one concern I'd like to raise.", ja:"\u305f\u3060\u3057\u30011\u70b9\u61f8\u5ff5\u4e8b\u9805\u3092\u304a\u4f1d\u3048\u3057\u305f\u3044\u3068\u601d\u3044\u307e\u3059\u3002"},
        {en:"According to our team members, if we proceed with the risk management-related SOP compliance, the approach to sample size may need to be reconsidered.", ja:"\u30c1\u30fc\u30e0\u30e1\u30f3\u30d0\u30fc\u306b\u3088\u308b\u3068\u3001\u30ea\u30b9\u30af\u30de\u30cd\u30b8\u30e1\u30f3\u30c8\u95a2\u9023\u306eSOP\u6e96\u62e0\u3092\u9032\u3081\u308b\u5834\u5408\u3001\u30b5\u30f3\u30d7\u30eb\u30b5\u30a4\u30ba\u306e\u30a2\u30d7\u30ed\u30fc\u30c1\u3092\u898b\u76f4\u3059\u5fc5\u8981\u304c\u751f\u3058\u308b\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002"},
        {en:"This means we may need to incorporate the SOP requirements into the additional test protocol as well.", ja:"\u3064\u307e\u308a\u3001\u8ffd\u52a0\u30c6\u30b9\u30c8\u30d7\u30ed\u30c8\u30b3\u30eb\u306b\u3082SOP\u8981\u4ef6\u3092\u53d6\u308a\u8fbc\u3080\u5fc5\u8981\u304c\u751f\u3058\u308b\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002"},
        {en:"Furthermore, since this SOP compliance work may result in changes to design documents, there is a possibility that we will need to go through the European Declaration of Conformity process once more in the future.", ja:"\u3055\u3089\u306b\u3001\u3053\u306eSOP\u6e96\u62e0\u4f5c\u696d\u306b\u3088\u308a\u8a2d\u8a08\u6587\u66f8\u306b\u5909\u66f4\u304c\u751f\u3058\u305f\u5834\u5408\u3001\u5c06\u6765\u7684\u306b\u6b27\u5dde\u9069\u5408\u5ba3\u8a00\u30d7\u30ed\u30bb\u30b9\u3092\u518d\u5ea6\u5b9f\u65bd\u3059\u308b\u5fc5\u8981\u304c\u751f\u3058\u308b\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002"},
        {en:"However, our current thinking is that this could be addressed in the sustaining phase rather than within the current project timeline.", ja:"\u305f\u3060\u3057\u73fe\u6642\u70b9\u306e\u8003\u3048\u3067\u306f\u3001\u3053\u308c\u306f\u73fe\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306e\u30bf\u30a4\u30e0\u30e9\u30a4\u30f3\u5185\u3067\u306f\u306a\u304f\u3001\u30b5\u30b9\u30c6\u30a4\u30cb\u30f3\u30b0\u30d5\u30a7\u30fc\u30ba\u3067\u5bfe\u5fdc\u3067\u304d\u308b\u3068\u3044\u3046\u898b\u89e3\u3067\u3059\u3002"},
        {en:"That covers the current status and key challenges.", ja:"\u4ee5\u4e0a\u304c\u73fe\u72b6\u3068\u4e3b\u306a\u8ab2\u984c\u3067\u3059\u3002"},
        {en:"Please feel free to share any questions or comments.", ja:"\u3054\u8cea\u554f\u3084\u30b3\u30e1\u30f3\u30c8\u304c\u3042\u308c\u3070\u304a\u6c17\u8efd\u306b\u3069\u3046\u305e\u3002"}
      ],
      pronunciationTips: [
        "Declaration of Conformity: dec-la-RA-tion of con-FOR-mi-ty\u3002RA\u3068FOR\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002\u4e00\u6c17\u306b\u8a00\u3048\u308b\u3088\u3046\u5206\u5272\u7df4\u7fd2\u3002",
        "exclusion criteria: ex-CLU-sion cri-TE-ri-a\u3002CLU\u3068TE\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "sustaining phase: sus-TAIN-ing phase\u3002TAIN\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "incorporate: in-COR-po-rate\u3002COR\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002\u6700\u5f8c\u306f\u300c\u30ec\u30a4\u30c8\u300d\u3067\u306f\u306a\u304f\u300crit\u300d\u3068\u8efd\u304f\u3002"
      ]
    }
  }
  ,
  {
    id: 'pentest-alignment',
    title: '\u30da\u30cd\u30c8\u30ec\u30fc\u30b7\u30e7\u30f3\u30c6\u30b9\u30c8\u65b9\u91dd\u306e\u78ba\u8a8d',
    date: '2026-06-07',
    tip: 'penetration / unauthorized access / externally exposed ports \u306e\u767a\u97f3\u3092\u6b63\u78ba\u306b\u3002\u5831\u544a\u2192\u78ba\u8a8d\u4f9d\u983c\u306e\u6d41\u308c\u3092\u5d29\u3055\u305a\u8a71\u3059\u3002',
    raw: "Thank you for joining today. I'd like to align on two points regarding our penetration test.\n\nFirst, on tester selection. We plan to conduct the test in-house rather than using an external vendor. To maintain credibility with the FDA, we want to ensure independence by assigning a team member from our Product Security division who is separate from the approver.\n\nSecond, on test scope. We'd like to exclude physical security testing. Since this device is used in a medical environment with high physical security standards, we consider the risk of unauthorized access to be low. We plan to focus on externally exposed ports only.\n\nDo these approaches align with your standards? We'd appreciate your confirmation.",
    breathGroups: [
      "Thank you for joining today.",
      "I'd like to align on two points",
      "regarding our penetration test.",
      "First, on tester selection.",
      "We plan to conduct the test in-house",
      "rather than using an external vendor.",
      "To maintain credibility with the FDA,",
      "we want to ensure independence",
      "by assigning a team member",
      "from our Product Security division",
      "who is separate from the approver.",
      "Second, on test scope.",
      "We'd like to exclude",
      "physical security testing.",
      "Since this device is used",
      "in a medical environment",
      "with high physical security standards,",
      "we consider the risk",
      "of unauthorized access to be low.",
      "We plan to focus",
      "on externally exposed ports only.",
      "Do these approaches align with your standards?",
      "We'd appreciate your confirmation."
    ],
    vocab: [
      {word:'penetration test', pron:'/\u02ccp\u025bn\u026a\u02c8tre\u026a\u0283\u0259n t\u025bst/', meaning:'\u30da\u30cd\u30c8\u30ec\u30fc\u30b7\u30e7\u30f3\u30c6\u30b9\u30c8\uff08\u4fb5\u5165\u30c6\u30b9\u30c8\uff09', example:'We plan to conduct the penetration test in-house.'},
      {word:'align on', pron:'/\u0259\u02c8la\u026an \u0252n/', meaning:'\u301c\u306b\u3064\u3044\u3066\u5408\u610f\u3059\u308b\u30fb\u8a8d\u8b58\u3092\u5408\u308f\u305b\u308b', example:"I'd like to align on two points regarding our approach."},
      {word:'in-house', pron:'/\u026an\u02c8ha\u028as/', meaning:'\u793e\u5185\u3067\u30fb\u81ea\u793e\u5185\u306e', example:'We plan to conduct the test in-house rather than using an external vendor.'},
      {word:'ensure independence', pron:'/\u026an\u02c8\u0283\u028a\u0259r \u02cc\u026and\u026a\u02c8p\u025bnd\u0259ns/', meaning:'\u72ec\u7acb\u6027\u3092\u78ba\u4fdd\u3059\u308b', example:'We want to ensure independence by assigning a separate team member.'},
      {word:'unauthorized access', pron:'/\u028cn\u02c8\u0254\u02d0\u03b8\u0259ra\u026azd \u02c8\u00e6kses/', meaning:'\u4e0d\u6b63\u30a2\u30af\u30bb\u30b9', example:'We consider the risk of unauthorized access to be low.'},
      {word:'externally exposed ports', pron:'/\u026ak\u02c8st\u025c\u02d0rn\u0259li \u026ak\u02c8spo\u028azd p\u0254\u02d0rts/', meaning:'\u5916\u90e8\u306b\u9732\u51fa\u3057\u3066\u3044\u308b\u30dd\u30fc\u30c8', example:'We plan to focus on externally exposed ports only.'},
      {word:"We'd appreciate your confirmation", pron:'/wi\u02d0d \u0259\u02c8pri\u02d0\u0283ie\u026at j\u0254\u02d0r \u02cck\u0252nf\u025c\u02d0\u02c8me\u026a\u0283\u0259n/', meaning:'\u3054\u78ba\u8a8d\u3044\u305f\u3060\u3051\u307e\u3059\u3068\u5e78\u3044\u3067\u3059', example:"Do these approaches align with your standards? We'd appreciate your confirmation."}
    ],
    analyzed: {
      sentences: [
        {en:"Thank you for joining today. I'd like to align on two points regarding our penetration test.", ja:"\u672c\u65e5\u306f\u3054\u53c2\u52a0\u3044\u305f\u3060\u304d\u3042\u308a\u304c\u3068\u3046\u3054\u3056\u3044\u307e\u3059\u3002\u30da\u30cd\u30c8\u30ec\u30fc\u30b7\u30e7\u30f3\u30c6\u30b9\u30c8\u306b\u95a2\u3057\u3066\uff12\u70b9\u78ba\u8a8d\u3055\u305b\u3066\u304f\u3060\u3055\u3044\u3002"},
        {en:"First, on tester selection. We plan to conduct the test in-house rather than using an external vendor.", ja:"\u307e\u305a\u3001\u30c6\u30b9\u30bf\u30fc\u9078\u5b9a\u306b\u3064\u3044\u3066\u3067\u3059\u3002\u5916\u90e8\u30d9\u30f3\u30c0\u30fc\u3067\u306f\u306a\u304f\u793e\u5185\u3067\u30c6\u30b9\u30c8\u3092\u5b9f\u65bd\u3059\u308b\u4e88\u5b9a\u3067\u3059\u3002"},
        {en:"To maintain credibility with the FDA, we want to ensure independence by assigning a team member from our Product Security division who is separate from the approver.", ja:"FDA\u3068\u306e\u4fe1\u983c\u6027\u3092\u7dad\u6301\u3059\u308b\u305f\u3081\u3001\u627f\u8a8d\u8005\u3068\u306f\u5225\u306eProduct Security\u306e\u62c5\u5f53\u8005\u3092\u30a2\u30b5\u30a4\u30f3\u3057\u3066\u72ec\u7acb\u6027\u3092\u78ba\u4fdd\u3057\u305f\u3044\u3068\u601d\u3044\u307e\u3059\u3002"},
        {en:"Second, on test scope. We'd like to exclude physical security testing.", ja:"\u6b21\u306b\u3001\u30c6\u30b9\u30c8\u7bc4\u56f2\u306b\u3064\u3044\u3066\u3067\u3059\u3002\u7269\u7406\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3\u30c6\u30b9\u30c8\u306f\u9664\u5916\u3057\u305f\u3044\u3068\u8003\u3048\u3066\u3044\u307e\u3059\u3002"},
        {en:"Since this device is used in a medical environment with high physical security standards, we consider the risk of unauthorized access to be low.", ja:"\u672c\u6a5f\u5668\u306f\u7269\u7406\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3\u57fa\u6e96\u306e\u9ad8\u3044\u533b\u7642\u74b0\u5883\u3067\u4f7f\u7528\u3055\u308c\u308b\u305f\u3081\u3001\u4e0d\u6b63\u30a2\u30af\u30bb\u30b9\u306e\u30ea\u30b9\u30af\u306f\u4f4e\u3044\u3068\u8003\u3048\u3066\u3044\u307e\u3059\u3002"},
        {en:"We plan to focus on externally exposed ports only.", ja:"\u5916\u90e8\u306b\u9732\u51fa\u3057\u3066\u3044\u308b\u30dd\u30fc\u30c8\u306e\u307f\u306b\u7d5e\u3063\u3066\u30c6\u30b9\u30c8\u3092\u884c\u3046\u4e88\u5b9a\u3067\u3059\u3002"},
        {en:"Do these approaches align with your standards? We'd appreciate your confirmation.", ja:"\u3053\u308c\u3089\u306e\u30a2\u30d7\u30ed\u30fc\u30c1\u306f\u8cb4\u30c1\u30fc\u30e0\u306e\u57fa\u6e96\u306b\u6cbf\u3063\u3066\u3044\u307e\u3059\u304b\uff1f\u3054\u78ba\u8a8d\u3044\u305f\u3060\u3051\u307e\u3059\u3068\u5e78\u3044\u3067\u3059\u3002"}
      ],
      pronunciationTips: [
        "penetration: pen-e-TRA-tion\u3002TRA\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002\u300c\u30da\u30cd\u30c8\u30ec\u30fc\u30b7\u30e7\u30f3\u300d\u3068\u65e5\u672c\u8a9e\u8aad\u307f\u306b\u8fd1\u3044\u3002",
        "credibility: cred-i-BIL-i-ty\u3002BIL\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "unauthorized: un-AU-thor-ized\u3002AU\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002",
        "externally exposed: ex-TER-nal-ly ex-POSED\u3002TER\u3068POSED\u306b\u30a2\u30af\u30bb\u30f3\u30c8\u3002"
      ]
    }
  }
  ,
  {
    id: '510k-readiness',
    title: '510k申請に向けた準備状況の確認',
    date: '2026-06-08',
    tip: 'PMDA / 510k / GSOP / labeling requirement の発音を正確に。2つのトピックを明確に区別して話す。',
    raw: "Thank you for your time today. First, I'd like to express my appreciation for your support during the PMDA inspection.\n\nI have two topics I'd like to discuss regarding our readiness level for the 510k submission.\n\nThe first is GSOP compliance. We have recently completed an estimate of the effort required. Based on this, I'd like to walk through the pros and cons and align on how far we should go with compliance, given that we are already close to submission.\n\nThe second is the new FDA labeling requirement. We have decided to address this, but have not yet determined how much needs to be completed before initiating the 510k submission. I'd like to discuss the impact on our schedule and cost, and get your guidance on the scope.",
    breathGroups: [
      "Thank you for your time today.",
      "First,",
      "I'd like to express my appreciation",
      "for your support",
      "during the PMDA inspection.",
      "I have two topics",
      "I'd like to discuss",
      "regarding our readiness level",
      "for the 510k submission.",
      "The first is GSOP compliance.",
      "We have recently completed",
      "an estimate of the effort required.",
      "Based on this,",
      "I'd like to walk through",
      "the pros and cons",
      "and align on how far we should go",
      "with compliance,",
      "given that we are already",
      "close to submission.",
      "The second is",
      "the new FDA labeling requirement.",
      "We have decided to address this,",
      "but have not yet determined",
      "how much needs to be completed",
      "before initiating the 510k submission.",
      "I'd like to discuss",
      "the impact on our schedule and cost,",
      "and get your guidance on the scope."
    ],
    vocab: [
      {word:'express my appreciation', pron:'/ɪkˈspres maɪ əˌpriːʃiˈeɪʃən/', meaning:'感謝の気持ちを伝える', example:"I'd like to express my appreciation for your support."},
      {word:'readiness level', pron:'/ˈrɛdinəs ˈlɛvəl/', meaning:'準備状況・準備レベル', example:"I'd like to discuss our readiness level for the submission."},
      {word:'walk through the pros and cons', pron:'/wɔːk θruː ðə proʊz ænd kɒnz/', meaning:'メリット・デメリットを整理して説明する', example:"I'd like to walk through the pros and cons of each approach."},
      {word:'align on', pron:'/əˈlaɪn ɒn/', meaning:'〜について合意する・認識を合わせる', example:"I'd like to align on how far we should go with compliance."},
      {word:'labeling requirement', pron:'/ˈleɪbəlɪŋ rɪˈkwaɪərmənt/', meaning:'ラベリング要件（規制上の表示要件）', example:'We need to address the new FDA labeling requirement.'},
      {word:'get your guidance on the scope', pron:'/ɡɛt jɔːr ˈɡaɪdəns ɒn ðə skoʊp/', meaning:'対応範囲についてご指導いただく', example:"I'd like to get your guidance on the scope of this work."}
    ],
    analyzed: {
      sentences: [
        {en:"Thank you for your time today. First, I'd like to express my appreciation for your support during the PMDA inspection.", ja:"本日はお時間をいただきありがとうございます。まず、PMDA査察中のご支援に感謝申し上げます。"},
        {en:"I have two topics I'd like to discuss regarding our readiness level for the 510k submission.", ja:"510k申請に向けた準備状況について、2点ご相談したいことがあります。"},
        {en:"The first is GSOP compliance. We have recently completed an estimate of the effort required.", ja:"1点目はGSOP準拠についてです。必要な工数の見積もりを最近完了しました。"},
        {en:"Based on this, I'd like to walk through the pros and cons and align on how far we should go with compliance, given that we are already close to submission.", ja:"これを踏まえて、申請が間近に迫っている中でどこまでの準拠を目指すべきか、メリット・デメリットを整理してご確認いただきたいと思います。"},
        {en:"The second is the new FDA labeling requirement. We have decided to address this, but have not yet determined how much needs to be completed before initiating the 510k submission.", ja:"2点目はFDAの新しいラベリング要件についてです。対応することは決定しましたが、510k申請を開始する前にどこまで完了させる必要があるか、まだ決まっていません。"},
        {en:"I'd like to discuss the impact on our schedule and cost, and get your guidance on the scope.", ja:"スケジュールとコストへの影響について議論し、対応範囲についてご指導いただきたいと思います。"}
      ],
      pronunciationTips: [
        "PMDA: ピー・エム・ディー・エー。各文字を明確に発音。",
        "510k: five-ten-k（ファイブ・テン・ケー）。日本語読みしない。",
        "compliance: com-PLI-ance。PLIにアクセント。",
        "labeling requirement: LAY-bel-ing re-QUIRE-ment。LAYとQUIREにアクセント。",
        "pros and cons: プロズ・アンド・コンズ。sを忘れずに。"
      ]
    }
  },
  {
    id: 'launch-status-update',
    title: '海外向け週次進捗報告（EU/US launch）',
    date: '2026-07-26',
    tip: 'change control / hand off to RA / steady stream / home stretch のリズムと強勢に注意。イディオムは一息で自然に。',
    raw: "Hi everyone, thanks for joining. Let me give you a quick update on where we stand.\n\nWe're in the final stretch of getting everything ready for the EU and US launches, and overall we're on track with the key milestones. For the EU launch, we're almost there — we've just got one more step left in our change control process, and once that's done, we'll get the final approval we need before we can hand it over to RA for submission. For the US launch, things are moving well too — we've shared everything RA needs on their end, and the last open item just got closed out, so we're on track to have everything ready to hand off to RA as planned.\n\nThat said, as we get closer to the finish line, we've been getting a steady stream of small issues popping up — nothing major, but they've kept us busy putting out fires here and there. Overall, though, I'd say we're in good shape. We can see the finish line, and even though we're not quite there yet, I think this is the home stretch — just one more push and we're done.\n\nThanks, I'll keep you posted.",
    breathGroups: [
      "Hi everyone, thanks for joining.",
      "Let me give you a quick update",
      "on where we stand.",
      "We're in the final stretch",
      "of getting everything ready",
      "for the EU and US launches,",
      "and overall we're on track",
      "with the key milestones.",
      "For the EU launch,",
      "we're almost there —",
      "we've just got one more step left",
      "in our change control process,",
      "and once that's done,",
      "we'll get the final approval we need",
      "before we can hand it over to RA",
      "for submission.",
      "For the US launch,",
      "things are moving well too —",
      "we've shared everything RA needs",
      "on their end,",
      "and the last open item",
      "just got closed out,",
      "so we're on track",
      "to have everything ready",
      "to hand off to RA",
      "as planned.",
      "That said,",
      "as we get closer to the finish line,",
      "we've been getting a steady stream",
      "of small issues popping up —",
      "nothing major,",
      "but they've kept us busy",
      "putting out fires here and there.",
      "Overall, though,",
      "I'd say we're in good shape.",
      "We can see the finish line,",
      "and even though we're not quite there yet,",
      "I think this is the home stretch —",
      "just one more push",
      "and we're done.",
      "Thanks,",
      "I'll keep you posted."
    ],
    vocab: [
      {word:'in the final stretch', pron:'/ɪn ðə ˈfaɪnəl strɛtʃ/', meaning:'（プロジェクトなどの）終盤・大詰めで', example:"We're in the final stretch of the project."},
      {word:'change control process', pron:'/tʃeɪndʒ kənˈtroʊl ˈprɑːsɛs/', meaning:'変更管理プロセス', example:"We've got one more step left in our change control process."},
      {word:'hand off to', pron:'/hænd ɔːf tuː/', meaning:'〜に引き渡す・引き継ぐ', example:"We're on track to have everything ready to hand off to RA."},
      {word:'close out', pron:'/kloʊz aʊt/', meaning:'（残っているタスクなどを）完了させる・片付ける', example:'The last open item just got closed out.'},
      {word:'a steady stream of', pron:'/ə ˈstɛdi striːm ʌv/', meaning:'〜が絶え間なく続くこと', example:"We've been getting a steady stream of small issues."},
      {word:'putting out fires', pron:'/ˈpʊtɪŋ aʊt ˈfaɪərz/', meaning:'次々起こる小さいトラブルの対応に追われること', example:"They've kept us busy putting out fires here and there."},
      {word:'home stretch', pron:'/hoʊm strɛtʃ/', meaning:'最後の追い込み・ラストスパート', example:'I think this is the home stretch.'}
    ],
    analyzed: {
      sentences: [
        {en:"Hi everyone, thanks for joining. Let me give you a quick update on where we stand.", ja:"皆さん、ありがとうございます。現状について簡単にアップデートします。"},
        {en:"We're in the final stretch of getting everything ready for the EU and US launches, and overall we're on track with the key milestones.", ja:"EU・米国それぞれのローンチに向けた準備は最終段階に入っていて、全体として主要なマイルストーンに向けて順調に進んでいます。"},
        {en:"For the EU launch, we're almost there — we've just got one more step left in our change control process, and once that's done, we'll get the final approval we need before we can hand it over to RA for submission.", ja:"EUローンチについてはもう少しのところまで来ていて、変更管理プロセスの最後のステップが1つ残っています。それが終わり次第、必要な最終承認をもらって、RAに申請のために引き渡せます。"},
        {en:"For the US launch, things are moving well too — we've shared everything RA needs on their end, and the last open item just got closed out, so we're on track to have everything ready to hand off to RA as planned.", ja:"米国ローンチについても順調で、RA側に必要なものはすべて共有済み、最後に残っていた項目も片付いたので、予定通りRAへの引き渡し準備が整う見込みです。"},
        {en:"That said, as we get closer to the finish line, we've been getting a steady stream of small issues popping up — nothing major, but they've kept us busy putting out fires here and there.", ja:"とはいえ、ゴールが近づくにつれて細かい問題が絶え間なく出てきていて、大きな問題ではないものの、あちこちで小さいトラブル対応に追われています。"},
        {en:"Overall, though, I'd say we're in good shape. We can see the finish line, and even though we're not quite there yet, I think this is the home stretch — just one more push and we're done.", ja:"それでも全体としては順調です。ゴールは見えていて、まだ完全にたどり着いてはいませんが、ここが最後の追い込みどころで、あと一押しで完了だと思っています。"},
        {en:"Thanks, I'll keep you posted.", ja:"ありがとうございます、また状況は共有します。"}
      ],
      pronunciationTips: [
        "stretch: ストレッチ。trはトゥ+ルに近い音。finalにアクセント。",
        "RA: アール・エイ。頭文字読み。",
        "closed out: クロウズド・アウト。dの音を落とさない。",
        "a steady stream of: ア・ステディ・ストリーム・オブ。sの連続に注意。",
        "putting out fires: PUTとFIRESにアクセント。プッティング・アウト・ファイアーズ。"
      ]
    }
  }
];
  var TRAVEL_SCRIPTS = [
    { id: 'airport', title: '空港・入国審査', en: 'Airport & Immigration' },
    { id: 'hotel', title: 'ホテルのチェックイン・トラブル対応', en: 'Hotel Check-in & Issues' },
    { id: 'restaurant', title: 'レストランでの注文', en: 'Ordering at a Restaurant' },
    { id: 'directions', title: '道案内・ちょっとしたトラブル', en: 'Directions & Mishaps' },
  ]; // per LEARNING_PLAN.md's 偶数週 priority order — not yet written, shown locked

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

  function loadProgress() {
    return S.apiGetJson('data/progress.json').then(function (obj) {
      scriptProgress = (obj && obj.scriptProgress) || {};
    }).catch(function () {}).then(function () { loaded = true; });
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
        + '<button class="btn-icon btn-ghost" style="width:28px;height:28px" onclick="PracticeTab.moveScript(\'' + s.id + '\',-1)">↑</button>'
        + '<button class="btn-icon btn-ghost" style="width:28px;height:28px" onclick="PracticeTab.moveScript(\'' + s.id + '\',1)">↓</button>'
        + '<button class="btn-icon btn-ghost" style="width:28px;height:28px" onclick="PracticeTab.toggleHidden(\'' + s.id + '\')">' + (hidden ? '👁️‍🗨️' : '👁️') + '</button>'
        + '</div></div>';
    }
    return '<button onclick="PracticeTab.openScript(\'' + s.id + '\')" style="display:flex;align-items:center;gap:12px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:14px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;width:100%">'
      + '<div style="flex:1"><div style="font-size:15px;font-weight:500">' + esc(s.title) + '</div><div style="margin-top:4px">' + badges + '</div></div>'
      + '<div style="font-size:13px;color:var(--color-accent-300);font-weight:500;white-space:nowrap">' + scoreLabelFor(s) + '</div></button>';
  }
  function travelCardHtml(s) {
    return '<div style="display:flex;align-items:center;gap:12px;background:var(--color-neutral-800);border:1px solid var(--color-neutral-700);border-radius:var(--radius-md);padding:14px;opacity:0.5">'
      + '<div style="flex:1"><div style="font-size:15px;font-weight:500">' + esc(s.title) + '</div><div style="font-size:12px;color:var(--color-neutral-400)">' + esc(s.en) + '</div></div>'
      + '<div style="font-size:12px;color:var(--color-neutral-400)">準備中</div></div>';
  }

  function renderList() {
    var el = document.getElementById('tab-practice');
    if (!loaded) { el.innerHTML = '<div class="card"><div style="padding:24px;text-align:center;color:var(--color-neutral-400)">読み込み中…</div></div>'; loadProgress().then(renderList); return; }

    var pending = window.App.state.pendingOpenScriptId;
    if (pending) { window.App.state.pendingOpenScriptId = null; openScriptDetail(pending); return; }
    if (openScript) { renderDetail(); return; }

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
      html += '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:4px">9月第3週の旅行に向けて（準備中）</div>';
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
    if (!s || TRAVEL_SCRIPTS.indexOf(s) !== -1) { if (TRAVEL_SCRIPTS.some(function (t) { return t.id === id; })) { App.toast('このスクリプトは準備中です'); return; } }
    openScript = s;
    practiceMode = 'shadow'; showMeaning = false; lastRecDataUrl = ''; isRec = false; isPlaying = false;
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
      if (w === '/') return '<span class="word-slash" style="color:var(--color-neutral-600);margin:0 2px">/</span>';
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
    var tips = (s.analyzed && s.analyzed.pronunciationTips || []).map(function (t) { return '<div style="font-size:12px;color:var(--color-neutral-300);padding:4px 0">🎯 ' + esc(t) + '</div>'; }).join('');
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

    html += '<div id="pt-words" style="font-size:16px;line-height:2.1;color:var(--color-neutral-200);margin-top:14px">' + wordSpansHtml(s) + '</div>';

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
      mediaRec.start(100);
      isRec = true;
      renderDetail();
      if (practiceMode === 'shadow' && !isPlaying) doSpeak();
    }).catch(function () { App.toast('マイクへのアクセスを許可してください'); });
  }
  function stopRec() {
    if (mediaRec && isRec) {
      try { if (mediaRec.state === 'recording') mediaRec.requestData(); } catch (e) {}
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

  // ── AI evaluation (ported verbatim: evalRec prompt / showAIFeedback) ──
  function evalRec(mode) {
    var fb = document.getElementById('pt-feedback');
    if (!S.GEM_KEY) {
      fb.innerHTML = '<div class="card" style="margin-top:10px">'
        + '<div style="font-size:12px;color:var(--color-warning);margin-bottom:8px">GeminiキーがURLにありません（自己評価で記録します）</div>'
        + '<div style="display:flex;gap:8px">'
        + '<button class="btn btn-secondary" style="flex:1;font-size:12px" onclick="PracticeTab.selfEval(\'bad\',\'' + mode + '\')">😕 難しい</button>'
        + '<button class="btn btn-secondary" style="flex:1;font-size:12px" onclick="PracticeTab.selfEval(\'ok\',\'' + mode + '\')">🙂 まあまあ</button>'
        + '<button class="btn btn-primary" style="flex:1;font-size:12px" onclick="PracticeTab.selfEval(\'good\',\'' + mode + '\')">😄 できた</button>'
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
      var promptText = 'You are an English pronunciation coach evaluating a Japanese business professional.\n'
        + 'This speaker is a Japanese native learning business English.\n'
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
          + '<div style="font-size:13px;color:var(--color-error);margin-bottom:8px">⚠️ AI評価エラー: ' + esc(e.message || '不明なエラー') + '</div>'
          + '<div style="display:flex;gap:8px">'
          + '<button class="btn btn-secondary" style="flex:1;font-size:12px" onclick="PracticeTab.selfEval(\'bad\',\'' + mode + '\')">😕 難しい</button>'
          + '<button class="btn btn-secondary" style="flex:1;font-size:12px" onclick="PracticeTab.selfEval(\'ok\',\'' + mode + '\')">🙂 まあまあ</button>'
          + '<button class="btn btn-primary" style="flex:1;font-size:12px" onclick="PracticeTab.selfEval(\'good\',\'' + mode + '\')">😄 できた</button>'
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
    var str = (r.strengths || []).map(function (s) { return '<li>✅ ' + esc(s) + '</li>'; }).join('');
    var imp = (r.improvements || []).map(function (s) { return '<li>💡 ' + esc(s) + '</li>'; }).join('');
    var advance = r.canAdvance ? '<div style="color:var(--color-success);font-size:13px;margin-top:8px">🎉 クリア！</div>' : '<div style="font-size:12px;color:var(--color-neutral-400);margin-top:8px">📌 ' + esc(r.nextStepAdvice || '') + '</div>';
    fb.innerHTML = '<div class="card" style="margin-top:10px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:44px;height:44px;border-radius:50%;background:' + col + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600">' + r.score + '</div>'
      + '<div><div style="font-weight:500">' + esc(r.scoreLabel || '') + '</div><div style="font-size:11px;color:var(--color-neutral-400)">' + (r.passed ? '✅ クリア' : '練習を続けましょう') + '</div></div></div>'
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

  window.PracticeTab = {
    setCategory: setCategory, toggleEditList: toggleEditList, moveScript: moveScript, toggleHidden: toggleHidden,
    openScript: openScriptDetail, closeScript: closeScript, setMode: setMode, setRate: setRate, toggleMeaning: toggleMeaning,
    togglePlay: togglePlay, toggleRec: toggleRec, retryRec: retryRec, evalRec: evalRec, selfEval: selfEval,
  };
  App.registerTab('practice', { onShow: renderList });
})();
