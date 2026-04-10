// ==========================================
// 1. NAVIGASI TAB UTAMA
// ==========================================
function openTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');

    // Trigger loading data spesifik per tab
    if (tabId === 'tab-dashboard') loadDashboard();
    if (tabId === 'tab-target')    initTargetForm();
    if (tabId === 'tab-realisasi') loadRealisasiList();
    if (tabId === 'tab-laporan')   loadLaporanKPI();
}

// ==========================================
// 2. LOGIKA TAB 1: DASHBOARD (MATA ELANG)
// ==========================================
async function loadDashboard() {
    const { data: kegiatans, error } = await supabase.from('kegiatan').select('*').order('waktu_selesai', { ascending: true });
    if (error) return;

    // A. Progress Ringkas (Kartu Biru)
    const total = kegiatans.length;
    const selesai = kegiatans.filter(k => k.status === 'Selesai').length;
    const persen = total > 0 ? Math.round((selesai / total) * 100) : 0;
    document.getElementById('dashProgressRingkas').innerHTML = `
        <h1 style="font-size: 48px; margin: 10px 0;">${persen}%</h1>
        <p style="margin:0; opacity:0.8;">${selesai} dari ${total} target tercapai</p>
    `;

    // B. To-Do List (Deadline Terdekat)
    const containerTodo = document.getElementById('dashTodoList');
    const aktif = kegiatans.filter(k => k.status !== 'Selesai').slice(0, 5); // Ambil 5 teratas
    
    if(aktif.length === 0) {
        containerTodo.innerHTML = "<p>Semua tugas selesai! 🚀</p>";
    } else {
        let html = '';
        aktif.forEach(k => {
            const tgl = new Date(k.waktu_selesai).toLocaleDateString('id-ID', { day:'numeric', month:'short' });
            html += `
                <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
                    <span style="font-weight:600; font-size:14px;">${k.nama_kegiatan}</span>
                    <span style="color:var(--danger); font-size:12px; font-weight:bold;">${tgl}</span>
                </div>`;
        });
        containerTodo.innerHTML = html;
    }

    // C. Kanban Otomatis (Mini View)
    const containerKanban = document.getElementById('dashKanban');
    const statuses = ['Persiapan', 'Pelaksanaan', 'Pelaporan', 'Selesai'];
    let kanbanHtml = '';
    statuses.forEach(s => {
        const count = kegiatans.filter(k => k.status === s).length;
        kanbanHtml += `
            <div style="flex:1; min-width:80px; background:#f1f5f9; padding:10px; border-radius:8px; text-align:center;">
                <div style="font-size:11px; font-weight:bold; color:#64748b;">${s.split(' ')[0]}</div>
                <div style="font-size:20px; font-weight:bold; color:var(--primary);">${count}</div>
            </div>`;
    });
    containerKanban.innerHTML = kanbanHtml;

    // D. Kalender (Trigger Render)
    loadKalenderDashboard(kegiatans);
}

function loadKalenderDashboard(data) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || window.dashCalendar) return;

    window.dashCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 350,
        headerToolbar: { left: 'prev,next', center: 'title', right: '' },
        events: data.map(k => ({ title: k.nama_kegiatan, start: k.waktu_selesai, color: k.status === 'Selesai' ? '#10b981' : '#3b82f6' }))
    });
    window.dashCalendar.render();
}

// ==========================================
// 3. LOGIKA TAB 2: INPUT TARGET
// ==========================================
async function initTargetForm() {
    const form = document.getElementById('formInputTarget');
    // Ambil data Dropdown Triwulan & KPI
    const { data: tri } = await supabase.from('triwulan').select('*').order('periode');
    const { data: kpi } = await supabase.from('rencana_kerja_kipapp').select('*').order('kode');

    form.innerHTML = `
        <label>Apa yang ingin Anda kerjakan?</label>
        <input type="text" id="t-nama" placeholder="Contoh: Updating SBR Triwulan II" required>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:15px;">
            <div>
                <label>Wadah Triwulan</label>
                <select id="t-triwulan" required>
                    ${tri.map(t => `<option value="${t.id}">${t.nama} (${t.tahun})</option>`).join('')}
                </select>
            </div>
            <div>
                <label>Rencana Kinerja (KPI)</label>
                <select id="t-kpi" required>
                    ${kpi.map(k => `<option value="${k.nama}">${k.nama}</option>`).join('')}
                </select>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; margin-top:15px;">
            <div><label>Jumlah Target</label><input type="number" id="t-jumlah" value="1" required></div>
            <div><label>Satuan</label><input type="text" id="t-satuan" value="Dokumen" required></div>
            <div><label>Deadline</label><input type="date" id="t-deadline" required></div>
        </div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:20px;">+ Simpan ke Rencana Kerja</button>
    `;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nama_kegiatan: document.getElementById('t-nama').value,
            triwulan_id: document.getElementById('t-triwulan').value,
            rencana_kerja_kipapp: document.getElementById('t-kpi').value,
            jumlah_target: document.getElementById('t-jumlah').value,
            satuan_target: document.getElementById('t-satuan').value,
            waktu_selesai: document.getElementById('t-deadline').value,
            status: 'Persiapan',
            waktu_pelaksanaan: new Date().toISOString().split('T')[0]
        };
        const { error } = await supabase.from('kegiatan').insert([payload]);
        if (!error) { alert("Target berhasil disimpan!"); form.reset(); openTab('tab-dashboard', document.querySelector('.tab-btn')); }
    };
}

// ==========================================
// 4. LOGIKA TAB 3: REALISASI (WORKSPACE)
// ==========================================
async function loadRealisasiList() {
    const ddl = document.getElementById('pilihRealisasi');
    const { data } = await supabase.from('kegiatan').select('id, nama_kegiatan').neq('status', 'Selesai');
    
    ddl.innerHTML = '<option value="">-- Pilih Pekerjaan yang Akan Diupdate --</option>' + 
                   data.map(k => `<option value="${k.id}">${k.nama_kegiatan}</option>`).join('');

    ddl.onchange = (e) => {
        const id = e.target.value;
        if(id) {
            window.kegiatanId = id; // Set global ID untuk bukti.js
            document.getElementById('areaWorkspaceRealisasi').style.display = 'block';
            renderWorkspaceRealisasi(id);
        }
    };
}

function renderWorkspaceRealisasi(id) {
    const container = document.getElementById('areaWorkspaceRealisasi');
    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div>
                <h4>📝 Logbook Harian</h4>
                <textarea id="logText" placeholder="Apa progres Anda hari ini?" style="width:100%; height:80px;"></textarea>
                <button class="btn-primary" style="background:var(--secondary);" onclick="simpanLogHarian()">Catat Progres</button>
                <div id="listLog" style="margin-top:15px; max-height:300px; overflow-y:auto;"></div>
            </div>
            <div>
                <h4>📎 Bukti Dukung (Google Drive)</h4>
                <input type="url" id="urlLink" placeholder="Paste link Drive/Doc di sini..." style="width:100%; padding:10px;">
                <button class="btn-primary" id="btnSimpanLink" style="margin-top:10px;">Simpan Link Dokumen</button>
                <div id="listBuktiDukung" style="margin-top:15px;"></div>
            </div>
        </div>
    `;
    // Panggil fungsi render ulang dari script yang sudah ada
    loadLogHarian(id);
    loadDaftarBukti(); 
}

// ==========================================
// 5. LOGIKA TAB 4: REPORT (HIMPUN LAPORAN)
// ==========================================
async function loadLaporanKPI() {
    const ddl = document.getElementById('pilihLaporanKpi');
    const { data } = await supabase.from('rencana_kerja_kipapp').select('nama').order('kode');
    ddl.innerHTML = '<option value="">-- Pilih KPI / Rencana Kinerja --</option>' + 
                   data.map(k => `<option value="${k.nama}">${k.nama}</option>`).join('');

    document.getElementById('btnBuatLaporan').onclick = async () => {
        const kpi = ddl.value;
        if(!kpi) return alert("Pilih KPI terlebih dahulu!");
        
        // Logika pembuatan landing page laporan terpadu akan dikembangkan di sini
        alert(`Sistem sedang menghimpun semua proyek untuk KPI: ${kpi}. Link laporan akan segera siap.`);
    };
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});