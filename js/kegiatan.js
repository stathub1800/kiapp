const urlParams = new URLSearchParams(window.location.search);
const kegiatanId = urlParams.get('id');

const panelPerencanaan = document.getElementById('panelPerencanaan');
const panelWorkspace = document.getElementById('panelWorkspace');

// ==========================================
// INISIALISASI HALAMAN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadDropdowns();
    
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('tanggalProgres')) document.getElementById('tanggalProgres').value = today;

    if (kegiatanId) {
        panelPerencanaan.style.display = 'none';
        panelWorkspace.style.display = 'block';
        loadWorkspaceData();
        loadProgresHarian();
    } else {
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
        jenis_pekerjaan: 'KPI Utama', 
        waktu_pelaksanaan: new Date().toISOString().split('T')[0] 
    };

    const { data, error } = await supabase.from('kegiatan').insert([payload]).select().single();
    if (error) alert("Error: " + error.message);
    else window.location.href = `kegiatan.html?id=${data.id}`; 
});

// ==========================================
// LOAD DATA WORKSPACE & DROPDOWN STATUS
// ==========================================
async function loadWorkspaceData() {
    const { data, error } = await supabase.from('kegiatan').select('*, triwulan(nama)').eq('id', kegiatanId).single();
    if (error || !data) return;

    document.getElementById('wsTitle').innerText = data.nama_kegiatan;
    
    const tglDeadline = new Date(data.waktu_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('wsMeta').innerText = `Target: ${data.jumlah_target} ${data.satuan_target} | Wadah: ${data.triwulan?.nama || 'Tahunan'} | Deadline: ${tglDeadline}`;
    
    // Fitur Dropdown Status agar bisa diklik dari Header
    document.getElementById('headerStatus').innerHTML = `
        <select id="ubahStatusKegiatan" style="padding: 5px 15px; border-radius: 20px; font-weight: bold; border: 2px solid white; background: var(--primary); color: white; outline: none; cursor: pointer; font-size: 14px;">
            <option value="Persiapan" ${data.status === 'Persiapan' ? 'selected' : ''}>Status: Persiapan</option>
            <option value="Pelaksanaan" ${data.status === 'Pelaksanaan' ? 'selected' : ''}>Status: Pelaksanaan</option>
            <option value="Pelaporan" ${data.status === 'Pelaporan' ? 'selected' : ''}>Status: Pelaporan</option>
            <option value="Monitoring dan Evaluasi" ${data.status === 'Monitoring dan Evaluasi' ? 'selected' : ''}>Status: Monev</option>
            <option value="Selesai" ${data.status === 'Selesai' ? 'selected' : ''}>Status: Selesai</option>
        </select>
    `;

    document.getElementById('ubahStatusKegiatan').addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        const selectEl = e.target;
        selectEl.disabled = true; // Kunci sebentar saat menyimpan
        const { error: updErr } = await supabase.from('kegiatan').update({ status: newStatus }).eq('id', kegiatanId);
        if(updErr) alert("Gagal update status!");
        selectEl.disabled = false;
    });
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
    } else {
        alert("Gagal simpan progres: " + error.message);
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