// Model adapters. GLM, DeepSeek and OpenAI all speak the OpenAI chat-completions shape, so they
// share one adapter and differ only by base URL. Anthropic has its own Messages format.
//
// Calls go through the local dev server's /ai/complete rather than straight from the page. Two
// reasons: browsers are blocked from most provider endpoints by CORS, and the key then stays on
// the machine running the server instead of being embedded in a page that could be published.

// Common models per vendor, offered as a dropdown so nobody has to remember exact ids. The list
// is a convenience, not a registry: model names churn constantly, so every slot still accepts a
// hand-typed id through the "手动输入" choice.
export const MODEL_CHOICES={
 glm:['glm-5.3','glm-5.3-flash','glm-5.2','glm-5-turbo','glm-4.7','glm-4.6'],
 'glm-coding':['glm-5.3','glm-5.3-flash','glm-5.2','glm-5-turbo','glm-4.7'],
 deepseek:['deepseek-v4-flash','deepseek-v4-pro','deepseek-chat'],
 openai:['gpt-5.2','gpt-5.1','gpt-5-mini','gpt-4o-mini'],
 anthropic:['claude-sonnet-5','claude-fable-5-1','claude-opus-5','claude-haiku-4-5'],
 typesafe:['jev-latest','jev-preview'],
 custom:[],
};

export const PROVIDERS={
 glm:{label:'GLM (智谱)',base:'https://open.bigmodel.cn/api/paas/v4',model:'glm-5.3',kind:'openai'},
 // A Coding Plan key is not a regular API key: it only works against the coding endpoint.
 'glm-coding':{label:'GLM Coding Plan',base:'https://open.bigmodel.cn/api/coding/paas/v4',model:'glm-5.3',kind:'openai'},
 deepseek:{label:'DeepSeek',base:'https://api.deepseek.com/v1',model:'deepseek-v4-flash',kind:'openai'},
 openai:{label:'OpenAI / Codex',base:'https://api.openai.com/v1',model:'gpt-4o-mini',kind:'openai'},
 anthropic:{label:'Claude',base:'https://api.anthropic.com/v1',model:'claude-sonnet-5',kind:'anthropic'},
 // TypeSafe's Jev is a System One model, not a chat model: it returns typed answers with
 // calibrated probabilities instead of text, so it goes through judge() rather than complete().
 typesafe:{label:'TypeSafe Jev',base:'https://api.typesafe.ai/v1',model:'jev-latest',kind:'typesafe'},
 custom:{label:'自定义 (OpenAI 兼容)',base:'',model:'',kind:'openai'},
};

/**
 * People paste whatever their provider's docs show, which is usually the full completions URL.
 * The adapter appends its own endpoint path, so a pasted one has to come off first — otherwise
 * Groq-style bases turn into /chat/completions/chat/completions and 404.
 */
export function normaliseBase(url){
 return String(url||'').trim()
  .replace(/\/+$/,'')
  .replace(/\/(chat\/completions|completions|messages|models)$/,'')
  .replace(/\/+$/,'');
}

/**
 * The user turn, with an optional JPEG frame for vision-capable models. Each wire format spells
 * multimodal content differently; text-only stays a plain string so non-vision models see no change.
 */
export function buildUserContent(kind,text,image){
 if(!image)return text;
 const b64=String(image).replace(/^data:image\/\w+;base64,/,'');
 if(kind==='anthropic')return [
  {type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}},
  {type:'text',text},
 ];
 return [
  {type:'image_url',image_url:{url:String(image)}},
  {type:'text',text},
 ];
}

function buildRequest({provider,model,system,user,image,maxTokens=220,temperature=0.7}){
 const preset=PROVIDERS[provider]||PROVIDERS.custom;
 const content=buildUserContent(preset.kind,user,image);
 if(preset.kind==='anthropic'){
  return {
   path:'/messages',
   body:{model,max_tokens:maxTokens,system,messages:[{role:'user',content}]},
  };
 }
 return {
  path:'/chat/completions',
  body:{model,max_tokens:maxTokens,temperature,
   messages:[{role:'system',content:system},{role:'user',content}]},
 };
}

function extractText(kind,payload){
 if(kind==='anthropic')return (payload?.content||[]).filter(p=>p.type==='text').map(p=>p.text).join('');
 return payload?.choices?.[0]?.message?.content??'';
}

function usageOf(kind,payload){
 const u=payload?.usage||{};
 return kind==='anthropic'
  ? {in:u.input_tokens||0,out:u.output_tokens||0}
  : {in:u.prompt_tokens||0,out:u.completion_tokens||0};
}

/**
 * Ask a model for one decision.
 * Returns {text, usage, ms}. Throws with a readable message on any transport or provider error.
 */
export async function complete({provider,model,apiKey,base,system,user,image,signal,temperature,proxy='/ai/complete'}){
 const preset=PROVIDERS[provider]||PROVIDERS.custom;
 const {path,body}=buildRequest({provider,model:model||preset.model,system,user,image,temperature});
 const started=performance.now();
 const res=await fetch(proxy,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  signal,
  body:JSON.stringify({provider,kind:preset.kind,base:normaliseBase(base||preset.base),path,apiKey,body}),
 });
 const ms=performance.now()-started;
 const payload=await res.json().catch(()=>null);
 if(!res.ok){
  const detail=payload?.error?.message||payload?.error||payload?.message||res.statusText;
  // The single most common failure deserves a way out, not just a code.
  const hint=/unsupported model|model.*not.*(exist|found)|无该模型|不存在的模型/i.test(String(detail))
   ?'（这个端点不认识该模型 id——点「拉取模型」看看这个 key 实际能用哪些）':'';
  throw new Error(`${res.status} ${detail}${hint}`.slice(0,260));
 }
 return {text:extractText(preset.kind,payload),usage:usageOf(preset.kind,payload),ms};
}

/**
 * Ask a System One model to answer several typed questions about one state.
 * Every question is evaluated against the same state in parallel, so asking a question that only
 * matters on some inputs costs a few tokens rather than another round trip.
 * Returns {answers, usage, ms}; throws with a readable message like complete() does.
 */
export async function judge({provider,model,apiKey,base,state,questions,signal,proxy='/ai/complete'}){
 const preset=PROVIDERS[provider]||PROVIDERS.typesafe;
 const started=performance.now();
 const res=await fetch(proxy,{
  method:'POST',headers:{'Content-Type':'application/json'},signal,
  body:JSON.stringify({provider,kind:'typesafe',base:normaliseBase(base||preset.base),
   path:'/systemone',apiKey,body:{state,model:model||preset.model,questions}}),
 });
 const ms=performance.now()-started;
 const payload=await res.json().catch(()=>null);
 if(!res.ok){
  const detail=payload?.error?.message||payload?.error||payload?.detail||payload?.message||res.statusText;
  throw new Error(`${res.status} ${typeof detail==='string'?detail:JSON.stringify(detail)}`.slice(0,260));
 }
 const u=payload?.usage||{};
 return {answers:payload?.answers||{},usage:{in:u.input_tokens||0,out:u.output_tokens||0},ms};
}

/**
 * Pull the decision object out of a reply. Models wrap JSON in prose or fences often enough that
 * a strict parse would throw away otherwise usable answers.
 */
export function parseDecision(text){
 if(!text)return null;
 const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i);
 const body=fenced?fenced[1]:text;
 const start=body.indexOf('{'),end=body.lastIndexOf('}');
 if(start<0||end<=start)return null;
 let parsed;
 try{parsed=JSON.parse(body.slice(start,end+1));}catch{return null;}
 if(!parsed||typeof parsed!=='object')return null;
 const go=parsed.go;
 const item=['throw','use'].includes(parsed.item)?parsed.item:null;
 return {
  go:go===null||go===undefined?null:go,
  item,
  target:parsed.target??null,
  plan:typeof parsed.plan==='string'?parsed.plan.trim().slice(0,30):null,
  why:typeof parsed.why==='string'?parsed.why.slice(0,60):'',
 };
}

/**
 * One tiny round trip to prove key, endpoint and model are all usable before a match starts.
 * Costs a handful of tokens by design; that is the price of the answer being real.
 */
export async function testConnection({provider,model,apiKey,base,proxy}){
 if((PROVIDERS[provider]||{}).kind==='typesafe'){
  const {answers,ms}=await judge({provider,model,apiKey,base,proxy,
   state:'一名玩家血量只剩 1，脚下的平台正在崩塌。',
   questions:{ok:{type:'noul',instructions:'这名玩家处境危险。'}}});
  const noul=answers?.ok?.noul;
  if(typeof noul!=='number')throw new Error('模型没有返回可用的答案');
  return {ms:Math.round(ms),sample:`noul ${noul.toFixed(2)}`};
 }
 const {text,ms}=await complete({provider,model,apiKey,base,proxy,temperature:0,
  system:'Reply with exactly: ok',user:'ping'});
 if(!text)throw new Error('模型返回了空内容');
 return {ms:Math.round(ms),sample:text.trim().slice(0,40)};
}

/** Both wire formats answer GET /models with {data:[{id}...]}; anything else is treated as empty. */
export function parseModelList(payload){
 const rows=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
 return rows.map(r=>r?.id??r?.name).filter(id=>typeof id==='string'&&id.length>0).sort();
}

/**
 * Ask the endpoint which models this key can actually use. This is the honest version of a model
 * dropdown: static lists rot, and "Unsupported model" after a match starts helps nobody.
 */
export async function listModels({provider,apiKey,base,proxy='/ai/complete'}){
 const preset=PROVIDERS[provider]||PROVIDERS.custom;
 const res=await fetch(proxy,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({provider,kind:preset.kind,base:normaliseBase(base||preset.base),path:'/models',method:'GET',apiKey}),
 });
 const payload=await res.json().catch(()=>null);
 if(!res.ok){
  const detail=payload?.error?.message||payload?.error||res.statusText;
  throw new Error(`${res.status} ${detail}`.slice(0,200));
 }
 const models=parseModelList(payload);
 if(!models.length)throw new Error('端点没有返回模型列表');
 return models;
}

/** Lessons come back as a JSON array of short strings; anything else is salvaged or dropped. */
export function parseLessonList(text){
 if(!text)return [];
 const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i);
 const body=fenced?fenced[1]:text;
 const start=body.indexOf('['),end=body.lastIndexOf(']');
 if(start<0||end<=start)return [];
 try{
  const arr=JSON.parse(body.slice(start,end+1));
  return (Array.isArray(arr)?arr:[]).filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean).map(x=>x.slice(0,40)).slice(0,5);
 }catch{return [];}
}
