// ตั้งค่าการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentPage = 1;
const itemsPerPage = 15;
let totalItems = 0;
let sumBudget = 0;

async function fetchData() {
    const tableBody = document.getElementById('mainTable');
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    try {
        // สร้าง Base Query สำหรับทั้งข้อมูลและยอดรวม
        let query = _supabase.from('projects').select('*', { count: 'exact' });
        let sumQuery = _supabase.from('projects').select('budget');

        // รับค่า Filter
        const fAmp = document.getElementById('sAmphoe').value;
        const fYear = document.getElementById('sYear').value;
        const fOpt = document.getElementById('sOpt').value;
        const fProj = document.getElementById('sProject').value;
        const fNote = document.getElementById('sNote').value;

        // ใส่เงื่อนไข Filter (ต้องใส่เหมือนกันทั้งข้อมูลและยอดรวม)
        [query, sumQuery].forEach(q => {
            if (fAmp) q.eq('amphoe', fAmp);
            if (fYear) q.eq('fiscal_year', fYear);
            if (fOpt) q.ilike('tambon', `%${fOpt}%`);
            if (fProj) q.ilike('project_name', `%${fProj}%`);
            if (fNote) q.ilike('remark', `%${fNote}%`);
        });

        // ดึงข้อมูลรายหน้า
        const { data, error, count } = await query
            .order('fiscal_year', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // ดึงข้อมูลเพื่อมาหาผลรวม (คำนวณยอดรวมของ Filter นั้นๆ ทั้งหมด)
        const { data: budgetData } = await sumQuery;
        sumBudget = budgetData.reduce((acc, curr) => acc + (Number(curr.budget) || 0), 0);

        totalItems = count;
        renderTable(data, from);
        updateUI();
        
        if (currentPage === 1 && document.getElementById('sAmphoe').options.length <= 1) {
            setupDropdowns();
        }

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-red-500">Error: ${err.message}</td></tr>`;
    }
}

/*function renderTable(data, startNumber) {
    const tableBody = document.getElementById('mainTable');
    tableBody.innerHTML = '';

    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-slate-400">ไม่พบข้อมูล</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = "hover:bg-blue-50/50 transition-colors";
        row.innerHTML = `
            <td class="p-4 text-center text-slate-400 font-medium">${startNumber + index + 1}</td>
            <td class="p-4">
                <div class="font-bold text-slate-700">${item.amphoe || '-'}</div>
                <div class="text-blue-600 font-medium text-[12px]">${item.tambon || ''}</div>
            </td>
            <td class="p-4">
                <div class="text-slate-800 font-semibold leading-relaxed mb-1">${item.project_name || '-'}</div>
                <div class="text-slate-400 text-[12px] italic">${item.remark || ''}</div>
            </td>
            <td class="p-4 text-right">
                <div class="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-bold mb-1">ปี ${item.fiscal_year || '-'}</div>
                <div class="text-emerald-600 font-bold text-[15px] tracking-tight">
                    ${Number(item.budget || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}*/

function renderTable(data, startNumber) {
    const tableBody = document.getElementById('mainTable');
    const mobileContainer = document.getElementById('mobileTable');
    
    // เคลียร์ข้อมูลเก่า
    tableBody.innerHTML = '';
    mobileContainer.innerHTML = '';

    if (!data || data.length === 0) {
        const emptyMsg = `<div class="p-10 text-center text-slate-400">ไม่พบข้อมูล</div>`;
        tableBody.innerHTML = `<tr><td colspan="4">${emptyMsg}</td></tr>`;
        mobileContainer.innerHTML = emptyMsg;
        return;
    }

    data.forEach((item, index) => {
        const num = startNumber + index + 1;
        
        // 1. สร้างแถวสำหรับตาราง (Desktop)
        const row = document.createElement('tr');
        row.className = "hover:bg-blue-50/50 transition-colors";
        row.innerHTML = `
            <td class="p-4 text-center text-slate-400 font-medium">${num}</td>
            <td class="p-4">
                <div class="font-bold text-slate-700">${item.amphoe || '-'}</div>
                <div class="text-blue-600 font-medium text-[12px]">${item.tambon || ''}</div>
            </td>
            <td class="p-4">
                <div class="text-slate-800 font-semibold leading-relaxed mb-1">${item.project_name || '-'}</div>
                <div class="text-slate-400 text-[12px] italic">${item.remark || ''}</div>
            </td>
            <td class="p-4 text-right">
                <div class="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-bold mb-1">ปี ${item.fiscal_year || '-'}</div>
                <div class="text-emerald-600 font-bold text-[15px] tracking-tight">
                    ${Number(item.budget || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>
            </td>
        `;
        tableBody.appendChild(row);

        // 2. สร้างการ์ดสำหรับมือถือ (Mobile)
        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-slate-400 font-bold">#${num}</span>
                <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px] font-bold">ปี ${item.fiscal_year || '-'}</span>
            </div>
            <div class="mb-2">
                <div class="font-bold text-slate-800">${item.amphoe || '-'}</div>
                <div class="text-blue-600 text-[13px]">${item.tambon || ''}</div>
            </div>
            <div class="mb-3">
                <div class="text-slate-700 font-medium leading-snug">${item.project_name || '-'}</div>
                <div class="text-slate-400 text-[11px] italic mt-1">${item.remark || ''}</div>
            </div>
            <div class="border-t border-slate-100 pt-3 text-right">
                <div class="text-[11px] text-slate-400">งบประมาณ</div>
                <div class="text-emerald-600 font-bold text-[16px]">
                    ${Number(item.budget || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} บาท
                </div>
            </div>
        `;
        mobileContainer.appendChild(card);
    });
}

function updateUI() {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('pageDisplay').innerText = `หน้า ${currentPage} จาก ${totalPages || 1}`;
    
    // แสดงสรุปจำนวนรายการ
    document.getElementById('pInfo').innerHTML = `พบข้อมูลทั้งหมด <span class="text-blue-600 font-bold">${totalItems.toLocaleString()}</span> รายการ`;
    
    // แสดงยอดงบประมาณรวม
    document.getElementById('totalBudgetInfo').innerHTML = `งบประมาณรวมทั้งสิ้น <span class="underline">${sumBudget.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> บาท`;
    
    document.getElementById('btnPrev').disabled = currentPage === 1;
    document.getElementById('btnNext').disabled = currentPage >= totalPages || totalPages === 0;
}

function changePage(step) {
    currentPage += step;
    fetchData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyFilter() {
    currentPage = 1;
    fetchData();
}

async function setupDropdowns() {
    try {
        // 1. สร้าง Dropdown ปีงบประมาณแบบ Manual (2547 - ปัจจุบัน)
        const yearSelect = document.getElementById('sYear');
        yearSelect.innerHTML = '<option value="">ทุกปี</option>';

        const startYear = 2547;
        const now = new Date();
        let currentYear = now.getFullYear() + 543;
        
        // ถ้าเดือนปัจจุบันคือ ตุลย์(9), พฤศจิกายน(10), หรือ ธันวาคม(11) ให้บวกปีเพิ่มไป 1
        if (now.getMonth() >= 9) {
            currentYear++;
        }

        // วนลูปสร้างปีจากปัจจุบันถอยหลังไปถึง 2547
        for (let year = currentYear; year >= startYear; year--) {
            yearSelect.add(new Option("พ.ศ. " + year, year));
        }

        // 2. สำหรับ "อำเภอ" ยังคงแนะนำให้ดึงจากฐานข้อมูล (เพราะอำเภอไม่ค่อยเปลี่ยนบ่อยและมีจำนวนน้อย)
        const { data: ampData, error: ampError } = await _supabase
            .from('projects')
            .select('amphoe')
            .not('amphoe', 'is', null);

        if (ampError) throw ampError;

        const uniqueAmphoes = [...new Set(ampData.map(i => i.amphoe))]
            .filter(a => a != null && a !== "")
            .sort();

        const ampSelect = document.getElementById('sAmphoe');
        ampSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        uniqueAmphoes.forEach(amp => {
            ampSelect.add(new Option(amp, amp));
        });

    } catch (err) {
        console.error('Error setupDropdowns:', err);
    }
}

function clearSearch() {
    document.getElementById('sAmphoe').value = "";
    document.getElementById('sYear').value = "";
    document.getElementById('sOpt').value = "";
    document.getElementById('sProject').value = "";
    document.getElementById('sNote').value = "";
    currentPage = 1;
    fetchData();
}

async function updateLastUpdateDisplay() {
    try {
        // ดึงวันที่ล่าสุดจากคอลัมน์ updated_at
        const { data, error } = await _supabase
            .from('projects')
            .select('updated_at')
            .order('updated_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0 && data[0].updated_at) {
            const lastUpdate = new Date(data[0].updated_at);
            
            // ปรับรูปแบบการแสดงผล: 22 กุมภาพันธ์ 2569 เวลา 14:30:05
            const thaiDateTime = lastUpdate.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            document.getElementById('nav-last-update').innerText = thaiDateTime;
        } else {
            // หากไม่มีข้อมูลในตาราง ให้โชว์วันที่ปัจจุบันแทน
            document.getElementById('nav-last-update').innerText = new Date().toLocaleDateString('th-TH');
        }
    } catch (err) {
        console.error('Error fetching last update:', err);
    }
}

async function fetchSystemInfo() {
    try {
        // ดึงข้อมูลทั้งหมดจากตาราง info
        const { data, error } = await _supabase
            .from('info')
            .select('item, data');

        if (error) throw error;

        if (data) {
            // แปลง array ของข้อมูลให้เป็น object เพื่อให้เรียกใช้ง่ายๆ
            // เช่น { header: "...", sub_header: "...", last_update: "..." }
            const infoMap = {};
            data.forEach(row => {
                infoMap[row.item] = row.data;
            });

            // นำไปแสดงผลโดยเรียกจากชื่อ item
            if (infoMap['header']) {
                document.getElementById('main-header').innerText = infoMap['header'];
            }
            
            if (infoMap['sub_header']) {
                document.getElementById('sub-header').innerText = infoMap['sub_header'];
            }
            
        }
    } catch (error) {
        console.error('Error fetching info:', error.message);
    }
}

// ฟังก์ชัน เปิด/ปิด Modal
function toggleLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.toggle('hidden');
}

// จัดการการส่งฟอร์ม Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const btnSubmit = document.getElementById('btnLoginSubmit');
    
    // เปลี่ยนสถานะปุ่มขณะกำลังโหลด
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'กำลังตรวจสอบ...';

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // ถ้าสำเร็จ
        alert('ยินดีต้อนรับ! เข้าสู่ระบบสำเร็จ');
        // รีโหลดหน้า หรือแสดงปุ่มเพิ่มข้อมูล (Add Project)
        location.reload(); 

    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'เข้าสู่ระบบ';
    }
});

// ปิด modal เมื่อคลิกพื้นหลังข้างนอก
window.onclick = function(event) {
    const modal = document.getElementById('loginModal');
    if (event.target == modal) {
        modal.classList.add('hidden');
    }
}

// ฟังก์ชันเช็คสถานะ User (เรียกใช้ตอนโหลดหน้าเว็บ)
async function checkUserStatus() {
    const { data: { user } } = await _supabase.auth.getUser();
    const actionArea = document.getElementById('adminActions');
    const btnLoginMain = document.getElementById('btnLoginMain');

    if (user) {
        // กรณี Login แล้ว: แสดงปุ่มเพิ่มข้อมูล (สีน้ำเงิน) และปุ่ม Logout (สีแดงอ่อน)
        if (btnLoginMain) btnLoginMain.classList.add('hidden');
        // แสดงปุ่ม "อัปโหลด Excel" แทน "เพิ่มโครงการ"
        actionArea.innerHTML = `
            <div class="flex gap-2 w-full animate-in fade-in duration-300">
                <button onclick="openUploadModal()" class="flex-[2] bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-blue-100 text-sm flex items-center justify-center gap-2 h-[42px]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    อัปโหลด Excel
                </button>
                <button onclick="handleLogout()" class="flex-1 bg-white hover:bg-red-50 text-red-500 font-bold py-2.5 rounded-xl transition border border-red-100 text-[11px] h-[42px]" title="ออกจากระบบ">
                    Log out
                </button>
            </div>
        `;
    } else {
        // กรณีไม่ได้ Login: ไม่ต้องแสดงอะไรในพื้นที่นี้ หรือแสดง Admin Login เล็กๆ
        if (btnLoginMain) btnLoginMain.classList.remove('hidden');
        actionArea.innerHTML = ''; 
    }
}

// ฟังก์ชัน Logout
async function handleLogout() {
    await _supabase.auth.signOut();
    location.reload();
}

// ฟังก์ชันสร้างและดาวน์โหลด Template
function downloadTemplate() {
    // เช็คว่า Library XLSX พร้อมใช้งานไหม
    if (typeof XLSX === 'undefined') {
        alert("ระบบกำลังโหลดเครื่องมือจัดการ Excel กรุณารอครู่เดียวแล้วลองใหม่ครับ");
        return;
    }

    const ws_data = [
        ["ปีงบประมาณ", "อำเภอ", "ตำบล", "ชื่อโครงการ", "งบประมาณ", "หมายเหตุ"],
        [2569, "เมืองนครปฐม", "พระปฐมเจดีย์", "ตัวอย่าง: ก่อสร้างถนนลาดยาง", 500000, "งบเร่งด่วน"],
    ];
    
    try {
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Project_Template_NKP.xlsx");
    } catch (error) {
        console.error("Download Error:", error);
        alert("ไม่สามารถสร้างไฟล์ได้ในขณะนี้");
    }
}

// ฟังก์ชันจัดการ Excel ความเร็วสูง
async function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        if (rows.length === 0) return alert("ไฟล์ว่างเปล่า");

        try {
            // 1. ดึง Prefix อำเภอทั้งหมด (ดึงครั้งเดียว)
            const { data: amphoeList } = await _supabase.from('amphoe').select('amp, amp_id');
            const ampMap = Object.fromEntries(amphoeList.map(i => [i.amp, i.amp_id]));

            // 2. ดึงข้อมูล ID ล่าสุดจาก DB เพื่อหาจุดเริ่มต้น (ดึงครั้งเดียว)
            const { data: allIds } = await _supabase.from('projects').select('id');
            
            // สร้าง Map เก็บเลขลำดับสูงสุดของแต่ละ Prefix+Year ที่มีอยู่แล้วในระบบ
            const lastNumMap = {};
            allIds.forEach(item => {
                const prefixYear = item.id.substring(0, 3); // เช่น M69
                const num = parseInt(item.id.substring(3));
                if (!lastNumMap[prefixYear] || num > lastNumMap[prefixYear]) {
                    lastNumMap[prefixYear] = num;
                }
            });

            // 3. ประมวลผลข้อมูลใน Memory (เร็วมาก)
            const finalData = rows.map(row => {
                const year = String(row['ปีงบประมาณ']).slice(-2);
                const prefix = ampMap[row['อำเภอ']];
                if (!prefix) throw new Error(`ไม่พบอำเภอ: ${row['อำเภอ']} ในระบบ`);

                const key = prefix + year;
                // ถ้ายังไม่มีในระบบให้เริ่มที่ 0 ถ้ามีแล้วให้เอาค่าล่าสุดมาใช้และบวกเพิ่ม
                lastNumMap[key] = (lastNumMap[key] || 0) + 1;
                
                const newId = key + String(lastNumMap[key]).padStart(4, '0');

                return {
                    id: newId,
                    fiscal_year: row['ปีงบประมาณ'],
                    amphoe: row['อำเภอ'],
                    tambon: row['ตำบล'],
                    project_name: row['ชื่อโครงการ'],
                    budget: parseFloat(row['งบประมาณ'] || 0),
                    remark: row['หมายเหตุ'] || ''
                };
            });

            // 4. บันทึกข้อมูลแบบก้อนเดียว (Bulk Insert)
            const { error } = await _supabase.from('projects').insert(finalData);
            if (error) throw error;

            alert(`สำเร็จ! เพิ่มข้อมูลโครงการใหม่ ${finalData.length} รายการ`);
            location.reload();

        } catch (err) {
            alert("Error: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

const dropZone = document.getElementById('dropZone');
const excelInput = document.getElementById('excelInput');
const fileInfo = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileName');
let selectedFile = null;

// ฟังก์ชันเปิด/ปิด Modal
function openUploadModal() {
    document.getElementById('uploadExcelModal').classList.remove('hidden');
}
function closeUploadModal() {
    document.getElementById('uploadExcelModal').classList.add('hidden');
    resetUploadState();
}

// ระบบ Drag & Drop
dropZone.addEventListener('click', () => excelInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-500', 'bg-blue-50');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    handleFileSelect(e.dataTransfer.files[0]);
});
excelInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

function handleFileSelect(file) {
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        selectedFile = file;
        fileNameDisplay.innerText = file.name;
        fileInfo.classList.remove('hidden');
        dropZone.classList.add('opacity-50', 'pointer-events-none');
    } else {
        alert("กรุณาเลือกไฟล์ Excel เท่านั้น");
    }
}

function resetUploadState() {
    selectedFile = null;
    fileInfo.classList.add('hidden');
    dropZone.classList.remove('opacity-50', 'pointer-events-none');
    excelInput.value = '';
}

// ประมวลผลและอัปโหลดความเร็วสูง
async function processUpload() {
    if (!selectedFile) return;
    const btn = document.getElementById('btnStartUpload');
    btn.disabled = true;
    btn.innerText = "กำลังอัปโหลด...";

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            if (rows.length === 0) throw new Error("ไม่พบข้อมูลในไฟล์");

            // เตรียมข้อมูลโดย "ไม่ต้องใส่ฟิลด์ id"
            const finalData = rows.map((row, index) => {
                // ทำความสะอาดค่างบประมาณ (เผื่อมีเครื่องหมายคอมมา)
                const cleanBudget = String(row['งบประมาณ'] || 0).replace(/,/g, '');

                return {
                    // id ไม่ต้องใส่ เพราะ DB จะสร้างให้เองอัตโนมัติ
                    fiscal_year: row['ปีงบประมาณ'],
                    amphoe: row['อำเภอ'],
                    tambon: row['ตำบล'] || '',
                    project_name: row['ชื่อโครงการ'] || '',
                    budget: parseFloat(cleanBudget),
                    remark: row['หมายเหตุ'] || ''
                };
            });

            // บันทึกข้อมูลแบบ Bulk Insert
            const { error } = await _supabase.from('projects').insert(finalData);
            
            if (error) throw error;

            alert(`สำเร็จ! นำเข้าข้อมูล ${finalData.length} รายการเรียบร้อยแล้ว`);
            location.reload();

        } catch (err) {
            alert("เกิดข้อผิดพลาด: " + err.message);
            btn.disabled = false;
            btn.innerText = "เริ่มอัปโหลด";
        }
    };
    reader.readAsArrayBuffer(selectedFile);
}

// เรียกใช้ checkUserStatus() ในจุดที่เหมาะสม (เช่น ท้ายไฟล์ script.js)
checkUserStatus();

// เรียกใช้งานฟังก์ชันเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    fetchSystemInfo();
    fetchData();
    updateLastUpdateDisplay();
    checkUserStatus();
});
