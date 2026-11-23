/* One historical snapshot, one target ranking; XC sources annotate the same rows. */
(()=>{'use strict';const C=DailyStats,V=VerifiedAnalysis;
const SCOPES={XC:{digits:3,label:'XC đầu + đuôi'},...V.SCOPES},esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=d=>d?d.split('-').reverse().join('/'):'—';
function analyze(draws,o){
 const scope=SCOPES[o.scope];if(!scope)throw Error('Phạm vi thống kê không hợp lệ');
 const prior=draws.filter(d=>d.date<o.date&&d.date>=C.shift(o.date,-365)),targets=C.stations(o.region,o.date,o.station||'ALL');
 const sources=scope.digits===4?[]:XCProfile.candidates(prior,{date:o.date,region:o.region,windowDays:o.windowDays||30,mode:o.mode||'exact',rule:scope.digits===2?'any':o.rule||'any'}),evidence=new Map();
 for(const s of sources){const key=scope.digits===2?s.number.slice(-2):s.number,list=evidence.get(key)||[];list.push(s);evidence.set(key,list);}
 return {scope:o.scope,digits:scope.digits,sourceApplicable:scope.digits!==4,profiles:targets.map(station=>{
 const q=o.scope==='XC'?C.rank(prior,{...o,station,type:'XC'}):V.rank(prior,{...o,station});
 let items=q.items.filter(x=>C.patternOK(x.number,o.pattern||'all')).map(x=>{const source=evidence.get(x.number)||[],events=new Map();for(const s of source)for(const e of s.sourceEvents)events.set(e.region+'|'+e.station+'|'+e.date+'|'+e.number,e);return {...x,sourceEvents:[...events.values()].sort((a,b)=>b.date.localeCompare(a.date)),hasSource:source.length>0,sourceExact:scope.digits===2?source.some(s=>s.sourceEvents.some(e=>e.number.endsWith(x.number))):source.some(s=>s.sourceExact)};});
 // For two-digit tails, require both regions after projecting three-digit candidates.
 if(o.rule==='both')items=items.map(x=>({...x,hasSource:new Set(x.sourceEvents.map(e=>e.region)).size===2}));
 if(o.sourceOnly&&scope.digits!==4)items=items.filter(x=>x.hasSource);
 return {station,sample:q.sample??q.trainingDraws??0,reason:q.reason||'',items};})};
}
let data=null;
const get=id=>typeof document!=='undefined'?document.getElementById(id):null;
function clear(){data=null;const n=get('unifiedResults');if(n)n.innerHTML='';const s=get('unifiedStatus');if(s)s.textContent='Chọn ngày, miền, đài rồi bấm Phân tích chung.';}
function render(){if(!data)return;const o={...data.options,scope:get('unifiedScope')?.value||'XC',sourceOnly:!!get('unifiedSourceOnly')?.checked,windowDays:Number(get('xcWindow')?.value)||30,mode:get('xcMatch')?.value||'exact',rule:get('xcRule')?.value||'any'},r=analyze(data.draws,o),limit=Number(get('unifiedCount')?.value)||5;
 const sourceToggle=get('unifiedSourceOnly');if(sourceToggle)sourceToggle.disabled=!r.sourceApplicable;
 get('unifiedStatus').textContent=fmt(o.date)+' · '+SCOPES[o.scope].label+' · '+C.METHODS[o.method]+' · Chỉ dùng kết quả trước ngày chọn. Nguồn XC: '+o.windowDays+' ngày trước, '+(o.mode==='family'?'gồm bộ đảo':'nguyên số')+'. '+(r.sourceApplicable?'Cột nguồn chỉ bổ sung bằng chứng lịch sử; không cộng thành xác suất trúng.':'XC có 3 chữ số nên không suy ra nguồn 4 số.');
 get('unifiedResults').innerHTML=r.profiles.map(p=>'<article class="xc-station"><h3>'+esc(C.LABELS[p.station]||p.station)+'</h3><p>'+p.sample+' kỳ đài trong mẫu xếp hạng · '+p.items.length+' số phù hợp. Một số ra nhiều lần trong kỳ chỉ tính một kỳ.</p>'+(p.items.length?'<div class="scroll"><table><thead><tr><th>Số</th><th>Kỳ có số / mẫu đích</th><th>Lần ra tại đích</th><th>Nguồn XC liên miền</th></tr></thead><tbody>'+p.items.slice(0,limit).map(x=>'<tr><td><b style="font-size:22px">'+x.number+'</b></td><td>'+x.hits+'/'+p.sample+'</td><td>'+fmt(x.last)+'</td><td>'+(!r.sourceApplicable?'Không áp dụng cho 4 số':x.hasSource?'<b>'+(r.digits===2?(x.sourceExact?'Khớp đuôi 2 số XC':'Đuôi 2 số từ bộ đảo XC'):x.sourceExact?'Khớp nguyên số':'Khớp bộ đảo')+'</b><details><summary>'+x.sourceEvents.length+' ghi nhận nguồn · xem ngày/đài</summary>'+x.sourceEvents.map(e=>fmt(e.date)+' · '+esc(C.LABELS[e.station]||e.station)+' ('+e.region+') · '+e.number).join('<br>')+'</details>':'Chưa có nguồn phù hợp trong khoảng chọn')+'</td></tr>').join('')+'</tbody></table></div>':'<p>'+(p.reason?esc(p.reason):'Không có số phù hợp với bộ lọc và điều kiện nguồn. Không thay bằng số từ phạm vi khác.')+'</p>')+'</article>').join('')||'<p>Không có đài theo lịch ngày chọn.</p>';
}
function setData(draws,options){data={draws,options:{...options}};render();}
globalThis.UnifiedStats={SCOPES,analyze,clear,render,setData};
if(typeof document!=='undefined'){const scope=get('unifiedScope');if(scope)scope.innerHTML=Object.entries(SCOPES).map(([k,v])=>'<option value="'+k+'">'+v.label+'</option>').join('');for(const id of ['unifiedScope','unifiedCount','unifiedSourceOnly','xcWindow','xcMatch','xcRule'])get(id)?.addEventListener('change',render);}
})();
