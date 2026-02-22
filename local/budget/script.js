// ตั้งค่าการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allProjects = [];

async function fetchData() {
    const tableBody = document.getElementById('mainTable');
    try {
        const { data, error } = await _supabase
            .from('projects')
            .select('*')
            .order('fiscal_year', { ascending: false });

        if (error) throw error;
        allProjects = data;
        
        setupDropdowns(data);
        renderTable(data);
        document.getElementById('nav-last-update').innerText = new Date().toLocaleDateString('th-TH');
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-red-500">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>`;
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('mainTable');
    const pInfo = document.getElementById('pInfo');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-slate-400">ไม่พบข้อมูลที่ค้นหา</td></tr>`;
        pInfo.innerText = "พบข้อมูล 0 รายการ";
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = "hover:bg-blue-50/50 transition-colors";
        row.innerHTML = `
            <td class="p-4 text-center text-slate-400 font-medium">${index + 1}</td>
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

    pInfo.innerText = `พบข้อมูลทั้งหมด ${data.length.toLocaleString()} รายการ`;
}

function applyFilter() {
    const fAmphoe = document.getElementById('sAmphoe').value;
    const fYear = document.getElementById('sYear').value;
    const fOpt = document.getElementById('sOpt').value.toLowerCase();
    const fProject = document.getElementById('sProject').value.toLowerCase();
    const fNote = document.getElementById('sNote').value.toLowerCase();

    const filtered = allProjects.filter(item => {
        const matchAmp = fAmphoe === "" || item.amphoe === fAmphoe;
        const matchYear = fYear === "" || String(item.fiscal_year) === fYear;
        const matchOpt = (item.tambon || '').toLowerCase().includes(fOpt);
        const matchProj = (item.project_name || '').toLowerCase().includes(fProject);
        const matchNote = (item.remark || '').toLowerCase().includes(fNote);

        return matchAmp && matchYear && matchOpt && matchProj && matchNote;
    });

    renderTable(filtered);
}

function setupDropdowns(data) {
    const ampSelect = document.getElementById('sAmphoe');
    const yearSelect = document.getElementById('sYear');
    
    const amphoes = [...new Set(data.map(i => i.amphoe))].filter(Boolean).sort();
    const years = [...new Set(data.map(i => String(i.fiscal_year)))].filter(Boolean).sort().reverse();

    amphoes.forEach(a => ampSelect.add(new Option(a, a)));
    years.forEach(y => yearSelect.add(new Option(y, y)));
}

function clearSearch() {
    document.getElementById('sAmphoe').value = "";
    document.getElementById('sYear').value = "";
    document.getElementById('sOpt').value = "";
    document.getElementById('sProject').value = "";
    document.getElementById('sNote').value = "";
    renderTable(allProjects);
}

document.addEventListener('DOMContentLoaded', fetchData);
