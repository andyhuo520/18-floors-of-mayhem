// Lessons for a System One seat are selected, not written. Jev returns judgments rather than prose,
// so instead of asking it to compose its own post-match notes (the LLM seats' reflect loop), the
// match report is judged against a fixed library of tactical maxims and the ones the report
// supports ride into the next match's instructions. Same slot, same UI, same 5-line cap.

export const MAXIMS=[
 // 生存 —— 判断依据直接引用 `战报` 的字段：Jev 按字面判断，不替你把「手里有毒果」推断成「没扔出去」。
 {id:'crumble_no_linger',text:'踩碎台落地即走，别停留',when:'`死因` 提到踩碎台、塌陷或平台碎裂'},
 {id:'spikes_never',text:'尖刺预警或弹出时绝不落上去',when:'`死因` 提到尖刺'},
 {id:'beast_avoid',text:'巨爪不在潜伏状态就绕开那块台',when:'`死因` 提到巨爪、巨兽或被掰碎'},
 {id:'descend_early',text:'走廊偏高就马上下降，别贪',when:'`死因` 提到危险线、顶部或被追上'},
 {id:'one_step',text:'一次只下一两层，别极限跳',when:'`死因` 是摔死或掉出安全区域'},
 {id:'narrow_detour',text:'很窄的台宁可绕路',when:'`死因` 提到失足或窄台'},
 // 道具
 {id:'heart_first',text:'血不满时红心优先于下降',when:'`终局血量` 低于 3/3，并且 `吃心次数` 为 0'},
 {id:'shield_now',text:'捡到护盾立刻穿上',when:'`终局手持` 是护盾，并且 `被打次数` 大于 0（护盾拿在手里没穿，却挨了打）'},
 {id:'poison_dump',text:'独活时先扔掉毒果腾出手',when:'`终局手持` 是毒果，并且 `是否独自存活到最后` 是「是」'},
 {id:'poison_leader',text:'有毒果就找机会扔领先的对手',when:'`毒果命中次数` 为 0 且 `名次` 不是第 1'},
 {id:'heart_keep',text:'满血时红心留着别浪费',when:'`扔出道具次数` 大于 `毒果命中次数`，说明扔掉过非武器道具'},
 // 对手
 {id:'shield_bait',text:'对手有盾先骗盾再补刀',when:'`战报` 提到毒果被护盾挡住'},
 {id:'below_rival',text:'别站在对手正下方',when:'`死因` 提到被对手扔来的东西打中'},
 {id:'endgame_safe',text:'只剩两人时保命优先于进攻',when:'`名次` 是第 2 且 `死因` 不是摔死'},
 // 节奏
 {id:'trust_fallback',text:'拿不准就交给本地控制器',when:'`战报` 提到低置信度或犹豫'},
];

const byId=Object.fromEntries(MAXIMS.map(m=>[m.id,m]));

/** One human-readable line per past match, for the state. */
export function summariseHistory(history=[]){
 return history.slice(-3).map((r,i)=>{
  const bits=[`${r.meters??0}m`];
  if(r.reason)bits.push(r.reason);
  if(r.throwHits)bits.push(`毒果命中 ${r.throwHits} 次`);
  if(r.heals)bits.push(`吃心 ${r.heals} 次`);
  if(r.hitsTaken)bits.push(`被打 ${r.hitsTaken} 次`);
  if(r.rank)bits.push(`第 ${r.rank} 名`);
  return `上${['一','二','三'][history.slice(-3).length-1-i]}局：`+bits.join(' · ');
 }).reverse();
}

/**
 * The post-match request: the report is the state, one Noul per maxim rides in the same call.
 * Each question names the exact condition the maxim answers, so the model judges evidence in the
 * report rather than whether the maxim sounds wise in general (it always does).
 */
export function buildReflectionQuestions(){
 return Object.fromEntries(MAXIMS.map(m=>[m.id,{type:'noul',
  instructions:`\`战报\` 表明这名选手下一局应当特别执行「${m.text}」。成立的条件：${m.when}。请核对 \`战报\` 里对应的字段。`}]));
}

/** Pick the maxims the report supports: probability at least `min`, at most `max`, strongest first. */
export function selectMaxims(answers={},{max=5,min=0.5}={}){
 return Object.entries(answers)
  .filter(([id,a])=>byId[id]&&typeof a?.noul==='number'&&a.noul>=min)
  .sort((a,b)=>b[1].noul-a[1].noul)
  .slice(0,max)
  .map(([id,a])=>({id,text:byId[id].text,p:a.noul}));
}

const ITEM_ZH={heart:'红心',shield:'护盾',poison:'毒果',time:'时钟',freeze:'冰冻果'};
/** The report as the fields the maxims cite, in the words they cite them with. */
export function describeReport(r={}){
 return {
  名次:r.rank?`第 ${r.rank} 名`:'未排名',
  深度:`${r.meters??0}m`,
  死因:r.reason||'存活到最后',
  终局血量:`${r.hp??0}/3`,
  终局手持:r.carriedAtEnd?ITEM_ZH[r.carriedAtEnd]||r.carriedAtEnd:'空手',
  是否独自存活到最后:r.aloneAtEnd?'是':'否',
  吃心次数:r.heals??0,
  毒果命中次数:r.throwHits??0,
  被打次数:r.hitsTaken??0,
  扔出道具次数:r.passes??r.itemsPicked??0,
 };
}
