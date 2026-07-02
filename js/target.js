// ============================================================
// target.js — Tab 2: Input Target + Daftar Target (v2.1)
// Baru di v2.1:
//   - Search & filter lengkap (client-side, TANPA query tambahan)
//   - Chip status: Aktif / Selesai / Batal / Semua (mode Arsip)
//   - Filter jenis, fase, triwulan, KPI
//   - Sortir: deadline / nama / status / terbaru
//   - Group-by: Triwulan / KPI / Jenis (arsip tertata)
//   - Export CSV satu klik
//   - Semua data dari AppCache (hemat Supabase)
// ============================================================

let _triwulanList = [];
let _kpiList      = [];
let _targetList   = [];

// State filter (dipertahankan selama sesi)
const _tf = {
    q: '',
    statusChip: 'Aktif',   // Aktif | Selesai | Batal | Semua
    jenis: '',
    fase: '',
    triwulan: '',
    kpi: '',
    sort: 'deadline',      // deadline | nama | status | terbaru
    groupBy: '',           // '' | triwulan | kpi | jenis
};

// ── ENTRY POINT ──
async function loadTargetTab() {
    await loadDropdownData();
    await loadDaftarTarget();
}

// ── LOAD DATA DROPDOWN (dari cache) ──
async function loadDropdownData() {
    const [tri, kpi] = await Promise.all([AppCache.getTriwulan(), AppCache.getKpi()]);
    _triwulanList = tri || [];
    _kpiList      = kpi || [];

    // Dropdown KPI di form input
    const ddlKpi = document.getElementById('t-kpi');
    if (ddlKpi) {
        const cur = ddlKpi.value;
        ddlKpi.innerHTML = '<option value="">-- Pilih Rencana Kinerja --</option>'
            + _kpiList.map(k => `<option value="${escAttr(k.nama)}">${k.kode ? k.kode + '. ' : ''}${k.nama}</option>`).join('');
        if (cur) ddlKpi.value = cur;
    }

    // Dropdown filter Triwulan & KPI di toolbar daftar target
    const fTri = document.getElementById('tf-triwulan');
    if (fTri) {
        fTri.innerHTML = '<option value="">Semua Triwulan</option>'
            + _triwulanList.map(t => `<option value="${t.id}">${t.nama} ${t.tahun}</option>`).join('');
        fTri.value = _tf.triwulan;
    }
    const fKpi = document.getElementById('tf-kpi');
    if (fKpi) {
        fKpi.innerHTML = '<option value="">Semua KPI</option>'
            + _kpiList.map(k => `<option value="${escAttr(k.nama)}">${k.kode ? k.kode + '. ' : ''}${k.nama}</option>`).join('');
        fKpi.value = _tf.kpi;
    }

    // Default tanggal mulai = hari ini
    const mulaiEl = document.getElementById('t-mulai');
    if (mulaiEl && !mulaiEl.value) {
        mulaiEl.value = new Date().toISOString().split('T')[0];
    }
}

// ── AUTO-DETECT TRIWULAN ──
function getInfoTriwulan(tanggalStr) {
    if (!tanggalStr) return null;
    const bulan      = new Date(tanggalStr).getMonth() + 1;
    const tahun      = new Date(tanggalStr).getFullYear();
    const kuartal    = Math.ceil(bulan / 3);
    const periodeMap = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
    const namaMap    = { 1: 'Triwulan I', 2: 'Triwulan II', 3: 'Triwulan III', 4: 'Triwulan IV' };
    const periode    = periodeMap[kuartal];

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
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateTargetForm()) return;

            const btn = form.querySelector('button[type=submit]');
            btn.disabled = true;
            btn.textContent = 'Menyimpan...';

            const deadline   = document.getElementById('t-deadline').value;
            const triwulanId = autoDetectTriwulan(deadline);

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
                AppCache.invalidate('kegiatan');
                await loadDaftarTarget();
            }

            btn.disabled = false;
            btn.textContent = '+ Simpan Target';
        });
    }

    // Auto-info triwulan saat deadline diubah
    const deadlineInput = document.getElementById('t-deadline');
    if (deadlineInput) {
        deadlineInput.addEventListener('change', async () => {
            const info = getInfoTriwulan(deadlineInput.value);
            const el   = document.getElementById('t-triwulan-info');
            if (!info || !el) return;

            if (info.found) {
                el.textContent = `✓ Otomatis masuk ke ${info.nama}`;
                el.style.color = 'var(--success)';
            } else {
                el.textContent = `⏳ Membuat data ${info.nama}...`;
                el.style.color = 'var(--text-muted)';

                const bulan   = new Date(deadlineInput.value).getMonth() + 1;
                const tahun   = new Date(deadlineInput.value).getFullYear();
                const kuartal = Math.ceil(bulan / 3);
                const periodeMap = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
                const namaMap    = { 1: 'Triwulan I', 2: 'Triwulan II', 3: 'Triwulan III', 4: 'Triwulan IV' };

                const { data: newTw, error } = await supabase
                    .from('triwulan')
                    .insert([{ nama: namaMap[kuartal], tahun, periode: periodeMap[kuartal] }])
                    .select()
                    .single();

                if (!error && newTw) {
                    _triwulanList.push(newTw);
                    AppCache.invalidate('triwulan');
                    el.textContent = `✓ ${namaMap[kuartal]} ${tahun} berhasil dibuat & dipilih otomatis`;
                    el.style.color = 'var(--success)';
                } else {
                    el.textContent = `ℹ Akan disimpan tanpa triwulan (bisa diatur manual nanti)`;
                    el.style.color = 'var(--text-muted)';
                }
            }
        });
    }

    // ── EVENT: TOOLBAR FILTER ──
    const searchEl = document.getElementById('tf-search');
    if (searchEl) {
        searchEl.addEventListener('input', debounce(() => {
            _tf.q = searchEl.value.trim().toLowerCase();
            renderDaftarTarget();
        }, 250));
    }

    document.querySelectorAll('#tf-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#tf-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            _tf.statusChip = chip.dataset.status;
            renderDaftarTarget();
        });
    });

    [['tf-jenis','jenis'], ['tf-fase','fase'], ['tf-triwulan','triwulan'],
     ['tf-kpi','kpi'], ['tf-sort','sort'], ['tf-group','groupBy']].forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => { _tf[key] = el.value; renderDaftarTarget(); });
    });

    const btnReset = document.getElementById('tf-reset');
    if (btnReset) btnReset.addEventListener('click', resetFilterTarget);

    const btnCsv = document.getElementById('tf-export');
    if (btnCsv) btnCsv.addEventListener('click', exportTargetCSV);
});

function resetFilterTarget() {
    _tf.q = ''; _tf.jenis = ''; _tf.fase = ''; _tf.triwulan = ''; _tf.kpi = '';
    _tf.sort = 'deadline'; _tf.groupBy = ''; _tf.statusChip = 'Aktif';
    ['tf-search','tf-jenis','tf-fase','tf-triwulan','tf-kpi'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const s = document.getElementById('tf-sort');  if (s) s.value = 'deadline';
    const g = document.getElementById('tf-group'); if (g) g.value = '';
    document.querySelectorAll('#tf-chips .chip').forEach(c =>
        c.classList.toggle('active', c.dataset.status === 'Aktif'));
    renderDaftarTarget();
}

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

    const dl = document.getElementById('t-deadline');
    if (dl && dl.value) {
        const today = new Date().toISOString().split('T')[0];
        if (dl.value < today) {
            showToast('Perhatian: deadline sudah di masa lalu.', 'warning');
        }
    }
    return valid;
}

// ── LOAD DAFTAR TARGET (fetch via cache, render via filter) ──
async function loadDaftarTarget(force = false) {
    const tbody = document.getElementById('target-tbody');
    if (tbody && !_targetList.length) tbody.innerHTML = skeletonRows(3, 6);

    _targetList = await AppCache.getKegiatan(force);
    renderDaftarTarget();
}

// ── FILTER + SORT + GROUP (murni client-side) ──
function applyTargetFilter(data) {
    let rows = data.slice();

    // Chip status
    if (_tf.statusChip === 'Aktif') {
        rows = rows.filter(k => k.status !== 'Selesai' && k.status !== 'Batal');
    } else if (_tf.statusChip !== 'Semua') {
        rows = rows.filter(k => k.status === _tf.statusChip);
    }

    if (_tf.jenis)    rows = rows.filter(k => k.jenis_pekerjaan === _tf.jenis);
    if (_tf.fase)     rows = rows.filter(k => k.fase_proyek === _tf.fase);
    if (_tf.triwulan) rows = rows.filter(k => k.triwulan_id === _tf.triwulan);
    if (_tf.kpi)      rows = rows.filter(k => k.rencana_kerja_kipapp === _tf.kpi);

    // Search bebas: nama, deskripsi, KPI, satuan
    if (_tf.q) {
        rows = rows.filter(k => {
            const hay = [k.nama_kegiatan, k.deskripsi, k.rencana_kerja_kipapp,
                         k.satuan_target, k.jenis_pekerjaan, k.fase_proyek]
                        .join(' ').toLowerCase();
            return hay.includes(_tf.q);
        });
    }

    // Sortir
    const sorters = {
        deadline: (a, b) => (a.waktu_selesai || '9999') > (b.waktu_selesai || '9999') ? 1 : -1,
        nama:     (a, b) => (a.nama_kegiatan || '').localeCompare(b.nama_kegiatan || '', 'id'),
        status:   (a, b) => (a.status || '').localeCompare(b.status || '', 'id'),
        terbaru:  (a, b) => (b.created_at || '') > (a.created_at || '') ? 1 : -1,
    };
    rows.sort(sorters[_tf.sort] || sorters.deadline);
    return rows;
}

function renderDaftarTarget() {
    const tbody = document.getElementById('target-tbody');
    if (!tbody) return;

    const rows = applyTargetFilter(_targetList);

    // Counter hasil
    const counter = document.getElementById('tf-count');
    if (counter) counter.textContent = `${rows.length} dari ${_targetList.length} kegiatan`;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:28px; color:var(--text-muted);">
            ${_targetList.length ? 'Tidak ada kegiatan yang cocok dengan filter. <a href="#" onclick="resetFilterTarget(); return false;">Reset filter</a>' : 'Belum ada target. Tambah target baru di formulir.'}
        </td></tr>`;
        return;
    }

    // Group-by (opsional)
    if (_tf.groupBy) {
        const keyFn = {
            triwulan: k => k.triwulan ? `${k.triwulan.nama} ${k.triwulan.tahun}` : 'Tanpa Triwulan',
            kpi:      k => k.rencana_kerja_kipapp || 'Tanpa KPI',
            jenis:    k => k.jenis_pekerjaan || 'Tanpa Jenis',
        }[_tf.groupBy];

        const groups = {};
        rows.forEach(k => {
            const g = keyFn(k);
            (groups[g] = groups[g] || []).push(k);
        });

        let no = 0;
        tbody.innerHTML = Object.keys(groups).sort((a,b) => a.localeCompare(b,'id')).map(g => {
            const items   = groups[g];
            const selesai = items.filter(k => k.status === 'Selesai').length;
            const header  = `<tr class="group-row"><td colspan="6">
                <span class="group-name">📂 ${g}</span>
                <span class="group-stat">${items.length} kegiatan · ${selesai} selesai</span>
            </td></tr>`;
            return header + items.map(k => targetRowHtml(k, ++no)).join('');
        }).join('');
        return;
    }

    tbody.innerHTML = rows.map((k, i) => targetRowHtml(k, i + 1)).join('');
}

function targetRowHtml(k, no) {
    const dl      = deadlineLabel(k.waktu_selesai);
    const isArsip = (k.status === 'Selesai' || k.status === 'Batal');
    return `
    <tr class="${k.status === 'Batal' ? 'row-batal' : ''}">
        <td style="color:var(--text-muted); font-size:12px;">${no}</td>
        <td>
            <div style="font-weight:600; font-size:13px;">${k.nama_kegiatan}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                ${k.rencana_kerja_kipapp || '-'}${k.triwulan ? ' · ' + k.triwulan.nama + ' ' + k.triwulan.tahun : ''}
            </div>
        </td>
        <td>
            ${renderFaseBadge(k.fase_proyek)}
            <div style="margin-top:3px;"><span class="badge badge-kpi" style="font-size:10px;">${k.jenis_pekerjaan || '-'}</span></div>
        </td>
        <td>
            <div style="font-size:12px; color:var(--text-muted);">${formatTgl(k.waktu_selesai)}</div>
            ${isArsip ? '' : `<div class="${dl.cls}" style="font-size:11px;">${dl.label}</div>`}
        </td>
        <td>${renderBadge(k.status)}</td>
        <td>
            <div class="td-actions">
                <button class="btn btn-primary btn-xs" onclick="bukaWorkspaceKegiatan('${k.id}')">Buka</button>
                ${k.status === 'Batal'
                    ? `<button class="btn btn-secondary btn-xs" onclick="pulihkanTarget('${k.id}')">Pulihkan</button>
                       <button class="btn btn-danger btn-xs" onclick="hapusTargetPermanen('${k.id}')">Hapus</button>`
                    : `<button class="btn btn-secondary btn-xs" onclick="batalkanTarget('${k.id}')">Batal</button>`}
            </div>
        </td>
    </tr>`;
}

// ── EXPORT CSV (client-side, nol beban Supabase) ──
function exportTargetCSV() {
    const rows = applyTargetFilter(_targetList);
    if (!rows.length) { showToast('Tidak ada data untuk diexport', 'warning'); return; }

    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['No','Nama Kegiatan','Deskripsi','KPI','Jenis','Fase','Triwulan',
                    'Target','Satuan','Mulai','Deadline','Status'];
    const lines = rows.map((k, i) => [
        i + 1, k.nama_kegiatan, k.deskripsi || '', k.rencana_kerja_kipapp || '',
        k.jenis_pekerjaan || '', k.fase_proyek || '',
        k.triwulan ? `${k.triwulan.nama} ${k.triwulan.tahun}` : '',
        k.jumlah_target, k.satuan_target, k.waktu_pelaksanaan || '',
        k.waktu_selesai || '', k.status
    ].map(esc).join(';'));

    // BOM agar Excel Indonesia membaca UTF-8 & pemisah ; dengan benar
    const csv  = '\uFEFF' + header.map(esc).join(';') + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `target_kpi_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`${rows.length} baris diexport ke CSV`, 'success');
}

// ── BATALKAN TARGET ──
async function batalkanTarget(id) {
    const ok = await confirmDialog('Batalkan target ini? Status akan diubah ke Batal (data tidak dihapus, masuk arsip).');
    if (!ok) return;
    const { error } = await supabase.from('kegiatan').update({ status: 'Batal' }).eq('id', id);
    if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
    AppCache.patchKegiatan(id, { status: 'Batal' });
    showToast('Target dibatalkan (lihat di chip "Batal").', 'warning');
    renderDaftarTarget();
}

// ── PULIHKAN DARI ARSIP BATAL ──
async function pulihkanTarget(id) {
    const { error } = await supabase.from('kegiatan').update({ status: 'Belum Dimulai' }).eq('id', id);
    if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
    AppCache.patchKegiatan(id, { status: 'Belum Dimulai' });
    showToast('Target dipulihkan ke daftar aktif.', 'success');
    renderDaftarTarget();
}

// ── HAPUS TARGET PERMANEN ──
async function hapusTargetPermanen(id) {
    const ok = await confirmDialog('Hapus permanen kegiatan ini beserta semua logbook dan bukti dukungnya? Aksi ini tidak bisa dibatalkan!');
    if (!ok) return;
    const { error } = await supabase.from('kegiatan').delete().eq('id', id);
    if (error) { showToast('Gagal hapus: ' + error.message, 'error'); return; }
    AppCache.invalidate('kegiatan');
    showToast('Kegiatan dihapus permanen.', 'success');
    loadDaftarTarget(true);
}

window.batalkanTarget     = batalkanTarget;
window.pulihkanTarget     = pulihkanTarget;
window.hapusTargetPermanen = hapusTargetPermanen;
window.resetFilterTarget  = resetFilterTarget;
