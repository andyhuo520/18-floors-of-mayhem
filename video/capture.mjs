// Capture actual game interactions from two independent browser sessions for the edit.
import {chromium} from 'playwright';
import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';

const out=path.resolve('video/raw');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const context=()=>browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const ready=async page=>{
 await page.addInitScript(()=>{localStorage.setItem('man18-intro-v1','seen');localStorage.setItem('man18-language','zh');});
 await page.goto('http://localhost:3180/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-quick-skin]').first().waitFor({timeout:15000});
};
try{
 const solo=await context(),soloPage=await solo.newPage();
 await ready(soloPage);
 await soloPage.locator('#nickname').fill('跌不倒的菠萝');
 await soloPage.locator('[data-quick-skin="2"]').click();
 await pause(600);
 await soloPage.locator('[data-quick-skin="4"]').click();
 await pause(600);
 await soloPage.locator('[data-quick-skin="1"]').click();
 await pause(700);
 await soloPage.locator('#cpu-play').click();
 await pause(2100);
 for(const [key,ms] of [['KeyS',600],['KeyD',700],['Space',200],['KeyS',600],['KeyA',650],['KeyS',650],['KeyD',800],['KeyJ',180],['KeyS',650],['KeyA',900],['Space',150],['KeyS',550]]){
  await soloPage.keyboard.down(key);await pause(ms);await soloPage.keyboard.up(key);await pause(200);
 }
 await pause(2200);
 const soloVideo=soloPage.video();await solo.close();
 await copyFile(await soloVideo.path(),path.join(out,'solo.webm'));
 console.log('Captured solo gameplay');

 const hostContext=await context(),friendContext=await browser.newContext({viewport:{width:1280,height:720}});
 const host=await hostContext.newPage(),friend=await friendContext.newPage();
 await ready(host);
 await host.locator('#nickname').fill('菠萝队长');
 await host.locator('[data-entry="friends"]').click();
 await pause(450);
 await host.locator('#create').click();
 await host.locator('#room-number').waitFor({state:'visible',timeout:10000});
 const code=(await host.locator('#room-number').innerText()).trim();
 await friend.addInitScript(()=>{localStorage.setItem('man18-intro-v1','seen');localStorage.setItem('man18-language','zh');});
 await friend.goto('http://localhost:3180/?room='+code,{waitUntil:'domcontentloaded'});
 await friend.locator('[data-quick-skin]').first().waitFor();
 await friend.locator('#nickname').fill('蓝莓搭子');
 await friend.locator('[data-quick-skin="5"]').click();
 await friend.locator('[data-entry="friends"]').click();
 await friend.locator('#join').click();
 await host.locator('#room-members').getByText('蓝莓搭子',{exact:false}).waitFor({timeout:10000});
 await pause(1400);
 await host.locator('#start').click();
 await pause(2200);
 for(const [key,ms] of [['KeyS',450],['KeyD',700],['Space',180],['KeyS',650],['KeyA',550],['KeyS',650]]){
  await host.keyboard.down(key);await friend.keyboard.down(key);await pause(ms);await host.keyboard.up(key);await friend.keyboard.up(key);await pause(250);
 }
 await pause(1800);
 const hostVideo=host.video();await friendContext.close();await hostContext.close();
 await copyFile(await hostVideo.path(),path.join(out,'friends.webm'));
 console.log('Captured multiplayer gameplay, room '+code);
}finally{await browser.close();}
