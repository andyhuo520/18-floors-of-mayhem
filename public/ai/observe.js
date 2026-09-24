// What an AI player is allowed to see, and how little of it we can get away with sending.
// Every field here costs tokens on every decision, so this is deliberately the view a human has
// on screen rather than the whole world: reachable platforms, visible rivals, and own state.
import {candidates} from './controller.js';
import {H} from '../engine.js';
import {summariseHistory} from './maxims.js';

const round=v=>Math.round(v);

function describePlatform(g,me,f){
 const item=g.items.find(i=>!i.collected&&i.platformId===f.id);
 const out={
  id:f.id,
  dx:round(f.x+f.w/2-me.x),        // sideways distance, signed: negative is left
  down:round(f.y-me.y),            // how far below us it sits
  w:round(f.w),
  type:f.type,
 };
 if(item)out.item=item.type;
 if(f.beast)out.beast=f.beastPhase||'lurk';
 if(f.type==='pulse')out.spikes=f.active?'out':f.warning?'warning':'in';
 if(f.breakAt)out.crumblesIn=Number(Math.max(0,f.breakAt-g.t).toFixed(1));
 return out;
}

/**
 * Build the observation for one player.
 * Distances are relative to the player so the model never has to do coordinate arithmetic.
 */
export function observe(g,me){
 const rivals=g.players.filter(p=>p.id!==me.id&&p.alive&&!p.downed).map(p=>({
  id:p.id,name:p.name,
  dx:round(p.x-me.x),dy:round(p.y-me.y),
  hp:p.hp,shield:!!p.shield,
  carry:p.carry||null,
 })).sort((a,b)=>Math.abs(a.dx)+Math.abs(a.dy)-Math.abs(b.dx)-Math.abs(b.dy));

 const height=round(me.y-g.camera);
 return {
  mode:g.rules.mode,
  t:Number(g.t.toFixed(1)),
  me:{
   hp:me.hp,maxHp:me.maxHp,shield:!!me.shield,carry:me.carry||null,
   lastHit:me.lastHit||null,
   metres:me.meters,
   // What this player has done so far this match; the System One state turns it into a sentence.
   stats:{heals:me.stats?.heals??0,hits:me.stats?.hits??0,passes:me.stats?.passes??0,throwHits:me.stats?.throwHits??0},
   onPlatform:me.ground??null,
   // The corridor is the whole survival problem: too high and the danger line takes you, too low
   // and there is nothing left below to land on.
   corridor:{height,ceiling:22,floor:H+65},
   fallenSinceLanding:round(me.y-me.lastSafe),
  },
  // Only what can actually be reached without a fatal fall; anything else is noise.
  reachable:candidates(g,me).map(f=>describePlatform(g,me,f)).sort((a,b)=>a.down-b.down).slice(0,8),
  rivals:rivals.slice(0,5),
  alive:g.players.filter(p=>p.alive).length,
 };
}

export const ACTION_SCHEMA=`Reply with one JSON object and nothing else:
{"go": <platform id from reachable, or null>, "item": "throw" | "use" | null, "target": <rival id or null>, "plan": "<你的阶段策略，≤15字，可延续可改写>", "why": "<8 words max>"}
- "go" is both movement AND shopping: picking up an item means choosing the platform that lists it. There is no separate pickup action.
- "item" spends what you carry NOW: "use" on yourself (heart heals +1, shield arms you; poison cannot be eaten), "throw" hurls it at "target".
- Throwing poison costs that rival one life. Throwing a heart or shield HELPS whoever catches it — almost never what you want.
- "target" is required when "item" is "throw".
- "plan" 是你的工作记忆：上一次的 plan 会原样带回给你，延续它或改写它。围绕它做决定，行为才有连贯性。`;

export const SYSTEM_PROMPT=`你在玩「真男人就下 18 层」，一场多人坠落淘汰赛。最后活着的人赢。

【生存】世界自动向下滚动。corridor.height 是你在画面里的高度：低于 120 会被顶部危险线杀死（必须继续往下）；高于 620 会掉出画面（别贪快）。fallenSinceLanding 超过 430 会摔死——一次只下一两层。理想是每次落到 down 在 120~220 之间的平台，保持在走廊中段。

【你的手不用管】本地控制器负责起跳、对位、落地。你只做两个决定：go 去哪块平台；item 怎么用手里的道具。你的价值在选择，不在手速。

【道具是胜负手，规则如下】
- 平台条目里的 item 字段就是货架：想要它，就把 go 指到那块平台，落地即入包。背包容量 1，手里有东西就捡不了新的。
- heart 红心：hp<3 时 use 立刻回血。你只有 1~3 条命，这是最重要的资源。
- shield 护盾：use 后挡下一次伤害。拿到就穿，留着没用。
- poison 毒果：你的武器，只能 throw。优先扔 metres 领先的对手；对方有 shield 时会被挡掉，可以先骗盾再补刀。
- 把红心/护盾扔出去是在资敌，除非你想演。

【环境威胁】type=crumble 落地后约 1 秒塌，crumblesIn 是剩余秒数；spikes 字段 warning/out 时别去；beast 字段不是 lurk 时那块平台会被巨爪掰碎——但也可以把对手往那引。

【决策优先级】1) 活下去（走廊高度与安全落点）2) hp 不满且视野里有 heart：绕路去拿也值得 3) 手里有毒果且有对手：找机会扔 4) 其余时间稳步下降，别在一块平台上恋战。
用 JSON 回答，果断，别解释。`;

/**
 * Lessons from earlier matches, written by the model itself, ride along on the next one.
 * This is the whole "evolution" loop: play, reflect, remember, replay.
 */
export function buildSystemPrompt(lessons=[]){
 if(!lessons.length)return SYSTEM_PROMPT;
 return SYSTEM_PROMPT+`\n\n【你自己上几局总结的战训——优先执行】\n`+lessons.map((l,i)=>`${i+1}. ${l}`).join('\n');
}

export function buildReflectionPrompt(report,prevLessons=[]){
 const prev=prevLessons.length?`你上一局带着的战训：${JSON.stringify(prevLessons)}\n`:'';
 return `你刚打完一局。战报：${JSON.stringify(report)}\n`+prev+
  `字段含义：rank 名次(1 最好)，meters 深度，reason 死因，hp 终局血量，heals 吃心次数，throwHits 毒果命中，hitsTaken 被打次数，itemsPicked 捡道具数。\n`+
  (prev?`逐条评估旧战训：本局起了作用的保留，没用或有害的删除或改写，再按本局教训新增。\n`:'')+
  `输出下一局要带的完整战训清单（1~5 条，每条不超过 20 字，具体可执行）。只输出 JSON 字符串数组，例如 ["血不满先去拿红心"]。这份清单会完整替换旧的。`;
}

/** Trim an observation to the bytes actually worth sending. */
export function serialiseObservation(view){
 return JSON.stringify(view);
}


// ---- System One 编码 --------------------------------------------------------------------------
// Jev 读的是语义，不是坐标。离线对照里，把 {dx:-180,down:205,w:96} 原样送过去时，在「有危险平台也
// 有安全平台」的 70 个真实局面上踩坑率 6%；换成下面这种命名分桶后是 0%，置信度中位数从 0.82 升到
// 0.97，token 反而更少。几何、可达性、坠落上限仍然留在 controller.js 里算——模型只做取舍。
const ITEM_ZH={heart:'红心(回血)',shield:'护盾',poison:'毒果(武器)',time:'时钟',freeze:'冰冻'};
const TYPE_ZH={solid:'实心台',moving:'移动台',crumble:'踩碎台',spring:'弹簧台',conveyor:'传送带',pulse:'尖刺台',seesaw:'跷跷板'};

/** One reachable platform, described the way a person would say it out loud. */
export function describeLedge(f){
 const side=Math.abs(f.dx)<60?'正下方':(f.dx<0?'偏左':'偏右')+(Math.abs(f.dx)<200?'一点':'很远');
 const step=f.down<110?'很小的一步':f.down<=230?'理想的一步':f.down<=300?'较大的一步':'极限一跳';
 const width=f.w<100?'很窄':f.w<130?'偏窄':f.w<200?'正常宽':'很宽';
 const parts=[side,step,width,TYPE_ZH[f.type]||f.type];
 if(f.item)parts.push('上面有 '+(ITEM_ZH[f.item]||f.item));
 if(f.spikes==='out')parts.push('尖刺已弹出，踩上去就受伤');
 else if(f.spikes==='warning')parts.push('尖刺即将弹出');
 if(f.beast&&f.beast!=='lurk')parts.push('巨爪正在掰碎它');
 else if(f.beast)parts.push('墙边有巨爪潜伏');
 if(f.crumblesIn!=null)parts.push(f.crumblesIn<1?'已经在塌，撑不到 1 秒':'落地约 1 秒后塌');
 return parts.join('；');
}

/** The same observation, re-expressed as named facts rather than numbers. */
export function buildJevState(view,{history=[]}={}){
 const me=view.me,h=me.corridor.height;
 const st=me.stats||{};
 const soFar=[st.heals?`吃心 ${st.heals} 次`:'',st.passes?`扔道具 ${st.passes} 次`:'',st.throwHits?`命中 ${st.throwHits} 次`:'',st.hits?`被打 ${st.hits} 次`:''].filter(Boolean);
 return {
  我的状态:{
   生命:`${me.hp}/${me.maxHp}`,
   手里拿着:me.carry?(ITEM_ZH[me.carry]||me.carry):'空手',
   走廊位置:h<170?'贴近顶部危险线，必须马上下降':h<320?'走廊中段，位置舒服':'偏低，下方可选的落点在变少',
   已下降:`${me.metres}m`,
  },
  // Memory the model can condition on: nothing is trained, it simply reads what happened.
  经历:{本局至今:soFar.length?soFar.join(' · '):'还没捡到或用过道具',...(history.length?{最近几局:summariseHistory(history)}:{})},
  可去的平台:Object.fromEntries(view.reachable.map(f=>[String(f.id),describeLedge(f)])),
  对手:Object.fromEntries(view.rivals.map(p=>[p.id,
   `${p.name}，${Math.abs(p.dy)<40?'同高':p.dy<0?'在上方':'在下方'}，生命 ${p.hp}`+(p.shield?'，有盾':'')])),
  场上剩余:view.alive,
 };
}

/**
 * The questions to ask about one state. Independent questions ride along in the same request:
 * `item_action` and `target` are answered even when nothing is carried, and the code ignores them.
 */
export function buildJevQuestions(view,persona,lessons=[]){
 // Selected maxims read like the LLM seats' own notes: numbered, and asked to be followed.
 const learned=lessons.length?'\n上几局总结的战训，优先执行：'+lessons.map((l,i)=>`${i+1}. ${l}`).join('；'):'';
 const qs={};
 // A Choice needs options. With fewer than two reachable ledges there is nothing to choose between
 // — and with none at all an empty criteria map is a 400 — so the question is simply not asked and
 // the local controller keeps the wheel. The item questions below still ride along.
 if(view.reachable.length>=2)qs.go={type:'choice',
   instructions:'从 `可去的平台` 里选出下一步应该落到哪一块。优先活下来：避开尖刺已弹出或即将弹出的、正被巨爪掰碎的、已经在塌的平台。生命不满时，有红心的平台值得绕路。参考 `经历` 里自己的近况。'
    +learned+(persona?`\n这名选手的性格：${persona}。在不违反上面生存要求的前提下体现它。`:''),
   criteria:Object.fromEntries(view.reachable.map(f=>[String(f.id),describeLedge(f)]))};
 qs.item_action={type:'choice',
  instructions:'假设你手里有道具，现在该怎么处置它。背包只有一格：手里的东西不处理掉，就捡不到平台上的红心。'
   +(view.rivals.length?'':'场上已经没有对手：毒果和冰冻果无人可打，扔掉它是腾出手的唯一办法。')+learned,
  criteria:{use:'自己用掉：红心回血，护盾穿上；毒果和冰冻果不能吃',throw:'扔出去：有对手时朝对手扔，没对手时扔掉腾手',hold:'先留着：红心满血时、护盾已生效时留着备用才划算'}};
 if(view.rivals.length)qs.target={type:'choice',
  instructions:'假设你要朝一名对手扔毒果，扔谁最划算。领先得多的更值得打断。',
  criteria:Object.fromEntries(view.rivals.map(p=>[p.id,`${p.name}，生命 ${p.hp}`+(p.shield?'，有盾会挡掉':'')]))};
 return qs;
}

/**
 * Whether this tick is worth a request at all. Across 240 simulated matches only 18-23% of
 * grounded decision points had two or more reachable platforms: the rest offer no choice to make,
 * and asking anyway spends latency and tokens on a question with one answer.
 */
export function worthAsking(view){
 return view.reachable.length>=2||!!view.me.carry;
}
