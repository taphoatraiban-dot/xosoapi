'use strict';
const fs=require('fs'),vm=require('vm'),a=require('node:assert/strict'),c={};vm.createContext(c);
for(const f of ['stats-data.js','daily-analysis-core.js','verified-analysis-core.js','xc-profile-core.js','unified-stats.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const U=c.UnifiedStats,C=c.DailyStats,V=c.VerifiedAnalysis,date='2026-11-23';
const draw=(region,station,date,db,g7='674')=>({region,station,date,prizes:{db:[db],g6:region==='MB'?['321','455','678']:['1234'],g7:region==='MB'?['01','02','03','04']:[g7],g8:region==='MB'?[]:['74']}});
const target=Array.from({length:10},(_,i)=>draw('MB','mienbac',C.shift(date,-i-1),'12674')).reverse();
const source=[draw('MN','kiengiang','2026-11-22','99888','674'),draw('MT','hue','2026-11-21','99777','974')],rows=[...target,...source];
const o={date,region:'MB',station:'ALL',method:'recent',pattern:'all',scope:'XCD',windowDays:30,mode:'exact',rule:'any'};
let p=U.analyze(rows,o).profiles[0],rank=V.rank(rows,{...o,station:'mienbac'});
a.equal(p.sample,rank.sample);a.equal(p.items[0].number,rank.items[0].number);a.equal(p.items[0].hits,rank.items[0].hits);a.equal(p.items[0].hits,10);a.equal(p.items[0].hasSource,true);a.ok(!p.items.some(x=>x.number==='321'),'XCD must not include G6');
a.ok(U.analyze(rows,{...o,scope:'XC'}).profiles[0].items.some(x=>x.number==='321'));
a.equal(U.analyze(rows,{...o,scope:'DDD',sourceOnly:true,rule:'both'}).profiles[0].items[0].number,'74','both source regions may have different 3-digit numbers sharing a 2-digit tail');
a.equal(U.analyze(rows,{...o,sourceOnly:true,rule:'both'}).profiles[0].items.length,0,'two sources with same tail are not an exact 3-digit agreement');
a.equal(U.analyze(target,o).profiles[0].items[0].hasSource,false);
const future=draw('MN','kiengiang',date,'99674','674');a.equal(JSON.stringify(U.analyze([...rows,future],o)),JSON.stringify(U.analyze(rows,o)));
const family=[...target,draw('MN','kiengiang','2026-11-22','99888','764')];p=U.analyze(family,{...o,mode:'family'}).profiles[0];a.equal(p.items[0].hasSource,true);a.equal(p.items[0].sourceExact,false);a.equal(U.analyze(family,{...o,scope:'DDD',mode:'family'}).profiles[0].items[0].sourceExact,false,'a projected family tail must not be labelled exact');
a.equal(U.analyze(rows,{...o,scope:'B4',sourceOnly:true}).sourceApplicable,false);a.ok(U.analyze(rows,{...o,scope:'B4',sourceOnly:true}).profiles[0].items.length>0,'XC sources cannot suppress 4-digit statistics');
a.equal(U.analyze(target.slice(0,5),o).profiles[0].items.length,0);
const zeroes=target.map(d=>({...d,prizes:{...d.prizes,db:['12000']}}));a.equal(U.analyze(zeroes,o).profiles[0].items[0].number,'000');
const nodes={unifiedScope:{value:'XCD'},unifiedCount:{value:'5'},unifiedSourceOnly:{checked:false},xcWindow:{value:'30'},xcMatch:{value:'exact'},xcRule:{value:'any'},unifiedStatus:{textContent:''},unifiedResults:{innerHTML:''}};
c.document={getElementById:id=>nodes[id]};U.setData(rows,o);a.ok(nodes.unifiedResults.innerHTML.includes('674'));a.ok(nodes.unifiedResults.innerHTML.includes('10/10'));a.ok(nodes.unifiedResults.innerHTML.includes('Khớp nguyên số'));nodes.unifiedSourceOnly.checked=true;nodes.xcRule.value='both';U.render();a.ok(nodes.unifiedResults.innerHTML.includes('Không có số phù hợp'));U.clear();a.equal(nodes.unifiedResults.innerHTML,'');
const page=fs.readFileSync('phan-tich-theo-ngay.html','utf8'),ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);a.equal(ids.length,new Set(ids).size,'no duplicated filter/result IDs');a.ok(page.indexOf('id="unifiedPanel"')<page.indexOf('id="deepAnalysis"'));a.ok(page.includes('id="deepAnalysis"'));a.ok(page.indexOf('unified-stats.js')<page.indexOf('daily-analysis.js'));
const home=fs.readFileSync('index.html','utf8');a.ok(home.includes('XC &amp; THỐNG KÊ · DÙNG THỬ 49K'));a.ok(!home.includes('>DÙNG THỬ 7 NGÀY · 49K</a>'));a.ok(!home.includes('>THỐNG KÊ 2 SỐ</a>'));a.ok(!home.includes('>THỐNG KÊ</a>'));a.ok(fs.readFileSync('thanh-vien.html','utf8').includes('Mở bảng chung'));
console.log('Unified statistics passed: one target ranking, explicit scopes, shared cutoffs, source tails vs exact/family, 4-digit limits, stale clearing, unique IDs and combined navigation.');
a.equal(JSON.stringify(U.analyze([...rows].reverse(),o)),JSON.stringify(U.analyze(rows,o)),'input ordering cannot change latest-ten selection');
const compare=U.comparison(rows,o);a.equal(compare.length,3);a.equal(compare.find(x=>x.method==='recent').profiles[0].sample,10);a.equal(compare.find(x=>x.method==='recent').profiles[0].lastDate,'2026-11-22');a.ok(compare.find(x=>x.method==='weekday').profiles[0].sample<6);
const counts={db:1,g1:1,g2:2,g3:6,g4:4,g5:6,g6:3,g7:4},width={db:5,g1:5,g2:5,g3:5,g4:4,g5:4,g6:3,g7:2},raw=[];
for(let i=300;i>=1;i--){const prizes={};for(const [k,n] of Object.entries(counts))prizes[k]=Array.from({length:n},(_,j)=>String((i*41+j*83)%10**width[k]).padStart(width[k],'0'));prizes.db=['12674'];raw.push({region:'MB',draw_date:C.shift(date,-i),data:{province:'Miền Bắc',prizes}});}
const checked=U.backtest(raw,o);a.ok(checked.rows.every(x=>x.early.trials===45&&x.late.trials===45&&x.late.hits===45));a.ok(checked.rows.every(x=>Math.abs(x.late.random-.001)<1e-12&&Math.abs(x.late.random5-.001)<1e-12),'a one-candidate group is not compared to five random numbers');
const futureRaw=JSON.parse(JSON.stringify(raw.at(-1)));futureRaw.draw_date=date;a.equal(JSON.stringify(U.backtest([...raw,futureRaw],o)),JSON.stringify(checked));
const changed=JSON.parse(JSON.stringify(raw));changed.at(-1).data.prizes.db=['12675'];const missed=U.backtest(changed,o);a.ok(missed.rows.every(x=>x.early.hits===45&&x.late.hits===44),'target outcome must not enter its own training');
const absent=U.backtest(raw.slice(0,-1),o);a.ok(absent.rows.every(x=>x.late.missing===1&&x.late.trials===44));
const filtered=U.backtest(raw,{...o,sourceOnly:true});a.ok(filtered.rows.every(x=>x.late.trials===0&&x.late.noCandidate===45),'source filter must apply during validation too');
a.equal(checked.perNumber[0].station,'mienbac');a.equal(checked.perNumber[0].number,'674');a.equal(checked.perNumber[0].hits,45);a.equal(checked.perNumber[0].trials,45);
a.equal(filtered.perNumber.length,0);
const one=U.backtest(raw,{...o,scope:'XC',limit:1}),three=U.backtest(raw,{...o,scope:'XC',limit:3});a.equal(one.perNumber.length,1);a.ok(three.perNumber.length>1,'per-number exposures must use the chosen display count');
a.ok(U.accuracyHTML(null).includes('Chưa có lần kiểm tra'));a.ok(U.accuracyHTML({trials:1,hits:1}).includes('Mẫu ít'));a.ok(!U.accuracyHTML({trials:1,hits:1}).includes('Có mẫu kiểm tra'));a.ok(U.accuracyHTML(checked.perNumber[0]).includes('Khoảng bất định 95%'));
nodes.unifiedMethodComparison={innerHTML:''};nodes.unifiedValidation={innerHTML:'',textContent:''};nodes.unifiedCompare={disabled:true};const cell={innerHTML:'',getAttribute:()=> 'mienbac|674'};nodes.unifiedResults.querySelectorAll=()=>[cell];nodes.unifiedSourceOnly.checked=false;nodes.xcRule.value='any';c.setTimeout=setTimeout;
(async()=>{U.setData(target,o,raw);a.ok(nodes.unifiedMethodComparison.innerHTML.includes('Ba cách xếp'));a.equal(nodes.unifiedCompare.disabled,true);const pending=U.runComparison();U.clear();await pending;a.equal(nodes.unifiedValidation.innerHTML,'');U.setData(target,o,raw);await U.runComparison();a.ok(nodes.unifiedValidation.innerHTML.includes('45/45'));a.ok(cell.innerHTML.includes('45/45 lần đúng'));a.equal(nodes.unifiedCompare.disabled,false);a.equal(await U.backtestAsync(raw,o,()=>false),null);await prospectiveCase();console.log('Three-method comparison passed: shared filters, rolling cutoffs, exact baseline size, missing/candidate skips, chronological order and stale UI cancellation.');})().catch(e=>{console.error(e);process.exitCode=1;});

const fixedNow=Date.parse('2026-11-23T07:00:00Z');
a.equal(U.saveWindow(o,fixedNow).allowed,true);a.equal(U.saveWindow({...o,scope:'XC'},fixedNow).allowed,false);
for(const [region,hour] of [['MN',9],['MT',10],['MB',11]])a.equal(U.saveWindow({...o,region},Date.parse('2026-11-23T'+String(hour).padStart(2,'0')+':00:00Z')).allowed,false);
a.equal(U.saveWindow({...o,date:'2026-11-22'},fixedNow).allowed,false);a.equal(U.saveWindow({...o,date:'2026-12-01'},fixedNow).allowed,false);a.equal(U.saveWindow({...o,date:'bad'},fixedNow).allowed,false);
const hash='0'.repeat(64),records=U.forecastRecords(rows,{...o,limit:3},hash);a.equal(records.length,1);a.equal(records[0].number,'674');a.equal(records[0].scope,'XCD');a.equal(records[0].snapshot.saved_count,1);a.equal(records[0].snapshot.shortlist_count,3);a.ok(!('user_id' in records[0]));a.ok(!('created_at' in records[0]));a.equal(JSON.stringify(U.forecastRecords([...rows,future],o,hash)),JSON.stringify(U.forecastRecords(rows,o,hash)));a.throws(()=>U.forecastRecords(rows,{...o,scope:'XC'},hash));a.equal(U.forecastRecords(target,{...o,sourceOnly:true},hash).length,0);
async function prospectiveCase(){
 c.Date=class extends Date{static now(){return fixedNow;}};c.crypto=require('node:crypto').webcrypto;c.TextEncoder=TextEncoder;let saved=[],inserts=0,authorized=true;
 nodes.unifiedSave={disabled:false};nodes.unifiedSaveStatus={textContent:''};nodes.unifiedLedger={innerHTML:'',textContent:''};
 const sb={auth:{getUser:async()=>({data:{user:authorized?{id:'test'}:null}})},from(table){const filters=[];const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},order(){return query;},limit:async()=>({data:saved}),in:async()=>({data:saved.map(x=>({forecast_id:x.id,status:'missed'}))}),then(resolve,reject){return Promise.resolve({data:saved.filter(x=>filters.every(([k,v])=>x[k]===v))}).then(resolve,reject);},insert:async batch=>{inserts++;saved.push(...batch.map((x,i)=>({...x,id:'f'+i,created_at:'2026-11-23T07:00:00Z'})));return {error:null};}};return query;}};
 c.window={memberSupabase:sb};U.setData(target,o);await U.saveForecast();a.equal(inserts,1);a.equal(saved[0].number,'674');a.ok(nodes.unifiedSaveStatus.textContent.includes('Đã chốt 1 số mới'));a.ok(nodes.unifiedLedger.innerHTML.includes('Sai · không xuất hiện'));
 const changedTarget=target.map(x=>({...x,prizes:{...x.prizes,db:['12675']}}));U.setData(changedTarget,o);await U.saveForecast();a.equal(inserts,1);a.equal(saved[0].number,'674');a.ok(nodes.unifiedSaveStatus.textContent.includes('giữ số đã chốt 674'));
 authorized=false;await U.saveForecast();a.equal(inserts,1);a.ok(nodes.unifiedSaveStatus.textContent.includes('Phiên đăng nhập đã hết hạn'));
 let resolveAuth;sb.auth.getUser=()=>new Promise(r=>{resolveAuth=r;});const stale=U.saveForecast();U.clear();resolveAuth({data:{user:{id:'test'}}});await stale;a.equal(inserts,1,'changed filters or cleared data must cancel before insert');
 console.log('Prospective ledger passed: explicit scopes, VN deadlines, one saved number, source filters, authenticated writes, immutable existing picks, scored outcomes and stale-save cancellation.');
}

// G7 is a real prize view, not the legacy MB G6/XC alias.
const mbG7=U.analyze(target,{...o,scope:'G7'});a.equal(mbG7.digits,2);a.equal(mbG7.scope,'DDA');a.ok(mbG7.profiles[0].items.every(x=>['01','02','03','04'].includes(x.number)));a.ok(!mbG7.profiles[0].items.some(x=>x.number==='321'));
const mnG7=Array.from({length:10},(_,i)=>draw('MN','hochiminh',C.shift(date,-7*(i+1)),'12674','007'));
const mnOption={...o,region:'MN',station:'hochiminh',scope:'G7'};a.equal(U.analyze(mnG7,mnOption).profiles[0].items[0].number,'007');a.equal(U.analyze(mnG7,mnOption).digits,3);
const mtG7=mnG7.map(x=>({...x,region:'MT',station:'phuyen'}));a.equal(U.analyze(mtG7,{...mnOption,region:'MT',station:'phuyen'}).profiles[0].items[0].number,'007');
a.equal(U.forecastRecords(mnG7,mnOption,hash)[0].scope,'XCA');a.equal(U.forecastRecords(target,{...o,scope:'G7'},hash)[0].scope,'DDA');a.equal(U.forecastRecords(target,{...o,scope:'G7'},hash)[0].number.length,2);a.equal(U.forecastRecords(mnG7,mnOption,hash)[0].snapshot.view_scope,'G7');
const sourceMB=draw('MB','mienbac','2026-11-22','12000');sourceMB.prizes.g6=['999','998','997'];
a.equal(U.prizeSources([sourceMB],{...mnOption,sourcePrize:'g7'},3).length,0,'MB 2-digit G7 cannot become a 3-digit source');
const src2=U.prizeSources([sourceMB],{...mnOption,sourcePrize:'g7'},2);a.equal(src2.length,4);a.ok(src2.every(x=>x.sourceEvents.every(e=>e.prize==='G7')));
const src3=U.prizeSources([sourceMB],{...mnOption,sourcePrize:'g7db'},3);a.equal(src3.length,1);a.equal(src3[0].number,'000');a.ok(src3[0].sourceEvents.every(e=>e.prize==='ĐB'));a.ok(!src3.some(x=>x.number==='999'));
a.equal(U.prizeSources([{...sourceMB,date}],{...mnOption,sourcePrize:'g7db'},3).length,0);
const last=U.overview([...target,draw('MB','mienbac',date,'99999')],o)[0];a.equal(last.db,'12674');a.equal(last.g7.length,4);a.equal(last.date,'2026-11-22');
a.ok(page.includes('id="g7dbOverview"'));a.ok(page.includes('data-prize-view="G7"'));a.ok(page.includes('id="unifiedSourcePrize"'));
console.log('G7/DB focus passed: regional widths, real G7 only, no MB G6 leakage, leading zeros, explicit source prizes, DB tails and canonical immutable ledger scopes.');

a.equal(JSON.stringify(U.backtest(raw,{...o,scope:'G7'})),JSON.stringify(U.backtest(raw,{...o,scope:'DDA',sourcePrize:'g7db'})),'MB G7 validation must use real 2-digit G7, not G6');
