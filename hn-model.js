/* Fixed exploratory models. All training is strictly before each target date. */
(()=>{'use strict';
const C=DailyStats,MODELS={frequency:'Tần suất có làm trơn',digits:'Từng vị trí chữ số',decay:'Chữ số gần đây · giảm trọng số theo thời gian',weekday:'Chữ số cùng thứ · kết hợp toàn mẫu'},ids=Object.keys(MODELS);
const fmt=d=>d.split('-').reverse().join('/'),pct=x=>x==null?'—':(100*x).toFixed(2)+'%';
function distribution(draws,date,digits,model){
 if(![2,3].includes(digits)||!ids.includes(model))throw Error('Mô hình hoặc số chữ số không hợp lệ');
 const h=draws.filter(d=>d.region==='MB'&&d.date<date&&d.date>=C.shift(date,-365)),U=10**digits;
 if(model==='frequency'){const p=Array(U).fill(1);for(const d of h)p[Number(d.prizes.db[0].slice(-digits))]++;return {p:p.map(x=>x/(U+h.length)),sample:h.length};}
 const positional=(rows,decay=false)=>{const counts=Array.from({length:digits},()=>Array(10).fill(10));let total=100;
 for(const d of rows){const age=(Date.parse(date)-Date.parse(d.date))/86400000,w=decay?2**(-age/45):1,n=d.prizes.db[0].slice(-digits);total+=w;for(let j=0;j<digits;j++)counts[j][Number(n[j])]+=w;}
 return Array.from({length:U},(_,i)=>[...String(i).padStart(digits,'0')].reduce((p,n,j)=>p*counts[j][Number(n)]/total,1));};
 let p=positional(h,model==='decay');
 if(model==='weekday'){const day=new Date(date+'T12:00:00Z').getUTCDay(),same=h.filter(d=>new Date(d.date+'T12:00:00Z').getUTCDay()===day),q=positional(same);p=p.map((v,i)=>.8*v+.2*q[i]);}
 const sum=p.reduce((a,b)=>a+b,0);return {p:p.map(x=>x/sum),sample:h.length};
}
function ranked(p,digits){return p.map((score,i)=>({number:String(i).padStart(digits,'0'),score})).sort((a,b)=>b.score-a.score||a.number.localeCompare(b.number));}
function metric(entries,model,digits){const n=entries.length,U=10**digits;let loss=0,top1=0,top5=0;const gains=[];
 for(const e of entries){const p=e.models[model],items=ranked(p,digits),prob=p[Number(e.actual)],l=-Math.log(prob);loss+=l;gains.push(Math.log(U)-l);top1+=Number(items[0].number===e.actual);top5+=Number(items.slice(0,5).some(x=>x.number===e.actual));}
 const gain=n?gains.reduce((a,b)=>a+b,0)/n:null,variance=n>1?gains.reduce((a,b)=>a+(b-gain)**2,0)/(n-1):null;
 return {trials:n,loss:n?loss/n:null,gain,lowerGain:n>1?gain-1.96*Math.sqrt(variance/n):null,top1,top5};
}
function tailP(hits,n,p){if(!n||!hits)return 1;let t=(1-p)**n,sum=0;for(let k=1;k<=n;k++){t*=((n-k+1)/k)*(p/(1-p));if(k>=hits)sum+=t;}return Math.min(1,sum);}
function evaluate(raw,date){
 // Cut off input first: target/future payloads cannot influence historical audits.
 raw=raw.filter(x=>x.region==='MB'&&x.draw_date<date);const early=[],late=[];
 for(let i=90;i>=1;i--){const day=C.shift(date,-i),prepared=C.prepare(raw,{beforeDate:day}),actual=(prepared.actualDraws||[]).filter(d=>d.region==='MB'&&d.date===day);if(actual.length!==1)continue;
 const h=prepared.draws.filter(d=>d.region==='MB');if(h.length<90)continue;
 const e={day,digits:{}};for(const digits of [2,3])e.digits[digits]={actual:actual[0].prizes.db[0].slice(-digits),models:Object.fromEntries(ids.map(id=>[id,distribution(h,day,digits,id).p]))};(i>45?early:late).push(e);}
 return [2,3].map(digits=>{const rows=ids.map(model=>({model,early:metric(early.map(e=>e.digits[digits]),model,digits),late:metric(late.map(e=>e.digits[digits]),model,digits)}));
 const selected=rows.filter(x=>x.early.trials>=30).sort((a,b)=>a.early.loss-b.early.loss||ids.indexOf(a.model)-ids.indexOf(b.model))[0]||null;
 const adjustedP=selected?Math.min(1,tailP(selected.late.top1,selected.late.trials,1/10**digits)*ids.length*2):1;
 return {digits,rows,selected:selected?.model||null,adjustedP,passed:!!selected&&selected.late.trials>=30&&selected.late.lowerGain>0&&adjustedP<.05,uniformLoss:Math.log(10**digits),earlyFrom:C.shift(date,-90),earlyTo:C.shift(date,-46),lateFrom:C.shift(date,-45),lateTo:C.shift(date,-1)};});
}
let cache=null;
function render(draws,date,raw){const root=typeof document!=='undefined'&&document.getElementById('hnModel');if(!root)return;
 if(!cache||cache.raw!==raw||cache.date!==date)cache={raw,date,results:evaluate(raw,date)};
 root.innerHTML='<h3>So sánh mô hình · '+fmt(date)+'</h3><p>Chọn mô hình bằng giai đoạn đầu, giữ nguyên để kiểm tra giai đoạn sau. Các ứng viên bên dưới là tham khảo thăm dò; không tự loại số đã ra và không ép đổi số mỗi ngày.</p>'+cache.results.map(r=>{const selected=r.rows.find(x=>x.model===r.selected),m=selected?.late,now=r.selected?distribution(draws,date,r.digits,r.selected):null,items=now?ranked(now.p,r.digits):[],ties=items.filter(x=>Math.abs(x.score-items[0].score)<1e-15).length;
 return '<article class="xc-station"><h4>'+r.digits+' số cuối ĐB · '+(r.passed?'Có tín hiệu thăm dò, cần xác nhận kỳ mới':'Chưa chứng minh tốt hơn ngẫu nhiên')+'</h4>'+(now?'<p>'+MODELS[r.selected]+' · '+now.sample+' kỳ huấn luyện trước ngày chọn.</p><div style="display:flex;gap:8px;flex-wrap:wrap">'+items.slice(0,3).map(x=>'<div style="padding:12px;border:1px solid #ddd;border-radius:10px"><strong style="font-size:28px">'+x.number+'</strong>'+(r.digits===3?'<div>Đuôi tương ứng: '+x.number.slice(-2)+'</div>':'')+'<div>'+HNDB.parity(x.number).replaceAll('C','Chẵn ').replaceAll('L','Lẻ ')+'</div></div>').join('')+'</div><p>'+ties+' số đồng hạng đầu. Thứ tự hòa theo chữ số; điểm mô hình không phải xác suất trúng đã xác nhận.</p><p>Kiểm tra riêng '+fmt(r.lateFrom)+' – '+fmt(r.lateTo)+': đúng số đứng đầu <b>'+m.top1+'/'+m.trials+'</b>; đúng trong nhóm 5 số <b>'+m.top5+'/'+m.trials+'</b>. Mức ngẫu nhiên tương ứng '+pct(1/10**r.digits)+' và '+pct(5/10**r.digits)+'.</p>':'<p>Chưa đủ ít nhất 30 kỳ ở giai đoạn chọn mô hình; chưa xếp ứng viên.</p>')+'<details><summary>Chi tiết bốn mô hình và mốc kiểm tra</summary><p>Giai đoạn chọn '+fmt(r.earlyFrom)+' – '+fmt(r.earlyTo)+'; giai đoạn kiểm tra '+fmt(r.lateFrom)+' – '+fmt(r.lateTo)+'. Chọn bằng log loss nhỏ nhất, không chọn theo số lần trúng ở giai đoạn kiểm tra. Log loss đo chất lượng phân bố, thấp hơn tốt hơn; ngẫu nhiên '+r.uniformLoss.toFixed(4)+'.</p><div class="scroll"><table><thead><tr><th>Mô hình</th><th>Log loss chọn / số kỳ</th><th>Log loss kiểm tra / số kỳ</th><th>Đúng 1 số</th><th>Đúng trong 5 số</th></tr></thead><tbody>'+r.rows.map(x=>'<tr><td>'+MODELS[x.model]+(r.selected===x.model?' · đã chọn':'')+'</td><td>'+(x.early.loss?.toFixed(4)||'—')+' / '+x.early.trials+'</td><td>'+(x.late.loss?.toFixed(4)||'—')+' / '+x.late.trials+'</td><td>'+x.late.top1+'/'+x.late.trials+'</td><td>'+x.late.top5+'/'+x.late.trials+'</td></tr>').join('')+'</tbody></table></div><p>Chỉ nhận bảng đủ giải, bỏ thiếu/nghi trùng. Đây là hồi cứu trên kho hiện tại đã được xem trước; không phải thử nghiệm tương lai độc lập. Ngưỡng thăm dò cần cải thiện log loss và kiểm định đúng số đã hiệu chỉnh cho 8 phép so sánh. Không dùng các ứng viên này để sửa lại dự đoán đã chốt.</p></details></article>';}).join('');
}
globalThis.HNModel={distribution,ranked,metric,tailP,evaluate,render,MODELS};
})();
