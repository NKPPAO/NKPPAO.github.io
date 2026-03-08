const SUPABASE_URL = 'https://qivysmrrauxskzjjyecw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdnlzbXJyYXV4c2t6amp5ZWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NjYyMTcsImV4cCI6MjA4ODQ0MjIxN30.-wVRDazgM1x83LSyco-xtchqj_JnM0NQJ-26a1N5DuI';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await checkUser();
    await loadServices();
    await loadStats();
});

// --- Universal UI Components ---

function showAlert(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-600'
    };
    toast.className = `${colors[type]} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 transform translate-x-12 opacity-0 transition-all duration-300 min-w-[300px]`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'info'}" class="w-5 h-5"></i> <span class="text-sm font-medium">${message}</span>`;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => { toast.classList.remove('translate-x-12', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-x-12', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function openModal(contentHtml) {
    const modal = document.getElementById('universal-modal');
    const inner = document.getElementById('modal-content');
    document.getElementById('modal-body').innerHTML = contentHtml;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        inner.classList.remove('scale-95', 'opacity-0');
    }, 10);
    lucide.createIcons();
}

function closeModal() {
    const modal = document.getElementById('universal-modal');
    const inner = document.getElementById('modal-content');
    inner.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 200);
}

// --- Auth Modals ---

function showLoginModal() {
    openModal(`
        <div class="text-center mb-8">
            <div class="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                <i data-lucide="lock" class="w-8 h-8"></i>
            </div>
            <h2 class="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h2>
            <p class="text-slate-500 text-sm mt-1">ยินดีต้อนรับกลับมา! กรุณาระบุข้อมูลของคุณ</p>
        </div>
        <form onsubmit="handleLogin(event)" class="space-y-4">
            <input type="email" id="email" placeholder="อีเมลของคุณ" class="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-sm" required>
            <input type="password" id="password" placeholder="รหัสผ่าน" class="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-sm" required>
            <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 btn-animate mt-2">ยืนยันการเข้าสู่ระบบ</button>
        </form>
        <div class="mt-8 text-center border-t border-slate-100 pt-6">
            <p class="text-slate-500 text-sm">ยังไม่มีบัญชีใช่ไหม? <a href="javascript:showRegisterModal()" class="text-blue-600 font-bold hover:underline italic">สมัครสมาชิกฟรี</a></p>
        </div>
    `);
}

function showRegisterModal() {
    openModal(`
        <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-slate-900">สร้างบัญชีผู้ใช้งาน</h2>
            <p class="text-slate-500 text-sm mt-1">กรอกข้อมูลเบื้องต้นเพื่อเริ่มต้นใช้งาน</p>
        </div>
        <form onsubmit="handleRegister(event)" class="space-y-3">
            <input type="text" id="reg-name" placeholder="ชื่อ-นามสกุล" class="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm" required>
            <input type="email" id="reg-email" placeholder="อีเมล" class="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm" required>
            <input type="tel" id="reg-phone" placeholder="เบอร์โทรศัพท์" class="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm" required>
            <textarea id="reg-address" placeholder="ที่อยู่ปัจจุบัน" class="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm h-24" required></textarea>
            <input type="password" id="reg-pass" placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" class="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm" required>
            <button class="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl btn-animate mt-2">สมัครสมาชิก</button>
        </form>
        <button onclick="showLoginModal()" class="w-full mt-4 text-slate-500 text-xs hover:underline italic">ย้อนกลับไปหน้าเข้าสู่ระบบ</button>
    `);
}

// --- Business Logic ---

async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: e.target.email.value,
        password: e.target.password.value
    });
    if (error) return showAlert(error.message, 'error');
    showAlert('เข้าสู่ระบบสำเร็จ', 'success');
    setTimeout(() => location.reload(), 1000);
}

async function handleRegister(e) {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signUp({
        email: e.target.elements['reg-email'].value,
        password: e.target.elements['reg-pass'].value,
        options: {
            data: {
                full_name: e.target.elements['reg-name'].value,
                phone_number: e.target.elements['reg-phone'].value,
                address: e.target.elements['reg-address'].value,
                role: 'member'
            }
        }
    });
    if (error) return showAlert(error.message, 'error');
    showAlert('สมัครสมาชิกสำเร็จ! กรุณาล็อกอิน', 'success');
    showLoginModal();
}

// ฟังก์ชันสลับหน้า View
function switchView(viewName) {
    // รายชื่อ ID ของ Section ทั้งหมดใน HTML (ตรวจดูว่าตรงกับในไฟล์ .html ของคุณไหม)
    const views = ['user-view', 'my-bookings-view', 'admin-view', 'booking-view'];
    
    // กำหนดเป้าหมาย: ถ้าส่งมาแค่ 'user' ให้กลายเป็น 'user-view'
    const targetId = viewName.endsWith('-view') ? viewName : `${viewName}-view`;
    
    let found = false;
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === targetId) {
                el.classList.remove('hidden');
                found = true;
            } else {
                el.classList.add('hidden');
            }
        }
    });

    if (!found) {
        console.warn(`ไม่พบ Element ที่มี ID: ${targetId} กรุณาเช็คใน HTML`);
    }

    // ถ้าไปหน้าแสดงรายการจอง ให้โหลดข้อมูลใหม่
    if (viewName.includes('user') || viewName.includes('booking')) {
        fetchUserRequests(); 
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadUserBookings() {
    const container = document.getElementById('user-request-list');
    
    // แสดง Loading ระหว่างรอข้อมูล
    container.innerHTML = `
        <div class="col-span-full py-20 text-center text-slate-400">
            <i data-lucide="loader-2" class="w-10 h-10 animate-spin mx-auto mb-4 text-blue-500"></i>
            <p class="font-bold">กำลังดึงข้อมูลการจองของคุณ...</p>
        </div>`;
    lucide.createIcons();

    // 1. ตรวจสอบว่าผู้ใช้ Login หรือยัง
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = `<div class="col-span-full text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
            <p class="text-slate-400 font-bold">กรุณาเข้าสู่ระบบเพื่อดูรายการจอง</p>
        </div>`;
        return;
    }

    // 2. ดึงข้อมูล (ปรับชื่อ table 'bookings' ให้ตรงกับของคุณ)
    const { data: bookings, error } = await supabase
        .from('service_requests') 
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error || !bookings || bookings.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-20 text-center bg-white rounded-[3rem] shadow-sm border border-slate-100">
                <i data-lucide="calendar-x" class="w-12 h-12 mx-auto mb-4 text-slate-200"></i>
                <p class="text-slate-400 font-bold text-lg text-blue-600">ยังไม่มีรายการจองในขณะนี้</p>
                <button onclick="switchView('user')" class="mt-4 text-blue-600 hover:underline font-bold text-sm">เริ่มรับบริการได้ที่หน้าหลัก</button>
            </div>`;
        lucide.createIcons();
        return;
    }

    // 3. เรนเดอร์ HTML Cards
    container.innerHTML = bookings.map(book => {
        // จัดการสีสถานะ
        const statusMap = {
            'รอดำเนินการ': { bar: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
            'อนุมัติแล้ว': { bar: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
            'ปฏิเสธ': { bar: 'bg-rose-400', text: 'text-rose-700', bg: 'bg-rose-50' }
        };
        const style = statusMap[book.status] || { bar: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50' };

        return `
        <div class="bg-white p-7 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-slate-50 group relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-2 ${style.bar}"></div>
            <div class="flex justify-between items-start mb-4">
                <div class="pl-2">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">REF: #${book.id.slice(0,8)}</span>
                    <h3 class="font-bold text-lg text-slate-900 mt-1">${book.service_name}</h3>
                </div>
                <span class="px-4 py-1.5 rounded-full text-[11px] font-bold ${style.text} ${style.bg}">
                    ${book.status}
                </span>
            </div>
            <div class="space-y-3 mb-6 pl-2">
                <div class="flex items-center gap-3 text-slate-500">
                    <i data-lucide="calendar" class="w-4 h-4 text-blue-500"></i>
                    <span class="text-sm font-medium">วันที่จอง: ${new Date(book.booking_date).toLocaleDateString('th-TH')}</span>
                </div>
            </div>
            <div class="pt-4 border-t border-slate-50 flex items-center justify-between pl-2">
                <button onclick="viewBookingDetail('${book.id}')" class="text-blue-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all">
                    ดูรายละเอียด <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

// ปรับปรุงฟังก์ชัน checkUser เพื่อสร้างปุ่มสลับหน้าบน Navbar
async function checkUser() {
const { data: { user } } = await supabaseClient.auth.getUser();
currentUser = user;
const authSection = document.getElementById('auth-section');

if (user) {
// 1. ดึงข้อมูล Profile เพื่อเช็คสิทธิ์
const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

// เช็คว่าเป็น Admin หรือไม่ (ปรับเงื่อนไขตามที่คุณใช้จริง)
const isStaff = profile?.role === 'staff' || user.user_metadata?.role === 'staff' || user.email === 'admin@example.com'; 

// 2. อัปเดตชื่อผู้ใช้ที่แสดงในหน้า Dashboard
const displayName = profile?.full_name || user.email;
const userDisplayElem = document.getElementById('user-display');
if (userDisplayElem) userDisplayElem.innerText = displayName;

// 3. สร้าง Navbar ใหม่ที่มีปุ่ม "สถานะการจอง" รวมอยู่ด้วย
let navHtml = `<div class="flex items-center gap-2 md:gap-4">`;

// ปุ่มสถานะการจอง (สำหรับทุกคนที่ Login)
navHtml += `
    <button onclick="switchView('user')" class="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all font-bold text-sm">
        <i data-lucide="clock" class="w-4 h-4"></i>
        <span class="hidden sm:inline">สถานะการจอง</span>
    </button>
`;

// ปุ่มจัดการระบบ (แสดงเฉพาะ Staff/Admin)
if (isStaff) {
    navHtml += `
        <button onclick="switchView('admin')" class="flex items-center gap-2 px-3 py-2 rounded-xl text-orange-600 hover:bg-orange-50 transition-all font-bold text-sm">
            <i data-lucide="shield-check" class="w-4 h-4"></i>
            <span class="hidden sm:inline">จัดการระบบ</span>
        </button>
    `;
}

// เส้นแบ่งเล็กน้อย
navHtml += `<div class="h-6 w-[1px] bg-slate-200 mx-1"></div>`;

// ปุ่มออกจากระบบ
navHtml += `
    <button onclick="handleLogout()" class="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-all font-bold text-sm">
        <i data-lucide="log-out" class="w-4 h-4"></i>
        <span class="hidden sm:inline">ออกจากระบบ</span>
    </button>
`;

navHtml += `</div>`;

authSection.innerHTML = navHtml;

// โหลดข้อมูลคำร้องของ User ทันที
fetchUserRequests();
} else {
// ถ้าไม่ได้ Login ให้แสดงปุ่มเข้าสู่ระบบปกติ
authSection.innerHTML = `
    <button id="btn-login-trigger" onclick="showLoginModal()" class="bg-blue-600 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all">
        เข้าสู่ระบบ
    </button>
`;
}

// สั่งให้ Lucide วาดไอคอนที่สร้างขึ้นมาใหม่
if (window.lucide) lucide.createIcons();
}

async function loadAdminData() {
const tableBody = document.getElementById('all-requests-table');
if (!tableBody) return;

// 1. ลองดึงข้อมูลแบบ Simple ที่สุดก่อน (ตัด Join ออก)
try {
const { data, error } = await supabaseClient
    .from('service_requests')
    .select('*') 
    .order('created_at', { ascending: false });

if (error) throw error;

// 2. อัปเดตตัวเลขสถิติ
const pendingCount = data.filter(r => r.status === 'Pending').length;
const pendingElem = document.getElementById('admin-pending-count');
if (pendingElem) pendingElem.innerText = pendingCount;

if (!data || data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-slate-400">ไม่พบรายการคำร้องในระบบ</td></tr>';
    return;
}

// 3. วาดตารางโดยดึงค่าจาก JSONB เป็นหลัก
tableBody.innerHTML = data.map(req => {
    const statusColors = {
        'Pending': 'bg-orange-100 text-orange-600',
        'Completed': 'bg-emerald-100 text-emerald-600',
        'Rejected': 'bg-red-100 text-red-600'
    };

    // ดึงข้อมูลจากก้อนรายละเอียดที่เราส่งไปตอนจอง
    const displayName = req.request_details?.requester_name || 'ไม่ระบุชื่อ';
    const displayPhone = req.request_details?.requester_phone || '-';
    // ถ้า service_id เป็น UUID และเราไม่ได้ Join ให้ใช้ชื่อที่เราแอบเก็บไว้ใน JSONB แทน
    const serviceTitle = req.request_details?.service_title || 'บริการทั่วไป';

    const dateStr = new Date(req.created_at).toLocaleDateString('th-TH', { 
        day: 'numeric', month: 'short', year: '2-digit' 
    });

    return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-5">
                <div class="font-bold text-slate-900">${displayName}</div>
                <div class="flex items-center gap-2 text-xs mt-1">
                    <span class="text-blue-600 font-bold">${serviceTitle}</span>
                    <span class="text-slate-400">| ${displayPhone}</span>
                </div>
            </td>
            <td class="px-6 py-5 text-sm text-slate-500">${dateStr}</td>
            <td class="px-6 py-5">
                <span class="px-3 py-1.5 rounded-xl text-[10px] font-bold ${statusColors[req.status] || 'bg-slate-100'}">
                    ${req.status === 'Pending' ? 'รอดำเนินการ' : req.status}
                </span>
            </td>
            <td class="px-6 py-5 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="viewRequestDetail('${req.id}')" class="p-2 hover:bg-blue-50 rounded-xl text-blue-600 border border-transparent hover:border-blue-200 transition-all">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}).join('');

lucide.createIcons();

} catch (err) {
console.error('Admin Load Error:', err);
tableBody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-rose-500">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
}
}

async function handleLogout() {
await supabaseClient.auth.signOut();
showAlert('ออกจากระบบแล้ว', 'info');
setTimeout(() => location.reload(), 800);
}

async function loadStats() {
    const { count: total } = await supabaseClient.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true);
    document.getElementById('stat-total').innerText = total || 0;
    
    if (currentUser) {
        const { count: pending } = await supabaseClient.from('service_requests').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id).eq('status', 'Pending');
        document.getElementById('stat-pending').innerText = pending || 0;
    }
}

async function loadServices() {
const { data: services, error } = await supabaseClient
.from('services')
.select('*');

if (error) {
console.error('Error loading services:', error);
return;
}

const container = document.getElementById('service-list');
container.innerHTML = ""; // ล้าง Skeleton loader ออก

services.forEach((item) => { // ใช้ชื่อ 'item' หรือ 'service' ก็ได้ แต่ต้องเหมือนกัน
const card = document.createElement('div');
card.className = "glass p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer group btn-animate";

// ตรงนี้สำคัญ: ส่ง item.id (UUID) และ item.name (ชื่อภาษาไทย)
card.onclick = () => handleServiceClick(item.id, item.name);

card.innerHTML = `
    <div class="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
        <i data-lucide="component" class="text-blue-600 group-hover:text-white w-7 h-7"></i>
    </div>
    <h3 class="font-bold text-slate-900 text-lg mb-2">${item.name}</h3>
    <p class="text-slate-500 text-sm leading-relaxed">${item.description || 'กดเพื่อดูรายละเอียดและขอรับบริการ'}</p>
`;
container.appendChild(card);
});

if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ประกาศตัวแปร Global ไว้ด้านบนสุดของสคริปต์
let activeServiceId = ""; 
let activeServiceName = "";

async function handleServiceClick(id, name) {
if (!currentUser) {
showAlert('กรุณาเข้าสู่ระบบก่อน', 'error');
return showLoginModal();
}

activeServiceId = id;
activeServiceName = name;

// --- ส่วนที่เพิ่มใหม่: ดึงข้อมูลหน่วยงานจาก DB ---
try {
const { data: serviceData, error } = await supabaseClient
    .from('services')
    .select('provider_agency, contact_phone') // ดึงชื่อกองและเบอร์โทร
    .eq('id', id)
    .single();

if (!error && serviceData) {
    const agency = serviceData.provider_agency || "หน่วยงานที่รับผิดชอบ";
    const phone = serviceData.contact_phone || "034-XXX-XXXX";

    // อัปเดตข้อความใน Card
    document.getElementById('help-card-text').innerText = 
        `หากพบปัญหาหรือต้องการสอบถามเพิ่มเติม ติดต่อ${agency}`;
    
    // อัปเดตเบอร์โทรและลิงก์สำหรับกดโทรออก
    document.getElementById('help-card-phone-number').innerText = phone;
    document.getElementById('help-card-phone-link').href = `tel:${phone.replace(/-/g, '')}`;
}
} catch (err) {
console.error("Error fetching agency info:", err);
}
// ------------------------------------------

switchView('booking');
renderDynamicFields(name);
}

function renderDynamicFields(name) {
const container = document.getElementById('dynamic-fields');
const title = document.getElementById('form-title');

if (!container) return; // กัน Error ถ้าหา container ไม่เจอ

container.innerHTML = ""; 
title.innerText = name;

// ดึงชื่อและเบอร์โทรจาก Metadata มาใส่ Section 1 อัตโนมัติ
if (currentUser) {
const nameInput = document.getElementById('common-name');
const phoneInput = document.getElementById('common-phone');

// ลองดึงหลายๆ ทางเผื่อไว้
const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "";
const phone = currentUser.user_metadata?.phone_number || currentUser.user_metadata?.phone || "";

if (nameInput) nameInput.value = fullName;
if (phoneInput) phoneInput.value = phone;
}

let dynamicHtml = "";

// ใช้ .trim() เพื่อตัดช่องว่างที่อาจหลุดมา
const serviceName = name.trim();

if (serviceName.includes('รถสุขา')) {
dynamicHtml = `
    <div class="space-y-2">
        <label class="text-xs font-bold text-slate-500 uppercase ml-1 italic">สถานที่ใช้งาน</label>
        <input type="text" id="f-location" placeholder="ระบุสถานที่หรือพิกัด" class="new-input-style" required>
    </div>
    <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase ml-1 italic">เริ่มวันที่</label>
            <input type="datetime-local" id="f-start" class="new-input-style" required>
        </div>
        <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase ml-1 italic">ถึงวันที่</label>
            <input type="datetime-local" id="f-end" class="new-input-style" required>
        </div>
    </div>
    <div class="space-y-2">
        <label class="text-xs font-bold text-slate-500 uppercase ml-1 italic">รายละเอียด/วัตถุประสงค์</label>
        <textarea id="f-detail" rows="3" class="new-input-style" required></textarea>
    </div>
`;
} 
else if (serviceName.includes('เจ้าภาพ')) {
dynamicHtml = `
    <div class="space-y-2">
        <label class="text-xs font-bold text-slate-500 uppercase ml-1 italic">วันที่ต้องการเข้าจัดกิจกรรม</label>
        <input type="date" id="f-date" class="new-input-style" required>
    </div>
    <div class="space-y-4">
        <label class="text-xs font-bold text-slate-500 uppercase ml-1 italic block">ช่วงเวลา</label>
        <div class="grid grid-cols-3 gap-3">
            <label class="cursor-pointer"><input type="checkbox" name="f-time" value="เช้า" class="peer hidden"><div class="p-3 border rounded-2xl text-center peer-checked:bg-blue-600 peer-checked:text-white transition-all">เช้า</div></label>
            <label class="cursor-pointer"><input type="checkbox" name="f-time" value="กลางวัน" class="peer hidden"><div class="p-3 border rounded-2xl text-center peer-checked:bg-blue-600 peer-checked:text-white transition-all">กลางวัน</div></label>
            <label class="cursor-pointer"><input type="checkbox" name="f-time" value="เย็น" class="peer hidden"><div class="p-3 border rounded-2xl text-center peer-checked:bg-blue-600 peer-checked:text-white transition-all">เย็น</div></label>
        </div>
    </div>
`;
} else {
// ถ้าไม่เข้าเงื่อนไขเลย ให้โชว์ฟิลด์พื้นฐานแทนที่จะปล่อยว่าง
dynamicHtml = `
    <div class="space-y-2">
        <label class="text-xs font-bold text-slate-500 uppercase ml-1 italic">รายละเอียดคำร้อง</label>
        <textarea id="f-generic-detail" rows="4" placeholder="กรุณาระบุรายละเอียดที่ต้องการรับบริการ..." class="new-input-style" required></textarea>
    </div>
`;
}

container.innerHTML = dynamicHtml;
lucide.createIcons(); // ต้องมีบรรทัดนี้เพื่อให้ไอคอนในฟอร์มที่เพิ่งฉีดเข้าไปทำงาน
}

async function handleGlobalSubmit(event) {
event.preventDefault();

// 1. ป้องกันปุ่มกดซ้ำ
const submitBtn = event.target.querySelector('button[type="submit"]');
if (submitBtn) submitBtn.disabled = true;

try {
// --- 2. ประกาศตัวแปร details ตรงนี้! (ห้ามลืม) ---
const details = {
    requester_name: document.getElementById('common-name')?.value || "",
    requester_phone: document.getElementById('common-phone')?.value || "",
    service_title: activeServiceName // ชื่อบริการภาษาไทยที่เราเก็บไว้
};

// 3. รวบรวมฟิลด์พิเศษตามที่ renderDynamicFields สร้างไว้
const dynamicIds = ['f-email', 'f-start', 'f-end', 'f-location', 'f-detail', 'f-date', 'f-activity'];
dynamicIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        // เก็บเฉพาะค่าที่มีข้อมูลเข้าไปใน details
        details[id.replace('f-', '')] = el.value;
    }
});

const timeCheckboxes = document.querySelectorAll('input[name="f-time"]:checked');
    if (timeCheckboxes.length > 0) {
        details['selected_times'] = Array.from(timeCheckboxes).map(cb => cb.value);
    }

// 4. ส่งข้อมูลไปยัง Supabase
const { data, error } = await supabaseClient
    .from('service_requests')
    .insert([{
        user_id: currentUser.id,
        service_id: activeServiceId, // UUID จากตาราง services
        request_details: details,    // ส่งก้อน details ที่ประกาศไว้ข้างบน
        status: 'Pending'
    }]);

if (error) throw error;

showAlert('ส่งคำร้องสำเร็จ!', 'success');
switchView('user');
if (typeof fetchUserRequests === 'function') fetchUserRequests();

} catch (err) {
console.error("Submit Error:", err);
showAlert('เกิดข้อผิดพลาด: ' + err.message, 'error');
} finally {
if (submitBtn) submitBtn.disabled = false;
}
}

async function updateRequestStatus(id, newStatus) {
const { error } = await supabaseClient
.from('service_requests')
.update({ status: newStatus })
.eq('id', id);

if (error) return showAlert('อัปเดตไม่สำเร็จ', 'error');
showAlert('อัปเดตสถานะเรียบร้อยแล้ว', 'success');
loadAdminData(); // โหลดตารางใหม่
}

async function viewRequestDetail(id) {
try {
const { data: req, error } = await supabaseClient
    .from('service_requests')
    .select('*')
    .eq('id', id)
    .single();

if (error || !req) return alert('ไม่พบข้อมูล');

const modal = document.getElementById('request-detail-modal');
const modalTitle = document.getElementById('req-modal-title');
const modalBody = document.getElementById('req-modal-body');

// 1. ตั้งหัวข้อ
modalTitle.innerText = req.request_details?.service_title || 'รายละเอียดคำร้อง';

// 2. เตรียมเนื้อหา
let detailHtml = `<div class="space-y-4">`;

// สถานะ
const statusClass = req.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600';
detailHtml += `
    <div class="p-4 rounded-2xl ${statusClass} text-center mb-4">
        <p class="text-[10px] font-bold uppercase opacity-70">สถานะคำร้อง</p>
        <p class="text-lg font-black">${req.status === 'Pending' ? 'รอดำเนินการ' : req.status}</p>
    </div>
`;

// วนลูปโชว์ข้อมูลจาก request_details
if (req.request_details) {
    Object.entries(req.request_details).forEach(([key, value]) => {
        if (key === 'service_title') return;

        // แปลงชื่อ Key ให้อ่านง่าย
        const labels = {
            'requester_name': 'ชื่อผู้ติดต่อ',
            'requester_phone': 'เบอร์โทรศัพท์',
            'date': 'วันที่ขอรับบริการ',
            'selected_times': 'ช่วงเวลาที่จอง',
            'location': 'สถานที่/ที่อยู่'
        };

        let displayValue = value;
        // ถ้าค่าเป็น Array (เช่น selected_times) ให้ Join เป็นสตริง
        if (Array.isArray(value)) displayValue = value.join(', ');

        detailHtml += `
            <div class="flex flex-col border-b border-slate-50 pb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${labels[key] || key}</span>
                <span class="text-slate-800 font-bold mt-0.5">${displayValue || '-'}</span>
            </div>`;
    });
}

detailHtml += `</div>`;

// 3. แสดง Modal
modalBody.innerHTML = detailHtml;
modal.classList.remove('hidden');
modal.classList.add('flex'); // มั่นใจว่ามันแสดงผลแบบ Flexbox

if (window.lucide) lucide.createIcons();

} catch (err) {
console.error(err);
}
}

function closeDetailModal() {
    const modal = document.getElementById('request-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function fetchUserRequests() {
console.log("🔍 กำลังดึงข้อมูลจองของ User...");
const container = document.getElementById('user-request-list');

// 1. ตรวจสอบว่ามี Container และ User หรือไม่
if (!container) return;

if (!currentUser) {
console.log("⚠️ ไม่พบข้อมูล User (currentUser is null)");
container.innerHTML = `<div class="p-10 text-center text-slate-400">กรุณาเข้าสู่ระบบเพื่อดูสถานะการจอง</div>`;
return;
}

try {
// 2. ดึงข้อมูลจาก Supabase
const { data: requests, error } = await supabaseClient
    .from('service_requests')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

if (error) {
    console.error("❌ Supabase Error:", error);
    throw error;
}

console.log("✅ ข้อมูลที่ดึงมาได้:", requests);

// 3. แสดงผลกรณีไม่มีข้อมูล
if (!requests || requests.length === 0) {
    container.innerHTML = `
        <div class="col-span-full p-10 bg-slate-50 rounded-[2rem] text-center border-2 border-dashed border-slate-200">
            <p class="text-slate-400 font-medium">ไม่พบประวัติการจองของคุณ</p>
        </div>`;
    return;
}

// 4. วาด Card รายการจอง
container.innerHTML = requests.map(req => {
    const statusCfg = {
        'Pending': { color: 'bg-orange-100 text-orange-600', label: 'รอดำเนินการ' },
        'Completed': { color: 'bg-emerald-100 text-emerald-600', label: 'เรียบร้อยแล้ว' },
        'Rejected': { color: 'bg-rose-100 text-rose-600', label: 'ไม่ผ่านการอนุมัติ' }
    }[req.status] || { color: 'bg-slate-100', label: req.status };

    const serviceName = req.request_details?.service_title || 'บริการทั่วไป';
    
    return `
        <div onclick="viewRequestDetail('${req.id}')" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <div class="flex justify-between items-start mb-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold ${statusCfg.color}">
                    ${statusCfg.label}
                </span>
                <p class="text-[10px] text-slate-400">
                    ${new Date(req.created_at).toLocaleDateString('th-TH')}
                </p>
            </div>
            <h4 class="font-bold text-slate-900">${serviceName}</h4>
        </div>
    `;
}).join('');

if (window.lucide) lucide.createIcons();

} catch (err) {
console.error('❌ Error in fetchUserRequests:', err);
container.innerHTML = `<p class="text-rose-500 text-center col-span-full">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>`;
}
}
