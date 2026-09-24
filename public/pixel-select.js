// A native <select> draws its option list through the operating system, so no stylesheet can reach
// it: on macOS the menu stays light grey in a system font, which looks like a different application
// bolted onto the game. This replaces the popup with a listbox we draw ourselves, while keeping the
// original <select> in the DOM as the source of truth so nothing that reads `.value`, assigns to it,
// or listens for `change` has to know this exists.

const OPEN=new Set();

function optionLabel(option){return option.textContent.trim();}

export function enhanceSelect(select){
 if(select.dataset.pixelSelect)return;
 select.dataset.pixelSelect='on';

 const shell=document.createElement('div');
 shell.className='pixel-select';
 const button=document.createElement('button');
 button.type='button';
 button.className='pixel-select-button';
 button.setAttribute('aria-haspopup','listbox');
 button.setAttribute('aria-expanded','false');
 const label=document.createElement('span');
 const caret=document.createElement('i');
 caret.setAttribute('aria-hidden','true');
 caret.textContent='▾';
 button.append(label,caret);
 const list=document.createElement('div');
 list.className='pixel-select-list';
 list.setAttribute('role','listbox');
 list.hidden=true;

 select.parentNode.insertBefore(shell,select);
 shell.append(button,list,select);
 // The native control keeps the value but stops being reachable twice by keyboard or screen reader.
 select.classList.add('pixel-select-native');
 select.setAttribute('aria-hidden','true');
 select.tabIndex=-1;
 if(select.id){
  const tag=document.querySelector(`label[for="${select.id}"]`);
  if(tag)button.setAttribute('aria-label',tag.textContent.trim());
  button.id=select.id+'-button';
  list.id=select.id+'-list';
  list.setAttribute('aria-labelledby',button.id);
 }

 let active=0;

 function render(){
  const options=[...select.options];
  const current=select.selectedIndex;
  label.textContent=current>=0?optionLabel(options[current]):'';
  button.disabled=select.disabled;
  shell.hidden=select.hidden;
  shell.classList.toggle('is-disabled',select.disabled);
  list.replaceChildren(...options.map((option,i)=>{
   const row=document.createElement('div');
   row.className='pixel-select-option'+(i===current?' is-selected':'');
   row.setAttribute('role','option');
   row.setAttribute('aria-selected',String(i===current));
   row.id=(select.id||'sel')+'-opt-'+i;
   row.tabIndex=-1;
   const mark=document.createElement('b');
   mark.setAttribute('aria-hidden','true');
   mark.textContent=i===current?'▸':'';
   const text=document.createElement('span');
   text.textContent=optionLabel(option);
   row.append(mark,text);
   if(option.disabled)row.classList.add('is-off');
   else row.addEventListener('click',()=>choose(i));
   row.addEventListener('mousemove',()=>highlight(i));
   list.append(row);
   return row;
  }));
  highlight(Math.max(0,current));
 }

 function highlight(i){
  active=Math.max(0,Math.min(select.options.length-1,i));
  [...list.children].forEach((row,idx)=>row.classList.toggle('is-active',idx===active));
  const row=list.children[active];
  if(row&&!list.hidden)row.scrollIntoView({block:'nearest'});
  if(row)button.setAttribute('aria-activedescendant',row.id);
 }

 function open(){
  if(select.disabled||list.hidden===false)return;
  for(const other of OPEN)other();
  OPEN.add(close);
  list.hidden=false;
  button.setAttribute('aria-expanded','true');
  shell.classList.add('is-open');
  highlight(select.selectedIndex);
 }
 function close(){
  if(list.hidden)return;
  list.hidden=true;
  button.setAttribute('aria-expanded','false');
  shell.classList.remove('is-open');
  OPEN.delete(close);
 }
 function choose(i){
  const option=select.options[i];
  if(!option||option.disabled)return;
  const changed=select.selectedIndex!==i;
  select.selectedIndex=i;
  close();
  button.focus();
  render();
  // Existing code listens for `change`; a synthetic one keeps that contract intact.
  if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));
 }

 button.addEventListener('click',()=>list.hidden?open():close());
 button.addEventListener('keydown',event=>{
  const keys={ArrowDown:1,ArrowUp:-1};
  if(event.key==='Enter'||event.key===' '||event.key==='Spacebar'){event.preventDefault();list.hidden?open():choose(active);return;}
  if(event.key==='Escape'){if(!list.hidden){event.preventDefault();close();}return;}
  if(event.key==='Home'||event.key==='End'){event.preventDefault();if(list.hidden)open();highlight(event.key==='Home'?0:select.options.length-1);return;}
  if(keys[event.key]===undefined)return;
  event.preventDefault();
  if(list.hidden){
   // Closed arrow keys move the value directly, the way a native select does.
   const next=active+keys[event.key];
   if(next>=0&&next<select.options.length)choose(next);
   return;
  }
  highlight(active+keys[event.key]);
 });
 // Pressing an option must not steal focus from the button. While the browser runs the button's
 // blur, document.activeElement is <body>, so any blur-based "did focus leave?" check answers yes
 // and closes the list between mousedown and click — the option's click then lands on nothing.
 // Keyboard and synthetic .click() never move focus, which is why only real mice ever hit this.
 list.addEventListener('mousedown',event=>event.preventDefault());
 shell.addEventListener('focusout',event=>{if(!shell.contains(event.relatedTarget))close();});

 // Assigning `select.value = x` in application code has to update what the player sees. The
 // property is intercepted on this instance only; the prototype behaviour is unchanged.
 const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
 Object.defineProperty(select,'value',{
  configurable:true,
  get(){return descriptor.get.call(select);},
  set(v){descriptor.set.call(select,v);render();},
 });
 new MutationObserver(render).observe(select,{attributes:true,attributeFilter:['disabled','hidden'],childList:true,subtree:true});
 select.addEventListener('change',render);

 render();
 return {render,close};
}

export function enhanceSelects(root=document){
 for(const select of root.querySelectorAll('select:not([data-pixel-select])'))enhanceSelect(select);
}

// A click anywhere else closes whatever is open, matching how a real menu behaves.
document.addEventListener('pointerdown',event=>{
 for(const close of [...OPEN]){
  const shell=event.target.closest?.('.pixel-select');
  if(!shell)close();
 }
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')for(const close of [...OPEN])close();});
