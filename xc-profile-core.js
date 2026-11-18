/* XC source candidates ranked separately for each target station and weekday. */
(()=>{'use strict';const C=DailyStats;
const dayOf=d=>new Date(d+'T12:00:00Z').getUTCDay();
const family=n=>[...n].sort().join('');
function permutations(s){let result=new Set();function visit(p,r){if(!r.length){result.add(p);return;}for(let i=0;i<r.length;i++)visit(p+r[i],r.slice(0,i)+r.slice(i+1));}visit('',s);return [...result].sort();}
function candidates(draws,{date,region,windowDays=30,mode='exact',rule='any'}){
 if(!['exact','family'].includes(mode)||!['any','both'].includes(rule))throw Error('Cách đối chiếu XC không hợp lệ');
 const groups=new Map();for(const d of draws){if(d.region===region||d.date>=date||d.date<C.shift(date,-windowDays))continue;
 for(const num of new Set(C.numbers(d,'XC'))){const key=mode==='family'?family(num):num;let g=groups.get(key);if(!g){g={key,events:[],regions:new Set(),last:''};groups.set(key,g);}g.events.push({region:d.region,station:d.station,date:d.date,number:num});g.regions.add(d.region);if(d.date>g.last)g.last=d.date;}}
 return [...groups.values()].filter(g=>rule!=='both'||g.regions.size===2).flatMap(g=>(mode==='family'?permutations(g.key):[g.key]).map(number=>({number,sourceLast:g.last,sourceRegions:[...g.regions].sort(),sourceEvents:g.events,sourceExact:g.events.some(e=>e.number===number)})));
}
function rankStation(draws,{date,region,station,windowDays=30,mode='exact',rule='any'}){
 const w=dayOf(date),history=draws.filter(d=>d.region===region&&d.station===station&&d.date<date&&d.date>=C.shift(date,-365));
 const same=history.filter(d=>dayOf(d.date)===w),all=new Map(),week=new Map();
 const add=(map,d)=>{for(const n of new Set(C.numbers(d,'XC'))){const x=map.get(n)||{hits:0,last:''};x.hits++;if(d.date>x.last)x.last=d.date;map.set(n,x);}};history.forEach(d=>add(all,d));same.forEach(d=>add(week,d));
 if(same.length<6)return {station,items:[],weekdayDraws:same.length,reason:'Chưa đủ 6 kỳ cùng thứ của đài này.'};
 const items=candidates(draws,{date,region,windowDays,mode,rule}).map(s=>({...s,weekdayHits:week.get(s.number)?.hits||0,weekdayLast:week.get(s.number)?.last||null,allHits:all.get(s.number)?.hits||0,allLast:all.get(s.number)?.last||null})).filter(x=>x.weekdayHits>0).sort((a,b)=>b.weekdayHits-a.weekdayHits||b.allHits-a.allHits||b.sourceLast.localeCompare(a.sourceLast)||a.number.localeCompare(b.number));
 return {station,items,weekdayDraws:same.length,totalDraws:history.length,weekday:w,reason:items.length?'':'Chưa có số từ nguồn đã từng xuất hiện ở đúng đài và cùng thứ trong mẫu.'};
}
function testStation(draws,options){const {date,region,station}=options,w=dayOf(date);let trials=0,hits=0,skipped=0,random=0;for(let i=90;i>=1;i--){const d=C.shift(date,-i);if(dayOf(d)!==w)continue;const actual=C.actual(draws,{date:d,region,station,type:'XC'});if(!actual.complete){skipped++;continue;}const ranked=rankStation(draws,{...options,date:d});if(!ranked.items.length){skipped++;continue;}trials++;hits+=Number(actual.nums.has(ranked.items[0].number));random+=actual.nums.size/1000;}return {trials,hits,skipped,rate:trials?hits/trials:null,random:trials?random/trials:null,interval:C.wilson(hits,trials)};}
function queryHistory(draws,{date,region,station='ALL',query=''}){
 query=String(query).trim();if(!query)return {rows:[],events:[],query:'',kind:null};if(!/^\d{2,3}$/.test(query))return {rows:[],events:[],error:'Nhập đúng 2 số đuôi (91) hoặc nguyên 3 số XC (391).'};
 const targets=C.stations(region,date,station),by=new Map(),events=[];for(const d of draws){if(d.region!==region||d.date>=date||d.date<C.shift(date,-365)||!targets.includes(d.station))continue;const w=dayOf(d.date),key=d.station+'|'+w;let g=by.get(key);if(!g){g={station:d.station,weekday:w,draws:0,slots:0,hits:0,hitDraws:0,last:null};by.set(key,g);}const nums=C.numbers(d,'XC'),matched=nums.filter(n=>query.length===2?n.endsWith(query):n===query);g.draws++;g.slots+=nums.length;g.hits+=matched.length;g.hitDraws+=Number(matched.length>0);if(matched.length&&(!g.last||d.date>g.last))g.last=d.date;
 for(const number of matched)events.push({date:d.date,station:d.station,number});}
 const rows=[...by.values()].sort((a,b)=>a.station.localeCompare(b.station)||((a.weekday+6)%7)-((b.weekday+6)%7));events.sort((a,b)=>b.date.localeCompare(a.date));return {rows,events,query,kind:query.length===2?'tail':'exact'};
}
function analyze(draws,options){const targets=C.stations(options.region,options.date,options.station||'ALL');return {targets,profiles:targets.map(station=>({...rankStation(draws,{...options,station}),test:testStation(draws,{...options,station})})),query:queryHistory(draws,options)};}
globalThis.XCProfile={permutations,candidates,rankStation,testStation,queryHistory,analyze};
})();
