(()=>{"use strict";
const root=document.getElementById("ket-qua");if(!root)return;
const region=document.body.dataset.region, province=document.body.dataset.province;
const keys=region==="MB"?["db","g1","g2","g3","g4","g5","g6","g7"]:["db","g1","g2","g3","g4","g5","g6","g7","g8"];
const names={db:"Đặc biệt",g1:"Giải nhất",g2:"Giải nhì",g3:"Giải ba",g4:"Giải tư",g5:"Giải năm",g6:"Giải sáu",g7:"Giải bảy",g8:"Giải tám"};
const clean=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]/g,"");
const aliases={"TP. Hồ Chí Minh":["TP Hồ Chí Minh","Hồ Chí Minh","TPHCM","Sài Gòn"],"Vũng Tàu":["Bà Rịa - Vũng Tàu","Bà Rịa Vũng Tàu"],"Đà Lạt":["Lâm Đồng","Đà Lạt"],"Huế":["Thừa Thiên Huế","Huế"],"Đắk Lắk":["Đắc Lắc","Đắk Lắk"],"Khánh Hòa":["Khánh Hoà"],"Bình Định":["Gia Lai Bình Định"],"Miền Bắc":["Hà Nội","Miền Bắc"]};
const allowed=[province,...(aliases[province]||[])].map(clean);
const pick=rows=>rows.find(x=>allowed.includes(clean(x.province||x.station||x.name)));
const dateEl=document.getElementById("ngay"),prev=document.getElementById("truoc"),next=document.getElementById("sau");
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
let date=new URL(location.href).searchParams.get("date")||today;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today)date=today;
dateEl.value=date;dateEl.max=today;
function step(n){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);date=d.toISOString().slice(0,10);if(date>today)date=today;dateEl.value=date;load()}
prev.addEventListener("click",()=>step(-1));next.addEventListener("click",()=>step(1));dateEl.addEventListener("change",()=>{if(!dateEl.value||dateEl.value>today)return;date=dateEl.value;load()});
const td=(text,cls)=>{const e=document.createElement("td");e.textContent=text;if(cls)e.className=cls;return e};
async function load(){
history.replaceState(null,"",location.pathname+(date===today?"":"?date="+date));
root.textContent="Đang tải kết quả ngày "+date+"…";next.disabled=date>=today;
const url="https://zigpqddlhvjbjrwhfhaa.supabase.co/functions/v1/xoso-public?region="+encodeURIComponent(region)+"&date="+encodeURIComponent(date);
try{const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw Error("Máy chủ trả lỗi "+response.status);
const payload=await response.json();if(!payload.success)throw Error(payload.error||"Không đọc được dữ liệu");
let rows=payload.data;for(let i=0;i<4&&!Array.isArray(rows);i++)rows=rows?.data;
if(!Array.isArray(rows))throw Error("Định dạng kết quả không hợp lệ");
const draw=pick(rows);if(!draw){root.textContent="Chưa có kết quả của đài "+province+" trong ngày "+date+". Bạn có thể chọn ngày khác.";return}
const prizes=draw.prizes||{};const table=document.createElement("table");const caption=document.createElement("caption");caption.textContent="Kết quả "+province+" ngày "+date;table.append(caption);
let count=0;for(const key of keys){const values=Array.isArray(prizes[key])?prizes[key]:[];if(!values.length)continue;const tr=document.createElement("tr");tr.append(td(names[key]));tr.append(td(values.map(v=>String(v)).join("  ·  "),key==="db"?"db":"nums"));table.append(tr);count+=values.length}
root.replaceChildren(table);const info=document.createElement("p");info.className="muted";info.textContent=count+" số đã công bố. Nguồn dữ liệu lưu trữ: "+String(payload.source||"không xác định")+". Nếu kỳ quay đang diễn ra, kết quả có thể chưa đầy đủ.";root.append(info);const link=document.createElement("a");link.href="/do-ve-so.html?province="+encodeURIComponent(draw.province);link.textContent="Dò vé số đài "+province+" →";link.style.cssText="display:inline-block;margin:12px 0;padding:10px 14px;background:#b90016;color:white;border-radius:8px;text-decoration:none;font-weight:700";root.append(link);
}catch(err){root.textContent="Không tải được kết quả: "+err.message+". Hãy thử lại sau hoặc xem trang kết quả 3 miền."}
}load();
})();