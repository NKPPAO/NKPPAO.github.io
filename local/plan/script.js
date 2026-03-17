const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tableBody = document.getElementById('dataTableBody');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

async function loadData() {
    tableBody.innerHTML = '<tr><td colspan="4" class="py-20 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูลโครงการ...</td></tr>';
    
    // ดึงข้อมูลจาก plan_projects พร้อม Join ข้อมูลจาก plan_documents
    let { data, error } = await _supabase
        .from('plan_projects')
        .select(`
            *,
            main_doc:main_doc_id (doc_name, pdf_url, page_offset),
            extra_doc:extra_doc_id (doc_name, pdf_url, page_offset)
        `);

    if (error) {
        console.error('Error:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="py-10 text-center text-red-500">ไม่สามารถเชื่อมต่อฐานข้อมูลได้</td></tr>';
        return;
    }

    // กรองข้อมูลฝั่ง Client (Search)
    const keyword = searchInput.value.trim();
    if (keyword) {
        data = data.filter(item => 
            item.project_name.includes(keyword) || 
            item.district.includes(keyword) || 
            item.local_org.includes(keyword)
        );
    }

    renderTable(data);
}

function renderTable(data) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="py-20 text-center text-slate-400 font-light">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>';
        return;
    }

    data.forEach(item => {
        // คำนวณเลขหน้า PDF จริง (หน้าเล่ม + Offset)
        const mainPdfPage = item.main_doc ? (item.main_page + (item.main_doc.page_offset || 0)) : null;
        const extraPdfPage = item.extra_doc ? (item.extra_page + (item.extra_doc.page_offset || 0)) : null;

        const row = `
            <tr class="hover:bg-blue-50/50 transition-colors">
                <td class="px-6 py-4">
                    <div class="font-bold text-[#003366] mb-1">${item.project_name}</div>
                    <div class="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block">สถานะ: ${item.project_status}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-slate-700">${item.local_org}</div>
                    <div class="text-xs text-slate-400">อ.${item.district}</div>
                </td>
                <td class="px-6 py-4 font-mono font-bold text-blue-700">
                    ${item.budget_amount ? Number(item.budget_amount).toLocaleString() : '0.00'}
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col gap-2 items-center">
                        ${item.main_doc ? createPdfBadge(item.main_doc.pdf_url, mainPdfPage, 'เล่มหลัก', item.main_page) : ''}
                        ${item.extra_doc ? createPdfBadge(item.extra_doc.pdf_url, extraPdfPage, 'เล่มเสริม', item.extra_page) : ''}
                    </div>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function createPdfBadge(url, pdfPage, label, pageNum) {
    return `
        <a href="${url}#page=${pdfPage}" target="_blank" 
           class="flex items-center space-x-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-md border border-red-100 hover:bg-red-600 hover:text-white transition w-full max-w-[140px]">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.586 5L14 2.414A2 2 0 0012.586 2H9z"></path></svg>
            <span class="text-[10px] font-bold uppercase">${label} น.${pageNum}</span>
        </a>
    `;
}

searchBtn.addEventListener('click', loadData);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadData(); });
window.onload = loadData;
