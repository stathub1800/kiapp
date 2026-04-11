// ============================================================
// report.js — Tab 4: Generate Laporan Terpadu
// ============================================================

let _triwulanForReport = [];
let _kpiForReport      = [];

// ── ENTRY POINT (dipanggil setiap kali tab dibuka) ──
async function loadReportTab() {
    await loadReportDropdowns();
    await loadSavedReports();
}

// ── LOAD DROPDOWN (selalu fresh) ──
async function loadReportDropdowns() {
    const [{ data: tri, error: e1 }, { data: kpi, error: e2 }] = await Promise.all([
        supabase.from('triwulan').select('*').order('tahun').order('periode'),
        supabase.from('rencana_kerja_kipapp').select('*').order('kode')
    ]);

    if (e1) console.error('[report] triwulan error:', e1.message);
    if (e2) console.error('[report] kpi error:', e2.message);

    _triwulanForReport = tri || [];
    _kpiForReport      = kpi || [];

    const ddlKpi = document.getElementById('r-kpi');
    if (ddlKpi) {
        ddlKpi.innerHTML = '<option value="">-- Pilih Rencana Kinerja --</option>'
            + _kpiForReport.map(k =>
                `<option value="${escAttr(k.nama)}">${k.kode ? k.kode + '. ' : ''}${k.nama}</option>`
              ).join('');
    }

    const ddlTri = document.getElementById('r-triwulan');
    if (ddlTri) {
        // Tambahkan opsi "Semua Triwulan" agar laporan bisa lintas triwulan
        ddlTri.innerHTML = '<option value="">-- Pilih Triwulan --</option>'
            + '<option value="ALL">📋 Semua Triwulan (Tahunan)</option>'
            + _triwulanForReport.map(t =>
                `<option value="${t.id}">${t.nama} ${t.tahun}</option>`
              ).join('');
    }
}

// ── HELPER: escape attribute ──
function escAttr(s) {
    return (s||'').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── GENERATE LAPORAN ──
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-generate-report');
    if (btn) btn.addEventListener('click', generateLaporan);
});

async function generateLaporan() {
    const ddlKpi = document.getElementById('r-kpi');
    const ddlTri = document.getElementById('r-triwulan');
    const namaKpi    = ddlKpi?.value?.trim();
    const triwulanId = ddlTri?.value?.trim();

    // ── VALIDASI ──
    if (!namaKpi) {
        showToast('Pilih Rencana Kinerja terlebih dahulu', 'warning');
        return;
    }
    if (!triwulanId) {
        showToast('Pilih Triwulan terlebih dahulu', 'warning');
        return;
    }

    const btn = document.getElementById('btn-generate-report');
    const infoEl = document.getElementById('report-share-info');

    // Tampilkan progress
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Memproses...'; }
    if (infoEl) infoEl.innerHTML = renderProgress('Mengambil data kegiatan...');

    try {
        // ── STEP 1: Ambil kegiatan ──
        let query = supabase
            .from('kegiatan')
            .select('*')
            .eq('rencana_kerja_kipapp', namaKpi)
            .neq('status', 'Batal')
            .order('waktu_selesai', { ascending: true });

        // Filter triwulan (kecuali pilih "Semua")
        if (triwulanId !== 'ALL') {
            query = query.eq('triwulan_id', triwulanId);
        }

        const { data: kegiatan, error: kErr } = await query;

        if (kErr) {
            if (infoEl) infoEl.innerHTML = renderError('Gagal ambil data kegiatan', kErr.message);
            resetBtn(btn); return;
        }

        // ── JIKA TIDAK ADA KEGIATAN: tetap buat laporan kosong ──
        // (bukan stop — laporan kosong lebih berguna daripada error)
        if (!kegiatan || kegiatan.length === 0) {
            if (infoEl) infoEl.innerHTML = renderWarning(
                'Belum ada kegiatan untuk Rencana Kinerja ini.',
                'Laporan tetap dibuat tapi kosong. Tambahkan kegiatan di Tab Target & Realisasi terlebih dahulu, lalu generate ulang.'
            );
            // Tetap lanjut buat token laporan kosong
        }

        if (infoEl) infoEl.innerHTML = renderProgress('Mengambil logbook dan bukti dukung...');

        // ── STEP 2: Ambil logbook & bukti ──
        const ids = (kegiatan || []).map(k => k.id);
        let logbooks = [], buktis = [];

        if (ids.length > 0) {
            const [r1, r2] = await Promise.all([
                supabase.from('progres_harian').select('*').in('kegiatan_id', ids).order('tanggal', { ascending: true }),
                supabase.from('bukti_dukung').select('*').in('kegiatan_id', ids).order('created_at', { ascending: true })
            ]);
            logbooks = r1.data || [];
            buktis   = r2.data || [];
        }

        if (infoEl) infoEl.innerHTML = renderProgress('Menyimpan laporan ke database...');

        // ── STEP 3: Buat token & simpan ke laporan_kpi ──
        const token  = _buatToken(24);
        const twObj  = triwulanId === 'ALL'
            ? null
            : _triwulanForReport.find(t => t.id === triwulanId);
        const periodeLabel = twObj ? `${twObj.nama} ${twObj.tahun}` : 'Tahunan';
        const judul  = `${namaKpi} — ${periodeLabel}`;
        const twIdSave = (triwulanId === 'ALL') ? null : triwulanId;

        const { data: lapSaved, error: lErr } = await supabase
            .from('laporan_kpi')
            .insert({
                share_token: token,
                nama_kpi:    namaKpi,
                triwulan_id: twIdSave,
                judul:       judul
            })
            .select()
            .single();

        if (lErr) {
            if (infoEl) infoEl.innerHTML = renderError('Gagal menyimpan laporan ke database', lErr.message
                + '\n\nPastikan tabel laporan_kpi sudah ada. Jalankan SETUP_DATABASE.sql jika belum.');
            resetBtn(btn); return;
        }

        // ── STEP 4: Tampilkan link ──
        const baseUrl  = window.location.href.split('/dashboard.html')[0];
        const shareUrl = `${baseUrl}/view.html?laporan=${token}`;

        if (infoEl) infoEl.innerHTML = renderSuccess(shareUrl, judul, kegiatan?.length || 0, logbooks.length, buktis.length);

        showToast('Laporan berhasil dibuat!', 'success');
        await loadSavedReports();

    } catch (err) {
        console.error('[report] unexpected error:', err);
        if (infoEl) infoEl.innerHTML = renderError('Terjadi kesalahan tidak terduga', err.message);
    }

    resetBtn(btn);
}

// ── TOKEN GENERATOR (lokal, tidak bergantung ui.js) ──
function _buatToken(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function resetBtn(btn) {
    if (btn) { btn.disabled = false; btn.textContent = '🖨 Generate & Buat Link'; }
}

// ── RENDER HELPERS ──
function renderProgress(msg) {
    return `<div style="padding:14px 16px; background:#f8fafc; border:1px solid var(--border); border-radius:10px; margin-top:12px; display:flex; align-items:center; gap:10px;">
        <span style="font-size:16px;">⏳</span>
        <span style="font-size:13px; color:var(--text-muted);">${msg}</span>
    </div>`;
}

function renderError(judul, detail) {
    return `<div style="padding:16px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; margin-top:12px;">
        <div style="font-weight:700; color:#991b1b; margin-bottom:6px;">❌ ${judul}</div>
        <div style="font-size:12px; color:#7f1d1d; background:#fff; padding:10px; border-radius:6px; font-family:monospace; white-space:pre-wrap;">${detail}</div>
        <div style="font-size:12px; color:#64748b; margin-top:10px;">
            Coba langkah berikut:<br>
            1. Pastikan sudah jalankan <strong>SETUP_DATABASE.sql</strong> terbaru<br>
            2. Pastikan sudah jalankan <strong>FIX_RLS.sql</strong><br>
            3. Cek koneksi Supabase di js/config.js
        </div>
    </div>`;
}

function renderWarning(judul, detail) {
    return `<div style="padding:16px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; margin-top:12px;">
        <div style="font-weight:700; color:#92400e; margin-bottom:6px;">⚠ ${judul}</div>
        <div style="font-size:12px; color:#78350f;">${detail}</div>
    </div>`;
}

function renderSuccess(shareUrl, judul, jmlKegiatan, jmlLog, jmlBukti) {
    return `<div style="padding:16px; background:#f0fdf4; border:1px solid #86efac; border-radius:10px; margin-top:12px;">
        <div style="font-weight:700; color:#166534; margin-bottom:8px;">✓ Laporan berhasil dibuat!</div>
        <div style="font-size:12px; color:#15803d; margin-bottom:4px;">${judul}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">
            ${jmlKegiatan} kegiatan · ${jmlLog} catatan logbook · ${jmlBukti} bukti dukung
        </div>
        <div style="display:flex; gap:8px;">
            <input type="text" value="${shareUrl}" readonly
                style="flex:1; font-size:12px; padding:8px; background:#fff; border:1px solid #86efac; border-radius:6px; outline:none;"
                onclick="this.select()">
            <button class="btn btn-success btn-sm" onclick="copyToClipboard('${shareUrl}')">📋 Salin</button>
            <a href="${shareUrl}" target="_blank" class="btn btn-primary btn-sm">Buka ↗</a>
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:8px;">
            Link ini bisa dibagikan ke pimpinan. Bisa dibuka tanpa login.
        </div>
    </div>`;
}

// ── DAFTAR LAPORAN TERSIMPAN ──
async function loadSavedReports() {
    const container = document.getElementById('saved-reports');
    if (!container) return;

    const { data, error } = await supabase
        .from('laporan_kpi')
        .select('*, triwulan(nama, tahun)')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div style="font-size:12px; color:var(--danger); padding:10px;">
            Gagal memuat: ${error.message}</div>`;
        return;
    }

    if (!data || !data.length) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">📄</div>
            <p>Belum ada laporan yang dibuat.<br>
            <span style="font-size:11px;">Pilih KPI & Triwulan lalu klik Generate.</span></p>
        </div>`;
        return;
    }

    const baseUrl = window.location.href.split('/dashboard.html')[0];
    container.innerHTML = data.map(r => {
        const url      = `${baseUrl}/view.html?laporan=${r.share_token}`;
        const periode  = r.triwulan ? `${r.triwulan.nama} ${r.triwulan.tahun}` : 'Tahunan';
        const tglBuat  = r.created_at
            ? new Date(r.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
            : '-';
        return `
        <div style="display:flex; align-items:center; justify-content:space-between;
                    padding:14px; border:1px solid var(--border); border-radius:10px;
                    margin-bottom:10px; background:#fff; gap:10px;">
            <div style="min-width:0; flex:1;">
                <div style="font-weight:700; font-size:13px; color:var(--text);
                            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
                     title="${escAttr(r.judul || r.nama_kpi)}">
                    ${r.judul || r.nama_kpi}
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">
                    ${periode} · Dibuat ${tglBuat}
                </div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <button class="btn btn-secondary btn-xs" onclick="copyToClipboard('${url}')">Salin</button>
                <a href="${url}" target="_blank" class="btn btn-primary btn-xs">Buka ↗</a>
                <button class="btn btn-danger btn-xs" onclick="hapusLaporan('${r.id}')">×</button>
            </div>
        </div>`;
    }).join('');
}

// ── HAPUS LAPORAN ──
async function hapusLaporan(id) {
    const ok = await confirmDialog('Hapus laporan ini? Link share akan tidak aktif lagi.');
    if (!ok) return;
    const { error } = await supabase.from('laporan_kpi').delete().eq('id', id);
    if (error) { showToast('Gagal hapus: ' + error.message, 'error'); return; }
    showToast('Laporan dihapus', 'success');
    await loadSavedReports();
}

// ── COPY TO CLIPBOARD ──
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Link disalin ke clipboard!', 'success'))
        .catch(() => {
            const tmp = document.createElement('textarea');
            tmp.value = text;
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            document.body.removeChild(tmp);
            showToast('Link disalin!', 'success');
        });
}