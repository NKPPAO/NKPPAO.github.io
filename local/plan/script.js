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
    // แสดงสถานะ Loading
    tableBody.innerHTML = '';
    loading.classList.remove('hidden');

    // รับค่าจาก Filter ต่างๆ
    const fAmphoe = document.getElementById('sAmphoe').value;
    const fPlanDocId = document.getElementById('sPlanDoc').value;
    const fOpt = document.getElementById('sOpt').value.trim();
    const fProject = document.getElementById('sProject').value.trim();
    const fStatus = document.getElementById('sStatus').value.trim();

    // สร้าง Query เชื่อมตาราง (Join กับ plan_documents)
    let query = _supabase
    .from('plan_projects')
    .select(`
        *,
        main_doc:main_doc_id(doc_name, pdf_url), 
        extra_doc:extra_doc_id(doc_name, pdf_url)
    `);

    // ใส่เงื่อนไขการกรอง (Filter)
    if (fAmphoe) query = query.eq('district', fAmphoe);
    if (fPlanDocId) {
        query = query.or(`main_doc_id.eq.${fPlanDocId},extra_doc_id.eq.${fPlanDocId}`);
    }
    if (fOpt) query = query.ilike('local_org', `%${fOpt}%`);
    if (fProject) query = query.ilike('project_name', `%${fProject}%`);
    if (fStatus) query = query.ilike('project_status', `%${fStatus}%`);

    const { data, error } = await query.order('id', { ascending: false });

    loading.classList.add('hidden');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    updateSummaryCards(data); // อัปเดตตัวเลขสรุป
    renderTable(data);        // วาดตารางข้อมูล
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
    tableBody.innerHTML = ''; // ล้างตารางก่อนวาดใหม่

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="py-20 text-center text-slate-400">ไม่พบข้อมูล</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50/30 transition-colors border-b border-slate-100";

        // ตรวจสอบว่ามีชื่อเล่มแผนไหม
        const docName = item.main_doc?.doc_name || 'ไม่ระบุเล่มแผน';
        
        // ตรงนี้ถ้าคุณมีฟิลด์ URL จริงๆ ในอนาคต ค่อยเปลี่ยนจาก '#' เป็น item.main_doc.your_column_name
        const fileUrl = item.main_doc?.file_path; // ใช้ชื่อคอลัมน์ที่เช็กมา

        const pdfButton = fileUrl 
            ? `<a href="${fileUrl}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                เปิดเอกสาร
               </a>`
            : `<span class="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-300 rounded-xl text-xs font-bold cursor-not-allowed">
                NO PDF
               </span>`;

        tr.innerHTML = `
            <td class="px-6 py-5">
                <div class="font-bold text-slate-800 mb-1 leading-snug">${item.project_name}</div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                        ${item.project_status || 'รออัปเดตสถานะ'}
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
            <td class="px-6 py-5 text-center">
                ${pdfButton}
                <div class="mt-1 text-[9px] text-slate-400 font-bold truncate max-w-[150px] mx-auto">
                    ${docName}
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
