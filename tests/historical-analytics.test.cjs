'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('historical-analytics.js','utf8');
new vm.Script(js,{filename:'historical-analytics.js'});
const counts={db:1,g1:1,g2:1,g3:2,g4:7,g5:1,g6:3,g7:1,g8:1},widths={db:6,g1:5,g2:5,g3:5,g4:5,g5:4,g6:4,g7:3,g8:2};
function fixture(complete=true){
 const prizes={};
 for(const [k,count] of Object.entries(counts)){prizes[k]=Array.from({length:count},(_,i)=>String(i*10000+7).padStart(widths[k],'0').slice(-widths[k]));}
 if(!complete)prizes.g4.pop();
 return {province:'Đài thử nghiệm',prizes};
}
async function runCase(n,complete,duplicate=false){
 const els=new Map();const get=id=>{
  if(!els.has(id))els.set(id,{value:'',disabled:false,textContent:'',innerHTML:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}});
  return els.get(id);
 };
 get('ha'+n+'Region').value='MN';get('ha'+n+'Days').value='7';get('ha'+n+'Station').value='ALL';get('ha'+n+'Number').value=n===3?'007':'0007';
 let calls=0;
 const document={currentScript:{dataset:{digits:String(n)}},getElementById:get};
 const fetch=async u=>{calls++;const target=get('ha'+n+'To').value;
   assert.match(String(u),/region=eq.MN/);
   const row={region:'MN',draw_date:target,data:[fixture(complete)]};
   return {ok:true,json:async()=>duplicate?[row,row]:[row]};
 };
 vm.runInNewContext(js,{document,fetch,Intl,Date,URL,AbortController,setTimeout,clearTimeout,console},{filename:'historical-analytics.js'});
 const listener=get('ha'+n+'Run').listeners.click;assert.equal(typeof listener,'function');
 await listener();
 const summary=get('ha'+n+'Summary').textContent,coverage=get('ha'+n+'Coverage').textContent;
 assert.ok(calls>=1);
 assert.equal(typeof get('ha'+n+'BacktestRun').listeners.click,'function');
 get('ha'+n+'BacktestRun').listeners.click();
 assert.match(get('ha'+n+'BacktestStatus').textContent,/Chưa đủ lịch sử|Đã đối chiếu ngoài mẫu/);
 assert.ok(get('ha'+n+'WeekChart').innerHTML.includes('haBarRow'));
 if(complete){assert.ok(get('ha'+n+'PermutationRows').innerHTML.includes(n===3?'007':'0007'));assert.ok(get('ha'+n+'HeadTailRows').innerHTML.includes('<tr>'));}
 assert.ok(!get('ha'+n+'Status').textContent.startsWith('Lỗi'),get('ha'+n+'Status').textContent);
 if(complete){assert.match(summary,/1 ngày có ít nhất một đài đủ giải/);
   assert.ok(get('ha'+n+'TopRows').innerHTML.includes(n===3?'007':'0007'));
   assert.ok(get('ha'+n+'NumberRows').innerHTML.includes('Đài thử nghiệm'));
   if(duplicate)assert.match(get('ha'+n+'Status').textContent,/1 bảng đài/);
 }else{assert.match(summary,/0 lượt số/);assert.match(coverage,/1 bảng đài thiếu giải/);}
 return true;
}
(async()=>{
 for(const n of [3,4]){
  const html=fs.readFileSync('thong-ke-'+n+'-so.html','utf8');
  assert.ok(html.includes('id="ha'+n+'"'));
  assert.ok(html.includes('src="./historical-analytics.js" data-digits="'+n+'"'));
  for(const id of ['Region','Station','Days','To','Number','Run','Status','Summary','Coverage','TopRows','RareRows','GanRows','WeekRows','PatternRows','MonthRows','StationRows','CompareRows','HeadTailRows','SumRows','PermutationRows','WeekChart','BacktestRun','BacktestRows','BacktestStatus','NumberRows','NumberInfo'])assert.ok(html.includes('id="ha'+n+id+'"'),id);
  await runCase(n,true);await runCase(n,false);await runCase(n,true,true);
 }
 console.log('Historical analytics tests: pass (3-digit, 4-digit, complete/incomplete/duplicate, leading-zero)');
})().catch(err=>{console.error(err);process.exitCode=1;});