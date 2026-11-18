'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);for(const file of ['stats-data.js','daily-analysis-core.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);const C=context.DailyStats;
const counts={MN:{db:1,g1:1,g2:1,g3:2,g4:7,g5:1,g6:3,g7:1,g8:1},MB:{db:1,g1:1,g2:2,g3:6,g4:4,g5:6,g6:3,g7:4}};
const widths={MN:{db:6,g1:5,g2:5,g3:5,g4:5,g5:4,g6:4,g7:3,g8:2},MB:{db:5,g1:5,g2:5,g3:5,g4:4,g5:4,g6:3,g7:2}};
function fixture(region,date,station,seed){const prizes={};Object.entries(counts[region==='MT'?'MN':region]).forEach(([k,count],i)=>{const w=widths[region==='MT'?'MN':region][k];prizes[k]=Array.from({length:count},(_,j)=>String((seed*37+i*711+j*89)%10**w).padStart(w,'0'));});return {region,draw_date:date,data:{province:C.LABELS[station]||station,prizes}};}
assert.equal(C.canon('TP HCM'),'hochiminh');assert.equal(C.canon('Thừa Thiên Huế'),'hue');assert.equal(C.canon('Đắc Nông'),'daknong');assert.equal(C.canon('Đắc Lắc'),'daklak');assert.equal(C.canon('Đắk Lắk'),'daklak');
for(const region of ['MN','MT','MB']){
 const row=fixture(region,'2026-11-17',C.SCHEDULE[region][2][0],1);const d=C.prepare([row]).draws[0];
 for(const [type,m] of Object.entries(region==='MB'?{DD:5,XC:4,B2:27,B3:23,B4:20}:{DD:2,XC:2,B2:18,B3:17,B4:16}))assert.equal(C.numbers(d,type).length,m,region+type);
 const dup={...row,draw_date:'2026-11-10'};assert.equal(C.prepare([row,dup]).suspectCount,2,'exclude both dates for repeated full board');
 const bad=JSON.parse(JSON.stringify(row));bad.data.prizes.g4.pop();assert.equal(C.prepare([bad]).draws.length,0);
}
assert.ok(C.patternOK('007','pair'));assert.ok(C.patternOK('1221','twoPairs'));assert.ok(!C.applicable('B3','twoPairs'));assert.ok(C.patternOK('679','up'));assert.ok(!C.patternOK('679','same'));
const totalPatterns=(digits,p)=>Array.from({length:10**digits},(_,i)=>String(i).padStart(digits,'0')).filter(s=>C.patternOK(s,p)).length;
assert.equal(totalPatterns(2,'distinct'),90);assert.equal(totalPatterns(3,'same'),10);assert.equal(totalPatterns(4,'twoPairs'),270);
const target='2026-11-18',rows=[];
for(const region of ['MN','MT','MB'])for(let i=200;i>=1;i--){const date=C.shift(target,-i);C.stations(region,date).forEach((station,j)=>rows.push(fixture(region,date,station,1000-i*3+j)));}
const prepared=C.prepare(rows);assert.equal(prepared.suspectCount,0);
let evaluated=0;
for(const region of ['MN','MT','MB'])for(const type of Object.keys(C.TYPES)){
 const options={date:target,region,station:'ALL',type,method:'recent',pattern:'all'},ranked=C.rank(prepared.draws,options);assert.ok(ranked.items.length);assert.equal(ranked.items[0].number.length,C.TYPES[type].digits);
 const targetRows=C.stations(region,target).map((s,j)=>fixture(region,target,s,999999-j));const withFuture=C.prepare([...rows,...targetRows]).draws;
 assert.equal(JSON.stringify(C.rank(withFuture,options)),JSON.stringify(ranked),'target draw must not affect rank');
 const result=C.evaluate(prepared.draws,options);assert.equal(result.length,3);assert.ok(result.every(x=>x.trials===90));assert.ok(result.every(x=>x.rate>=0&&x.rate<=1&&x.random>=0&&x.random<=1));evaluated+=result.length;
 const incompleteDate=C.shift(target,-1),filtered=prepared.draws.filter(d=>d.region!==region||d.date!==incompleteDate);
 const reduced=C.evaluate(filtered,options);assert.ok(reduced.every(x=>x.trials===89&&x.skipped===1),'missing day must be skipped, not scored as a miss');
}
const oneStation=C.rank(prepared.draws,{date:target,region:'MN',station:'baclieu',type:'B3',method:'recent'});assert.equal(oneStation.items.length,0,'station has no Wednesday draw');
assert.equal(C.rank(prepared.draws,{date:target,region:'MN',station:'ALL',type:'DD',method:'recent',pattern:'twoPairs'}).items.length,0);
const html=fs.readFileSync('phan-tich-theo-ngay.html','utf8');assert.ok(html.includes('id="memberGate"'));assert.ok(html.includes('member_access_status'));for(const asset of ['daily-analysis.js','daily-analysis-core.js'])new vm.Script(fs.readFileSync(asset,'utf8'),{filename:asset});
console.log('Daily analysis passed: '+evaluated+' regional/type/method evaluations; no target-date leakage; incomplete/repeated boards; leading zeros, scope counts, schedules, patterns and gated page.');
// Cross-region tracking distinguishes exact suffixes from permutation families.
const seedDay='2026-11-01',cross=[];
for(let i=0;i<=10;i++){const date=C.shift(seedDay,i);for(const region of ['MN','MT','MB'])C.stations(region,date).forEach((station,j)=>{const row=fixture(region,date,station,2000+i*3+j);if(i===0&&j===0&&region==='MN')row.data.prizes.g7=['769'];if(i===0&&j===0&&region==='MT')row.data.prizes.g7=['679'];if(i===3&&region==='MB')row.data.prizes.g6[0]='769';cross.push(row);});}
const cdata=C.prepare(cross).draws;
const family=C.crossRegion(cdata,{date:C.shift(seedDay,11),region:'MB',type:'XC',mode:'family'}),signal=family.signals.find(x=>x.date===seedDay&&x.key==='679');
assert.ok(signal);assert.equal(signal.lag,3);assert.equal(signal.first,C.shift(seedDay,3));assert.ok(family.trials>=1);assert.ok(family.random>=0&&family.random<=1);
const exact=C.crossRegion(cdata,{date:C.shift(seedDay,11),region:'MB',type:'XC',mode:'exact'});assert.ok(!exact.signals.some(x=>x.date===seedDay&&x.key==='769'),'do not count 769 and 679 as an exact match');
const pending=C.crossRegion(cdata,{date:C.shift(seedDay,5),region:'MB',type:'XC',mode:'family'});assert.ok(pending.excluded>=1,'do not score incomplete 7-day windows');
const noFuture=C.crossRegion([...cdata,{region:'MB',date:C.shift(seedDay,20),station:'mienbac',prizes:{g6:['679'],db:['00679']}}],{date:C.shift(seedDay,11),region:'MB',type:'XC',mode:'family'});assert.equal(JSON.stringify(noFuture),JSON.stringify(family));
console.log('Cross-region checks passed: exact vs family, three-day lag, unfinished windows, baseline and future-data exclusion.');
async function uiCase(allowed=true){
 const els=new Map(),get=id=>{if(!els.has(id))els.set(id,{value:'',innerHTML:'',textContent:'',disabled:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}});return els.get(id);};
 for(const [id,value] of Object.entries({dailyRegion:'MN',dailyStation:'ALL',dailyMethod:'recent',dailyPattern:'all',dailyCrossType:'XC',dailyCrossMode:'family'}))get(id).value=value;
 let fetches=0;const RealDate=Date;class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:['2026-11-18T06:00:00Z']));}static now(){return RealDate.parse('2026-11-18T06:00:00Z');}}
 const env={document:{getElementById:get},window:{memberSupabase:{auth:{getUser:async()=>({data:{user:{id:'test'}}})},rpc:async()=>({data:{allowed}})}},Date:FixedDate,Intl,URL,AbortController,setTimeout,clearTimeout,fetch:async u=>{fetches++;const q=u.searchParams,bounds=q.getAll('draw_date');assert.equal(bounds.length,2);const region=q.get('region').slice(3),from=bounds.find(x=>x.startsWith('gte.')).slice(4),to=bounds.find(x=>x.startsWith('lte.')).slice(4);return {ok:true,json:async()=>rows.filter(r=>r.region===region&&r.draw_date>=from&&r.draw_date<=to)};}};
 vm.createContext(env);for(const f of ['stats-data.js','daily-analysis-core.js','xc-profile-core.js','daily-analysis.js'])vm.runInContext(fs.readFileSync(f,'utf8'),env);
 await get('dailyRun').listeners.click();
 if(!allowed){assert.equal(fetches,0);assert.match(get('dailyStatus').textContent,/chưa có quyền/);return;}
 assert.match(get('dailyStatus').textContent,/Đã phân tích/);assert.equal((get('dailyCards').innerHTML.match(/class="day-card"/g)||[]).length,5);assert.equal((get('dailyTests').innerHTML.match(/<tr>/g)||[]).length,15);assert.equal(fetches,27,'nine bounded requests for each region');
 get('dailyRegion').value='MT';get('dailyRegion').listeners.change();assert.equal(get('dailyCards').innerHTML,'');await get('dailyRun').listeners.click();assert.equal(fetches,27,'cache supports changing target region without reloading');assert.match(get('dailyScope').textContent,/Miền Trung/);
}
(async()=>{await uiCase(false);await uiCase(true);console.log('Daily page checks passed: entitlement before fetch, all five cards, 15 method comparisons, bounded requests, stale-card clearing and cached region changes.');})().catch(e=>{console.error(e);process.exitCode=1});

const copied={...rows.find(r=>r.region==='MN'),draw_date:target};
const historical=C.prepare(rows,{beforeDate:target}),withCopiedTarget=C.prepare([...rows,copied],{beforeDate:target});
assert.equal(JSON.stringify(withCopiedTarget.draws),JSON.stringify(historical.draws),'target-date quality checks must not change training history');
assert.equal(withCopiedTarget.targetSuspectCount,1);assert.equal(withCopiedTarget.actualDraws.length,0);
console.log('Snapshot cutoff passed: target-day duplicate audit cannot alter training data.');
