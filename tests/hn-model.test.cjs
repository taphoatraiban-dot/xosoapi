'use strict';
const fs=require('fs'),vm=require('vm'),a=require('node:assert/strict'),c={};vm.createContext(c);
for(const f of ['stats-data.js','daily-analysis-core.js','hn-db.js','hn-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const M=c.HNModel,C=c.DailyStats,date='2026-11-23',draw=(date,db)=>({date,region:'MB',station:'mienbac',prizes:{db:[db]}});
const ds=[draw('2026-11-20','12001'),draw('2026-11-21','34002'),draw('2026-11-22','56003')];
for(const digits of [2,3])for(const model of Object.keys(M.MODELS)){
 const r=M.distribution(ds,date,digits,model);a.equal(r.sample,3);a.equal(r.p.length,10**digits);a.ok(r.p.every(x=>Number.isFinite(x)&&x>0));a.ok(Math.abs(r.p.reduce((a,b)=>a+b,0)-1)<1e-12);
 a.equal(JSON.stringify(M.distribution([...ds,draw(date,'99999'),draw('2026-11-24','99999')],date,digits,model)),JSON.stringify(r));
 a.equal(M.ranked(r.p,digits)[0].number.length,digits);
}
a.throws(()=>M.distribution(ds,date,4,'digits'));
a.ok(M.distribution(ds,date,3,'digits').p[4]>0,'unseen numbers must remain eligible');
const uniform=Array(100).fill(.01),metric=M.metric([{models:{u:uniform},actual:'01'}],'u',2);
a.ok(Math.abs(metric.gain)<1e-12);a.equal(metric.top1,0);a.equal(metric.top5,1);a.equal(M.tailP(0,45,.01),1);
const counts={db:1,g1:1,g2:2,g3:6,g4:4,g5:6,g6:3,g7:4},width={db:5,g1:5,g2:5,g3:5,g4:4,g5:4,g6:3,g7:2},raw=[];
for(let i=300;i>=1;i--){const prizes={};for(const [k,n] of Object.entries(counts))prizes[k]=Array.from({length:n},(_,j)=>String((i*41+j*83)%10**width[k]).padStart(width[k],'0'));raw.push({region:'MB',draw_date:C.shift(date,-i),data:{province:'Miền Bắc',prizes}});}
const r=M.evaluate(raw,date);a.equal(r.length,2);a.ok(r.every(x=>x.rows.length===4&&x.selected&&x.rows.every(y=>y.early.trials===45&&y.late.trials===45)));
const changed=JSON.parse(JSON.stringify(raw));for(const row of changed)if(row.draw_date>=C.shift(date,-45))row.data.prizes.db[0]='99000';
const second=M.evaluate(changed,date);a.equal(JSON.stringify(r.map(x=>x.selected)),JSON.stringify(second.map(x=>x.selected)),'held-out outcomes cannot choose method');
const future=JSON.parse(JSON.stringify(raw.at(-1)));future.draw_date=date;
a.equal(JSON.stringify(M.evaluate([...raw,future],date)),JSON.stringify(r),'target payload cannot alter any audit or score');
a.ok(M.evaluate([],date).every(x=>x.selected===null&&!x.passed));
const node={innerHTML:''};c.document={getElementById:id=>id==='hnModel'?node:null};M.render(C.prepare(raw,{beforeDate:date}).draws,date,raw);
a.ok(node.innerHTML.includes('So sánh mô hình'));a.ok(node.innerHTML.includes('Chưa chứng minh tốt hơn ngẫu nhiên'));a.ok(node.innerHTML.includes('không phải xác suất trúng đã xác nhận'));
console.log('HN model passed: normalized unseen support, independent tails, strict cutoff, frozen selection, proper scoring, uniform comparator, honest rendering and missing-data handling.');
const nodes={hnDBPanel:{},hnDBBody:{innerHTML:''},hnDBMethod:{value:'recent'},hnModel:{innerHTML:''}};
c.document={getElementById:id=>nodes[id]};c.HNDB.render(C.prepare(raw,{beforeDate:date}).draws,date,raw);
a.ok(nodes.hnDBBody.innerHTML.startsWith('<section class="xc-station" id="hnModel">'));
a.ok(nodes.hnDBBody.innerHTML.includes('<details><summary>Đối chiếu cách xếp tần suất cũ</summary>'));
a.ok(nodes.hnModel.innerHTML.includes('đúng số đứng đầu'));
const page=fs.readFileSync('phan-tich-theo-ngay.html','utf8');a.ok(page.indexOf('hn-db.js')<page.indexOf('hn-model.js'));a.ok(page.includes('hn-db.js?v=9'));
console.log('HN model integration passed: primary model output, collapsed legacy ranks, validation display and script order.');
