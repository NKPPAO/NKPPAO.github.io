// ตั้งค่าการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allProjects = []; // เก็บข้อมูลทั้งหมดไว้สำหรับ Filter

async function fetchProjects() {
    const tableBody = document.getElementById('project-table-body');
    
    try {
        const { data, error } = await _supabase
            .from('projects')
            .select('*')
            .order('fiscal_year', { ascending: false });

        if (error) throw error;
        allProjects = data;
        
        renderTable(allProjects);
        setupFilters(allProjects);

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('project-table-body');
    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge badge-year rounded-pill">${item.fiscal_year || '-'}</span></td>
            <td>
                <span class="project-title">${item.project_name || '-'}</span>
                <span class="location-sub text-muted">${item.remark || ''}</span>
            </td>
            <td>
                <div>${item.amphoe || '-'}</div>
                <div class="location-sub">${item.tambon || ''}</div>
            </td>
            <td class="text-end budget-amount">
                ${Number(item.budget || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ระบบ Filter สดๆ บนหน้าจอ
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterAmphoe').addEventListener('change', applyFilters);
document.getElementById('filterYear').addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedAmphoe = document.getElementById('filterAmphoe').value;
    const selectedYear = document.getElementById('filterYear').value;

    const filtered = allProjects.filter(item => {
        const matchSearch = (item.project_name || '').toLowerCase().includes(searchTerm);
        const matchAmphoe = selectedAmphoe === "" || item.amphoe === selectedAmphoe;
        const matchYear = selectedYear === "" || String(item.fiscal_year) === selectedYear;
        return matchSearch && matchAmphoe && matchYear;
    });

    renderTable(filtered);
}

// สร้างตัวเลือกใน Dropdown อัตโนมัติจากข้อมูลที่มี
function setupFilters(data) {
    const amphoeSelect = document.getElementById('filterAmphoe');
    const yearSelect = document.getElementById('filterYear');
    
    const amphoes = [...new Set(data.map(item => item.amphoe))].filter(Boolean).sort();
    const years = [...new Set(data.map(item => String(item.fiscal_year)))].filter(Boolean).sort().reverse();

    amphoes.forEach(amp => {
        const opt = new Option(amp, amp);
        amphoeSelect.add(opt);
    });

    years.forEach(yr => {
        const opt = new Option(yr, yr);
        yearSelect.add(opt);
    });
}

document.addEventListener('DOMContentLoaded', fetchProjects);
