export const WORLD_SPAN=1200;
export const WORLDS=[
 {name:'根系果园',kind:'root',music:'space',colors:['#071f28','#123c37','#285a40','#7da856','#cfe089'],tip:'先找落点。按 S 穿过平台，别一次落空太深。'},
 {name:'荧光菌林',kind:'glow',music:'space',colors:['#101e30','#173844','#286061','#72d8b1','#c5fbd5'],tip:'蘑菇开始发光。易碎桥踩上后只有一秒多。'},
 {name:'地下河道',kind:'water',music:'searching',colors:['#091f35','#123951','#236b81','#66bdd1','#b9e8e6'],tip:'路线有分岔。宁可多落一次，也别赌看不见的底。'},
 {name:'水晶地壳',kind:'crystal',music:'searching',colors:['#171a36','#2b3450','#4e6487','#9abddc','#e1dafa'],tip:'移动平台要看方向。朝它将要到的位置跳。'},
 {name:'熔岩地心',kind:'fire',music:'pressure',colors:['#2c1927','#58303a','#995044','#e89557','#ffe0a1'],tip:'黄灯是预警，红色尖刺不能踩。旁边有安全路线。'},
 {name:'月面遗迹',kind:'moon',music:'searching',colors:['#151e33','#2c3b4b','#576475','#9babb3','#e5e3d1'],tip:'已经穿过地球。弹簧会弹起，落回后有短暂冷却。'},
 {name:'火星裂谷',kind:'mars',music:'pressure',colors:['#291824','#542b34','#885042','#d88159','#f3c48c'],tip:'别在传送带上发呆。反方向移动才能抵消推力。'},
 {name:'小行星带',kind:'asteroid',music:'pressure',colors:['#111629','#262d42','#4e5369','#a49b94','#e7d5b1'],tip:'紧凑的交错路线来了。靠近平台边缘，缩短横移。'},
 {name:'冰环星球',kind:'ice',music:'space',colors:['#0c2036','#193e56','#3c728a','#8ed8dd','#dff7ef'],tip:'碎裂平台不会等你。提前判断下一次落点。'},
 {name:'紫色星云',kind:'nebula',music:'space',colors:['#0e102d','#241d49','#543467','#a3669c','#c7bef1'],tip:'没有切关，速度还在增加。保持自己的节奏。'},
 {name:'星际航道',kind:'orbit',music:'pressure',colors:['#040b1c','#0d1735','#163553','#4f98b0','#c2f2ee'],tip:'距离纪录越来越近。侧边小平台也能救命。'},
 {name:'黑洞边缘',kind:'blackhole',music:'searching',colors:['#080b1a','#19172d','#433451','#b18a9f','#f3d7b3'],tip:'这里没有尽头。活得更久，才有下一次落地。'}
].map((z,i)=>({...z,range:i===11?`${i*120} m → ∞`:`${i*120}—${(i+1)*120} m`}));
export const worldIndex=scroll=>Math.min(WORLDS.length-1,Math.floor(Math.max(0,scroll)/WORLD_SPAN));
export const ROUTES=[
 {name:'交错落点',positions:[120,420,135,425],width:315},
 {name:'阶梯走廊',positions:[145,240,335,410],width:315},
 {name:'双路分岔',positions:[150,410,145,415],width:300},
 {name:'易碎桥群',positions:[190,345,220,390],width:320},
 {name:'移动廊道',positions:[135,410,165,405],width:320},
 {name:'弹跳传送井',positions:[185,350,210,400],width:320}
];

export const BATTLEFIELDS=[
 {name:'倒悬果园',type:'seesaw',tip:'重心倾斜 · 踩上 4 秒断裂'},
 {name:'巨菇回廊',type:'spring',tip:'弹性菌盖 · 落地自动弹起'},
 {name:'激流闸门',type:'conveyor',tip:'水流推送 · 逆流控制落点'},
 {name:'碎晶圣殿',type:'crumble',tip:'晶面开裂 · 一秒内离开'},
 {name:'地心熔炉',type:'spring',tip:'喷气弹射 · 注意头顶危险线'},
 {name:'月面发射台',type:'spring',tip:'强力弹射 · 提前选择落点'},
 {name:'火星采矿带',type:'conveyor',tip:'运输沙带 · 反向移动抵消推力'},
 {name:'漂流陨石群',type:'moving',tip:'横向漂移 · 瞄准未来位置'},
 {name:'冰环浮岛',type:'moving',tip:'冰岛漂移 · 留意平台边缘'},
 {name:'星云幻桥',type:'crumble',tip:'触碰消散 · 不要停留'},
 {name:'星际输送港',type:'conveyor',tip:'快速输送 · 向下一块残骸跳'},
 {name:'引力天平',type:'seesaw',tip:'重心倾斜 · 引力拉向台心'}
];
