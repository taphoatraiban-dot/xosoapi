'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={};vm.runInNewContext(fs.readFileSync('stats-data.js','utf8'),ctx);
const structure={MN:[[1,6],[1,5],[1,5],[2,5],[7,5],[1,4],[3,4],[1,3],[1,2]],MB:[[1,5],[1,5],[2,5],[6,5],[4,4],[6,4],[3,3],[4,2]]};structure.MT=structure.MN;
function fixture(region){const prizes={};structure[region].forEach(([count,width],i)=>{prizes[i?'g'+i:'db']=Array.from({length:count},()=> '7'.padStart(width,'0'));});return {region,draw_date:'2026-11-16',data:{province:'Đài A',prizes}};}
for(const region of ['MN','MT','MB']){
 const row=fixture(region),draws=ctx.XosoStats.draws;
 assert.equal(draws([row,row]).length,1,'deduplicate station/day');
 const incomplete=JSON.parse(JSON.stringify(row));incomplete.data.prizes.g4.pop();
 assert.equal(draws([incomplete]).length,0,'reject incomplete');
 assert.equal(draws([incomplete,row]).length,1,'prefer complete');
 const conflict=JSON.parse(JSON.stringify(row));conflict.data.prizes.g1[0]='12345';
 assert.throws(()=>draws([row,conflict]),/mâu thuẫn/);
 const parent={...row,data:{province:'Đài A',data:{prizes:row.data.prizes}}};
 assert.equal(draws([parent,row]).length,1,'inherit parent station');
 const nested={...row,data:JSON.stringify({data:[row.data]})};assert.equal(draws([nested]).length,1);
 const valid=draws([row])[0];for(const n of [2,3,4]){
  const nums=Object.values(valid.data.prizes).flat().filter(s=>s.length>=n).map(s=>s.slice(-n));
  const expected=region==='MB'?(n===2?27:n===3?23:20):(n===2?18:n===3?17:16);
  assert.equal(nums.length,expected);assert.ok(nums.every(s=>s==='7'.padStart(n,'0')));
 }
}
let compiled=0;
for(const file of ['thong-ke-2-so.html','thong-ke-3-so.html','thong-ke-4-so.html','thong-ke-2-3-4-so.html']){
 const html=fs.readFileSync(file,'utf8');assert.ok(html.includes('src="./stats-data.js"'));
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=/.test(m[1])){new vm.Script(m[2],{filename:file});compiled++;}
 assert.ok(!/searchParams\.set\('draw_date','lte\./.test(html),'date upper bound must not replace lower');
}
const four=fs.readFileSync('thong-ke-4-so.html','utf8');assert.ok(!four.includes('slice(-3)'));assert.ok(!four.includes('3 chữ số'));
// Exercise the actual four-digit parser, weekly parser and permutations.
let legacy=four.match(/var records=\[\], coverage=\{\}, top=\[\], combined=true;([\s\S]*?)\n\}\)\(\);/)[0];
let funcs='';for(const name of ['collect','prizeDigits','permutations','fourCollect']){
 const start=legacy.indexOf('function '+name+'(');const next=legacy.indexOf('\n  function ',start+10);funcs+=legacy.slice(start,next<0?undefined:next)+'\n';
}
const parser={};vm.runInNewContext(funcs+';globalThis.parse=(row)=>{var a=[];a._region=row.region;collect(row.data,a,0);return a};globalThis.week=(row)=>{var a=[];a._region=row.region;prizeDigits(row.data,a,0);return a};',parser);
for(const region of ['MN','MT','MB']){const row=fixture(region),a=parser.parse(row);assert.equal(a.length,region==='MB'?19:15);assert.ok(a.every(n=>n==='0007'));assert.equal(parser.week(row).length,a.length);}
assert.equal(parser.permutations('0012').length,12);assert.equal(parser.permutations('1111').length,1);assert.equal(parser.permutations('123').length,0);
console.log('Statistics regression checks passed: 3 regions, 2/3/4 digits, duplicates, conflicts, incomplete draws, parent names, leading zeros, four-digit weekly/permutations; '+compiled+' scripts compile.');
(async()=>{
 for(const n of [3,4]){
  const source=fs.readFileSync('thong-ke-'+n+'-so.html','utf8');
  const encoded=source.match(/srcdoc="([^"]*)"/)[1];
  const frame=encoded.replace(/&(?:quot|#x27|amp|lt|gt);/g,s=>({'&quot;':'"','&#x27;':"'",'&amp;':'&','&lt;':'<','&gt;':'>'}[s]));
  assert.ok(frame.includes('src="./stats-data.js"'));
  const code=[...frame.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  new vm.Script(code);
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,{value:'',innerHTML:'',textContent:'',disabled:false,addEventListener(){}});return els.get(id);};
  get('digits').value=String(n);get('region').value='MN';get('weekday').value='1';
  let calls=0;const sandbox={document:{getElementById:get},URL,Date,Intl,AbortController,setTimeout,clearTimeout,XosoStats:ctx.XosoStats,fetch:async url=>{calls++;const bounds=url.searchParams.getAll('draw_date');assert.equal(bounds.length,2);const row=fixture('MN');row.draw_date=bounds[1].slice(4);return {ok:true,json:async()=>[row,row]};}};
  vm.runInNewContext(code,sandbox);await sandbox.run();
  assert.equal(get('go').disabled,false,'iframe button must unlock');
  assert.ok(!get('status').textContent.startsWith('Lỗi:'),get('status').textContent);
  assert.equal(calls,9,'365 days in nine bounded requests');
 }
 console.log('Embedded 365-day statistics: runtime and bounded requests passed for 3 and 4 digits.');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const html=fs.readFileSync('thong-ke-2-3-4-so.html','utf8');
 const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src='))[0][2].replace("$('run').addEventListener('click',run);run();","$('run').addEventListener('click',run);");
 for(const region of ['MN','MT','MB'])for(const digits of [2,3,4]){
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,{value:'',innerHTML:'',textContent:'',disabled:false,addEventListener(){}});return els.get(id);};
  get('region').value=region;get('digits').value=String(digits);get('period').value='30';
  const env={document:{getElementById:get},XosoStats:ctx.XosoStats,URL,Date,Intl,AbortController,setTimeout,clearTimeout,fetch:async u=>{const bounds=u.searchParams.getAll('draw_date');assert.equal(bounds.length,2);const row=fixture(region);row.draw_date=bounds[1].slice(4);return {ok:true,json:async()=>[row,row]};}};
  vm.runInNewContext(inline,env);await env.run();
  assert.ok(!get('status').textContent.startsWith('Lỗi'),get('status').textContent);
  assert.equal(get('draws').textContent,1);
  assert.equal(Number(get('total').textContent),region==='MB'?({2:27,3:23,4:20}[digits]):({2:18,3:17,4:16}[digits]));
 }
 console.log('Combined statistics UI: exact counts passed in all nine region/digit cases.');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 for(const digits of [3,4])for(const stale of [false,true]){
  const html=fs.readFileSync('thong-ke-'+digits+'-so.html','utf8');
  const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const D='+digits+';')).replace(/\}\)\(\);\s*$/, 'globalThis.exactRun=run;})();');
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,{value:'',innerHTML:'',textContent:'',disabled:false,selectedOptions:[{textContent:'MN'}],addEventListener(){}});return els.get(id);};
  for(const [id,value] of Object.entries({exactNum:'7'.padStart(digits,'0'),exactRegion:'MN',exactDays:'30',exactStation:'ALL',exactWeekday:'ALL'}))get(id).value=value;
  const env={document:{getElementById:get},XosoStats:ctx.XosoStats,URL,Date,Intl,AbortController,setTimeout,clearTimeout,fetch:async u=>{const row=fixture('MN');row.draw_date=u.searchParams.getAll('draw_date')[1].slice(4);if(stale)get('exactRegion').value='MT';return {ok:true,json:async()=>[row,row]};}};
  vm.runInNewContext(script,env);await env.exactRun();
  assert.ok(!get('exactStatus').textContent.startsWith('Không tải được'),get('exactStatus').textContent);
  if(stale)assert.equal(get('exactCount').textContent,'','reject stale response after region change');
  else assert.ok(Number(get('exactCount').textContent)>0,'exact lookup returns leading-zero matches');
  assert.equal(get('exactGo').disabled,false);
 }
 console.log('Exact 3/4-digit lookup: duplicate fixtures and stale region responses passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
