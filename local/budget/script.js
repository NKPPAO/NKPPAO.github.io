// ตั้งค่าการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentPage = 1;
const itemsPerPage = 15;
let totalItems = 0;

async function fetchData() {
    const tableBody = document.getElementById('mainTable');
    
    // คำนวณช่วงของข้อมูล (0-14, 15-29, ...)
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    try {
        // ดึงข้อมูลพร้อมนับจำนวนทั้งหมดด้วย { count: 'exact' }
        let query = _supabase
            .from('projects')
            .select('*', { count: 'exact' });

        // นำค่าจาก Filter มาใส่ใน Query (ถ้ามี)
        const fAmphoe = document.getElementById('sAmphoe').value;
        const fYear = document.getElementById('sYear').value;
        const fOpt = document.getElementById('sOpt').value;
        const fProject = document.getElementById('sProject').value;
        const fNote = document.getElementById('sNote').value;

        if (fAmphoe) query = query.eq('amphoe', fAmphoe);
        if (fYear) query = query.eq('fiscal_year', fYear);
        if (fOpt) query = query.ilike('tambon', `%${fOpt}%`);
        if (fProject) query = query.ilike('project_name', `%${fProject}%`);
        if (fNote) query = query.ilike('remark', `%${fNote}%`);

        const { data, error, count } = await query
            .order('fiscal_year', { ascending: false })
            .range(from, to);

        if (error) throw error;

        totalItems = count;
        renderTable(data, from);
        updatePaginationControls();
        
        // ถ้าเป็นการโหลดครั้งแรก ให้โหลด Dropdown ด้วย
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

function updatePaginationControls() {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('pageDisplay').innerText = `หน้า ${currentPage} จาก ${totalPages || 1}`;
    document.getElementById('pInfo').innerText = `พบข้อมูลทั้งหมด ${totalItems.toLocaleString()} รายการ`;
    
    document.getElementById('btnPrev').disabled = currentPage === 1;
    document.getElementById('btnNext').disabled = currentPage >= totalPages;
}

function changePage(step) {
    currentPage += step;
    fetchData();
    window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนขึ้นบนเมื่อเปลี่ยนหน้า
}

function applyFilter() {
    currentPage = 1; // รีเซ็ตไปหน้า 1 ทุกครั้งที่ค้นหาใหม่
    fetchData();
}

async function setupDropdowns() {
    // แยกโหลด dropdown ต่างหากเพื่อไม่ให้โดน Limit 15 แถว
    const { data: ampData } = await _supabase.from('projects').select('amphoe');
    const { data: yearData } = await _supabase.from('projects').select('fiscal_year');

    const amphoes = [...new Set(ampData.map(i => i.amphoe))].filter(Boolean).sort();
    const years = [...new Set(yearData.map(i => String(i.fiscal_year)))].filter(Boolean).sort().reverse();

    const ampSelect = document.getElementById('sAmphoe');
    const yearSelect = document.getElementById('sYear');
    
    amphoes.forEach(a => ampSelect.add(new Option(a, a)));
    years.forEach(y => yearSelect.add(new Option(y, y)));
}

function clearSearch() {
    document.querySelectorAll('input, select').forEach(el => el.value = "");
    currentPage = 1;
    fetchData();
}

document.addEventListener('DOMContentLoaded', fetchData);
