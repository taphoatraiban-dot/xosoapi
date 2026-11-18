/* Observed frequency, with a separate recent window for each station. */
(()=>{'use strict';
function rank(rows,{window=10,mode='recent',digits=2}={}){
 const groups=new Map();
 for(const row of rows){if(!row.nums?.length)continue;const k=row.station; if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
 if(![2,3,4].includes(digits))throw Error('Unsupported number length');
 const stats=new Map();
 let total=0,recentTotal=0,shortStations=0,latest='';
 for(const [station,draws] of groups){
  draws.sort((a,b)=>b.date.localeCompare(a.date));const recent=Math.min(window,draws.length);
  total+=draws.length;recentTotal+=recent;if(recent<window)shortStations++;
  if(draws[0].date>latest)latest=draws[0].date;
  draws.forEach((row,index)=>{for(const num of new Set(row.nums)){if(!new RegExp('^\\d{'+digits+'}$').test(num))continue;let s=stats.get(num);if(!s){s={num,hits:0,recentHits:0,last:'',stations:new Set()};stats.set(num,s);}s.hits++;if(index<recent){s.recentHits++;s.stations.add(station);}if(row.date>s.last)s.last=row.date;}});
 }
 const items=[...stats.values()].filter(x=>mode==='overall'?x.hits:x.recentHits).sort((a,b)=>mode==='overall'?
  b.hits-a.hits||b.recentHits-a.recentHits||b.last.localeCompare(a.last)||a.num.localeCompare(b.num):
  b.recentHits-a.recentHits||b.hits-a.hits||b.last.localeCompare(a.last)||a.num.localeCompare(b.num));
 return {items,total,recentTotal,stations:groups.size,shortStations,latest,window};
}
globalThis.XosoFocus={rank};
})();
