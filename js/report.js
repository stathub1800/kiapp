// ============================================================
// report.js — Tab 4: Generate Laporan Terpadu per KPI & Triwulan
// ============================================================

let _triwulanForReport = [];
let _kpiForReport      = [];
let _savedReports      = [];

// ── ENTRY POINT ──
async function loadReportTab() {
    await loadReportDropdowns();
    await loadSavedReports();
}

async function loadReportDropdowns() {
    if (_triwulanForReport.length && _kpiForReport.length) return;

    const [{ data: tri }, { data: kpi }] = await Promise.all([
        supabase.from('triwulan').select('*').order('tahun').order('periode'),
        supabase.from('rencana_kerja_kipapp').select('*').order('kode')
    ]);

    _triwulanForReport = tri || [];
    _kpiForReport      = kpi || [];

    const ddlKpi = document.getElementById('r-kpi');
    if (ddlKpi) {
        ddlKpi.innerHTML = '<option value="">-- Pilih Rencana Kinerja --</option>'
            + _kpiForReport.map(k => `<option value="${k.nama}">${k.kode ? k.kode + ' — ' : ''}${k.nama}</option>`).join('');
    }

    const ddlTri = document.getElementById('r-triwulan');
    if (ddlTri) {
        ddlTri.innerHTML = '<option value="">-- Pilih Triwulan --</option>'
            + _triwulanForReport.map(t => `<option value="${t.id}">${t.nama} ${t.tahun}</option>`).join('');
    }
}

// ── GENERATE LAPORAN ──
document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btn-generate-report');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', generateLaporan);
    }
});

async function generateLaporan() {
    const namaKpi    = document.getElementById('r-kpi')?.value;
    const triwulanId = document.getElementById('r-triwulan')?.value;

    if (!namaKpi)    { showToast('Pilih Rencana Kinerja terlebih dahulu', 'warning'); return; }
    if (!triwulanId) { showToast('Pilih Triwulan terlebih dahulu', 'warning'); return; }

    const btn = document.getElementById('btn-generate-report');
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

    // 1. Ambil semua kegiatan untuk KPI + triwulan ini
    const { data: kegiatan, error: kErr } = await supabase
        .from('kegiatan')
        .select('*, triwulan(nama, periode)')
        .eq('rencana_kerja_kipapp', namaKpi)
        .eq('triwulan_id', triwulanId)
        .neq('status', 'Batal')
        .order('waktu_selesai', { ascending: true });

    if (kErr) { showToast('Gagal ambil data kegiatan: ' + kErr.message, 'error'); resetBtn(btn); return; }

    if (!kegiatan || !kegiatan.length) {
        showToast('Tidak ada kegiatan untuk KPI & triwulan ini. Pastikan sudah input target.', 'warning');
        resetBtn(btn); return;
    }

    // 2. Ambil semua logbook & bukti secara paralel
    const ids = kegiatan.map(k => k.id);

    const [{ data: logbooks }, { data: buktis }] = await Promise.all([
        supabase.from('progres_harian').select('*').in('kegiatan_id', ids).order('tanggal', { ascending: true }),
        supabase.from('bukti_dukung').select('*').in('kegiatan_id', ids).order('created_at', { ascending: true })
    ]);

    // 3. Kelompokkan per kegiatan
    const grouped = kegiatan.map(k => ({
        ...k,
        logbook: (logbooks || []).filter(l => l.kegiatan_id === k.id),
        bukti:   (buktis   || []).filter(b => b.kegiatan_id === k.id)
    }));

    // 4. Simpan ke DB dan buat token
    const token = generateToken(24);
    const twObj = _triwulanForReport.find(t => t.id === triwulanId);
    const judul = `Laporan ${namaKpi} — ${twObj ? twObj.nama + ' ' + twObj.tahun : ''}`;

    const { error: lErr } = await supabase.from('laporan_kpi').upsert({
        share_token: token,
        nama_kpi:    namaKpi,
        triwulan_id: triwulanId,
        judul
    }, { onConflict: 'share_token' });

    if (lErr) { showToast('Gagal simpan token laporan: ' + lErr.message, 'error'); resetBtn(btn); return; }

    // 5. Tampilkan share link
    const baseUrl  = window.location.href.split('/').slice(0,-1).join('/');
    const shareUrl = `${baseUrl}/view.html?laporan=${token}`;

    const sharePanelHtml = `
        <div style="padding:16px; background:var(--success-bg); border:1px solid var(--success); border-radius:10px; margin-top:16px;">
            <div style="font-weight:700; color:#065f46; margin-bottom:10px;">✓ Laporan berhasil dibuat!</div>
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${judul}</div>
            <div style="display:flex; gap:8px;">
                <input type="text" value="${shareUrl}" readonly style="flex:1; font-size:12px; padding:8px;" onclick="this.select()">
                <button class="btn btn-success btn-sm" onclick="copyToClipboard('${shareUrl}')">Salin Link</button>
                <a href="${shareUrl}" target="_blank" class="btn btn-primary btn-sm">Buka ↗</a>
            </div>
        </div>`;

    const infoEl = document.getElementById('report-share-info');
    if (infoEl) infoEl.innerHTML = sharePanelHtml;

    showToast('Laporan berhasil dibuat!', 'success');
    await loadSavedReports();
    resetBtn(btn);
}

function resetBtn(btn) {
    if (btn) { btn.disabled = false; btn.textContent = '🖨 Generate & Buat Link'; }
}

// ── DAFTAR LAPORAN TERSIMPAN ──
async function loadSavedReports() {
    const container = document.getElementById('saved-reports');
    if (!container) return;

    const { data, error } = await supabase
        .from('laporan_kpi')
        .select('*, triwulan(nama, tahun)')
        .order('created_at', { ascending: false });

    if (error || !data || !data.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><p>Belum ada laporan yang dibuat.</p></div>`;
        return;
    }

    _savedReports = data;

    const baseUrl = window.location.href.split('/').slice(0,-1).join('/');
    container.innerHTML = data.map(r => {
        const url = `${baseUrl}/view.html?laporan=${r.share_token}`;
        return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; border:1px solid var(--border); border-radius:10px; margin-bottom:10px; background:#fff;">
            <div>
                <div style="font-weight:700; font-size:13px; color:var(--text);">${r.judul || r.nama_kpi}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${r.triwulan ? r.triwulan.nama + ' ' + r.triwulan.tahun : ''} · Dibuat ${formatTgl(r.created_at)}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary btn-xs" onclick="copyToClipboard('${url}')">Salin</button>
                <a href="${url}" target="_blank" class="btn btn-primary btn-xs">Buka ↗</a>
                <button class="btn btn-danger btn-xs" onclick="hapusLaporan('${r.id}')">×</button>
            </div>
        </div>`;
    }).join('');
}

// ── HAPUS LAPORAN ──
async function hapusLaporan(id) {
    const ok = await confirmDialog('Hapus laporan ini? Link share akan tidak aktif.');
    if (!ok) return;
    const { error } = await supabase.from('laporan_kpi').delete().eq('id', id);
    if (error) { showToast('Gagal hapus', 'error'); return; }
    showToast('Laporan dihapus', 'success');
    loadSavedReports();
}

// ── COPY TO CLIPBOARD ──
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Link disalin ke clipboard!', 'success');
    }).catch(() => {
        const tmp = document.createElement('textarea');
        tmp.value = text; document.body.appendChild(tmp);
        tmp.select(); document.execCommand('copy');
        document.body.removeChild(tmp);
        showToast('Link disalin!', 'success');
    });
}
