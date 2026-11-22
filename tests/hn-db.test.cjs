const fs=require('fs'),vm=require('vm'),a=require('node:assert/strict'),c={};vm.createContext(c);for(const f of ['stats-data.js','daily-analysis-core.js','hn-db.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const H=c.HNDB,C=c.DailyStats;
const draw=(date,db)=>({region:'MB',station:'mienbac',date,prizes:{db:[db],g6:['999','999','999'],g7:['99','99','99','99']}});
const date='2026-11-18',ds=[draw('2026-11-04','12001'),draw('2026-11-11','34001'),draw('2026-11-12','56099')];
a.equal(H.rank(ds,date,3).items[0].number,'001');a.equal(H.rank(ds,date,3).items[0].hits,2);a.equal(H.rank(ds,date,2).items[0].number,'01');a.equal(H.rank(ds,date,3,'weekday').sample,2);a.equal(H.rank([...ds,draw(date,'00999'),draw('2026-11-19','00999')],date,3).items[0].number,'001');a.equal(H.rank(ds,date,3).items.some(x=>x.number==='999'),false,'G6 must not be pooled');
a.deepEqual(Array.from(H.cycles(ds,date,'001').gaps),[7]);a.equal(H.parity('001'),'CL');a.equal(H.parity('014'),'LC');a.equal(H.parity('000'),'CC');a.equal(H.parity('391'),'LL');
const p=H.patterns(ds,date);a.equal(p.total,3);a.equal(p.weekdays,2);a.equal(p.rows.CL.all,2);a.equal(p.next,0);a.equal(p.rows.LL.next,0);const transition=H.patterns([...ds,draw("2026-11-13","78111")],date);a.equal(transition.next,1);a.equal(transition.rows.LL.next,1);a.equal(p.rows.CL.next,0,'missing days not adjacent');
a.throws(()=>H.rank(ds,date,4));a.equal(H.rank([],date,2).items.length,0);
const counts={db:1,g1:1,g2:2,g3:6,g4:4,g5:6,g6:3,g7:4},width={db:5,g1:5,g2:5,g3:5,g4:4,g5:4,g6:3,g7:2};let raw=[];for(let i=180;i>=1;i--){let prizes={};for(let [k,n] of Object.entries(counts))prizes[k]=Array.from({length:n},(_,j)=>String((i*41+j*83)%10**width[k]).padStart(width[k],'0'));raw.push({region:'MB',draw_date:C.shift(date,-i),data:{province:'Miền Bắc',prizes}});}
const tests=H.evaluate(raw,date);a.equal(tests.length,6);a.ok(tests.every(t=>t.trials===90));a.ok(tests.every(t=>t.random===1/10**t.digits));const bad=JSON.parse(JSON.stringify(raw));bad.at(-1).data.prizes.g6.pop();a.ok(H.evaluate(bad,date).every(t=>t.trials===89&&t.skipped===1));const future=JSON.parse(JSON.stringify(raw.at(-1)));future.draw_date=date;a.equal(JSON.stringify(H.evaluate([...raw,future],date)),JSON.stringify(tests));
console.log('HN DB passed: DB-only scope, independent tails, weekday filters, leading zeros, gaps, adjacent transitions, six rolling evaluations, missing days and future exclusion.');
// A displayed set must share its last two digits and parity, even when independent ranks differ.
const aligned=[draw('2026-11-04','12000'),draw('2026-11-11','34000'),draw('2026-11-12','56338'),draw('2026-11-13','57138'),draw('2026-11-14','58238')];
for(const method of ['all','recent','weekday'])for(let i=0;i<7;i++){const b=H.bundle(aligned,C.shift(date,i),method);if(b.three){a.equal(b.two,b.three.slice(-2));a.equal(b.parity,H.parity(b.two));}}
a.equal(H.bundle(aligned,date).three,'000');a.equal(H.bundle(aligned,date).two,'00');a.equal(H.rank(aligned,date,2).items[0].number,'38');
const leading=H.bundle([draw('2026-11-11','12014')],date);a.equal(leading.three,'014');a.equal(leading.two,'14');a.equal(leading.parity,'LC');
const nodes={hnDBPanel:{},hnDBBody:{innerHTML:''},hnDBMethod:{value:'all'}};c.document={getElementById:id=>nodes[id]};H.render(aligned,date,raw);const html=nodes.hnDBBody.innerHTML;
a.ok(html.includes('<b>000</b></td><td><span class="hn-linked-tail">00</span></td><td>Chẵn–chẵn')); 
a.ok(html.includes('Thống kê 2 số độc lập — không thuộc bộ chính'));a.ok(html.includes('Số đứng đầu riêng: <b>38</b>'));a.ok(html.includes('Đối chiếu 7 ngày trước ngày chọn'));a.ok(!html.includes('7 ngày từ ngày chọn'));a.ok(!html.includes('class="day-number"'));
H.reset();a.equal(nodes.hnDBBody.textContent,'Chọn ngày rồi bấm Phân tích theo ngày.');
console.log('Aligned set passed: 000 → 00, 014 → 14, parity, all methods, seven dates and separated independent ranking.');

// Regression: tied annual leaders must both appear, with consistent linked tails.
const tied=[draw('2026-04-12','12000'),draw('2026-06-14','34000'),draw('2026-07-28','56000'),draw('2026-01-31','12754'),draw('2026-05-19','34754'),draw('2026-07-23','56754'),draw('2026-11-16','97403')];
H.render(tied,date,raw);const tiedHTML=nodes.hnDBBody.innerHTML;
a.ok(tiedHTML.includes('2 số đồng hạng'));
a.ok(tiedHTML.includes('<b>754</b></td><td><span class="hn-linked-tail">54</span></td><td>Lẻ–chẵn'));
a.ok(tiedHTML.includes('Nhóm đứng đầu không đổi'));
a.ok(tiedHTML.includes('Đối chiếu ba cửa sổ lịch sử'));
a.ok(tiedHTML.includes('<td>403</td>'),'retrospective displays actual DB tail');
a.ok(!tiedHTML.includes('<td>19/11/2026</td>'),'no future date rows');
H.render([...tied,draw('2026-11-17','78754')],date,raw);
a.ok(nodes.hnDBBody.innerHTML.includes('1 số đồng hạng'));
a.ok(!nodes.hnDBBody.innerHTML.includes('Nhóm đứng đầu không đổi'));
console.log('Tied leader regression passed: all peers, matching tails, unchanged explanation, real past outcomes, and new-data ranking update.');
