import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 1. Configuration - ใส่ค่าของคุณเอง
const supabaseUrl = 'https://gqanipdzdpstzxrddpzo.supabase.co'
const supabaseKey = 'sb_publishable_xS3RCe4T4oik28s0sO_jpg_hZb5H10O'
const supabase = createClient(supabaseUrl, supabaseKey)

let currentUser = null;
let isEditing = false;

// Elements
const loginModal = document.getElementById('loginModal');
const inputSection = document.getElementById('inputSection');
const adminHeader = document.getElementById('adminHeader');
const projectForm = document.getElementById('projectForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// --- Auth Functions ---
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    
    if (user) {
        document.getElementById('userInfo').classList.replace('hidden', 'flex');
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('userEmail').innerText = user.email;
        inputSection.classList.remove('hidden'); // แสดงฟอร์มเมื่อ Login
        adminHeader.classList.remove('hidden'); // แสดงคอลัมน์การจัดการ
    } else {
        document.getElementById('userInfo').classList.replace('flex', 'hidden');
        document.getElementById('loginBtn').classList.remove('hidden');
        inputSection.classList.add('hidden');
        adminHeader.classList.add('hidden');
    }
    fetchProjects();
}

// Login Modal Logic
document.getElementById('loginBtn').onclick = () => loginModal.classList.remove('hidden');
document.getElementById('closeLogin').onclick = () => loginModal.classList.add('hidden');

document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        document.getElementById('authError').innerText = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        document.getElementById('authError').classList.remove('hidden');
    } else {
        location.reload();
    }
};

document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
};

// --- Data Functions ---
async function fetchProjects() {
    document.getElementById('loadingMsg').classList.remove('hidden');
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (!error) renderTable(data);
    document.getElementById('loadingMsg').classList.add('hidden');
}

function renderTable(projects) {
    const tbody = document.getElementById('projectTableBody');
    tbody.innerHTML = '';
    projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-blue-50 transition";
        const badgeColor = p.meeting_decision === 'Approve' ? 'bg-green-100 text-green-700' : 
                         p.meeting_decision === 'Revise' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
        
        tr.innerHTML = `
            <td class="p-4 text-center"><span class="px-3 py-1 rounded-full text-xs font-bold ${badgeColor}">${p.meeting_decision}</span></td>
            <td class="p-4 font-bold text-gray-800">${p.project_name}</td>
            <td class="p-4 text-gray-600">${p.owner_agency || '-'}</td>
            <td class="p-4 text-right font-mono">${Number(p.estimated_budget || 0).toLocaleString()}</td>
            <td class="p-4 text-center ${currentUser ? '' : 'hidden'}">
                <button onclick="prepareEdit('${p.id}')" class="text-blue-600 hover:text-blue-800 mr-3">แก้ไข</button>
                <button onclick="deleteProject('${p.id}')" class="text-red-600 hover:text-red-800">ลบ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CRUD Actions ---
projectForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('project_id').value;
    const formData = {
        project_name: document.getElementById('project_name').value,
        owner_agency: document.getElementById('owner_agency').value,
        location: document.getElementById('location').value,
        estimated_budget: document.getElementById('estimated_budget').value,
        strategic_fit: document.getElementById('strategic_fit').value,
        meeting_decision: document.getElementById('meeting_decision').value,
        budget_management_guideline: document.getElementById('budget_management_guideline').value
    };

    if (isEditing) {
        await supabase.from('projects').update(formData).eq('id', id);
        alert('แก้ไขข้อมูลเรียบร้อย');
    } else {
        await supabase.from('projects').insert([formData]);
        alert('บันทึกข้อมูลสำเร็จ');
    }
    resetForm();
    fetchProjects();
};

window.deleteProject = async (id) => {
    if (confirm('ยืนยันการลบโครงการ?')) {
        await supabase.from('projects').delete().eq('id', id);
        fetchProjects();
    }
};

window.prepareEdit = async (id) => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('project_id').value = data.id;
        document.getElementById('project_name').value = data.project_name;
        document.getElementById('owner_agency').value = data.owner_agency;
        document.getElementById('location').value = data.location;
        document.getElementById('estimated_budget').value = data.estimated_budget;
        document.getElementById('strategic_fit').value = data.strategic_fit;
        document.getElementById('meeting_decision').value = data.meeting_decision;
        document.getElementById('budget_management_guideline').value = data.budget_management_guideline;
        
        isEditing = true;
        document.getElementById('formTitle').innerText = "🔄 กำลังแก้ไขโครงการ";
        document.getElementById('submitBtn').innerText = "อัปเดตข้อมูล";
        cancelEditBtn.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

function resetForm() {
    isEditing = false;
    projectForm.reset();
    document.getElementById('project_id').value = "";
    document.getElementById('formTitle').innerText = "📝 เพิ่มโครงการใหม่";
    document.getElementById('submitBtn').innerText = "บันทึกข้อมูล";
    cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.onclick = resetForm;

// Init
checkUser();
