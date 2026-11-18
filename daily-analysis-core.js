/* Daily historical rankings. All forecasts use dates strictly before the target. */
(()=>{'use strict';
const TYPES={DD:{digits:2,label:'Đầu đuôi'},XC:{digits:3,label:'Xỉu chủ'},B2:{digits:2,label:'Bao 2 số'},B3:{digits:3,label:'Bao 3 số'},B4:{digits:4,label:'Bao 4 số'}};
const METHODS={recent:'10 kỳ gần nhất mỗi đài',frequency:'Tần suất 56 ngày',weekday:'Cùng thứ trong 112 ngày'};
const SCHEDULE={MN:[['tiengiang','kiengiang','lamdong'],['hochiminh','dongthap','camau'],['bentre','vungtau','baclieu'],['dongnai','cantho','soctrang'],['tayninh','angiang','binhthuan'],['vinhlong','binhduong','travinh'],['hochiminh','longan','binhphuoc','haugiang']],MT:[['khanhhoa','kontum','hue'],['phuyen','hue'],['daklak','quangnam'],['danang','khanhhoa'],['binhdinh','quangtri','quangbinh'],['gialai','ninhthuan'],['danang','quangngai','daknong']],MB:Array.from({length:7},()=>['mienbac'])};
const LABELS={tiengiang:'Tiền Giang',kiengiang:'Kiên Giang',lamdong:'Đà Lạt',hochiminh:'TP Hồ Chí Minh',dongthap:'Đồng Tháp',camau:'Cà Mau',bentre:'Bến Tre',vungtau:'Vũng Tàu',baclieu:'Bạc Liêu',dongnai:'Đồng Nai',cantho:'Cần Thơ',soctrang:'Sóc Trăng',tayninh:'Tây Ninh',angiang:'An Giang',binhthuan:'Bình Thuận',vinhlong:'Vĩnh Long',binhduong:'Bình Dương',travinh:'Trà Vinh',longan:'Long An',binhphuoc:'Bình Phước',haugiang:'Hậu Giang',khanhhoa:'Khánh Hòa',kontum:'Kon Tum',hue:'Huế',phuyen:'Phú Yên',daklak:'Đắk Lắk',quangnam:'Quảng Nam',danang:'Đà Nẵng',binhdinh:'Bình Định',quangtri:'Quảng Trị',quangbinh:'Quảng Bình',gialai:'Gia Lai',ninhthuan:'Ninh Thuận',quangngai:'Quảng Ngãi',daknong:'Đắk Nông',mienbac:'Miền Bắc'};
function canon(s){const k=String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');return ({tphcm:'hochiminh',tphochiminh:'hochiminh',thuathienhue:'hue',daclak:'daklak',daclac:'daklak',daklac:'daklak',dacnong:'daknong',dalat:'lamdong'})[k]||k;}
function shift(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const weekday=date=>new Date(date+'T12:00:00Z').getUTCDay();
function stations(region,date,station='ALL'){const list=SCHEDULE[region]?.[weekday(date)]||[];return station==='ALL'?list:list.includes(station)?[station]:[];}
function numbers(draw,type){const t=TYPES[type],p=draw.prizes;const keys=type==='DD'?['db',draw.region==='MB'?'g7':'g8']:type==='XC'?['db',draw.region==='MB'?'g6':'g7']:Object.keys(p);return keys.flatMap(k=>(p[k]||[]).filter(x=>x.length>=t.digits).map(x=>x.slice(-t.digits)));}
function patternOK(num,pattern='all'){
 const counts=Object.values([...num].reduce((m,c)=>(m[c]=(m[c]||0)+1,m),{})).sort((a,b)=>b-a);
 if(pattern==='all')return true;if(pattern==='distinct')return counts.length===num.length;if(pattern==='repeat')return counts.length<num.length;
 if(pattern==='same')return counts.length===1;if(pattern==='pair')return counts[0]===2&&counts.filter(x=>x===2).length===1;
 if(pattern==='twoPairs')return num.length===4&&counts.join()=== '2,2';if(pattern==='triple')return num.length>=3&&counts[0]===3;
 if(pattern==='palindrome')return num===[...num].reverse().join('');if(pattern==='up')return [...num].every((c,i)=>!i||c>num[i-1]);if(pattern==='down')return [...num].every((c,i)=>!i||c<num[i-1]);
 if(pattern==='evenSum')return [...num].reduce((a,c)=>a+Number(c),0)%2===0;if(pattern==='oddSum')return [...num].reduce((a,c)=>a+Number(c),0)%2===1;
 throw Error('Dạng số không hợp lệ');
}
function applicable(type,pattern){return !(pattern==='twoPairs'&&TYPES[type].digits!==4||pattern==='triple'&&TYPES[type].digits<3);}
function prepare(rows){
 const valid=XosoStats.draws(rows),map=new Map();
 for(const row of valid){const d={region:row.region,date:row.draw_date,station:row.region==='MB'?'mienbac':canon(row.data.province),prizes:row.data.prizes};const id=d.region+'|'+d.date+'|'+d.station;
  if(map.has(id)){if(JSON.stringify(Object.keys(d.prizes).sort().map(k=>[k,map.get(id).prizes[k].slice().sort()]))!==JSON.stringify(Object.keys(d.prizes).sort().map(k=>[k,d.prizes[k].slice().sort()])))throw Error('Bảng cùng ngày mâu thuẫn sau khi chuẩn hóa tên đài');continue;}map.set(id,d);
 }
 const groups=new Map();for(const d of map.values()){const signature=d.region+'|'+d.station+'|'+JSON.stringify(Object.keys(d.prizes).sort().map(k=>[k,d.prizes[k].slice().sort()]));if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(d);}
 const suspect=new Set(),suspectGroups=[];for(const group of groups.values())if(new Set(group.map(d=>d.date)).size>1){group.forEach(d=>suspect.add(d));suspectGroups.push({region:group[0].region,station:group[0].station,dates:group.map(d=>d.date).sort()});}
 const draws=[...map.values()].filter(d=>!suspect.has(d)).sort((a,b)=>a.date.localeCompare(b.date)||a.station.localeCompare(b.station));
 return {draws,validBeforeAudit:valid.length,suspectCount:suspect.size,suspectGroups};
}
function rank(draws,{date,region,station='ALL',type,method='recent',pattern='all'}){
 if(!TYPES[type]||!METHODS[method])throw Error('Kiểu phân tích không hợp lệ');if(!applicable(type,pattern))return {items:[],reason:'Dạng này không áp dụng cho '+TYPES[type].digits+' chữ số.'};
 const expected=stations(region,date,station);if(!expected.length)return {items:[],reason:'Đài này không có lịch quay vào ngày đã chọn.'};
 let train=draws.filter(d=>d.region===region&&d.date<date&&expected.includes(d.station));
 if(method==='recent'){const groups=new Map();for(const s of expected)groups.set(s,[]);train.forEach(d=>groups.get(d.station).push(d));train=[...groups.values()].flatMap(g=>g.slice(-10));}
 else train=train.filter(d=>d.date>=shift(date,method==='frequency'?-56:-112)&&(method!=='weekday'||weekday(d.date)===weekday(date)));
 const coverage=expected.map(s=>({station:s,draws:train.filter(d=>d.station===s).length}));
 if(coverage.some(x=>x.draws<6))return {items:[],reason:'Chưa đủ 6 kỳ lịch sử của mỗi đài được chọn.',coverage};
 const map=new Map();for(const d of train)for(const num of new Set(numbers(d,type))){if(!patternOK(num,pattern))continue;const v=map.get(num)||{number:num,hits:0,last:''};v.hits++;if(d.date>v.last)v.last=d.date;map.set(num,v);}
 const items=[...map.values()].sort((a,b)=>b.hits-a.hits||b.last.localeCompare(a.last)||a.number.localeCompare(b.number));
 return {items,trainingDraws:train.length,coverage,firstDate:train.map(d=>d.date).sort()[0],lastDate:train.map(d=>d.date).sort().at(-1),reason:items.length?'':'Chưa thấy số thuộc dạng này trong mẫu lịch sử.'};
}
function actual(draws,{region,date,station='ALL',type}){const expected=stations(region,date,station);const found=draws.filter(d=>d.region===region&&d.date===date&&expected.includes(d.station));return {complete:expected.length>0&&new Set(found.map(d=>d.station)).size===expected.length,draws:found.length,expected:expected.length,nums:new Set(found.flatMap(d=>numbers(d,type)))};}
function wilson(h,n){if(!n)return null;const z=1.95996398454,p=h/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,w=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-w),Math.min(1,c+w)];}
function evaluate(draws,options){
 const {date,region,station='ALL',type,pattern='all'}=options;const output=[];
 for(const method of Object.keys(METHODS)){
  let trials=0,hits=0,expected=0,skipped=0;const examples=[];
  for(let i=90;i>=1;i--){const day=shift(date,-i);if(!stations(region,day,station).length)continue;
   const target=actual(draws,{region,date:day,station,type});if(!target.complete){skipped++;continue;}
   const ranked=rank(draws,{date:day,region,station,type,method,pattern});if(!ranked.items.length){skipped++;continue;}
   const num=ranked.items[0].number,hit=target.nums.has(num);trials++;hits+=Number(hit);expected+=target.nums.size/(10**TYPES[type].digits);
   if(examples.length<5)examples.push({date:day,number:num,hit});
  }
  output.push({method,trials,hits,skipped,rate:trials?hits/trials:null,random:trials?expected/trials:null,interval:wilson(hits,trials),examples});
 }return output;
}
const familyUniverses=new Map();
function multiplicity(key){return Object.values([...key].reduce((m,c)=>(m[c]=(m[c]||0)+1,m),{})).sort((a,b)=>b-a).join('-');}
function familyUniverse(digits){if(!familyUniverses.has(digits)){const groups=new Map(),seen=new Set();for(let i=0;i<10**digits;i++){const key=[...String(i).padStart(digits,'0')].sort().join('');if(seen.has(key))continue;seen.add(key);const shape=multiplicity(key);groups.set(shape,(groups.get(shape)||0)+1);}familyUniverses.set(digits,groups);}return familyUniverses.get(digits);}
function crossRegion(draws,{date,region,station='ALL',type='XC',mode='family'}){
 const start=shift(date,-365),prior=draws.filter(d=>d.date>=start&&d.date<date),sources=Object.keys(SCHEDULE).filter(r=>r!==region),groups=new Map();
 const identity=num=>mode==='exact'?num:[...num].sort().join('');
 for(const d of prior){if(!sources.includes(d.region))continue;for(const num of new Set(numbers(d,type))){const key=identity(num),id=d.date+'|'+key;let g=groups.get(id);if(!g){g={date:d.date,key,sources:{}};groups.set(id,g);}if(!g.sources[d.region])g.sources[d.region]=new Set();g.sources[d.region].add(num);}}
 const targets=prior.filter(d=>d.region===region&&(station==='ALL'||d.station===station));
 const events=new Map();for(const d of targets)for(const num of new Set(numbers(d,type))){const key=identity(num);if(!events.has(key))events.set(key,[]);events.get(key).push(d.date);}
 const coverageCache=new Map();const dayComplete=day=>{if(!coverageCache.has(day))coverageCache.set(day,actual(prior,{region,date:day,station,type}).complete);return coverageCache.get(day);};
 const signals=[...groups.values()].filter(g=>sources.every(r=>g.sources[r])).sort((a,b)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key));let trials=0,hits=0,excluded=0,randomTotal=0;const windows=new Map(),universe=10**TYPES[type].digits,families=familyUniverse(TYPES[type].digits);
 for(const g of signals){g.first=(events.get(g.key)||[]).filter(d=>d>g.date).sort()[0]||null;g.lag=g.first?Math.round((Date.parse(g.first)-Date.parse(g.date))/86400000):null;
  const days=Array.from({length:7},(_,i)=>shift(g.date,i+1)).filter(d=>stations(region,d,station).length);const complete=days.length>0&&shift(g.date,7)<date&&days.every(dayComplete);
  if(complete){trials++;if(g.first&&g.first<=shift(g.date,7))hits++;
   if(!windows.has(g.date)){const nums=new Set(targets.filter(d=>d.date>g.date&&d.date<=shift(g.date,7)).flatMap(d=>numbers(d,type))),byShape=new Map();for(const num of nums){const key=[...num].sort().join(''),shape=multiplicity(key);if(!byShape.has(shape))byShape.set(shape,new Set());byShape.get(shape).add(key);}windows.set(g.date,{nums,byShape});}
   const w=windows.get(g.date);randomTotal+=mode==='exact'?w.nums.size/universe:(w.byShape.get(multiplicity(g.key))?.size||0)/families.get(multiplicity(g.key));
  }else excluded++;
  g.sources=Object.fromEntries(Object.entries(g.sources).map(([r,nums])=>[r,[...nums].sort()]));
 }
 return {signals,trials,hits,excluded,sources,rate:trials?hits/trials:null,random:trials?randomTotal/trials:null};
}
globalThis.DailyStats={TYPES,METHODS,SCHEDULE,LABELS,canon,shift,stations,numbers,patternOK,applicable,prepare,rank,actual,evaluate,wilson,crossRegion};
})();
