(()=>{'use strict';
const $=id=>document.getElementById(id),C=DailyStats;
const ENDPOINT='https://zigpqddlhvjbjrwhfhaa.supabase.co/rest/v1/lottery_results',KEY='sb_publishable_U8VKihgNe0M7ff5KHB3Mvg_04ifZ7ni';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=d=>d?d.split('-').reverse().join('/'):'—',pct=v=>v===null?'—':(100*v).toFixed(2)+'%';
let generation=0,cacheKey='',cache=null;
function syncStations(){const old=$('dailyStation').value,region=$('dailyRegion').value,date=$('dailyDate').value||today();const expected=C.stations(region,date);$('dailyStation').innerHTML='<option value="ALL">Tất cả đài theo lịch ngày này</option>'+expected.map(s=>'<option value="'+s+'">'+esc(C.LABELS[s]||s)+'</option>').join('');$('dailyStation').value=expected.includes(old)?old:'ALL';}
function clear(message){generation++;$('dailyCards').innerHTML='';$('dailyTests').innerHTML='';$('dailyPatterns').innerHTML='';$('dailyCrossRows').innerHTML='';$('dailyCrossStatus').textContent='';$('dailyQuality').textContent='';$('dailyAudit').textContent='';$('dailyStatus').textContent=message;$('dailyScope').textContent='';$('dailyRun').disabled=false;}
async function load(region,from,to,token){const rows=[];for(let cursor=from;cursor<=to;cursor=C.shift(cursor,45)){
 const end=C.shift(cursor,44)>to?to:C.shift(cursor,44);const u=new URL(ENDPOINT);u.searchParams.set('select','region,draw_date,data');u.searchParams.set('region','eq.'+region);u.searchParams.set('draw_date','gte.'+cursor);u.searchParams.append('draw_date','lte.'+end);u.searchParams.set('limit','1000');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),20000);let res;try{res=await fetch(u,{headers:{apikey:KEY,Accept:'application/json'},signal:ctl.signal,cache:'no-store'});if(!res.ok)throw Error('Supabase HTTP '+res.status);const page=await res.json();if(!Array.isArray(page)||page.length>=1000)throw Error('Dữ liệu không hợp lệ hoặc vượt giới hạn tải.');rows.push(...page.filter(d=>d.region===region&&d.draw_date>=cursor&&d.draw_date<=end));}finally{clearTimeout(timer);}
 if(token!==generation)throw Error('Đã đổi bộ lọc');$('dailyStatus').textContent='Đang tải '+fmt(cursor)+' – '+fmt(end)+'…';
 }return rows;}
function renderCard(type,ranked,checked,selected,date,draws,options){
 const info=C.TYPES[type],entry=ranked.items[0],test=checked.find(x=>x.method===selected);const actual=C.actual(draws,{...options,type,date});
 const content=entry?'<strong class="day-number">'+entry.number+'</strong><p class="reason">Có trong <b>'+entry.hits+'/'+ranked.trainingDraws+' kỳ đài</b> của mẫu xếp hạng.</p><dl><div><dt>Lần ra cuối trong mẫu</dt><dd>'+fmt(entry.last)+'</dd></div><div><dt>Mẫu đến ngày</dt><dd>'+fmt(ranked.lastDate)+'</dd></div><div><dt>Kiểm tra 90 ngày trước</dt><dd>'+test.hits+'/'+test.trials+' ngày</dd></div><div><dt>Tỷ lệ quan sát</dt><dd>'+pct(test.rate)+'</dd></div><div><dt>Chọn ngẫu nhiên: mức tham chiếu</dt><dd>'+pct(test.random)+'</dd></div></dl><span class="evidence">'+(test.trials<30?'Mẫu kiểm chứng ít':'Chưa xác nhận lợi thế dự báo')+'</span>'+(date<today()?'<p class="actual">'+(actual.complete?'Kết quả ngày này: '+(actual.nums.has(entry.number)?'có xuất hiện':'không xuất hiện'):'Chưa đủ bảng để đối chiếu ngày này')+'</p>':'')+'<details><summary>5 số đầu theo cách xếp này</summary><p class="shortlist">'+ranked.items.slice(0,5).map(x=>'<span>'+x.number+' <small>('+x.hits+' kỳ)</small></span>').join('')+'</p></details>':'<p class="no-data">'+esc(ranked.reason)+'</p>';
 return '<article class="day-card"><div class="eyebrow">'+esc(type)+'</div><h2>'+esc(info.label)+'</h2><span class="card-caption">Số đứng đầu dữ liệu · '+fmt(date)+'</span>'+content+'</article>';
}
function renderTests(type,tests){return tests.map(t=>'<tr><td>'+esc(C.TYPES[type].label)+'</td><td>'+esc(C.METHODS[t.method])+'</td><td>'+t.hits+'/'+t.trials+'</td><td>'+pct(t.rate)+'</td><td>'+pct(t.random)+'</td><td>'+(t.interval?t.interval.map(pct).join(' – '):'—')+'</td><td>'+t.skipped+'</td></tr>').join('');}
function patternTable(draws,options){
 const prior=draws.filter(d=>d.date<options.date&&d.region===options.region&&C.stations(options.region,options.date,options.station).includes(d.station));
 const patterns={distinct:'Các chữ số khác nhau',repeat:'Có chữ số lặp',same:'Tất cả chữ số giống nhau',pair:'Đúng một cặp trùng',twoPairs:'Hai cặp trùng',triple:'Đúng ba chữ số giống nhau',palindrome:'Đối xứng',up:'Tăng nghiêm ngặt',down:'Giảm nghiêm ngặt',evenSum:'Tổng chữ số chẵn',oddSum:'Tổng chữ số lẻ'};
 let html='';for(const type of Object.keys(C.TYPES)){const nums=prior.flatMap(d=>C.numbers(d,type)),universe=10**C.TYPES[type].digits;
 for(const [pattern,label] of Object.entries(patterns)){if(!C.applicable(type,pattern))continue;const hits=nums.filter(n=>C.patternOK(n,pattern)).length;let count=0;for(let i=0;i<universe;i++)count+=Number(C.patternOK(String(i).padStart(C.TYPES[type].digits,'0'),pattern));html+='<tr><td>'+esc(type)+'</td><td>'+esc(label)+'</td><td>'+hits+'/'+nums.length+'</td><td>'+pct(nums.length?hits/nums.length:null)+'</td><td>'+pct(count/universe)+'</td></tr>';}}
 $('dailyPatterns').innerHTML=html;
}
function renderCross(){
 const date=$('dailyDate').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){$('dailyCrossStatus').textContent='Chọn ngày hợp lệ và tải phân tích trước.';return;}const to=date<C.shift(today(),-1)?date:C.shift(today(),-1);if(!cache||cacheKey!=='ALL|'+C.shift(date,-365)+'|'+to){$('dailyCrossRows').innerHTML='';$('dailyCrossStatus').textContent='Hãy tải phân tích của ngày đang chọn trước.';return;}
 const options={date:$('dailyDate').value,region:$('dailyRegion').value,station:$('dailyStation').value,type:$('dailyCrossType').value,mode:$('dailyCrossMode').value};
 const r=C.crossRegion(cache.draws,options),names={MN:'Nam',MT:'Trung',MB:'Bắc'};
 $('dailyCrossStatus').textContent='Có '+r.signals.length+' lần hai miền nguồn cùng xuất hiện trong một ngày. '+r.hits+'/'+r.trials+' trường hợp có đủ 7 ngày theo dõi đã xuất hiện lại ở miền đích trong 7 ngày ('+pct(r.rate)+'). Mức ngẫu nhiên cùng dạng trên các cửa sổ này: '+pct(r.random)+'. Bỏ '+r.excluded+' trường hợp chưa đủ thời gian hoặc thiếu bảng đích. Đây là tần suất lịch sử, không phải xác suất kỳ tới.';
 $('dailyCrossRows').innerHTML=r.signals.length?r.signals.slice(0,50).map(g=>'<tr><td>'+fmt(g.date)+'</td><td>'+esc(options.mode==='exact'?g.key:'Bộ '+g.key)+'</td><td>'+esc(r.sources.map(s=>names[s]+': '+g.sources[s].join(', ')).join(' · '))+'</td><td>'+(g.first?fmt(g.first):'Chưa ghi nhận trong dữ liệu đã tải')+'</td><td>'+(g.lag===null?'—':g.lag+' ngày')+'</td></tr>').join(''):'<tr><td colspan="5">Chưa có trường hợp phù hợp trong khoảng dữ liệu đã tải.</td></tr>';
}
async function run(){const token=++generation;$('dailyRun').disabled=true;$('dailyCards').innerHTML='';$('dailyTests').innerHTML='';$('dailyPatterns').innerHTML='';$('dailyCrossRows').innerHTML='';$('dailyCrossStatus').textContent='';$('dailyQuality').textContent='';$('dailyAudit').textContent='';$('dailyStatus').textContent='Đang kiểm tra quyền truy cập…';
 try{
 const sb=window.memberSupabase;if(!sb)throw Error('Đăng nhập để phân tích.');const user=await sb.auth.getUser();if(user.error||!user.data?.user)throw Error('Phiên đăng nhập đã hết hạn.');const access=await sb.rpc('member_access_status');if(access.error||access.data?.allowed!==true)throw Error('Tài khoản chưa có quyền truy cập.');if(token!==generation)return;
 const date=$('dailyDate').value,region=$('dailyRegion').value,station=$('dailyStation').value,method=$('dailyMethod').value,pattern=$('dailyPattern').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||C.shift(date,0)!==date)throw Error('Ngày không hợp lệ.');if(date>C.shift(today(),7))throw Error('Chỉ phân tích đến 7 ngày tới; ngày xa hơn chưa có dữ liệu mới.');
 const from=C.shift(date,-365),to=date<C.shift(today(),-1)?date:C.shift(today(),-1),key='ALL|'+from+'|'+to;
 if(key!==cacheKey){const raw=[];for(const source of ['MN','MT','MB']){raw.push(...await load(source,from,to,token));if(token!==generation)return;}const prepared=C.prepare(raw);if(token!==generation)return;cache=prepared;cacheKey=key;}
 if(token!==generation)return;const options={date,region,station,method,pattern},expected=C.stations(region,date,station);
 if(!expected.length)throw Error('Đài không quay vào ngày đã chọn.');const cutoff=cache.draws.filter(d=>d.date<date),dates=new Set(cutoff.map(d=>d.date));
 $('dailyScope').textContent=fmt(date)+' · '+{MN:'Miền Nam',MT:'Miền Trung',MB:'Miền Bắc'}[region]+' · '+expected.map(s=>C.LABELS[s]||s).join(', ')+' · '+C.METHODS[method];
 $('dailyQuality').textContent='Lịch sử cả 3 miền '+fmt(from)+' – '+fmt(to)+' · '+dates.size+' ngày có ít nhất một bảng trước ngày phân tích · '+cache.draws.length+' bảng giữ lại · Loại '+cache.suspectCount+' bảng nghi lặp nguyên bảng khác ngày. Chỉ nhận bảng đủ số lượng và độ dài giải. Ngày thiếu/đài thiếu được bỏ qua khi kiểm chứng; không coi là số chưa ra. Các đài theo lịch thường lệ, cần kiểm tra riêng ngày nghỉ quay.';
 $('dailyAudit').textContent=cache.suspectGroups.length?cache.suspectGroups.map(g=>(C.LABELS[g.station]||g.station)+': '+g.dates.map(fmt).join(' / ')).join('\n'):'Không thấy nguyên bảng giải lặp khác ngày trong khoảng tải. Điều này chưa thay thế đối chiếu nguồn độc lập.';
 const cards=[],tests=[];for(const type of Object.keys(C.TYPES)){
  if(token!==generation)return;$('dailyStatus').textContent='Đang kiểm chứng '+C.TYPES[type].label+' trên 90 ngày trước ngày đã chọn…';await new Promise(r=>setTimeout(r,0));
  const ranked=C.rank(cutoff,{...options,type}),checked=C.evaluate(cutoff,{...options,type});cards.push(renderCard(type,ranked,checked,method,date,cache.draws,options));tests.push(renderTests(type,checked));
  if(token!==generation)return;$('dailyCards').innerHTML=cards.join('');$('dailyTests').innerHTML=tests.join('');
 }
 if(token!==generation)return;patternTable(cutoff,options);renderCross();$('dailyStatus').textContent='Đã phân tích '+fmt(date)+'. Số xếp hạng chỉ dùng kết quả trước ngày này. Tỷ lệ kiểm chứng là lịch sử, không phải xác suất chắc trúng.';
 }catch(e){if(token!==generation)return;$('dailyCards').innerHTML='';$('dailyTests').innerHTML='';$('dailyPatterns').innerHTML='';$('dailyStatus').textContent='Chưa thể phân tích: '+(e.message||String(e));}finally{if(token===generation)$('dailyRun').disabled=false;}}
$('dailyDate').value=today();$('dailyDate').max=C.shift(today(),7);syncStations();
for(const id of ['dailyDate','dailyRegion'])$(id).addEventListener('change',()=>{syncStations();clear('Đã đổi ngày hoặc miền. Bấm Phân tích theo ngày để tải lại.');});
for(const id of ['dailyStation','dailyMethod','dailyPattern'])$(id).addEventListener('change',()=>clear('Đã đổi cách xem. Bấm Phân tích theo ngày để cập nhật.'));
for(const id of ['dailyCrossType','dailyCrossMode'])$(id).addEventListener('change',renderCross);
$('dailyRun').addEventListener('click',run);
})();
