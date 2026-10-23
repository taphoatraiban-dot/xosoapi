/* XOSOAPI historical statistics: read-only, no prediction claim. */
(()=>{'use strict';
const script=document.currentScript, N=Number(script?.dataset.digits);if(![3,4].includes(N))return;
const $=id=>document.getElementById('ha'+N+id), regions=['MN','MT','MB'];
const KEY='sb_publishable_U8VKihgNe0M7ff5KHB3Mvg_04ifZ7ni',URL='https://zigpqddlhvjbjrwhfhaa.supabase.co/rest/v1/lottery_results';
const COUNTS={MN:{db:1,g1:1,g2:1,g3:2,g4:7,g5:1,g6:3,g7:1,g8:1},MT:{db:1,g1:1,g2:1,g3:2,g4:7,g5:1,g6:3,g7:1,g8:1},MB:{db:1,g1:1,g2:2,g3:6,g4:4,g5:6,g6:3,g7:4}};
const WIDTH={MN:{db:6,g1:5,g2:5,g3:5,g4:5,g5:4,g6:4,g7:3,g8:2},MT:{db:6,g1:5,g2:5,g3:5,g4:5,g5:4,g6:4,g7:3,g8:2},MB:{db:5,g1:5,g2:5,g3:5,g4:4,g5:4,g6:3,g7:2}};
const normalizeKey=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const shift=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const diff=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay();
const set=(id,v)=>{$(id).textContent=v};
let cache=[],cacheTo='';
function walk(v,region,date,out,depth=0){
 if(depth>12||v==null)return;
 if(typeof v==='string'){if(/^[\[{]/.test(v.trim()))try{walk(JSON.parse(v),region,date,out,depth+1)}catch(_){}return;}
 if(Array.isArray(v)){v.forEach(x=>walk(x,region,date,out,depth+1));return;}
 if(typeof v!=='object')return;
 if(v.prizes&&typeof v.prizes==='object'){
  const station=String(v.province||v.station||v.tinh||v.name||(region==='MB'?'Miền Bắc':'Không xác định'));
  const prizes={},alias={special:'db',dacbiet:'db',giaidacbiet:'db'};
  for(const [raw,a] of Object.entries(v.prizes)){const k=alias[normalizeKey(raw)]||normalizeKey(raw);if(!(k in COUNTS[region]))continue;
   prizes[k]=(Array.isArray(a)?a:[a]).map(x=>String(x??'').trim()).filter(x=>/^\d+$/.test(x)&&x.length===WIDTH[region][k]);}
  const complete=Object.entries(COUNTS[region]).every(([k,c])=>(prizes[k]||[]).length===c);
  out.push({region,date,station,prizes,complete});return;
 }
 for(const [k,x] of Object.entries(v))if(!['prizes','metadata','meta','info'].includes(k)&&x&&typeof x==='object')walk(x,region,date,out,depth+1);
}
async function load(region,from,to){
 const rows=[];
 for(let cursor=from;cursor<=to;cursor=shift(cursor,45)){
  const end=shift(cursor,44)>to?to:shift(cursor,44),url=new URL(URL);
  url.searchParams.set('select','region,draw_date,data');url.searchParams.set('region','eq.'+region);
  url.searchParams.set('draw_date','gte.'+cursor);url.searchParams.set('draw_date','lte.'+end);url.searchParams.set('limit','1000');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);let response;
  try{response=await fetch(url,{headers:{apikey:KEY,Accept:'application/json'},signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timer);}
  if(!response.ok)throw Error('Supabase '+region+' HTTP '+response.status);
  const part=await response.json();if(!Array.isArray(part))throw Error('Dữ liệu trả về không phải danh sách');rows.push(...part);
 }return rows;
}
function normalize(rows){const out=new Map();for(const row of rows){const draws=[];walk(row.data,row.region,row.draw_date,draws);
 for(const d of draws){const id=d.region+'|'+d.date+'|'+normalizeKey(d.station),prior=out.get(id);
  if(!prior||(!prior.complete&&d.complete))out.set(id,d);}}
 return [...out.values()];}
function model(data){const numbers=new Map(),validDays=new Set(),events=[],incomplete=[];
 for(const d of data){if(!d.complete){incomplete.push(d);continue;}validDays.add(d.date);
 for(const [prize,arr] of Object.entries(d.prizes))for(const raw of arr)if(raw.length>=N){const num=raw.slice(-N);
  events.push({number:num,date:d.date,station:d.station,region:d.region,prize,raw});
  const g=numbers.get(num)||{num,count:0,dates:new Set()};g.count++;g.dates.add(d.date);numbers.set(num,g);
 }}return {numbers,validDays,events,incomplete};}
function features(s){const a=[...s],counts=Object.values(a.reduce((m,c)=>(m[c]=(m[c]||0)+1,m),{}));return {
 'Chữ số lặp':counts.some(n=>n>1),'Toàn số kép':counts.length===1,
 'Đối xứng':s===[...s].reverse().join(''),
 'Tăng nghiêm ngặt':a.every((c,i)=>!i||+c>+a[i-1]),
 'Giảm nghiêm ngặt':a.every((c,i)=>!i||+c<+a[i-1]),
 'Tổng chữ số chẵn':a.reduce((sum,x)=>sum+ +x,0)%2===0
};}
function table(id,rows,cols){$(id).innerHTML=rows.length?rows.map(row=>'<tr>'+row.map(v=>'<td>'+escapeHTML(v)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+cols+'">Không có kết quả hợp lệ.</td></tr>';}
function render(data,from,to){
 const m=model(data),list=[...m.numbers.values()].map(g=>{const dates=[...g.dates].sort();const gaps=dates.slice(1).map((d,i)=>diff(dates[i],d));
  return {...g,dates,last:dates.at(-1),age:diff(dates.at(-1),to),mean:gaps.length?(gaps.reduce((a,b)=>a+b,0)/gaps.length).toFixed(1):'—'};});
 const format=g=>[g.num,g.count,g.dates.size,g.last,g.age,g.mean];
 table('TopRows',[...list].sort((a,b)=>b.count-a.count||b.dates.size-a.dates.size||a.num.localeCompare(b.num)).slice(0,10).map(format),6);
 table('RareRows',[...list].sort((a,b)=>a.count-b.count||a.num.localeCompare(b.num)).slice(0,10).map(format),6);
 table('GanRows',[...list].sort((a,b)=>b.age-a.age||a.num.localeCompare(b.num)).slice(0,10).map(format),6);
 const missing=10**N-list.length;set('Summary',m.events.length.toLocaleString('vi-VN')+' lượt số · '+m.validDays.size+' ngày có ít nhất một đài đủ giải · '+list.length+' số đã xuất hiện · '+missing+' số chưa ghi nhận.');
 let absent=0;for(let d=from;d<=to;d=shift(d,1))if(!m.validDays.has(d))absent++;
 set('Coverage','Khoảng '+from+' đến '+to+' · '+absent+' ngày không có bảng đủ giải · '+m.incomplete.length+' bảng đài thiếu giải. Khi chọn tất cả đài, một ngày có bảng hợp lệ không đồng nghĩa mọi đài đều đủ dữ liệu.');
 const w=Array.from({length:7},()=>({dates:new Set(),count:0})),months=new Map(),patterns=new Map();
 for(const e of m.events){const x=w[weekday(e.date)];x.dates.add(e.date);x.count++;
  const month=e.date.slice(0,7);months.set(month,(months.get(month)||0)+1);
  for(const [name,present] of Object.entries(features(e.number)))if(present)patterns.set(name,(patterns.get(name)||0)+1);
 }
 table('WeekRows',w.map((x,i)=>[['CN','T2','T3','T4','T5','T6','T7'][i],x.dates.size,x.count,x.dates.size?(x.count/x.dates.size).toFixed(2):'—']),4);
 table('PatternRows',[...patterns].sort((a,b)=>b[1]-a[1]).map(([name,count])=>[name,count,m.events.length?(count*100/m.events.length).toFixed(2)+'%':'0%']),3);
 table('MonthRows',[...months].sort((a,b)=>a[0].localeCompare(b[0])),2);
 const needle=$('Number').value.replace(/\D/g,'').slice(0,N);
 if(needle.length===N){const matches=m.events.filter(e=>e.number===needle).sort((a,b)=>b.date.localeCompare(a.date));
  table('NumberRows',matches.slice(0,50).map(e=>[e.date,e.region,e.station,e.prize,e.raw]),5);
  const g=m.numbers.get(needle);set('NumberInfo',g?needle+' đã xuất hiện '+g.count+' lượt trong '+g.dates.size+' ngày; lần cuối '+[...g.dates].sort().at(-1)+'.':needle+' chưa ghi nhận trong dữ liệu hợp lệ đã lọc.');
 }else{table('NumberRows',[],5);set('NumberInfo','Nhập đủ '+N+' chữ số để xem lịch sử xuất hiện.');}
 set('Status','Hoàn thành: '+data.length+' bảng đài, '+m.events.length+' lượt giải. Chỉ số quan sát, không phải xác suất dự đoán.');
}
async function run(){if($('Run').disabled)return;$('Run').disabled=true;
 try{set('Status','Đang tải dữ liệu 365 ngày hoặc khoảng đã chọn…');const region=$('Region').value,span=Number($('Days').value)||60;
  const to=$('To').value||shift(today(),-1);if(to>shift(today(),-1))throw Error('Ngày kết thúc phải trước ngày hiện tại để tránh giải LIVE chưa đủ.');
  const from=shift(to,-span+1),raw=[];
  for(const r of region==='ALL'?regions:[region]){raw.push(...await load(r,from,to));set('Status','Đã tải '+r+'; đang kiểm tra đủ giải…');}
  cache=normalize(raw);cacheTo=to;const station=$('Station').value;
  const choices=[...new Set(cache.map(d=>d.station))].sort((a,b)=>a.localeCompare(b,'vi'));
  $('Station').innerHTML='<option value="ALL">Tất cả đài</option>'+choices.map(s=>'<option value="'+escapeHTML(s)+'">'+escapeHTML(s)+'</option>').join('');
  $('Station').value=choices.includes(station)?station:'ALL';repaint();
 }catch(e){set('Status','Lỗi tải dữ liệu: '+(e.message||String(e)));}finally{$('Run').disabled=false;}}
function repaint(){if(!cacheTo)return;const span=Number($('Days').value)||60,station=$('Station').value;
 render(station==='ALL'?cache:cache.filter(d=>d.station===station),shift(cacheTo,-span+1),cacheTo);}
$('Run').addEventListener('click',run);$('Station').addEventListener('change',repaint);$('Number').addEventListener('input',repaint);
$('Region').addEventListener('change',()=>{$('Station').innerHTML='<option value="ALL">Tất cả đài</option>';cache=[];cacheTo='';});
$('To').value=shift(today(),-1);
})();