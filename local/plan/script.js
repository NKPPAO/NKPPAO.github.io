const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
//const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: window.sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

let currentUser = null;
let inactivityTimer;
let allData = []; // เก็บข้อมูลทั้งหมดที่โหลดมา
let allPlanDocs = [];
let currentPage = 1;
const rowsPerPage = 10; // กำหนดจำนวนรายการต่อหน้า

// --- INITIAL LOAD ---
/*window.onload = async () => {
    // 1. ตรวจสอบ Session ก่อนว่าล็อกอินค้างไว้ไหม
    await checkUserSession(); 
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth State Changed:", event);
        if (session && session.user) {
            currentUser = session.user;
        } else {
            currentUser = null;
        }
        checkAuthState(); // อัปเดต UI (ซ่อน/แสดงปุ่ม Admin)
    });
    // ย้ายการตรวจสอบ DOM มาไว้ที่นี่เพื่อให้แน่ใจว่า HTML โหลดเสร็จแล้ว
    await initDropdowns(); 
    await loadData();      
};*/
window.onload = async () => {
    // 1. โหลดข้อมูลพื้นฐานและตารางขึ้นมาโชว์ก่อน (เพื่อให้คนทั่วไปดูได้ทันที)
    await initDropdowns(); 
    await loadData();      

    // 2. ตรวจสอบ Session และดักฟังการเปลี่ยนแปลงสิทธิ์
    // เมื่อใช้ sessionStorage ร่วมกับ onAuthStateChange ระบบจะจัดการ currentUser ให้เองอัตโนมัติ
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth State Changed:", event);
        if (session && session.user) {
            currentUser = session.user;
            resetInactivityTimer(); // เริ่มนับถอยหลัง 10 นาทีถ้าเจอ Session
        } else {
            currentUser = null;
            clearTimeout(inactivityTimer); // หยุดนับถ้า Logout
        }
        checkAuthState(); // อัปเดต UI (ปุ่มแก้ไข/ปุ่มเพิ่มแผน)
    });
};

// 1. ฟังก์ชันสร้าง Dropdown
async function initDropdowns() {
    const [districtsRes, docsRes] = await Promise.all([
        _supabase.from('plan_projects').select('district'),
        _supabase.from('plan_documents').select('id, doc_name, pdf_url, page_offset')
    ]);

    const sAmphoe = document.getElementById('sAmphoe');
    const sPlanDoc = document.getElementById('sPlanDoc');
    const cardTotalDocs = document.getElementById('cardTotalDocs');

    allPlanDocs = docsRes.data || [];

    if (districtsRes.data && sAmphoe) {
        const uniqueDistricts = [...new Set(districtsRes.data.map(item => item.district))].filter(Boolean).sort();
        sAmphoe.innerHTML = '<option value="">ทั้งหมด</option>' + 
            uniqueDistricts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    if (docsRes.data && sPlanDoc) {
        sPlanDoc.innerHTML = '<option value="">ทั้งหมด</option>' + 
            docsRes.data.map(doc => `<option value="${doc.id}">${doc.doc_name}</option>`).join('');
        if (cardTotalDocs) cardTotalDocs.innerText = docsRes.data.length.toLocaleString();
    }
}

async function loadData() {
    const tableBody = document.getElementById('dataTableBody');
    const loading = document.getElementById('loading');

    if (!tableBody || !loading) return;

    tableBody.innerHTML = '';
    loading.classList.remove('hidden');

    // 1. ดึงค่าจาก Filter และตัดช่องว่างออก
    const fAmphoe = document.getElementById('sAmphoe').value;
    const fPlanDocId = document.getElementById('sPlanDoc').value;
    const fOpt = document.getElementById('sOpt').value.trim();
    const fProject = document.getElementById('sProject').value.trim();
    const fStatus = document.getElementById('sStatus').value.trim();

    // 2. เริ่มต้น Query แบบดึงทั้งหมด
    /*let query = _supabase
        .from('plan_projects')
        .select(`
            *,
            main_doc:main_doc_id(doc_name, pdf_url, page_offset),
            extra_doc:extra_doc_id(doc_name, pdf_url, page_offset)
        `);*/
    let query = _supabase.from('plan_projects').select('*');

    // 3. ตรวจสอบว่า "มีค่าจริงๆ" ถึงจะใส่ Filter (สำคัญมาก!)
    if (fAmphoe && fAmphoe !== "") {
        query = query.eq('district', fAmphoe);
    }
    
    if (fPlanDocId && fPlanDocId !== "") {
        query = query.or(`main_doc_id.eq.${fPlanDocId},extra_doc_id.eq.${fPlanDocId}`);
    }

    if (fOpt !== "") {
        query = query.ilike('local_org', `%${fOpt}%`);
    }

    if (fProject !== "") {
        query = query.ilike('project_name', `%${fProject}%`);
    }

    if (fStatus !== "") {
        query = query.ilike('project_status', `%${fStatus}%`);
    }

    // 4. สั่ง Execution
    const { data, error } = await query.order('id', { ascending: false });

    if (error) { 
        console.error("Supabase Error:", error); 
        loading.classList.add('hidden');
        return; 
    }

    console.log("Data received:", data); // ตรวจสอบอีกครั้ง
    loading.classList.add('hidden');
    allData = data || [];
    currentPage = 1;

    updateSummaryCards(allData);
    displayPage(1); 
}
// 3. ฟังก์ชันอัปเดต Card สรุปผล
function updateSummaryCards(data) {
    //const totalBudget = data.reduce((sum, item) => sum + (Number(item.budget_amount) || 0), 0);
    
    // อัปเดตงบประมาณรวม
    /*document.getElementById('cardTotalBudget').innerText = totalBudget.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });*/
    
    // อัปเดตจำนวนโครงการ
    document.getElementById('cardTotalProjects').innerText = data.length.toLocaleString();
}

// 4. ฟังก์ชันวาดแถวตาราง
function renderTable(data) {
    const projectCountEl = document.getElementById('projectCount');
    if (projectCountEl) {
        projectCountEl.innerText = allData.length.toLocaleString();
    }
    
    const tableBody = document.getElementById('dataTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<div class="py-20 text-center text-slate-400">ไม่พบข้อมูลโครงการ</div>`;
        return;
    }

    // เพิ่ม index เข้ามาใน parameters
    data.forEach((item, index) => {
        const rowNumber = ((currentPage - 1) * rowsPerPage) + index + 1;

        // ฟังก์ชันสร้างปุ่ม PDF
        /*const createPdfButton = (doc, pageInBook, themeColor) => {
            if (!doc || !doc.pdf_url || !pageInBook) return '';
            const actualPdfPage = Number(pageInBook) + (Number(doc.page_offset) || 0);
            return `
                <a href="${doc.pdf_url}#page=${actualPdfPage}" target="_blank" 
                   class="inline-flex items-center gap-2 px-3 py-2 ${themeColor} text-white rounded-xl text-[11px] font-bold shadow-sm transition-all hover:brightness-110 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    ${doc.doc_name} หน้า ${pageInBook}
                </a>`;
        };

        const mainBtn = createPdfButton(item.main_doc, item.main_page, 'bg-blue-600');
        const extraBtn = createPdfButton(item.extra_doc, item.extra_page, 'bg-orange-500');*/
        // --- ฟังก์ชันสร้างปุ่ม PDF ใหม่ที่ดึงข้อมูลจาก Cache ---
        const createPdfButtonFromCache = (docId, pageInBook, themeColor) => {
            if (!docId || !pageInBook) return '';
            
            // หาข้อมูลเล่มจาก Cache ที่เรามีอยู่ (allPlanDocs จาก initDropdowns)
            const doc = allPlanDocs.find(d => d.id == docId);
            if (!doc || !doc.pdf_url) return '';

            const actualPdfPage = Number(pageInBook) + (Number(doc.page_offset) || 0);
            return `
                <a href="${doc.pdf_url}#page=${actualPdfPage}" target="_blank" 
                   class="inline-flex items-center gap-2 px-3 py-2 ${themeColor} text-white rounded-xl text-[11px] font-bold shadow-sm transition-all hover:brightness-110 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    ${doc.doc_name} หน้า ${pageInBook}
                </a>`;
        };

        // สร้างปุ่มแผนหลัก
        const mainBtn = createPdfButtonFromCache(item.main_doc_id, item.main_page, 'bg-blue-600');

        // สร้างปุ่มแผนเสริม (รองรับหลายค่าคั่นด้วยคอมม่า)
        let extraBtns = '';
        if (item.extra_doc_id) {
            const ids = String(item.extra_doc_id).split(',');
            const pages = String(item.extra_page || '').split(',');
            extraBtns = ids.map((id, i) => {
                return createPdfButtonFromCache(id.trim(), (pages[i] || pages[0] || '').trim(), 'bg-orange-500');
            }).join('');
        }

        const adminTools = currentUser ? `
            <div class="flex gap-4">
                <button onclick="editProject(${item.id})" class="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    แก้ไข
                </button>
                <button onclick="deleteProject(${item.id})" class="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    ลบ
                </button>
            </div>
        ` : '';

        const div = document.createElement('div');
        div.className = "p-5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0";

        div.innerHTML = `
            <div class="flex gap-4">
              <div class="flex-none">
                  <span class="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 text-lg font-bold rounded-lg">
                      ${rowNumber}
                  </span>
              </div>
            
              <div class="flex flex-col gap-3 flex-1">
                  <div class="flex justify-between items-start">
                      <div class="text-base font-bold text-blue-600 uppercase tracking-wider">
                          อ. ${item.district} <span class="mx-1 text-slate-200">/</span> ${item.local_org}
                      </div>
                      <!--<span class="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100 uppercase">
                          ${item.project_status || '-'}
                      </span>-->
                      ${adminTools}
                  </div>
            
                  <div class="flex justify-between items-start gap-4">
                      <div class="text-sm font-bold text-slate-600 leading-snug flex-1">
                          ${item.project_name}
                      </div>
                      <!--<div class="flex-none text-right">
                          <span class="block text-[10px] text-slate-400 font-bold uppercase">งบประมาณ</span>
                          <span class="text-sm font-black text-green-600">
                              ${(Number(item.budget_amount) || 0).toLocaleString()} <span class="text-[10px]">บาท</span>
                          </span>
                      </div>-->
                  </div>
            
                  <div class="flex justify-between items-center mt-1">
                      <div class="flex flex-wrap gap-2">
                          ${mainBtn} ${extraBtns}
                          ${(!mainBtn && !extraBtns) ? '<span class="text-xs text-slate-300 italic">ไม่มีข้อมูลไฟล์แนบ</span>' : ''}
                      </div>
                      
                  </div>
              </div>
            </div>
        `;
        tableBody.appendChild(div);
    });
}
// 5. ฟังก์ชันล้างการค้นหา
function clearSearch() {
    document.getElementById('sAmphoe').value = "";
    document.getElementById('sPlanDoc').value = "";
    document.getElementById('sOpt').value = "";
    document.getElementById('sProject').value = "";
    document.getElementById('sStatus').value = "";
    
    currentPage = 1; // เพิ่มบรรทัดนี้
    loadData();
}

function displayPage(page) {
    const tableBody = document.getElementById('dataTableBody');
    tableBody.innerHTML = '';
    
    // คำนวณจุดเริ่มต้นและจุดสิ้นสุดของข้อมูลในหน้านั้นๆ
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = allData.slice(start, end);

    // ส่งข้อมูลที่ตัดแล้วไปวาด Card (ฟังก์ชัน renderTable เดิมของคุณ)
    renderTable(paginatedItems); 

    // สร้างปุ่มเปลี่ยนหน้า
    renderPagination();
}

function renderPagination() {
    // 1. อ้างอิง Container (เปลี่ยน ID ให้ตรงกับ HTML ใหม่ที่คุณต้องการ)
    const container = document.getElementById('pagination-controls'); 
    if (!container) return;

    // 2. คำนวณค่าพื้นฐาน
    const totalItems = allData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const sumBudget = allData.reduce((sum, item) => sum + (Number(item.budget_amount) || 0), 0);

    // 3. อัปเดตข้อมูลสรุปและ Card ด้านบน (ถ้ามี element เหล่านี้ในหน้าจอ)
    const pInfo = document.getElementById('pInfo');
    const totalBudgetInfo = document.getElementById('totalBudgetInfo');
    const cardBudget = document.getElementById('cardTotalBudget');
    const cardProjects = document.getElementById('cardTotalProjects');

    if (pInfo) pInfo.innerHTML = `พบข้อมูลทั้งหมด <span class="text-blue-600 font-bold">${totalItems.toLocaleString()}</span> รายการ`;
    if (totalBudgetInfo) totalBudgetInfo.innerHTML = `งบประมาณรวมทั้งสิ้น <span class="rounded inline-block px-2 py-0.5 bg-emerald-100 text-emerald-600 font-bold text-[15px] tracking-tight">${sumBudget.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> บาท`;
    if (cardBudget) cardBudget.innerText = sumBudget.toLocaleString(undefined, {minimumFractionDigits: 2});
    if (cardProjects) cardProjects.innerText = totalItems.toLocaleString();

    // ล้างปุ่มเดิม
    container.innerHTML = '';
    if (totalPages <= 1) return; // ถ้ามีหน้าเดียว ไม่ต้องโชว์ปุ่ม

    // --- ฟังก์ชันภายในสำหรับสร้างปุ่ม ---
    const createBtn = (content, targetPage, isDisabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.disabled = isDisabled;
        btn.onclick = () => {
            currentPage = targetPage;
            displayPage(currentPage); // เรียกฟังก์ชันแสดงผลหน้าปัจจุบัน
            
            // Scroll กลับไปที่จุดเริ่มต้นของตาราง (เพื่อให้ User ไม่หลงทาง)
            const tableElement = document.getElementById('projectCount') || document.querySelector('main');
            if (tableElement) {
                tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        
        // Tailwind Classes สำหรับปุ่มแบบ Modern
        let baseClass = "w-10 h-10 flex items-center justify-center rounded-xl transition-all text-sm font-bold ";
        if (isActive) {
            baseClass += "bg-blue-600 text-white shadow-md shadow-blue-100 scale-110 z-10";
        } else if (isDisabled) {
            baseClass += "bg-transparent text-slate-200 cursor-not-allowed";
        } else {
            baseClass += "bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600";
        }
        
        btn.className = baseClass;
        btn.innerHTML = content;
        return btn;
    };

    // --- สัญลักษณ์ SVG ---
    const svgFirst = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>`;
    const svgPrev = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`;
    const svgNext = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>`;
    const svgLast = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;

    // --- เริ่มการสร้างปุ่มลงใน Container ---
    container.appendChild(createBtn(svgFirst, 1, currentPage === 1));
    container.appendChild(createBtn(svgPrev, currentPage - 1, currentPage === 1));

    // คำนวณช่วงตัวเลขหน้า (แสดง 3 ปุ่มรอบหน้าปัจจุบัน)
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    // ปรับให้แสดง 3 ปุ่มเสมอถ้าจำนวนหน้าถึง
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createBtn(i, i, false, i === currentPage));
    }

    container.appendChild(createBtn(svgNext, currentPage + 1, currentPage === totalPages));
    container.appendChild(createBtn(svgLast, totalPages, currentPage === totalPages));
}

// 6. ฟังก์ชันส่งออก Excel
function exportToExcel() {
    if (!allData || allData.length === 0) {
        //alert('ไม่พบข้อมูลตามเงื่อนไขที่ระบุ');
        showAlert('info', 'ไม่พบข้อมูล', 'กรุณาเลือกเงื่อนไขการกรองใหม่ เนื่องจากไม่พบข้อมูลโครงการที่ต้องการส่งออก');
        return;
    }

    const excelData = allData.map((item, index) => {
        
        // 1. จัดการแผนหลัก: รวม "ชื่อเล่ม (หน้า ...)" เข้าด้วยกัน
        const mainDocName = allPlanDocs.find(d => d.id == item.main_doc_id)?.doc_name || '-';
        const mainDocFull = item.main_doc_id ? `${mainDocName} (หน้า ${item.main_page || '0'})` : '-';

        // 2. จัดการแผนเสริม: รวมหลายเล่มเข้าด้วยกัน (ถ้ามี)
        let extraDocsStr = '-';
        if (item.extra_doc_id) {
            const ids = String(item.extra_doc_id).split(',');
            const pages = String(item.extra_page || '').split(',');
            
            extraDocsStr = ids.map((id, i) => {
                const doc = allPlanDocs.find(d => d.id == id.trim());
                const p = (pages[i] || pages[0] || '').trim();
                return doc ? `${doc.doc_name} (หน้า ${p})` : `เล่ม ID:${id} (หน้า ${p})`;
            }).join(', ');
        }

        // 3. จัดเรียงคอลัมน์ใหม่ตามที่ต้องการ
        return {
            "ลำดับ": index + 1,
            "อำเภอ": item.district || '-',
            "องค์กรปกครองส่วนท้องถิ่น": item.local_org || '-',
            "ชื่อโครงการ": item.project_name || '-',
            "งบประมาณ (บาท)": Number(item.budget_amount) || 0,
            "สถานะ": item.project_status || "-",
            "แผนฯ": mainDocFull, // ✅ ยุบรวมเหลือคอลัมน์เดียวแล้ว
            "เปลี่ยนแปลง/เพิ่มเติม/แก้ไข": extraDocsStr
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // ปรับความกว้างคอลัมน์ให้เหมาะสมกับเนื้อหาที่ยุบรวม
    worksheet['!cols'] = [
        { wch: 8 },  // ลำดับ
        { wch: 15 }, // อำเภอ
        { wch: 25 }, // อปท.
        { wch: 55 }, // ชื่อโครงการ (กว้างหน่อย)
        { wch: 18 }, // งบประมาณ
        { wch: 12 }, // สถานะ
        { wch: 40 }, // แผนหลัก (ระบุหน้า) ✅ ขยายความกว้างรองรับชื่อเล่ม+หน้า
        { wch: 45 }  // แผนเสริม
    ];

    try {
        const date = new Date();
        const timestamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}_${date.getHours()}${date.getMinutes()}`;
        const fileName = `รายงานโครงการ_อบจ_นครปฐม_${timestamp}.xlsx`;

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const finalData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        
        saveAs(finalData, fileName);
        // ✅ แจ้งเตือนเมื่อเตรียมไฟล์เสร็จ (Optional)
        showAlert('success', 'ส่งออกสำเร็จ', 'ระบบเตรียมไฟล์ Excel เรียบร้อยแล้ว');
    } catch (err) {
        //alert("Export Error: " + err.message);
        showAlert('error', 'ส่งออกล้มเหลว', 'เกิดข้อผิดพลาดทางเทคนิค: ' + err.message);
    }
}

// --- 1. ระบบ Login/Logout (Supabase Auth) ---
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        //alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      showAlert('error', 'เข้าสู่ระบบไม่สำเร็จ', error.message);
    } else {
        currentUser = data.user;
        toggleLoginModal();
        checkAuthState();
        //alert("ยินดีต้อนรับ ผู้ดูแลระบบ");
        showAlert('success', 'ยินดีต้อนรับ', 'เข้าสู่ระบบในฐานะผู้ดูแลระบบเรียบร้อยแล้ว');
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    currentUser = null;
    checkAuthState();
    //alert("ออกจากระบบแล้ว");
  showAlert('info', 'ออกจากระบบ', 'คุณได้ออกจากระบบเรียบร้อยแล้ว');
}
function checkAuthState() {
    const adminControls = document.getElementById('adminControls'); // หรือ adminActions ตามใน HTML
    const btnLoginMain = document.getElementById('btnLoginMain');

    if (currentUser) {
        if (adminControls) adminControls.classList.remove('hidden');
        if (btnLoginMain) btnLoginMain.classList.add('hidden');
        resetInactivityTimer();
    } else {
        if (adminControls) adminControls.classList.add('hidden');
        if (btnLoginMain) btnLoginMain.classList.remove('hidden');
        clearTimeout(inactivityTimer);
    }
    loadData(); // รีโหลดตารางเพื่อซ่อน/แสดงปุ่ม Edit
}

// --- 2. ระบบ Auto Logout (10 นาที) ---
/*function resetInactivityTimer() {
    if (!currentUser) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("คุณไม่มีการเคลื่อนไหวนานเกิน 10 นาที ระบบจะออกจากระบบอัตโนมัติเพื่อความปลอดภัย");
        handleLogout();
    }, 10 * 60 * 1000); // 10 นาที
}*/
function resetInactivityTimer() {
    if (!currentUser) return;
    
    // บันทึกเวลาที่มีการเคลื่อนไหวลง localStorage
    localStorage.setItem('lastActiveTime', Date.now());

    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        // เช็คอีกครั้งว่าหน้าจอยังเปิดอยู่ไหม
        if (currentUser) {
           // alert("คุณไม่มีการเคลื่อนไหวนานเกิน 10 นาที ระบบจะออกจากระบบอัตโนมัติ");
            showAlert('error', 'หมดเวลาเชื่อมต่อ', 'คุณไม่มีการเคลื่อนไหวนานเกิน 10 นาที ระบบจะออกจากระบบอัตโนมัติเพื่อความปลอดภัย', true); // reload = true เพื่อเคลียร์หน้าจอ
            handleLogout();
        }
    }, 10 * 60 * 1000);
}

// ตรวจจับการเคลื่อนไหว
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer);
});

/*async function checkUserSession() {
    const { data: { session }, error } = await _supabase.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
    } else {
        currentUser = null;
    }
    checkAuthState(); 
}*/
async function checkUserSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (session) {
        // ดึงเวลาล่าสุดที่มีการใช้งาน (ที่เราบันทึกไว้เอง)
        const lastActive = localStorage.getItem('lastActiveTime');
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        const oneHour = 60 * 60 * 1000; // 60 นาที (3,600,000 มิลลิวินาที)
        const oneDay = 24 * 60 * 60 * 1000; // หรือตั้งค่าตามต้องการ

        // ตรวจสอบว่ามีเวลาบันทึกไว้ไหม และห่างจากปัจจุบันเกิน 60 นาทีหรือเปล่า
        if (lastActive && (now - lastActive > oneHour)) {
            // 🚨 เกิน 60 นาทีแล้ว ให้บังคับ Logout
            await _supabase.auth.signOut();
            localStorage.removeItem('lastActiveTime');
            currentUser = null;
            console.log("Session expired: Over 60 minutes");
        } else {
            // ✅ ยังไม่เกิน 60 นาที ให้ใช้งานต่อได้
            currentUser = session.user;
            localStorage.setItem('lastActiveTime', now); // อัปเดตเวลาล่าสุด
        }
    } else {
        currentUser = null;
    }
    checkAuthState();
}

// --- 3. Drag & Drop Upload ---
function toggleUploadModal() { document.getElementById('uploadModal').classList.toggle('hidden'); }
function toggleLoginModal() { document.getElementById('loginModal').classList.toggle('hidden'); }

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('excelFileInput');

dropZone.onclick = () => fileInput.click();

dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-blue-50'); };
dropZone.ondragleave = () => { dropZone.classList.remove('border-blue-500', 'bg-blue-50'); };
dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
};

fileInput.onchange = (e) => handleFileSelect(e.target.files[0]);

let selectedExcelFile = null;
function handleFileSelect(file) {
    if (file && file.name.endsWith('.xlsx')) {
        selectedExcelFile = file;
        dropZone.innerHTML = `<p class="text-blue-600 font-bold">เตรียมพร้อม: ${file.name}</p>`;
        document.getElementById('btnProcessUpload').classList.remove('hidden');
    } else {
        alert("กรุณาเลือกไฟล์ .xlsx เท่านั้น");
    }
}

// --- 4. ฟังก์ชันดาวน์โหลด Template ---
function downloadTemplate() {
    if (typeof XLSX === 'undefined') {
        alert('กรุณารอโหลดระบบสักครู่ครับ...');
        return;
    }

    // กำหนดหัวคอลัมน์เป็นภาษาไทย
    const headers = [
        ["อำเภอ", "อปท", "ชื่อโครงการ", "งบประมาณ", "สถานะ", "IDเล่มแผนหลัก", "หน้าในเล่มหลัก", "IDเล่มแผนเสริม", "หน้าในเล่มเสริม"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_งบประมาณ");

    XLSX.writeFile(wb, "แบบฟอร์มนำเข้าข้อมูล_อบจ_นครปฐม.xlsx");
}

async function importToSupabase(items) {
    // 1. ดึง ID ล่าสุดมาเพื่อรันต่อ (Auto Increment Logic)
    const { data: maxIdData } = await _supabase
        .from('plan_projects')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    let lastId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id : 0;

    // 2. แปลงข้อมูลจากหัวภาษาไทย เป็นฟิลด์ภาษาอังกฤษ
    const cleanData = items.map((item) => {
        lastId++;
        return {
            id: lastId,
            district: item["อำเภอ"] || "",
            local_org: item["อปท"] || "",
            project_name: item["ชื่อโครงการ"] || "",
            budget_amount: Number(item["งบประมาณ"]) || 0,
            project_status: item["สถานะ"] || "-",
            main_doc_id: item["IDเล่มแผนหลัก"] || null,
            main_page: item["หน้าในเล่มหลัก"] || null,
            extra_doc_id: item["IDเล่มแผนเสริม"] || null,
            extra_page: item["หน้าในเล่มเสริม"] || null
        };
    });

    // 3. Insert ลง Supabase
    const { error } = await _supabase.from('plan_projects').insert(cleanData);

    if (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
        alert(`นำเข้าข้อมูลสำเร็จ ${cleanData.length} รายการ`);
        toggleUploadModal();
        loadData();
    }
}

// --- ส่วนเชื่อมต่อปุ่มกับฟังก์ชันอ่านไฟล์ ---
function processUpload() {
    if (!selectedExcelFile) {
        alert("กรุณาเลือกไฟล์ก่อนครับ");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // อ่านข้อมูลเป็น JSON โดยใช้หัวตารางภาษาไทย
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            alert("ไฟล์ว่างเปล่าหรือหัวตารางไม่ถูกต้อง");
            return;
        }

        // ส่งต่อไปยังฟังก์ชันที่คุณเขียนไว้
        importToSupabase(jsonData);
    };
    reader.readAsArrayBuffer(selectedExcelFile);
}

// ฟังก์ชัน importToSupabase (ใช้ตัวเดิมที่คุณส่งมาได้เลย แต่ปรับ budget เล็กน้อยเผื่อมีลูกน้ำ)
async function importToSupabase(items) {
    const { data: maxIdData } = await _supabase
        .from('plan_projects')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    let lastId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id : 0;

    const cleanData = items.map((item) => {
        lastId++;
        return {
            id: lastId,
            district: item["อำเภอ"] || "",
            local_org: item["อปท"] || "",
            project_name: item["ชื่อโครงการ"] || "",
            // ปรับตรงนี้: กำจัดเครื่องหมายคอมมาก่อนแปลงเป็นตัวเลข
            budget_amount: Number(String(item["งบประมาณ"]).replace(/,/g, '')) || 0,
            project_status: item["สถานะ"] || "-",
            main_doc_id: item["IDเล่มแผนหลัก"] || null,
            main_page: item["หน้าในเล่มหลัก"] || null,
            extra_doc_id: item["IDเล่มแผนเสริม"] || null,
            extra_page: item["หน้าในเล่มเสริม"] || null
        };
    });

    const { error } = await _supabase.from('plan_projects').insert(cleanData);

    if (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
        alert(`นำเข้าข้อมูลสำเร็จ ${cleanData.length} รายการ`);
        toggleUploadModal();
        loadData();
        // ล้างค่าไฟล์เดิมออก
        selectedExcelFile = null;
        document.getElementById('dropZone').innerHTML = `<p class="text-sm font-bold text-slate-600">ลากไฟล์ Excel มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>`;
    }
}

// --- ฟังก์ชันลบ ---
async function deleteProject(id) {
    if (!confirm("ยืนยันการลบโครงการนี้?")) return;

    const { error } = await _supabase
        .from('plan_projects')
        .delete()
        .eq('id', id);

    if (error) {
        alert("ลบไม่สำเร็จ: " + error.message);
    } else {
        alert("ลบข้อมูลสำเร็จ");
        loadData();
    }
}

// --- ส่วนควบคุม Modal แก้ไขโครงการ ---

// 1. เปิด/ปิด Modal
function toggleEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.toggle('hidden');
}

// 2. ฟังก์ชันสร้างแถวแผนเสริม (ใช้ซ้ำได้ทั้งตอนโหลดข้อมูลเดิมและตอนกดเพิ่มใหม่)
function createExtraDocRow(selectedId = "", pageValue = "") {
    const container = document.getElementById('extraDocsContainer');
    const rowId = 'row_' + Math.random().toString(36).substr(2, 9);
    
    const div = document.createElement('div');
    div.id = rowId;
    div.className = "flex gap-2 items-end p-2 bg-white/60 rounded-xl border border-orange-100 animate-in fade-in slide-in-from-top-2 duration-200";
    
    // สร้าง Option จาก Cache ของเล่มแผนทั้งหมด (allPlanDocs)
    const options = allPlanDocs.map(doc => 
        `<option value="${doc.id}" ${doc.id == selectedId ? 'selected' : ''}>${doc.doc_name}</option>`
    ).join('');

    div.innerHTML = `
        <div class="flex-1">
            <select class="extra-doc-select w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="">-- เลือกเล่มแผนเสริม --</option>
                ${options}
            </select>
        </div>
        <div class="w-20">
            <input type="number" value="${pageValue}" placeholder="หน้า" class="extra-page-input w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-orange-400">
        </div>
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
    `;
    container.appendChild(div);
}

// 3. ฟังก์ชันปุ่ม "เพิ่มแผนเสริม"
function addExtraDocRow() {
    createExtraDocRow();
}

// 4. ฟังก์ชันโหลดข้อมูลใส่ Modal (เมื่อกดปุ่มแก้ไขในตาราง)
async function editProject(id) {
    const project = allData.find(item => item.id == id);
    if (!project) return alert("ไม่พบข้อมูลโครงการ");

    // เคลียร์ค่าเดิมในตู้คอนเทนเนอร์แผนเสริม
    document.getElementById('extraDocsContainer').innerHTML = '';
    
    // ใส่ข้อมูลพื้นฐาน
    document.getElementById('editId').value = project.id;
    document.getElementById('editProjectName').value = project.project_name;
    document.getElementById('editBudget').value = project.budget_amount;
    document.getElementById('editStatus').value = project.project_status || "-";

    // จัดการแผนหลัก (Dropdown)
    const mainSelect = document.getElementById('editMainDocId');
    mainSelect.innerHTML = '<option value="">-- เลือกเล่มแผนหลัก --</option>' + 
        allPlanDocs.map(doc => `<option value="${doc.id}" ${doc.id == project.main_doc_id ? 'selected' : ''}>${doc.doc_name}</option>`).join('');
    document.getElementById('editMainPage').value = project.main_page || "";

    // จัดการแผนเสริม (ถ้ามีข้อมูลคั่นด้วยคอมม่า ให้แตกออกมาเป็นแถว)
    if (project.extra_doc_id) {
        const extraIds = String(project.extra_doc_id).split(',');
        const extraPages = String(project.extra_page || '').split(',');
        
        extraIds.forEach((docId, index) => {
            const cleanId = docId.trim();
            if (cleanId) {
                const pageVal = (extraPages[index] || '').trim();
                createExtraDocRow(cleanId, pageVal);
            }
        });
    }

    toggleEditModal();
}

// 5. ฟังก์ชันบันทึกการแก้ไข
async function saveEdit() {
    const id = document.getElementById('editId').value;
    const btnSave = document.getElementById('btnSaveEdit');
    
    // รวบรวมข้อมูลแผนเสริมจาก UI
    const docSelects = document.querySelectorAll('.extra-doc-select');
    const pageInputs = document.querySelectorAll('.extra-page-input');
    
    let extraIdsArr = [];
    let extraPagesArr = [];
    
    docSelects.forEach((select, i) => {
        if (select.value) { // เก็บเฉพาะแถวที่เลือกเล่มแผน
            extraIdsArr.push(select.value);
            extraPagesArr.push(pageInputs[i].value || "0");
        }
    });

    const updateData = {
        project_name: document.getElementById('editProjectName').value,
        budget_amount: Number(document.getElementById('editBudget').value) || 0,
        project_status: document.getElementById('editStatus').value,
        main_doc_id: document.getElementById('editMainDocId').value || null,
        main_page: document.getElementById('editMainPage').value || null,
        // รวมอาเรย์กลับเป็น String คั่นด้วยคอมม่าเพื่อลง Database
        extra_doc_id: extraIdsArr.join(','), 
        extra_page: extraPagesArr.join(',')
    };

    btnSave.disabled = true;
    btnSave.innerText = "กำลังบันทึกข้อมูล...";

    const { error } = await _supabase
        .from('plan_projects')
        .update(updateData)
        .eq('id', id);

    if (error) {
        //alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      showAlert('error', 'บันทึกไม่สำเร็จ', 'ไม่สามารถอัปเดตข้อมูลได้: ' + error.message);
    } else {
        //alert("บันทึกข้อมูลเรียบร้อยแล้ว ✨");
        toggleEditModal();
        showAlert('success', 'บันทึกสำเร็จ', 'อัปเดตข้อมูลโครงการเรียบร้อยแล้ว');
        loadData(); // รีโหลดตารางโครงการใหม่
    }
    
    btnSave.disabled = false;
    btnSave.innerText = "บันทึกการแก้ไข";
}

// --- Plan Documents Management ---

async function renderPlanList() {
    const container = document.getElementById('planListContainer');
    container.innerHTML = '<div class="text-center py-4 animate-pulse text-slate-400 text-xs">กำลังโหลดข้อมูลเล่มแผน...</div>';

    const { data, error } = await _supabase
        .from('plan_documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    container.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-amber-200 transition-all group shadow-sm";
        div.innerHTML = `
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">${item.doc_type}</span>
                    <span class="text-[10px] text-slate-400">Offset: ${item.page_offset}</span>
                </div>
                <h4 class="text-sm font-bold text-slate-700 truncate">${item.doc_name}</h4>
                <p class="text-[10px] text-blue-500 truncate">${item.pdf_url || 'ไม่มีลิงก์ PDF'}</p>
            </div>
            <div class="flex gap-1 ml-4">
                <button onclick="editPlan(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onclick="deletePlan(${item.id}, '${item.doc_name}')" class="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

async function savePlan() {
    const id = document.getElementById('planId').value;
    const planData = {
        doc_name: document.getElementById('pDocName').value.trim(),
        pdf_url: document.getElementById('pPdfUrl').value.trim(),
        doc_type: document.getElementById('pDocType').value,
        page_offset: parseInt(document.getElementById('pOffset').value) || 0
    };

    if (!planData.doc_name) return alert('กรุณาระบุชื่อเล่มแผน');

    let error;
    if (id) {
        // อัปเดตข้อมูลเดิม
        ({ error } = await _supabase.from('plan_documents').update(planData).eq('id', id));
    } else {
        // เพิ่มข้อมูลใหม่ (id รันอัตโนมัติ)
        ({ error } = await _supabase.from('plan_documents').insert([planData]));
    }

    if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
        resetPlanForm();
        renderPlanList();
        // เรียกฟังก์ชันโหลด Dropdown หน้าหลักใหม่ (ถ้าคุณเขียนไว้)
        if (typeof loadInitialData === "function") loadInitialData(); 
    }
}

function editPlan(item) {
    document.getElementById('planId').value = item.id;
    document.getElementById('pDocName').value = item.doc_name;
    document.getElementById('pPdfUrl').value = item.pdf_url || '';
    document.getElementById('pDocType').value = item.doc_type;
    document.getElementById('pOffset').value = item.page_offset;
    
    document.getElementById('btnSavePlan').innerText = 'บันทึกการแก้ไข';
    document.getElementById('btnCancelEdit').classList.remove('hidden');
}

function resetPlanForm() {
    document.getElementById('planId').value = '';
    document.getElementById('pDocName').value = '';
    document.getElementById('pPdfUrl').value = '';
    document.getElementById('pDocType').value = 'แผนหลัก';
    document.getElementById('pOffset').value = '0';
    
    document.getElementById('btnSavePlan').innerText = 'บันทึกข้อมูล';
    document.getElementById('btnCancelEdit').classList.add('hidden');
}

async function deletePlan(id, name) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเล่มแผน: ${name}?`)) return;

    const { error } = await _supabase.from('plan_documents').delete().eq('id', id);
    if (!error) renderPlanList();
    else alert('ไม่สามารถลบได้: ' + error.message);
}

async function openPlanManager() {
    const modal = document.getElementById('planManagerModal');
    if (modal) {
        modal.classList.remove('hidden');
        await renderPlanList(); // โหลดรายการเล่มแผนมาโชว์
    }
}

function closePlanManager() {
    const modal = document.getElementById('planManagerModal');
    if (modal) modal.classList.add('hidden');
}

function showAlert(type, title, message, reload = false, showCancel = false) {
    const btn = document.getElementById('modalBtn');
    btn.disabled = false; // รีเซ็ตสถานะปุ่มทุกครั้งที่เปิดแจ้งเตือนใหม่
    btn.innerText = "ตกลง";   // ค่าพื้นฐาน
    const modal = document.getElementById('universalModal');
    const container = document.getElementById('modalIconContainer');
    const icon = document.getElementById('modalIcon');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    //const btn = document.getElementById('modalBtn');
    const closeBtn = document.getElementById('modalCloseBtn');
    
    // ดึงตัวครอบปุ่ม (Action Area) มาจัดการ Layout
    const actionArea = document.getElementById('modalActionArea');

    // ล้าง Class เดิมออกก่อน
    container.className = "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ";
    
    // ตั้งค่าตามประเภท (Success / Error / Info)
    if (type === 'success') {
        container.classList.add('bg-emerald-100', 'text-emerald-600');
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>`;
        btn.className = "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl shadow-emerald-100 transition-all";
    } else if (type === 'error') {
        container.classList.add('bg-red-100', 'text-red-600');
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`;
        btn.className = "w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl shadow-red-100 transition-all";
    } else { // info
        container.classList.add('bg-blue-100', 'text-blue-600');
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        btn.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-blue-100 transition-all";
    }

    titleEl.innerText = title;
    msgEl.innerText = message;
    
    // ✅ จุดสำคัญ: จัดการปุ่มให้สมดุล
    if (showCancel && closeBtn) {
        closeBtn.classList.remove('hidden');
        // ใช้ Grid 2 คอลัมน์เพื่อให้ปุ่มกว้างเท่ากัน (50/50)
        actionArea.className = "grid grid-cols-2 gap-3 mt-8 w-full"; 
        
        // เซ็ตปุ่มกดยกเลิกให้ปิด Modal
        closeBtn.onclick = () => modal.classList.add('hidden');
    } else if (closeBtn) {
        closeBtn.classList.add('hidden');
        // ถ้ามีปุ่มเดียว ให้แสดงแบบเต็มความกว้าง (Full Width)
        actionArea.className = "block mt-8 w-full"; 
    }

    // ตั้งค่าปุ่มหลัก (ตกลง/ยืนยัน)
    btn.onclick = () => {
        modal.classList.add('hidden');
        if (reload) location.reload();
    };

    modal.classList.remove('hidden');
}
