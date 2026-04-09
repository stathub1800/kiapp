// ============================================================
// DASHBOARD BERANDA — "Asisten Pagi" 
// File: js/dashboard-home.js
// Dipanggil dari dashboard.html, tab ke-0 (Beranda)
// ============================================================

async function loadBeranda() {
    const el = {
        tanggal:       document.getElementById('beranda-tanggal'),
        sapaan:        document.getElementById('beranda-sapaan'),
        deadlineList:  document.getElementById('beranda-deadline'),
        tanpaBukti:    document.getElementById('beranda-tanpa-bukti'),
        kpiRingkasan:  document.getElementById('beranda-kpi'),
        triwulanAktif: document.getElementById('beranda-triwulan'),
    };

    // ── Tanggal & Sapaan ──────────────────────────────────────
    const sekarang = new Date();
    const jam = sekarang.getHours();
    const sapaan = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
    const opsiTanggal = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    
    if (el.tanggal) el.tanggal.innerText = sekarang.toLocaleDateString('id-ID', opsiTanggal);
    if (el.sapaan)  el.sapaan.innerText  = sapaan;

    // ── Ambil semua data kegiatan sekaligus ───────────────────
    const { data: semuaKegiatan, error } = await supabase
        .from('kegiatan')
        .select('id, nama_kegiatan, status, jenis_pekerjaan, waktu_selesai, triwulan_id')
        .order('waktu_selesai', { ascending: true });

    if (error || !semuaKegiatan) return;

    const hariIni     = new Date(); hariIni.setHours(0,0,0,0);
    const tigaHariLagi = new Date(hariIni); tigaHariLagi.setDate(hariIni.getDate() + 3);

    // ── 1. ALERT: Deadline ≤ 3 hari & belum Selesai ───────────
    const mauDeadline = semuaKegiatan.filter(k => {
        if (k.status === 'Selesai') return false;
        if (!k.waktu_selesai) return false;
        const tgl = new Date(k.waktu_selesai); tgl.setHours(0,0,0,0);
        return tgl <= tigaHariLagi;
    });

    if (el.deadlineList) {
        if (mauDeadline.length === 0) {
            el.deadlineList.innerHTML = `
                <div style="padding:12px 16px; background:#f0fdf4; border:1px solid #bbf7d0;
                            border-radius:8px; color:#166534; font-size:13px;">
                    ✓ Tidak ada kegiatan yang mendekati deadline. Aman!
                </div>`;
        } else {
            let html = '';
            mauDeadline.forEach(k => {
                const tgl    = new Date(k.waktu_selesai); tgl.setHours(0,0,0,0);
                const selisih = Math.round((tgl - hariIni) / (1000*60*60*24));
                const labelWaktu = selisih < 0
                    ? `<span style="color:#dc2626; font-weight:700;">TERLAMBAT ${Math.abs(selisih)} hari</span>`
                    : selisih === 0
                        ? `<span style="color:#dc2626; font-weight:700;">HARI INI</span>`
                        : `<span style="color:#d97706; font-weight:700;">${selisih} hari lagi</span>`;

                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center;
                                padding:10px 14px; background:#fff; border:1px solid #fca5a5;
                                border-left:4px solid #ef4444; border-radius:6px; margin-bottom:8px;">
                        <div>
                            <div style="font-size:13px; font-weight:600; color:#1e293b;">
                                ${k.nama_kegiatan}
                            </div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">
                                ${k.status} · Deadline: ${tgl.toLocaleDateString('id-ID')}
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                            ${labelWaktu}
                            <a href="kegiatan.html?id=${k.id}"
                               style="font-size:11px; color:#3b82f6; text-decoration:none; font-weight:600;">
                                Buka →
                            </a>
                        </div>
                    </div>`;
            });
            el.deadlineList.innerHTML = html;
        }
    }

    // ── 2. ALERT: Kegiatan tanpa bukti dukung ────────────────
    if (el.tanpaBukti) {
        // Ambil semua kegiatan_id yang sudah punya bukti dukung
        const { data: semuaBukti } = await supabase
            .from('bukti_dukung')
            .select('kegiatan_id');

        const idDenganBukti = new Set((semuaBukti || []).map(b => b.kegiatan_id));

        // Filter: belum Selesai, belum punya bukti, sudah lewat tanggal mulai
        const tanpaBuktiList = semuaKegiatan.filter(k =>
            k.status !== 'Selesai' &&
            !idDenganBukti.has(k.id)
        );

        if (tanpaBuktiList.length === 0) {
            el.tanpaBukti.innerHTML = `
                <div style="padding:12px 16px; background:#f0fdf4; border:1px solid #bbf7d0;
                            border-radius:8px; color:#166534; font-size:13px;">
                    ✓ Semua kegiatan aktif sudah memiliki bukti dukung.
                </div>`;
        } else {
            let html = `
                <div style="padding:8px 14px; background:#fefce8; border:1px solid #fde68a;
                            border-radius:6px; margin-bottom:10px; font-size:12px; color:#92400e;">
                    ⚠️ ${tanpaBuktiList.length} kegiatan belum ada lampiran bukti dukung
                </div>`;
            tanpaBuktiList.slice(0, 5).forEach(k => {
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center;
                                padding:9px 14px; background:#fff; border:1px solid #fde68a;
                                border-left:4px solid #f59e0b; border-radius:6px; margin-bottom:6px;">
                        <div style="font-size:13px; color:#1e293b;">${k.nama_kegiatan}</div>
                        <a href="kegiatan.html?id=${k.id}"
                           style="font-size:11px; color:#3b82f6; text-decoration:none; font-weight:600; flex-shrink:0;">
                            + Lampirkan →
                        </a>
                    </div>`;
            });
            if (tanpaBuktiList.length > 5) {
                html += `<div style="font-size:12px; color:#64748b; text-align:center; padding:4px;">
                    ...dan ${tanpaBuktiList.length - 5} kegiatan lainnya
                </div>`;
            }
            el.tanpaBukti.innerHTML = html;
        }
    }

    // ── 3. PROGRESS KPI (semua kegiatan, lintas triwulan) ─────
    if (el.kpiRingkasan) {
        const total   = semuaKegiatan.length;
        const selesai = semuaKegiatan.filter(k => k.status === 'Selesai').length;
        const persen  = total > 0 ? Math.round((selesai / total) * 100) : 0;

        // Hitung per jenis pekerjaan
        const jenisList = ['KPI Utama', 'Tugas Rutin', 'Tugas Tambahan', 'Inovasi'];
        const warnaJenis = {
            'KPI Utama':     { bg:'#fee2e2', text:'#991b1b', bar:'#ef4444' },
            'Tugas Rutin':   { bg:'#e0e7ff', text:'#3730a3', bar:'#6366f1' },
            'Tugas Tambahan':{ bg:'#fef9c3', text:'#854d0e', bar:'#f59e0b' },
            'Inovasi':       { bg:'#dcfce7', text:'#166534', bar:'#10b981' },
        };

        let htmlJenis = '';
        jenisList.forEach(jenis => {
            const grup     = semuaKegiatan.filter(k => k.jenis_pekerjaan === jenis);
            if (grup.length === 0) return;
            const slsJenis = grup.filter(k => k.status === 'Selesai').length;
            const pJenis   = Math.round((slsJenis / grup.length) * 100);
            const w        = warnaJenis[jenis] || { bg:'#f1f5f9', text:'#475569', bar:'#94a3b8' };

            htmlJenis += `
                <div style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-size:12px; font-weight:600; 
                                     background:${w.bg}; color:${w.text};
                                     padding:2px 8px; border-radius:4px;">
                            ${jenis}
                        </span>
                        <span style="font-size:12px; color:#64748b;">
                            ${slsJenis}/${grup.length} selesai
                        </span>
                    </div>
                    <div style="background:#e2e8f0; border-radius:4px; height:8px; overflow:hidden;">
                        <div style="background:${w.bar}; width:${pJenis}%; height:100%;
                                    border-radius:4px; transition:width 0.5s;"></div>
                    </div>
                </div>`;
        });

        const warnaTotal = persen >= 80 ? '#10b981' : persen >= 50 ? '#f59e0b' : '#ef4444';

        el.kpiRingkasan.innerHTML = `
            <div style="margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
                    <span style="font-size:13px; font-weight:600; color:#1e293b;">Total Semua Kegiatan</span>
                    <span style="font-size:22px; font-weight:700; color:${warnaTotal};">${persen}%</span>
                </div>
                <div style="background:#e2e8f0; border-radius:6px; height:12px; overflow:hidden;">
                    <div style="background:${warnaTotal}; width:${persen}%; height:100%;
                                border-radius:6px; transition:width 0.6s;"></div>
                </div>
                <div style="font-size:12px; color:#64748b; margin-top:4px;">
                    ${selesai} dari ${total} kegiatan selesai
                </div>
            </div>
            <div style="border-top:1px solid #e2e8f0; padding-top:16px;">
                ${htmlJenis}
            </div>`;
    }

    // ── 4. SHORTCUT: Triwulan/Proyek Aktif ───────────────────
    if (el.triwulanAktif) {
        const tahunIni = new Date().getFullYear();
        const { data: triwulanData } = await supabase
            .from('triwulan')
            .select('*')
            .eq('tahun', tahunIni)
            .order('periode', { ascending: true });

        if (!triwulanData || triwulanData.length === 0) {
            el.triwulanAktif.innerHTML = `
                <p style="color:#64748b; font-size:13px;">
                    Belum ada proyek untuk tahun ${tahunIni}.
                    <a href="#" onclick="openTab('tab-arsitektur', document.querySelectorAll('.tab-btn')[1]); return false;"
                       style="color:#3b82f6;">Buat sekarang →</a>
                </p>`;
        } else {
            let html = '';
            triwulanData.forEach(t => {
                const jmlKegiatan = semuaKegiatan.filter(k => k.triwulan_id === t.id).length;
                const jmlSelesai  = semuaKegiatan.filter(k => k.triwulan_id === t.id && k.status === 'Selesai').length;

                html += `
                    <a href="triwulan.html?id=${t.id}"
                       style="display:flex; justify-content:space-between; align-items:center;
                              padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0;
                              border-radius:8px; text-decoration:none; margin-bottom:8px;
                              transition:border-color 0.2s;"
                       onmouseover="this.style.borderColor='#3b82f6'"
                       onmouseout="this.style.borderColor='#e2e8f0'">
                        <div>
                            <div style="font-size:14px; font-weight:600; color:#1e3a8a;">${t.nama}</div>
                            <div style="font-size:12px; color:#64748b; margin-top:2px;">
                                Tahun ${t.tahun} · ${jmlKegiatan} kegiatan · ${jmlSelesai} selesai
                            </div>
                        </div>
                        <span style="color:#3b82f6; font-size:18px;">→</span>
                    </a>`;
            });
            el.triwulanAktif.innerHTML = html;
        }
    }
}

// Jalankan saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadBeranda();
});
