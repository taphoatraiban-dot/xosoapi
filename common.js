'use strict';
const BASE='https://zigpqddlhvjbjrwhfhaa.supabase.co';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>String(d||'').split('-').reverse().join('/');
const pad=n=>String(n).padStart(2,'0');
const localDay=(d=new Date())=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
const minusDays=(d,n)=>{let x=new Date(d+'T12:00:00');x.setDate(x.getDate()-n);return localDay(x)};
const getKey=()=>($('apiKey')?.value||sessionStorage.getItem('lottery_public_key')||'').trim();
const getBase=()=>($('base')?.value||BASE).replace(/\/+$/,'');
const status=(s,error=false)=>{if($('status')){$('status').textContent=s;$('status').style.color=error?'#ff9292':'#a8c5df'}};
// Only recognized prize keys. Avoid treating province names, dates or metadata as prize values.
const prizeKeys={db:6,g1:5,g2:5,g3:5,g4:5,g5:4,g6:4,g7:3,g8:2};
function extractDraws(value,region,date){
  let out=[];
  function walk(v,province,depth){
    if(depth>12||v==null)return;
    if(typeof v==='string'&&/^[\[{]/.test(v.trim())){try{return walk(JSON.parse(v),province,depth+1)}catch(e){return}}
    if(Array.isArray(v)){v.forEach(x=>walk(x,province,depth+1));return}
    if(typeof v!=='object')return;
    let prov=String(v.province||v.station||v.tinh||v.name||province||(region==='MB'?'Miền Bắc':'Không rõ đài'));
    if(v.prizes&&typeof v.prizes==='object'){
      let prizes={};for(let [k,val] of Object.entries(v.prizes)){
        let canonical=k.toLowerCase().replace(/[^a-z0-9]/g,'');
        if(canonical==='special'||canonical==='dacbiet')canonical='db';
        if(!Object.hasOwn(prizeKeys,canonical))continue;
        let raw=Array.isArray(val)?val:[val];
        // Source may append a 2-digit metadata code to every prize array: validate prize length.
        let nums=raw.map(x=>typeof x==='number'||typeof x==='string'?String(x).trim():'').filter(x=>/^\d+$/.test(x)&&x.length===(region==='MB'?({db:5,g1:5,g2:5,g3:5,g4:4,g5:4,g6:3,g7:2}[canonical]||0):prizeKeys[canonical]));
        if(nums.length)prizes[canonical]=nums;
      }
      if(Object.keys(prizes).length)out.push({region,date,province:prov,prizes});
    }
    for(let [k,child] of Object.entries(v))if(!['prizes','province','station','tinh','name'].includes(k)&&child&&typeof child==='object')walk(child,prov,depth+1);
  }
  walk(value,'',0);return out;
}
async function fetchHistory(days=60){
  let key=getKey();if(!key)throw Error('Cần nhập Supabase anon / publishable key.');
  sessionStorage.setItem('lottery_public_key',key);
  const to=localDay(),from=minusDays(to,days-1),rows=[];
  for(const region of ['MN','MT','MB']){
    status('Đang tải '+region+'…');
    let u=new URL(getBase()+'/rest/v1/lottery_results');
    u.searchParams.set('select','region,draw_date,data');u.searchParams.set('region','eq.'+region);
    u.searchParams.set('draw_date','gte.'+from);u.searchParams.set('order','draw_date.desc');u.searchParams.set('limit','10000');
    let controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000),res;
    try{res=await fetch(u,{headers:{apikey:key,Accept:'application/json'},signal:controller.signal})}finally{clearTimeout(timer)}
    if(!res.ok)throw Error(region+': HTTP '+res.status+' — '+(await res.text()).slice(0,160));
    for(let r of await res.json())rows.push(...extractDraws(r.data,region,r.draw_date));
  }
  let uniq=new Map();for(let r of rows){let sig=r.region+'|'+r.date+'|'+r.province+'|'+JSON.stringify(r.prizes);uniq.set(sig,r)}
  return [...uniq.values()];
}
function flatten(draw){return Object.values(draw.prizes).flat()}
function twoDigits(draw){return flatten(draw).map(s=>s.slice(-2))}
function getSelected(rows,region,province){return rows.filter(r=>r.region===region&&(!province||r.province===province))}
