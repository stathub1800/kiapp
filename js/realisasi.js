// ============================================================
// realisasi.js — Tab 3: Realisasi / Workspace Logbook
// ============================================================

let _currentKegiatanId = null;

// ── ENTRY POINT ──
async function loadRealisasiTab() {
    await loadRealisasiDropdown();
}

// ── DROPDOWN PILIH KEGIATAN ──
async function loadRealisasiDropdown() {
    const ddl = document.getElementById('pilih-realisasi');
    if (!ddl) return;

    const { data, error } = await supabase
        .from('kegiatan')
        .select('id, nama_kegiatan, status, waktu_selesai')
        .neq('status', 'Batal')
        .order('waktu_selesai', { ascending: true });

    if (error) return;

    const opts = (data || []).map(k => {
        const dl = deadlineLabel(k.waktu_selesai);
        return `<option value="${k.id}" data-status="${k.status}">[${k.status}] ${k.nama_kegiatan} — ${dl.label}</option>`;
    });

    ddl.innerHTML = '<option value="">-- Pilih pekerjaan untuk diupdate --</option>' + opts.join('');

    ddl.onchange = (e) => {
        if (e.target.value) openWorkspace(e.target.value);
        else closeWorkspace();
    };
}

// ── BUKA WORKSPACE ──
async function openWorkspace(id) {
    _currentKegiatanId = id;
    window.kegiatanId  = id; // expose untuk bukti.js

    const panel = document.getElementById('panel-workspace');
    if (panel) panel.style.display = 'block';

    // Load data paralel
    const [kegData] = await Promise.all([
        loadWorkspaceHeader(id),
        loadLogbook(id),
        loadDaftarBukti()
    ]);
}

// ── TUTUP WORKSPACE ──
function closeWorkspace() {
    _currentKegiatanId = null;
    window.kegiatanId  = null;
    const panel = document.getElementById('panel-workspace');
    if (panel) panel.style.display = 'none';
}

// ── HEADER WORKSPACE ──
async function loadWorkspaceHeader(id) {
    const { data: k, error } = await supabase
        .from('kegiatan')
        .select('*, triwulan(nama)')
        .eq('id', id)
        .single();

    if (error || !k) return;

    const titleEl = document.getElementById('ws-title');
    const metaEl  = document.getElementById('ws-meta');
    const statusDdl = document.getElementById('ws-status');

    if (titleEl) titleEl.textContent = k.nama_kegiatan;
    if (metaEl)  metaEl.textContent  = `KPI: ${k.rencana_kerja_kipapp || '-'} · Target: ${k.jumlah_target} ${k.satuan_target} · Deadline: ${formatTgl(k.waktu_selesai)} · Triwulan: ${k.triwulan?.nama || '-'}`;
    if (statusDdl) {
        statusDdl.value = k.status;
        statusDdl.onchange = async (e) => {
            statusDdl.disabled = true;
            const { error: upErr } = await supabase.from('kegiatan').update({ status: e.target.value }).eq('id', id);
            if (upErr) { showToast('Gagal update status', 'error'); statusDdl.value = k.status; }
            else { showToast('Status diperbarui', 'success'); }
            statusDdl.disabled = false;
        };
    }
}

// ── LOGBOOK ──
document.addEventListener('DOMContentLoaded', () => {
    // Set tanggal default logbook
    const tglEl = document.getElementById('log-tanggal');
    if (tglEl) tglEl.value = new Date().toISOString().split('T')[0];

    // Form submit logbook
    const formLog = document.getElementById('form-logbook');
    if (formLog) {
        formLog.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!_currentKegiatanId) return;

            const teks  = document.getElementById('log-teks').value.trim();
            const tanggal = document.getElementById('log-tanggal').value;

            if (!teks)    { showToast('Isi catatan progres terlebih dahulu', 'warning'); return; }
            if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'warning'); return; }

            const btn = formLog.querySelector('button[type=submit]');
            btn.disabled = true; btn.textContent = 'Menyimpan...';

            const { error } = await supabase.from('progres_harian').insert([{
                kegiatan_id: _currentKegiatanId,
                tanggal,
                deskripsi: teks
            }]);

            if (error) { showToast('Gagal menyimpan: ' + error.message, 'error'); }
            else {
                document.getElementById('log-teks').value = '';
                showToast('Progres dicatat!', 'success');
                await loadLogbook(_currentKegiatanId);
            }

            btn.disabled = false; btn.textContent = '+ Catat Progres';
        });
    }
});

async function loadLogbook(id) {
    const container = document.getElementById('list-logbook');
    if (!container) return;

    container.innerHTML = '<div class="skeleton" style="height:60px; border-radius:8px;"></div>';

    const { data, error } = await supabase
        .from('progres_harian')
        .select('*')
        .eq('kegiatan_id', id)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

    if (error || !data || !data.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Belum ada catatan progres harian.</p></div>`;
        return;
    }

    container.innerHTML = `<div class="timeline">
        ${data.map(p => `
        <div class="timeline-item">
            <button class="timeline-delete" onclick="hapusLogbook('${p.id}')" title="Hapus catatan ini">×</button>
            <div class="timeline-date">${formatTglLong(p.tanggal)}</div>
            <div class="timeline-text">${escHtml(p.deskripsi)}</div>
        </div>`).join('')}
    </div>`;
}

async function hapusLogbook(id) {
    const ok = await confirmDialog('Hapus catatan progres ini?');
    if (!ok) return;
    const { error } = await supabase.from('progres_harian').delete().eq('id', id);
    if (error) { showToast('Gagal hapus', 'error'); return; }
    showToast('Catatan dihapus', 'success');
    if (_currentKegiatanId) loadLogbook(_currentKegiatanId);
}

// ── ESCAPE HTML ──
function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
