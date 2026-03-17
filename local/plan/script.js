const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM
const tableBody = document.getElementById('dataTableBody');
const loading = document.getElementById('loading');
const countProjects = document.getElementById('countProjects');
const totalBudget = document.getElementById('totalBudget');
const countDocs = document.getElementById('countDocs');

async function loadData() {
    tableBody.innerHTML = '';
    loading.classList.remove('hidden');

    // ดึงข้อมูลทั้งโครงการและจำนวนเล่มแผน
    const [projectsRes, docsRes] = await Promise.all([
        _supabase.from('plan_projects').select('*, main_doc:main_doc_id(*), extra_doc:extra_doc_id(*)'),
        _supabase.from('plan_documents').select('id', { count: 'exact' })
    ]);

    loading.classList.add('hidden');

    if (projectsRes.error) return console.error(projectsRes.error);

    let data = projectsRes.data;
    const keyword = document.getElementById('searchInput').value.trim();

    if (keyword) {
        data = data.filter(item => 
            item.project_name.includes(keyword) || 
            item.district.includes(keyword) || 
            item.local_org.includes(keyword)
        );
    }

    // อัปเดต Summary Cards
    countProjects.innerText = data.length.toLocaleString();
    countDocs.innerText = docsRes.count || 0;
    const total = data.reduce((sum, item) => sum + (Number(item.budget_amount) || 0), 0);
    totalBudget.innerText = total.toLocaleString(undefined, { minimumFractionDigits: 2 });

    renderTable(data);
}

function renderTable(data) {
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="py-20 text-center text-slate-400 font-light">ไม่พบข้อมูลที่ต้องการค้นหา</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = `
            <tr class="group hover:bg-blue-50/40 transition-all duration-200">
                <td class="px-6 py-5">
                    <div class="text-[15px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors">${item.project_name}</div>
                    <div class="mt-1">
                        <span class="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold uppercase tracking-tighter border border-slate-200">
                            ${item.project_status}
                        </span>
                    </div>
                </td>
                <td class="px-6 py-5">
                    <div class="text-sm font-semibold text-slate-700">${item.local_org}</div>
                    <div class="text-xs text-slate-400">อ. ${item.district}</div>
                </td>
                <td class="px-6 py-5 text-right font-mono font-bold text-blue-600 text-base">
                    ${Number(item.budget_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td class="px-6 py-5">
                    <div class="flex flex-col gap-2 min-w-[150px]">
                        ${renderBadge(item.main_doc, item.main_page, 'เล่มหลัก', 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600')}
                        ${renderBadge(item.extra_doc, item.extra_page, 'เล่มเสริม', 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600')}
                    </div>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function renderBadge(doc, page, label, styles) {
    if (!doc) return '';
    const finalPage = page + (doc.page_offset || 0);
    return `
        <a href="${doc.pdf_url}#page=${finalPage}" target="_blank" 
           class="flex items-center justify-between px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all hover:text-white ${styles}">
            <span>${label} น.${page}</span>
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path></svg>
        </a>
    `;
}

document.getElementById('searchBtn').addEventListener('click', loadData);
window.onload = loadData;
