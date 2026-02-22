import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 1. Configuration - ใส่ค่าของคุณเอง
const supabaseUrl = 'https://gqanipdzdpstzxrddpzo.supabase.co'
const supabaseKey = 'sb_publishable_xS3RCe4T4oik28s0sO_jpg_hZb5H10O'
const supabase = createClient(supabaseUrl, supabaseKey)

// Elements
const projectForm = document.getElementById('projectForm');
const projectTableBody = document.getElementById('projectTableBody');
const submitBtn = document.getElementById('submitBtn');

// 2. ฟังก์ชันดึงข้อมูล (Read)
async function fetchProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    renderTable(data);
}

// 3. ฟังก์ชันสร้างแถวตาราง (Render)
function renderTable(projects) {
    projectTableBody.innerHTML = '';
    projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50 transition";
        
        // กำหนดสีของมติตามสถานะ
        let badgeClass = 'badge-reject';
        if (p.meeting_decision === 'Approve') badgeClass = 'badge-approve';
        if (p.meeting_decision === 'Revise') badgeClass = 'badge-revise';

        tr.innerHTML = `
            <td class="p-3 text-center">
                <span class="badge ${badgeClass}">${p.meeting_decision}</span>
            </td>
            <td class="p-3 font-semibold text-blue-900">${p.project_name}</td>
            <td class="p-3 text-gray-600">${p.owner_agency || '-'}</td>
            <td class="p-3 text-right font-mono">${Number(p.estimated_budget || 0).toLocaleString()}</td>
        `;
        projectTableBody.appendChild(tr);
    });
}

// 4. ฟังก์ชันบันทึกข้อมูล (Create)
projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    submitBtn.disabled = true;
    submitBtn.innerText = 'กำลังบันทึก...';

    const formData = {
        project_name: document.getElementById('project_name').value,
        owner_agency: document.getElementById('owner_agency').value,
        location: document.getElementById('location').value,
        estimated_budget: document.getElementById('estimated_budget').value,
        strategic_fit: document.getElementById('strategic_fit').value,
        redundancy_check: document.getElementById('redundancy_check').value,
        legal_authority: document.getElementById('legal_authority').value,
        impact: document.getElementById('impact').value,
        meeting_decision: document.getElementById('meeting_decision').value,
        budget_management_guideline: document.getElementById('budget_management_guideline').value
    };

    const { error } = await supabase.from('projects').insert([formData]);

    if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
        alert('บันทึกข้อมูลโครงการสำเร็จ!');
        projectForm.reset();
        await fetchProjects(); // รีโหลดข้อมูลในตารางใหม่
    }

    submitBtn.disabled = false;
    submitBtn.innerText = 'บันทึกโครงการ';
});

// เริ่มโหลดข้อมูลเมื่อเปิดหน้าเว็บ
fetchProjects();
