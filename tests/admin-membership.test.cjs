'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('thanh-vien.html','utf8');
const code=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src='))[0][2];
new vm.Script(code);
async function check(status){
 const els=new Map(),get=id=>{if(!els.has(id))els.set(id,{hidden:true,textContent:'',value:'',reportValidity:()=>true});return els.get(id);};
 let orderReads=0;
 const sb={auth:{getUser:async()=>({data:{user:{email:'test@example.com'}}})},rpc:async()=>({data:status}),from:()=>{orderReads++;return {select:()=>({order:()=>({limit:async()=>({data:[]})})})}}};
 vm.runInNewContext(code,{document:{getElementById:get},window:{supabase:{createClient:()=>sb}},Date,encodeURIComponent});
 await new Promise(resolve=>setImmediate(resolve));
 if(status.is_admin){assert.equal(get('renew').hidden,true);assert.equal(get('trial').hidden,true);assert.equal(get('order').hidden,true);assert.equal(orderReads,0);assert.match(get('status').textContent,/ADMIN.*không thời hạn/);}
 else{assert.equal(get('renew').hidden,false);assert.equal(orderReads,1);assert.equal(get('trial').hidden,!(status.can_trial&&!status.allowed));}
}
(async()=>{await check({is_admin:true,allowed:true,can_trial:false,expires_at:null});await check({allowed:false,can_trial:true});await check({allowed:false,can_trial:false});await check({allowed:true,can_trial:false,expires_at:'2026-12-01T00:00:00Z'});console.log('Member UI checks passed: admin, new, expired and paid users.');})().catch(e=>{console.error(e);process.exitCode=1});
