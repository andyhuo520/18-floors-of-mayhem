const MOODS=['嘴硬的','倒着走的','偷偷摆烂的','只会尖叫的','穿拖鞋的','拒绝加班的','怕高的','假装镇定的','正在漏气的','一碰就碎的','宇宙无敌的','迷路的','不想下班的','自带音效的','刚睡醒的','蹦跶的','喝高的','脆皮的','掉线的','不服气的'];
const FOODS=['西瓜','土豆','柠檬','榴莲','年糕','草莓','菠萝','葡萄','冬瓜','布丁','锅巴','豆包','番茄','芒果','咸鱼','香蕉','水蜜桃','小笼包','火龙果','臭豆腐'];
const ROLES=['侠','队长','大王','猛男','战神','阿牛','鸭鸭','猫爷'];
export function randomName(random=Math.random){const pick=a=>a[Math.min(a.length-1,Math.max(0,Math.floor(random()*a.length)))];return pick(MOODS)+pick(FOODS)+pick(ROLES);}
export function cleanName(value){return typeof value==='string'?Array.from(value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').trim()).slice(0,12).join(''):'';}
// A finite random bank alone cannot guarantee uniqueness: check actual reservations.
export function uniqueName(requested,taken,random=Math.random){
 const name=cleanName(requested)||randomName(random);if(!taken.has(name))return name;
 for(let i=0;i<16;i++){const candidate=randomName(random);if(!taken.has(candidate))return candidate;}
 for(let i=2;;i++){const suffix='·'+i, candidate=Array.from(name).slice(0,12-suffix.length).join('')+suffix;if(!taken.has(candidate))return candidate;}
}
