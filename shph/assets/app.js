const tabs = $all('.tab', root);
const content = $('#tab-content', root);


function showTab(name){
tabs.forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
if(name==='about') renderAbout();
if(name==='staff') renderStaff();
if(name==='schedule') renderSchedule();
if(name==='news') renderNews();
}


tabs.forEach(t=>t.addEventListener('click', ()=>showTab(t.dataset.tab)));


function renderAbout(){
content.innerHTML = `
<h3>ข้อมูลทั่วไป</h3>
<p><strong>ชื่อ:</strong> ${item.name}</p>
<p><strong>อำเภอ:</strong> ${item.district}</p>
<p><strong>ประวัติความเป็นมา:</strong><br>${item.history || '-'}</p>
<p><strong>เขตรับผิดชอบ:</strong> ${item.area || '-'}</p>
<p><strong>ที่ตั้ง:</strong> ${item.address || '-'}</p>
`;
}


function renderStaff(){
const staff = item.staff || [];
if(!staff.length){ content.innerHTML = '<p>ไม่มีข้อมูลบุคลากร</p>'; return }
let html = '<h3>โครงสร้างบุคลากร</h3>'
html += '<table class="table"><thead><tr><th>คำนำหน้า-ชื่อ-สกุล</th><th>ตำแหน่ง</th><th>ฝ่าย/กลุ่มงาน</th></tr></thead><tbody>'
staff.forEach(s=>{
html += `<tr><td>${s.name}</td><td>${s.position}</td><td>${s.group}</td></tr>`
})
html += '</tbody></table>'
content.innerHTML = html;
}


function renderSchedule(){
const sched = item.schedule || [];
if(!sched.length){ content.innerHTML = '<p>ไม่มีข้อมูลตารางเวลา</p>'; return }
let html = '<h3>ตารางเวลาปฏิบัติงาน</h3>'
html += '<table class="table"><thead><tr><th>วัน/เวลา</th><th>รายละเอียด</th></tr></thead><tbody>'
sched.forEach(s=>{
html += `<tr><td>${s.when}</td><td>${s.detail}</td></tr>`
})
html += '</tbody></table>'
content.innerHTML = html;
}


function renderNews(){
const news = item.news || [];
if(!news.length){ content.innerHTML = '<p>ไม่มีข่าวสาร</p>'; return }
let html = '<h3>ข่าวสารสาธารณสุข</h3>'
news.forEach(n=>{
html += `<article style="margin-bottom:12px"><h4>${n.title}</h4><div class="meta">${n.date}</div><p>${n.excerpt}</p></article>`
})
content.innerHTML = html;
}


// show default tab
showTab('about');
}


return { initListPage, initDetailPage }
})();
