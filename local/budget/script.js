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

function renderTable(data, startNumber) {
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
        // 1. ดึงปีงบประมาณที่ไม่ซ้ำ (Unique) และเรียงจากมากไปน้อย
        // เราใช้ select แบบระบุคอลัมน์ และสั่งไม่ให้เอาค่าซ้ำ
        const { data: yearData, error: yearError } = await _supabase
            .from('projects')
            .select('fiscal_year')
            .not('fiscal_year', 'is', null); // ไม่เอาค่าว่าง

        if (yearError) throw yearError;

        // 2. ดึงชื่ออำเภอที่ไม่ซ้ำ
        const { data: ampData, error: ampError } = await _supabase
            .from('projects')
            .select('amphoe')
            .not('amphoe', 'is', null);

        if (ampError) throw ampError;

        // ใช้ Set เพื่อกรองค่าซ้ำอีกชั้นในกรณีที่ดึงมา (เผื่อ API return ค่าซ้ำ)
        const uniqueYears = [...new Set(yearData.map(i => i.fiscal_year))]
            .sort((a, b) => b - a); // เรียงจากปีล่าสุด (2567 -> 2566)

        const uniqueAmphoes = [...new Set(ampData.map(i => i.amphoe))]
            .sort(); // เรียงกขค

        // 3. นำข้อมูลใส่ Dropdown
        const yearSelect = document.getElementById('sYear');
        const ampSelect = document.getElementById('sAmphoe');

        // ล้างตัวเลือกเดิมก่อน (ยกเว้น "ทั้งหมด")
        yearSelect.innerHTML = '<option value="">ทุกปี</option>';
        ampSelect.innerHTML = '<option value="">ทั้งหมด</option>';

        uniqueYears.forEach(year => {
            const opt = new Option("พ.ศ. " + year, year); // แสดงผล "พ.ศ. 2567" แต่ส่งค่า "2567" ไปค้นหา
            yearSelect.add(opt);
        });

        uniqueAmphoes.forEach(amp => {
            const opt = new Option(amp, amp);
            ampSelect.add(opt);
        });

    } catch (err) {
        console.error('Error loading dropdowns:', err);
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

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    document.getElementById('nav-last-update').innerText = new Date().toLocaleDateString('th-TH');
});
