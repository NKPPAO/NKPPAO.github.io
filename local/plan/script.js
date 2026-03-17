const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM ELEMENTS ---
const tableBody = document.getElementById('dataTableBody');
const loading = document.getElementById('loading');

// --- INITIAL LOAD ---
window.onload = async () => {
    await initDropdowns(); // สร้าง Dropdown อำเภอ และ เล่มแผน
    await loadData();      // โหลดข้อมูลลงตาราง
};

// 1. ฟังก์ชันสร้าง Dropdown อัตโนมัติ (Dynamic Options)
async function initDropdowns() {
    // ดึงรายชื่ออำเภอที่มีในโครงการ และรายชื่อเล่มแผนทั้งหมด
    const [districtsRes, docsRes] = await Promise.all([
        _supabase.from('plan_projects').select('district'),
        _supabase.from('plan_documents').select('id, doc_name')
    ]);

    // สร้าง Dropdown อำเภอ
    const sAmphoe = document.getElementById('sAmphoe');
    if (districtsRes.data) {
        const uniqueDistricts = [...new Set(districtsRes.data.map(item => item.district))].filter(Boolean).sort();
        sAmphoe.innerHTML = '<option value="">ทั้งหมด</option>' + 
            uniqueDistricts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    // สร้าง Dropdown เล่มแผน และนับจำนวนเล่มแผนเพื่อแสดงใน Card
    const sPlanDoc = document.getElementById('sPlanDoc');
    if (docsRes.data) {
        sPlanDoc.innerHTML = '<option value="">ทั้งหมด</option>' + 
            docsRes.data.map(doc => `<option value="${doc.id}">${doc.doc_name}</option>`).join('');
        
        // อัปเดต Card จำนวนเล่มแผน
        const cardTotalDocs = document.getElementById('cardTotalDocs');
        if (cardTotalDocs) cardTotalDocs.innerText = docsRes.data.length.toLocaleString();
    }
}

// 2. ฟังก์ชันโหลดข้อมูลหลัก
async function loadData() {
    tableBody.innerHTML = '';
    loading.classList.remove('hidden');

    // ดึงค่า Filter จากหน้าเว็บ
    const fAmphoe = document.getElementById('sAmphoe').value;
    const fPlanDocId = document.getElementById('sPlanDoc').value;
    const fOpt = document.getElementById('sOpt').value.trim();
    const fProject = document.getElementById('sProject').value.trim();
    const fStatus = document.getElementById('sStatus').value.trim();

    // Query ดึงข้อมูลโครงการ พร้อมข้อมูลเล่มแผน (ทั้งหลักและเสริม)
    let query = _supabase
        .from('plan_projects')
        .select(`
            *,
            main_doc:main_doc_id(doc_name, pdf_url, page_offset),
            extra_doc:extra_doc_id(doc_name, pdf_url, page_offset)
        `);

    // ใส่เงื่อนไขการกรอง
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
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="py-20 text-center text-slate-400">ไม่พบข้อมูลโครงการ</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50/30 transition-colors border-b border-slate-100";

        // --- ฟังก์ชันสร้างปุ่ม PDF อัจฉริยะ ---
        const createPdfButton = (doc, pageInBook, themeColor) => {
            if (!doc || !doc.pdf_url || !pageInBook) return '';

            // คำนวณหน้า PDF จริง: เลขหน้าในเล่ม + ค่า offset
            const actualPdfPage = Number(pageInBook) + (Number(doc.page_offset) || 0);
            const finalUrl = `${doc.pdf_url}#page=${actualPdfPage}`;

            return `
                <div class="mb-3 last:mb-0 group">
                    <a href="${finalUrl}" target="_blank" 
                       class="inline-flex items-center gap-2 px-3 py-1.5 ${themeColor} text-white rounded-lg text-[11px] font-bold transition-all hover:shadow-md active:scale-95 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        เปิดหน้า ${pageInBook}
                    </a>
                    <div class="mt-1 text-[10px] text-slate-500 font-medium leading-tight max-w-[160px]">
                        <span class="text-slate-400 font-bold uppercase">เล่ม:</span> ${doc.doc_name}
                    </div>
                </div>`;
        };

        // สร้างปุ่มสำหรับแผนหลัก (สีน้ำเงิน) และแผนเสริม (สีส้ม)
        const mainBtn = createPdfButton(item.main_doc, item.main_page, 'bg-[#0056b3] hover:bg-blue-700');
        const extraBtn = createPdfButton(item.extra_doc, item.extra_page, 'bg-orange-500 hover:bg-orange-600');

        tr.innerHTML = `
            <td class="px-6 py-5">
                <div class="font-bold text-slate-800 mb-1 leading-snug">${item.project_name}</div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                        ${item.project_status || 'คงเดิม'}
                    </span>
                </div>
            </td>
            <td class="px-6 py-5">
                <div class="text-sm font-bold text-slate-700">${item.local_org || '-'}</div>
                <div class="text-xs text-slate-400">อ. ${item.district || '-'}</div>
            </td>
            <td class="px-6 py-5 text-right font-black text-blue-600 text-base">
                ${(Number(item.budget_amount) || 0).toLocaleString()}
            </td>
            <td class="px-6 py-5">
                <div class="flex flex-col min-w-[170px]">
                    ${mainBtn}
                    ${extraBtn}
                    ${(!mainBtn && !extraBtn) ? '<span class="text-slate-300 text-[10px] font-bold italic">ไม่พบไฟล์เอกสาร</span>' : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
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
