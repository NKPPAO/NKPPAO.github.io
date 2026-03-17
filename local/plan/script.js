const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let inactivityTimer;
let allData = []; // เก็บข้อมูลทั้งหมดที่โหลดมา
let currentPage = 1;
const rowsPerPage = 10; // กำหนดจำนวนรายการต่อหน้า

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
    let query = _supabase
        .from('plan_projects')
        .select(`
            *,
            main_doc:main_doc_id(doc_name, pdf_url, page_offset),
            extra_doc:extra_doc_id(doc_name, pdf_url, page_offset)
        `);

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

    loading.classList.add('hidden');
    
    if (error) { 
        console.error("Supabase Error:", error); 
        return; 
    }

    console.log("Data received:", data); // ตรวจสอบอีกครั้ง

    allData = data || [];
    currentPage = 1;

    updateSummaryCards(allData);
    displayPage(1); 
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

    // เพิ่ม index เข้ามาใน parameters
    data.forEach((item, index) => {
        const rowNumber = ((currentPage - 1) * rowsPerPage) + index + 1;

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
                    <span class="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-500 text-[11px] font-bold rounded-lg">
                        ${rowNumber}
                    </span>
                </div>

                <div class="flex flex-col gap-3 flex-1">
                    <div class="flex justify-between items-start">
                        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            อ. ${item.district} <span class="mx-1 text-slate-200">/</span> ${item.local_org}
                        </div>
                        <span class="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100 uppercase">
                            ${item.project_status || 'คงเดิม'}
                        </span>
                    </div>

                    <div class="flex justify-between items-start gap-4">
                        <div class="text-sm font-bold text-slate-800 leading-snug flex-1">
                            ${item.project_name}
                        </div>
                        <div class="flex-none text-right">
                            <span class="block text-[10px] text-slate-400 font-bold uppercase">งบประมาณ</span>
                            <span class="text-sm font-black text-green-600">
                                ${(Number(item.budget_amount) || 0).toLocaleString()} <span class="text-[10px]">บาท</span>
                            </span>
                        </div>
                    </div>

                    <div class="flex justify-between items-center mt-1">
                        <div class="flex flex-wrap gap-2">
                            ${mainBtn} ${extraBtn}
                            ${(!mainBtn && !extraBtn) ? '<span class="text-[11px] text-slate-300 italic">ไม่มีข้อมูลไฟล์แนบ</span>' : ''}
                        </div>
                        ${adminTools}
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
    const paginationContainer = document.getElementById('pagination'); // ต้องเพิ่ม ID นี้ใน HTML
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    const pageCount = Math.ceil(allData.length / rowsPerPage);

    if (pageCount <= 1) return; // ถ้ามีหน้าเดียวไม่ต้องโชว์ปุ่ม

    // สร้างปุ่ม "ก่อนหน้า"
    const prevBtn = document.createElement('button');
    prevBtn.innerText = 'ก่อนหน้า';
    prevBtn.disabled = currentPage === 1;
    prevBtn.className = `px-4 py-2 rounded-lg text-xs font-bold ${currentPage === 1 ? 'bg-slate-100 text-slate-400' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`;
    prevBtn.onclick = () => { currentPage--; displayPage(currentPage); window.scrollTo(0,0); };
    paginationContainer.appendChild(prevBtn);

    // แสดงข้อความ "หน้า X จาก Y"
    const pageInfo = document.createElement('span');
    pageInfo.innerText = `หน้า ${currentPage} / ${pageCount}`;
    pageInfo.className = 'text-xs font-bold text-slate-500 px-4';
    paginationContainer.appendChild(pageInfo);

    // สร้างปุ่ม "ถัดไป"
    const nextBtn = document.createElement('button');
    nextBtn.innerText = 'ถัดไป';
    nextBtn.disabled = currentPage === pageCount;
    nextBtn.className = `px-4 py-2 rounded-lg text-xs font-bold ${currentPage === pageCount ? 'bg-slate-100 text-slate-400' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`;
    nextBtn.onclick = () => { currentPage++; displayPage(currentPage); window.scrollTo(0,0); };
    paginationContainer.appendChild(nextBtn);
}

// 6. ฟังก์ชันส่งออก Excel (เบื้องต้น)
function exportToExcel() {
    // คุณสามารถเพิ่ม Library SheetJS เพื่อทำงานส่วนนี้ต่อได้
    alert('ระบบกำลังเตรียมไฟล์ข้อมูล...');
}

// --- 1. ระบบ Login/Logout (Supabase Auth) ---
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    } else {
        currentUser = data.user;
        toggleLoginModal();
        checkAuthState();
        alert("ยินดีต้อนรับ ผู้ดูแลระบบ");
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    currentUser = null;
    checkAuthState();
    alert("ออกจากระบบแล้ว");
}

function checkAuthState() {
    const adminControls = document.getElementById('adminControls');
    const btnLoginMain = document.getElementById('btnLoginMain');

    if (currentUser) {
        adminControls.classList.remove('hidden');
        btnLoginMain.classList.add('hidden'); // ซ่อนปุ่มล็อคอินเดิม
        resetInactivityTimer(); // เริ่มนับเวลาถอยหลัง
    } else {
        adminControls.classList.add('hidden');
        btnLoginMain.classList.remove('hidden');
        clearTimeout(inactivityTimer);
    }
    loadData(); // รีโหลดตารางเพื่อซ่อน/แสดงปุ่ม Edit
}

// --- 2. ระบบ Auto Logout (10 นาที) ---
function resetInactivityTimer() {
    if (!currentUser) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("คุณไม่มีการเคลื่อนไหวนานเกิน 10 นาที ระบบจะออกจากระบบอัตโนมัติเพื่อความปลอดภัย");
        handleLogout();
    }, 10 * 60 * 1000); // 10 นาที
}

// ตรวจจับการเคลื่อนไหว
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer);
});

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
            project_status: item["สถานะ"] || "คงเดิม",
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
            project_status: item["สถานะ"] || "คงเดิม",
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

// 1. ฟังก์ชันเปิด/ปิด Modal
function toggleEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

// 2. ฟังก์ชันโหลดข้อมูลใส่ Modal
async function editProject(id) {
    // แปลง id เป็น Number เพื่อความชัวร์ในการหาใน Array
    const targetId = Number(id);
    const project = allData.find(item => Number(item.id) === targetId);
    
    if (!project) {
        console.error("ไม่พบข้อมูลโครงการ ID:", targetId);
        return;
    }

    // ใส่ข้อมูลลง Form
    document.getElementById('editId').value = project.id;
    document.getElementById('editProjectName').value = project.project_name;
    document.getElementById('editBudget').value = project.budget_amount;
    document.getElementById('editStatus').value = project.project_status || "คงเดิม";

    // สั่งเปิด Modal
    toggleEditModal();
}

// 3. ฟังก์ชันบันทึก
async function saveEdit() {
    const id = document.getElementById('editId').value;
    const btn = event.target; // ปุ่มที่กด
    btn.disabled = true;
    btn.innerText = "กำลังบันทึก...";

    const { error } = await _supabase
        .from('plan_projects')
        .update({
            project_name: document.getElementById('editProjectName').value,
            budget_amount: Number(document.getElementById('editBudget').value) || 0,
            project_status: document.getElementById('editStatus').value
        })
        .eq('id', id);

    if (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
        alert("แก้ไขข้อมูลเรียบร้อยแล้ว ✨");
        toggleEditModal();
        loadData(); // รีโหลดตาราง
    }
    btn.disabled = false;
    btn.innerText = "บันทึกการแก้ไข";
}
