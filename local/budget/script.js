// ตั้งค่าการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://ojnhxucgohoeycarooyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbmh4dWNnb2hvZXljYXJvb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjAwNzAsImV4cCI6MjA4NzMzNjA3MH0.T2cH67c45xGbMLZamZ44aVn9WlhRwH47Zj0VYxtP-oU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ฟังก์ชันดึงข้อมูล
async function fetchProjects() {
    const tableBody = document.getElementById('project-table-body');
    
    try {
        // ดึงข้อมูลจากตาราง 'projects' เรียงตาม ID
        const { data, error } = await _supabase
            .from('projects')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        // ล้างข้อมูลเก่าในตาราง
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบข้อมูล</td></tr>';
            return;
        }

        // วนลูปสร้างแถวตาราง
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id || '-'}</td>
                <td>${item.project_name || '-'}</td>
                <td>${item.amphoe || '-'}</td>
                <td>${item.tambon || '-'}</td>
                <td>${item.fiscal_year || '-'}</td>
                <td class="text-end budget-cell">${Number(item.budget || 0).toLocaleString()}</td>
                <td><small class="text-muted">${item.remark || ''}</small></td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
    }
}

// เรียกใช้งานทันทีที่โหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', fetchProjects);
