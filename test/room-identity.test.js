import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../shared/room.js';

function peer(){return {readyState:1,messages:[],send(raw){this.messages.push(JSON.parse(raw));}};}
function send(room,ws,message){room.handle(ws,JSON.stringify(message));}

test('friends can rename before the match; collisions are resolved and everyone sees the change',()=>{
 const room=new Room('ABC123'),host=peer(),friend=peer();
 room.attach(host);send(room,host,{type:'create',name:'菠萝队长'});
 room.attach(friend);send(room,friend,{type:'join',name:'西瓜队长'});
 send(room,friend,{type:'rename',name:'菠萝队长'});
 const hostLobby=host.messages.filter(m=>m.type==='lobby').at(-1);
 const friendLobby=friend.messages.filter(m=>m.type==='lobby').at(-1);
 assert.deepEqual(hostLobby.players,friendLobby.players);
 assert.equal(new Set(hostLobby.players.map(p=>p.name)).size,2);
 assert.notEqual(hostLobby.players.find(p=>p.id===friend.pid).name,'菠萝队长');
 send(room,host,{type:'rename',name:'新来的队长'});
 assert.equal(friend.messages.filter(m=>m.type==='lobby').at(-1).players.find(p=>p.id===host.pid).name,'新来的队长');
 send(room,host,{type:'start'});
 const countdown=host.messages.find(m=>m.type==='countdown');
 assert.equal(countdown.game.players.find(p=>p.id===host.pid).name,'新来的队长');
 send(room,friend,{type:'rename',name:'比赛中偷改'});
 assert.equal(friend.messages.at(-1).type,'error');
 assert.equal(room.members.get(friend.pid).name,friendLobby.players.find(p=>p.id===friend.pid).name);
});
