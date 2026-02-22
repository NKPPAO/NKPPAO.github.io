import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 1. Configuration - ใส่ค่าของคุณเอง
const supabaseUrl = 'https://gqanipdzdpstzxrddpzo.supabase.co'
const supabaseKey = 'sb_publishable_xS3RCe4T4oik28s0sO_jpg_hZb5H10O'
const supabase = createClient(supabaseUrl, supabaseKey)

let currentUser = null;

// --- ระบบ Authentication ---
// เพิ่มตัวแปรอ้างอิงถึง Section ของฟอร์ม
const inputSection = document.getElementById('inputSection');

async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    
    const info = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    
    if (user) {
        // เมื่อ Login แล้ว
        info.classList.remove('hidden');
        info.classList.add('flex');
        loginBtn.classList.add('hidden');
        document.getElementById('userEmail').innerText = user.email;
        
        // --- ส่วนที่เพิ่มใหม่: แสดงฟอร์ม ---
        inputSection.classList.remove('hidden'); 
    } else {
        // เมื่อยังไม่ได้ Login หรือ Logout แล้ว
        info.classList.add('hidden');
        loginBtn.classList.remove('hidden');
        
        // --- ส่วนที่เพิ่มใหม่: ซ่อนฟอร์ม ---
        inputSection.classList.add('hidden');
    }
    fetchProjects();
}

document.getElementById('loginBtn').onclick = async () => {
    const email = prompt("Email:");
    const password = prompt("Password:");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else location.reload();
};

document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
};

// --- ฟังก์ชันดึงข้อมูลและจัดการตาราง ---
async function fetchProjects() {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    renderTable(data);
}

function renderTable(projects) {
    const tbody = document.getElementById('projectTableBody');
    tbody.innerHTML = '';
    
    projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        
        // ส่วนของปุ่ม แก้ไข/ลบ (จะโชว์เฉพาะเมื่อ currentUser ไม่เป็น null)
        const adminTools = currentUser ? `
            <button onclick="editProject('${p.id}')" class="text-blue-600 hover:underline mr-2">แก้ไข</button>
            <button onclick="deleteProject('${p.id}')" class="text-red-600 hover:underline">ลบ</button>
        ` : '';

        tr.innerHTML = `
            <td class="p-3 text-center">${p.meeting_decision}</td>
            <td class="p-3 font-semibold">${p.project_name} <br> ${adminTools}</td>
            <td class="p-3">${p.owner_agency}</td>
            <td class="p-3 text-right">${Number(p.estimated_budget).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- ฟังก์ชันลบข้อมูล ---
window.deleteProject = async (id) => {
    if (confirm('ยืนยันการลบโครงการนี้?')) {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) alert('ไม่มีสิทธิ์ลบ: ' + error.message);
        else fetchProjects();
    }
}

// --- ฟังก์ชันแก้ไขข้อมูล (แบบง่าย) ---
window.editProject = async (id) => {
    const newName = prompt("แก้ไขชื่อโครงการ:");
    if (newName) {
        const { error } = await supabase.from('projects').update({ project_name: newName }).eq('id', id);
        if (error) alert('ไม่มีสิทธิ์แก้ไข: ' + error.message);
        else fetchProjects();
    }
}

// รันตอนเริ่มหน้าเว็บ
checkUser();
