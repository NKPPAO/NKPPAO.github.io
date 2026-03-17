const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- INITIAL LOAD ---
window.onload = async () => {
    // ย้ายการตรวจสอบ DOM มาไว้ที่นี่เพื่อให้แน่ใจว่า HTML โหลดเสร็จแล้ว
    await initDropdowns(); 
    await loadData();      
};

// 1. ฟังก์ชันสร้าง Dropdown
async function initDropdowns() {
    const [districtsRes, docsRes] = await Promise.all([
        _supabase.from('plan_projects').select('district'),
        _supabase.from('plan_documents').select('id, doc_name')
    ]);

    const sAmphoe = document.getElementById('sAmphoe');
    const sPlanDoc = document.getElementById('sPlanDoc');
    const cardTotalDocs = document.getElementById('cardTotalDocs');

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
    // ดึง Element ข้างในฟังก์ชันเพื่อป้องกันค่า null
    const tableBody = document.getElementById('dataTableBody');
    const loading = document.getElementById('loading');

    if (!tableBody || !loading) return; // Safety check

    tableBody.innerHTML = '';
    loading.classList.remove('hidden');

    // ... ส่วนของ Filter และ Query เหมือนเดิมที่คุณเขียนไว้ ...
    const fAmphoe = document.getElementById('sAmphoe').value;
    const fPlanDocId = document.getElementById('sPlanDoc').value;
    const fOpt = document.getElementById('sOpt').value.trim();
    const fProject = document.getElementById('sProject').value.trim();
    const fStatus = document.getElementById('sStatus').value.trim();

    let query = _supabase
        .from('plan_projects')
        .select(`
            *,
            main_doc:main_doc_id(doc_name, pdf_url, page_offset),
            extra_doc:extra_doc_id(doc_name, pdf_url, page_offset)
        `);

    if (fAmphoe) query = query.eq('district', fAmphoe);
    if (fPlanDocId) query = query.or(`main_doc_id.eq.${fPlanDocId},extra_doc_id.eq.${fPlanDocId}`);
    if (fOpt) query = query.ilike('local_org', `%${fOpt}%`);
    if (fProject) query = query.ilike('project_name', `%${fProject}%`);
    if (fStatus) query = query.ilike('project_status', `%${fStatus}%`);

    const { data, error } = await query.order('id', { ascending: false });

    loading.classList.add('hidden');
    if (error) { console.error(error); return; }

    updateSummaryCards(data);
    renderTable(data);
}

// 3. ฟังก์ชันอัปเดต Card สรุปผล
function updateSummaryCards(data) {
    const totalBudget = data.reduce((sum, item) => sum + (Number(item.budget_amount) || 0), 0);
    
    // อัปเดตงบประมาณรวม
    document.getElementById('cardTotalBudget').innerText = totalBudget.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // อัปเดตจำนวนโครงการ
    document.getElementById('cardTotalProjects').innerText = data.length.toLocaleString();
}

// 4. ฟังก์ชันวาดแถวตาราง
function renderTable(data) {
    const tableBody = document.getElementById('dataTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<div class="py-20 text-center text-slate-400">ไม่พบข้อมูลโครงการ</div>`;
        return;
    }

    data.forEach(item => {
        // ฟังก์ชันสร้างปุ่ม PDF
        const createPdfButton = (doc, pageInBook, themeColor) => {
            if (!doc || !doc.pdf_url || !pageInBook) return '';
            const actualPdfPage = Number(pageInBook) + (Number(doc.page_offset) || 0);
            return `
                <a href="${doc.pdf_url}#page=${actualPdfPage}" target="_blank" 
                   class="inline-flex items-center gap-2 px-3 py-2 ${themeColor} text-white rounded-xl text-[11px] font-bold shadow-sm transition-all hover:brightness-110 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    เล่มแผน หน้า ${pageInBook}
                </a>`;
        };

        const mainBtn = createPdfButton(item.main_doc, item.main_page, 'bg-blue-600');
        const extraBtn = createPdfButton(item.extra_doc, item.extra_page, 'bg-orange-500');

        // ตรวจสอบสิทธิ์ Admin
        const isAdmin = false; 
        const adminTools = isAdmin ? `
            <div class="flex gap-4 pt-3 border-t border-slate-50">
                <button onclick="editProject('${item.id}')" class="text-xs font-bold text-blue-600 hover:text-blue-800">⚙️ แก้ไขข้อมูล</button>
                <button onclick="deleteProject('${item.id}')" class="text-xs font-bold text-red-500 hover:text-red-700">🗑️ ลบโครงการ</button>
            </div>` : '';

        // สร้าง Item แบบ Card (1 Column)
        const div = document.createElement('div');
        div.className = "p-5 hover:bg-slate-50 transition-colors";

        div.innerHTML = `
            <div class="flex flex-col gap-3">
                <div class="flex justify-between items-start">
                    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        อ. ${item.district} <span class="mx-1 text-slate-200">/</span> ${item.local_org}
                    </div>
                    <span class="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100 uppercase">
                        ${item.project_status || 'คงเดิม'}
                    </span>
                </div>

                <div class="text-15px md:text-16px font-bold text-slate-800 leading-snug">
                    ${item.project_name}
                </div>

                <div class="text-lg font-black text-[#003366]">
                    <span class="text-xs font-bold text-slate-400 mr-1 text-sm">งบประมาณ:</span>
                    ${(Number(item.budget_amount) || 0).toLocaleString()} <span class="text-[10px] font-bold text-slate-400 ml-1">บาท</span>
                </div>

                <div class="flex flex-wrap gap-2 py-1">
                    ${mainBtn} ${extraBtn}
                    ${(!mainBtn && !extraBtn) ? '<span class="text-[11px] text-slate-300 italic">ไม่มีข้อมูลไฟล์แนบ</span>' : ''}
                </div>

                ${adminTools}
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
    loadData();
}

// 6. ฟังก์ชันส่งออก Excel (เบื้องต้น)
function exportToExcel() {
    // คุณสามารถเพิ่ม Library SheetJS เพื่อทำงานส่วนนี้ต่อได้
    alert('ระบบกำลังเตรียมไฟล์ข้อมูล...');
}
