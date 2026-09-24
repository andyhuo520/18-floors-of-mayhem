export function strikeBoss(b,damage,t){
 if(b.hp<=0)return;
 const oldHp=b.hp,oldGuard=b.guard;
 if(b.guard>0){b.guard=Math.max(0,b.guard-damage);if(!b.guard)b.brokenUntil=t+5;}
 else b.hp=Math.max(0,b.hp-damage*(t<(b.brokenUntil||0)?1.5:1));
 b.hits=(b.hits||[]).filter(h=>t-h.at<1).slice(-7);b.hits.push({at:t,hp:oldHp-b.hp,guard:oldGuard-b.guard,x:b.x,y:b.y});
 b.hitAt=t;
}
export function recoverGuard(b,t){if(b.guard===0&&b.hp>0&&t>=(b.brokenUntil||Infinity)){b.guard=b.maxGuard;b.brokenUntil=0;}}
export function bossMove(index,cycle){return [
 ['金箍棒横扫','腾云飞踢','金光分身'],['钉耙横扫','钉耙重砸'],['月牙铲劈击','流沙波'],['炎斧劈落','烈焰'],['骨爪','骨雨'],['火轮','三昧火'],['蛛腿横扫','蛛网'],['雷翅拍击','雷羽'],['魔掌','莲弹']
 ][index%9][cycle%([0].includes(index%9)?3:2)];}
