/* Station-to-station recurrence by scheduled target draw, not calendar guesses. */
(()=>{'use strict';const C=DailyStats,V=VerifiedAnalysis,shape=n=>Object.values([...n].reduce((m,c)=>(m[c]=(m[c]||0)+1,m),{})).sort().join(),universes=new Map();
function key(n,mode){return mode==='tail'?n.slice(-2):mode==='family'?[...n].sort().join(''):n;}
function universe(digits){if(!universes.has(digits)){let seen=new Set(),m=new Map();for(let i=0;i<10**digits;i++){let k=key(String(i).padStart(digits,'0'),'family');if(!seen.has(k)){seen.add(k);m.set(shape(k),(m.get(shape(k))||0)+1);}}universes.set(digits,m);}return universes.get(digits);}
function targetDates(after,region,station,n){let result=[];for(let day=C.shift(after,1),i=0;i<120&&result.length<n;day=C.shift(day,1),i++)if(C.stations(region,day).includes(station))result.push(day);return result;}
function analyze(raw,o){if(!V.SCOPES[o.scope]||!['exact','tail','family'].includes(o.mode)||![1,2,4,8].includes(o.maxLag))throw Error('Phạm vi hoặc độ trễ không hợp lệ');
 const digits=o.mode==='tail'?2:V.SCOPES[o.scope].digits,query=String(o.query||'').trim();if(query&&!new RegExp('^\\d{'+digits+'}$').test(query))throw Error('Nhập đúng '+digits+' chữ số cho cách khớp đã chọn.');
 const p=C.prepare(raw.filter(r=>r.draw_date<=o.asOf&&r.draw_date>=C.shift(o.asOf,-365))),draws=p.draws,targets=new Map(draws.filter(d=>d.region===o.targetRegion&&d.station===o.targetStation).map(d=>[d.date,d])),sources=draws.filter(d=>d.region===o.sourceRegion&&d.station===o.sourceStation),boundary=C.shift(o.asOf,-90),events=[],stats=Array.from({length:o.maxLag},(_,i)=>({lag:i+1,trials:0,hits:0,randomSum:0,missing:0,pending:0,early:{trials:0,hits:0,randomSum:0},late:{trials:0,hits:0,randomSum:0}}));
 for(const s of sources){const groups=new Map();for(const n of V.nums(s,o.scope)){const k=key(n,o.mode);if(!groups.has(k))groups.set(k,new Set());groups.get(k).add(n);}const dates=targetDates(s.date,o.targetRegion,o.targetStation,o.maxLag);
 for(const [k,sourceNums] of groups){const steps=[];for(let i=0;i<dates.length;i++){const day=dates[i],t=targets.get(day),b=stats[i],future=day>o.asOf;let hit=null,random=null,matched=[];
 if(future)b.pending++;else if(!t)b.missing++;else{const ns=V.nums(t,o.scope),ks=new Set(ns.map(n=>key(n,o.mode)));matched=ns.filter(n=>key(n,o.mode)===k);hit=ks.has(k);random=o.mode==='family'?[...ks].filter(n=>shape(n)===shape(k)).length/universe(digits).get(shape(k)):ks.size/10**digits;b.trials++;b.hits+=Number(hit);b.randomSum+=random;const phase=day<boundary?'early':s.date>=boundary?'late':null;if(phase){b[phase].trials++;b[phase].hits+=Number(hit);b[phase].randomSum+=random;}}
 steps.push({lag:i+1,date:day,days:Math.round((new Date(day)-new Date(s.date))/86400000),status:future?'pending':!t?'missing':hit?'hit':'miss',matched,sourceNumbers:[...sourceNums],targetDB:t?.prizes.db[0]||null});}
 if(query&&key(query,o.mode)===k)events.push({sourceDate:s.date,sourceDB:s.prizes.db[0],numbers:[...sourceNums],steps});}}
 for(const b of stats){b.rate=b.trials?b.hits/b.trials:null;b.random=b.trials?b.randomSum/b.trials:null;b.interval=C.wilson(b.hits,b.trials);for(const phase of [b.early,b.late]){phase.rate=phase.trials?phase.hits/phase.trials:null;phase.random=phase.trials?phase.randomSum/phase.trials:null;}}
 const eligible=stats.filter(b=>b.early.trials>=30&&b.early.hits>0&&b.early.rate>b.early.random).sort((a,b)=>(b.early.rate-b.early.random)-(a.early.rate-a.early.random)||a.lag-b.lag),selectedLag=eligible[0]?.lag||null;
 return {stats,events:events.sort((a,b)=>b.sourceDate.localeCompare(a.sourceDate)),sourceDraws:sources.length,targetDraws:targets.size,suspect:p.suspectCount,selectedLag,boundary,asOf:o.asOf,query,mode:o.mode,scope:o.scope};
}
globalThis.StationPair={analyze,targetDates,key};
})();
