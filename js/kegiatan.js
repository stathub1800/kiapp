const urlParams = new URLSearchParams(window.location.search);
const kegiatanId = urlParams.get('id');

const panelPerencanaan = document.getElementById('panelPerencanaan');
const panelWorkspace = document.getElementById('panelWorkspace');

// ==========================================
// INISIALISASI HALAMAN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadDropdowns();
    
    // Set tanggal hari ini sebagai default di input progres
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('tanggalProgres')) document.getElementById('tanggalProgres').value = today;

    if (kegiatanId) {
        // MODE WORKSPACE (Data sudah ada)
        panelPerencanaan.style.display = 'none';
        panelWorkspace.style.display = 'block';
        loadWorkspaceData();
        loadProgresHarian();
    } else {
        // MODE PERENCANAAN (Bikin Baru)
        panelPerencanaan.style.display = 'block';
        panelWorkspace.style.display = 'none';
    }
});

// ==========================================
// LOAD DROPDOWN (Triwulan & KPI)
// ==========================================
async function loadDropdowns() {
    const ddlTriwulan = document.getElementById('triwulan_id');
    const ddlKpi = document.getElementById('rencana_kerja');
    
    if (ddlTriwulan) {
        const { data } = await supabase.from('triwulan').select('*').order('periode', { ascending: true });
        ddlTriwulan.innerHTML = '<option value="">-- Pilih Triwulan --</option>';
        data?.forEach(t => ddlTriwulan.innerHTML += `<option value="${t.id}">${t.nama} (${t.tahun})</option>`);
    }

    if (ddlKpi) {
        const { data } = await supabase.from('rencana_kerja_kipapp').select('*').order('kode');
        ddlKpi.innerHTML = '<option value="">-- Pilih Rencana Kinerja --</option>';
        data?.forEach(k => ddlKpi.innerHTML += `<option value="${k.nama}">${k.nama}</option>`);
    }
}

// ==========================================
// SIMPAN RENCANA (To-Do List Baru)
// ==========================================
document.getElementById('formKegiatan')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nama_kegiatan: document.getElementById('nama_kegiatan').value,
        triwulan_id: document.getElementById('triwulan_id').value,
        rencana_kerja_kipapp: document.getElementById('rencana_kerja').value,
        jumlah_target: parseInt(document.getElementById('jumlah_target').value),
        satuan_target: document.getElementById('satuan_target').value,
        waktu_selesai: document.getElementById('waktu_selesai').value,
        status: 'Persiapan',
        jenis_pekerjaan: 'KPI Utama', // Default
        waktu_pelaksanaan: new Date().toISOString().split('T')[0] // Mulai hari ini
    };

    const { data, error } = await supabase.from('kegiatan').insert([payload]).select().single();
    if (error) alert("Error: " + error.message);
    else window.location.href = `kegiatan.html?id=${data.id}`; // Langsung buka Workspacenya
});

// ==========================================
// LOAD DATA WORKSPACE
// ==========================================
async function loadWorkspaceData() {
    const { data, error } = await supabase.from('kegiatan').select('*, triwulan(nama)').eq('id', kegiatanId).single();
    if (error || !data) return;

    document.getElementById('wsTitle').innerText = data.nama_kegiatan;
    
    // Format Tanggal Indonesia
    const tglDeadline = new Date(data.waktu_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('wsMeta').innerText = `Target: ${data.jumlah_target} ${data.satuan_target} | Wadah: ${data.triwulan?.nama} | Deadline: ${tglDeadline}`;
    
    document.getElementById('headerStatus').innerHTML = `<span style="background: white; color: var(--primary); padding: 5px 15px; border-radius: 20px; font-weight: bold;">Status: ${data.status}</span>`;
    
    // Inject HTML Panel Bukti Dukung Anda ke Kolom Kanan agar script lama Anda jalan sempurna
    document.getElementById('panelBuktiDukung').innerHTML = `
        <h3 style="margin-top: 0; color: var(--primary);">📎 Dokumen Asli / Drive</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: -10px;">Salin link file dari Drive Anda ke sini.</p>
        <input type="url" id="urlLink" placeholder="Paste link dokumen di sini..." style="width: 100%; margin-bottom: 5px; padding: 8px;">
        <div id="previewNama" style="margin-bottom: 5px;"></div>
        <input type="text" id="namaLink" placeholder="Nama Dokumen (Contoh: Laporan SBR)" style="width: 100%; margin-bottom: 10px; padding: 8px;">
        <button class="btn-primary" id="btnSimpanLink" style="width: 100%;">Lampirkan Dokumen</button>
        <p id="linkStatus" style="font-size:12px; color:var(--success); margin-top:5px; text-align:center;"></p>
        <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
        <div id="listBuktiDukung"></div>
    `;
    
    // Panggil ulang event listener bukti.js karena elemennya baru dibuat
    if(typeof btnSimpanLink !== 'undefined' && document.getElementById('btnSimpanLink')){
        document.getElementById('btnSimpanLink').addEventListener('click', btnSimpanLink.onclick);
    }
}

// ==========================================
// SIMPAN & LOAD LOGBOOK PROGRES
// ==========================================
document.getElementById('formProgres')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'Menyimpan...';

    const payload = {
        kegiatan_id: kegiatanId,
        tanggal: document.getElementById('tanggalProgres').value,
        deskripsi: document.getElementById('teksProgres').value
    };

    const { error } = await supabase.from('progres_harian').insert([payload]);
    if (!error) {
        document.getElementById('teksProgres').value = '';
        loadProgresHarian();
    }
    btn.innerText = '+ Catat Progres';
});

async function loadProgresHarian() {
    const list = document.getElementById('listProgres');
    const { data, error } = await supabase.from('progres_harian').select('*').eq('kegiatan_id', kegiatanId).order('tanggal', { ascending: false }).order('created_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); font-size:13px; text-align:center;">Belum ada catatan progres.</p>';
        return;
    }

    let html = '';
    data.forEach(p => {
        const tgl = new Date(p.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
        html += `
            <div class="logbook-item">
                <div class="logbook-date">${tgl}</div>
                <div style="font-size: 14px; line-height: 1.5; color: #333; white-space: pre-wrap;">${p.deskripsi}</div>
            </div>
        `;
    });
    list.innerHTML = html;
}