// ============================================================
// target.js — Tab 2: Input Target Pekerjaan
// ============================================================

let _triwulanList = [];
let _kpiList      = [];
let _targetList   = [];

// ── ENTRY POINT ──
async function loadTargetTab() {
    await loadDropdownData();
    await loadDaftarTarget();
}

// ── LOAD DATA DROPDOWN ──
async function loadDropdownData() {
    // Selalu reload KPI (bisa berubah), triwulan cukup sekali
    const [{ data: tri }, { data: kpi }] = await Promise.all([
        supabase.from('triwulan').select('*').order('tahun').order('periode'),
        supabase.from('rencana_kerja_kipapp').select('*').order('kode')
    ]);

    _triwulanList = tri || [];
    _kpiList      = kpi || [];

    // Isi dropdown KPI
    const ddlKpi = document.getElementById('t-kpi');
    if (ddlKpi) {
        ddlKpi.innerHTML = '<option value="">-- Pilih Rencana Kinerja --</option>'
            + _kpiList.map(k => `<option value="${k.nama}">${k.kode ? k.kode + '. ' : ''}${k.nama}</option>`).join('');
    }

    // Set default tanggal mulai = hari ini
    const mulaiEl = document.getElementById('t-mulai');
    if (mulaiEl && !mulaiEl.value) {
        mulaiEl.value = new Date().toISOString().split('T')[0];
    }
}

// ── AUTO-DETECT TRIWULAN ──
// Mengembalikan { id, nama, found } — id bisa null jika tidak ada di DB
function getInfoTriwulan(tanggalStr) {
    if (!tanggalStr) return null;
    const bulan      = new Date(tanggalStr).getMonth() + 1;
    const tahun      = new Date(tanggalStr).getFullYear();
    const kuartal    = Math.ceil(bulan / 3);
    const periodeMap = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
    const namaMap    = { 1: 'Triwulan I', 2: 'Triwulan II', 3: 'Triwulan III', 4: 'Triwulan IV' };
    const periode    = periodeMap[kuartal];

    // Coba cocokkan: (1) periode + tahun, (2) periode saja, (3) nama saja
    const tw = _triwulanList.find(t => t.periode === periode && t.tahun === tahun)
            || _triwulanList.find(t => t.periode === periode)
            || _triwulanList.find(t => t.nama === namaMap[kuartal]);

    return {
        id:    tw ? tw.id : null,
        nama:  tw ? `${tw.nama} ${tw.tahun}` : `${namaMap[kuartal]} ${tahun}`,
        found: !!tw
    };
}

function autoDetectTriwulan(tanggalStr) {
    const info = getInfoTriwulan(tanggalStr);
    return info ? info.id : null;
}

// ── FORM SUBMIT ──
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formTarget');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateTargetForm()) return;

        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        const deadline       = document.getElementById('t-deadline').value;
        const triwulanId     = autoDetectTriwulan(deadline);

        const payload = {
            nama_kegiatan:        document.getElementById('t-nama').value.trim(),
            deskripsi:            document.getElementById('t-deskripsi').value.trim() || null,
            rencana_kerja_kipapp: document.getElementById('t-kpi').value,
            triwulan_id:          triwulanId,
            jumlah_target:        parseInt(document.getElementById('t-jumlah').value) || 1,
            satuan_target:        document.getElementById('t-satuan').value.trim() || 'Dokumen',
            waktu_pelaksanaan:    document.getElementById('t-mulai').value,
            waktu_selesai:        deadline,
            status:               'Belum Dimulai',
            fase_proyek:          document.getElementById('t-fase').value || 'Perencanaan',
            jenis_pekerjaan:      document.getElementById('t-jenis').value,
        };

        const { error } = await supabase.from('kegiatan').insert([payload]);

        if (error) {
            showToast('Gagal menyimpan: ' + error.message, 'error');
        } else {
            showToast('Target berhasil disimpan!', 'success');
            form.reset();
            document.getElementById('t-mulai').value = new Date().toISOString().split('T')[0];
            document.getElementById('t-triwulan-info').textContent = '';
            await loadDaftarTarget();
        }

        btn.disabled = false;
        btn.textContent = '+ Simpan Target';
    });

    // Auto-info triwulan saat deadline diubah
    const deadlineInput = document.getElementById('t-deadline');
    if (deadlineInput) {
        deadlineInput.addEventListener('change', async () => {
            const info = getInfoTriwulan(deadlineInput.value);
            const el   = document.getElementById('t-triwulan-info');
            if (!info || !el) return;

            if (info.found) {
                // Triwulan ditemukan di database
                el.textContent = `✓ Otomatis masuk ke ${info.nama}`;
                el.style.color = 'var(--success)';
            } else {
                // Tidak ditemukan di DB — coba auto-insert
                el.textContent = `⏳ Membuat data ${info.nama}...`;
                el.style.color = 'var(--text-muted)';

                const bulan   = new Date(deadlineInput.value).getMonth() + 1;
                const tahun   = new Date(deadlineInput.value).getFullYear();
                const kuartal = Math.ceil(bulan / 3);
                const periodeMap = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
                const namaMap    = { 1: 'Triwulan I', 2: 'Triwulan II', 3: 'Triwulan III', 4: 'Triwulan IV' };

                // Insert triwulan baru ke database otomatis
                const { data: newTw, error } = await supabase
                    .from('triwulan')
                    .insert([{ nama: namaMap[kuartal], tahun, periode: periodeMap[kuartal] }])
                    .select()
                    .single();

                if (!error && newTw) {
                    _triwulanList.push(newTw);
                    el.textContent = `✓ ${namaMap[kuartal]} ${tahun} berhasil dibuat & dipilih otomatis`;
                    el.style.color = 'var(--success)';
                } else {
                    // Gagal insert, tetap bisa simpan tanpa triwulan_id
                    el.textContent = `ℹ Akan disimpan tanpa triwulan (bisa diatur manual nanti)`;
                    el.style.color = 'var(--text-muted)';
                }
            }
        });
    }
});

// ── VALIDASI ──
function validateTargetForm() {
    let valid = true;
    const required = ['t-nama', 't-kpi', 't-deadline', 't-jenis'];
    required.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const errEl = document.getElementById(id + '-err');
        if (!el.value.trim()) {
            if (errEl) { errEl.classList.add('show'); errEl.textContent = 'Wajib diisi'; }
            el.classList.add('error');
            valid = false;
        } else {
            if (errEl) errEl.classList.remove('show');
            el.classList.remove('error');
        }
    });

    // Deadline tidak boleh di masa lalu (opsional, tampilkan warning saja)
    const dl = document.getElementById('t-deadline');
    if (dl && dl.value) {
        const today = new Date().toISOString().split('T')[0];
        if (dl.value < today) {
            showToast('Perhatian: deadline sudah di masa lalu.', 'warning');
        }
    }
    return valid;
}

// ── DAFTAR TARGET ──
async function loadDaftarTarget() {
    const tbody = document.getElementById('target-tbody');
    if (!tbody) return;

    tbody.innerHTML = skeletonRows(3, 5);

    const { data, error } = await supabase
        .from('kegiatan')
        .select('*, triwulan(nama)')
        .order('waktu_selesai', { ascending: true });

    if (error) { showToast('Gagal memuat daftar target', 'error'); return; }
    _targetList = data || [];

    if (!_targetList.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:28px; color:var(--text-muted);">Belum ada target. Tambah target baru di atas.</td></tr>`;
        return;
    }

    tbody.innerHTML = _targetList.map((k, i) => {
        const dl  = deadlineLabel(k.waktu_selesai);
        return `
        <tr>
            <td style="color:var(--text-muted); font-size:12px;">${i + 1}</td>
            <td>
                <div style="font-weight:600; font-size:13px;">${k.nama_kegiatan}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${k.rencana_kerja_kipapp || '-'}</div>
            </td>
            <td>
                ${renderFaseBadge(k.fase_proyek)}
                <div style="margin-top:3px;"><span class="badge badge-kpi" style="font-size:10px;">${k.jenis_pekerjaan || '-'}</span></div>
            </td>
            <td>
                <div style="font-size:12px; color:var(--text-muted);">${formatTgl(k.waktu_selesai)}</div>
                <div class="${dl.cls}" style="font-size:11px;">${dl.label}</div>
            </td>
            <td>${renderBadge(k.status)}</td>
            <td>
                <div class="td-actions">
                    <button class="btn btn-primary btn-xs" onclick="bukaWorkspaceKegiatan('${k.id}')">Buka</button>
                    <button class="btn btn-secondary btn-xs" onclick="batalkanTarget('${k.id}')">Batal</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── BATALKAN TARGET ──
async function batalkanTarget(id) {
    const ok = await confirmDialog('Batalkan target ini? Status akan diubah ke Batal (data tidak dihapus).');
    if (!ok) return;
    const { error } = await supabase.from('kegiatan').update({ status: 'Batal' }).eq('id', id);
    if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
    showToast('Target dibatalkan.', 'warning');
    loadDaftarTarget();
}

// ── HAPUS TARGET PERMANEN ──
async function hapusTargetPermanen(id) {
    const ok = await confirmDialog('Hapus permanen kegiatan ini beserta semua logbook dan bukti dukungnya? Aksi ini tidak bisa dibatalkan!');
    if (!ok) return;
    const { error } = await supabase.from('kegiatan').delete().eq('id', id);
    if (error) { showToast('Gagal hapus: ' + error.message, 'error'); return; }
    showToast('Kegiatan dihapus.', 'success');
    loadDaftarTarget();
}