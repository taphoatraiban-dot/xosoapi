/* Shared validation for historical statistics. Never merge partial draw updates. */
(()=>{'use strict';
const counts={MN:{db:1,g1:1,g2:1,g3:2,g4:7,g5:1,g6:3,g7:1,g8:1},MB:{db:1,g1:1,g2:2,g3:6,g4:4,g5:6,g6:3,g7:4}};
counts.MT=counts.MN;
const widths={MN:{db:6,g1:5,g2:5,g3:5,g4:5,g5:4,g6:4,g7:3,g8:2},MB:{db:5,g1:5,g2:5,g3:5,g4:4,g5:4,g6:3,g7:2}};widths.MT=widths.MN;
const key=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
function draws(rows){
 const map=new Map();
 function visit(node,row,station='',depth=0){
  if(depth>18||node==null)return;
  if(typeof node==='string'){if(/^[\[{]/.test(node.trim())){let parsed;try{parsed=JSON.parse(node)}catch(_){return}visit(parsed,row,station,depth+1)}return}
  if(Array.isArray(node)){node.forEach(v=>visit(v,row,station,depth+1));return}
  if(typeof node!=='object')return;
  station=node.province||node.station||node.tinh||node.name||station||(row.region==='MB'?'Miền Bắc':'');
  if(node.prizes&&typeof node.prizes==='object'){
   if(!station)return;const prizes={},expected=counts[row.region];
   for(const [raw,values] of Object.entries(node.prizes)){
    const alias=key(raw),k=['special','dacbiet','giaidacbiet'].includes(alias)?'db':alias;
    if(!(k in expected))continue;
    if(prizes[k])throw Error('Trùng tên giải '+station+' '+row.draw_date);
    prizes[k]=(Array.isArray(values)?values:[values]).map(v=>String(v??'').trim()).filter(v=>/^\d+$/.test(v)&&v.length===widths[row.region][k]);
   }
   if(!Object.entries(expected).every(([k,n])=>prizes[k]?.length===n))return;
   const id=row.region+'|'+row.draw_date+'|'+key(station),signature=JSON.stringify(Object.keys(expected).map(k=>prizes[k].slice().sort()));
   const prev=map.get(id);if(prev&&prev.signature!==signature)throw Error('Kết quả mâu thuẫn: '+station+' '+row.draw_date+'. Cần xác minh dữ liệu.');
   map.set(id,{region:row.region,draw_date:row.draw_date,data:{province:station,prizes},signature});return;
  }
  for(const [k,v] of Object.entries(node))if(!['meta','metadata','info'].includes(k)&&v&&typeof v==='object')visit(v,row,station,depth+1);
 }
 for(const row of rows){if(counts[row.region]&&/^\d{4}-\d{2}-\d{2}$/.test(row.draw_date))visit(row.data,row)}
 return [...map.values()].map(({signature,...row})=>row);
}
globalThis.XosoStats={draws};
})();
