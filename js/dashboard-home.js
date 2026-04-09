async function loadBeranda() {
    const el = {
        tanggal:      document.getElementById('beranda-tanggal'),
        sapaan:       document.getElementById('beranda-sapaan'),
        todoList:     document.getElementById('priority-todo-list'),
        kpiRingkas:   document.getElementById('beranda-kpi-ringkas'),
        kpiDetail:    document.getElementById('beranda-kpi-detail'),
        quickForm:    document.getElementById('quickInputForm')
    };

    // 1. WAKTU & SAPAAN
    const sekarang = new Date();
    const jam = sekarang.getHours();
    const sapaan = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
    if(el.tanggal) el.tanggal.innerText = sekarang.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    if(el.sapaan) el.sapaan.innerText = sapaan;

    // 2. LOAD DROPDOWN UNTUK QUICK INPUT (Penting untuk Sinkronisasi!)
    const ddlTriwulan = document.getElementById('q-triwulan');
    const ddlKpi = document.getElementById('q-kpi');
    
    if (ddlTriwulan && ddlTriwulan.options.length <= 1) {
        const { data: triData } = await supabase.from('triwulan').select('*').order('periode', { ascending: true });
        ddlTriwulan.innerHTML = '<option value="">-- Pilih Wadah Triwulan --</option>';
        triData?.forEach(t => ddlTriwulan.innerHTML += `<option value="${t.id}">${t.nama} (${t.tahun})</option>`);
    }

    if (ddlKpi && ddlKpi.options.length <= 1) {
        const { data: kpiData } = await supabase.from('rencana_kerja_kipapp').select('*').order('kode');
        ddlKpi.innerHTML = '<option value="">-- Pilih Rencana Kinerja --</option>';
        kpiData?.forEach(k => ddlKpi.innerHTML += `<option value="${k.nama}">${k.nama}</option>`);
    }

    // 3. LOAD DATA KEGIATAN & SORTIR DEADLINE
    const { data: kegiatans, error } = await supabase.from('kegiatan').select('*').order('waktu_selesai', { ascending: true });
    if (error) return;

    renderTodoList(kegiatans, el.todoList);
    renderKPISummary(kegiatans, el.kpiRingkas, el.kpiDetail);

    // 4. LOGIKA SIMPAN QUICK INPUT
    if(el.quickForm) {
        el.quickForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true; btn.innerText = 'Menyimpan...';

            const payload = {
                nama_kegiatan: document.getElementById('q-nama').value,
                triwulan_id: document.getElementById('q-triwulan').value,
                rencana_kerja_kipapp: document.getElementById('q-kpi').value,
                jumlah_target: parseInt(document.getElementById('q-jumlah').value),
                satuan_target: document.getElementById('q-satuan').value || 'Dokumen',
                waktu_selesai: document.getElementById('q-deadline').value,
                status: 'Persiapan',
                jenis_pekerjaan: 'KPI Utama',
                waktu_pelaksanaan: sekarang.toISOString().split('T')[0]
            };

            const { error: insErr } = await supabase.from('kegiatan').insert([payload]);
            if(insErr) {
                alert("Gagal menyimpan: " + insErr.message);
            } else { 
                el.quickForm.reset(); 
                loadBeranda(); // Refresh data otomatis
            }
            btn.disabled = false; btn.innerText = '+ Tambah ke To-Do List';
        };
    }
}

function renderTodoList(data, container) {
    if(!container) return;
    const aktif = data.filter(k => k.status !== 'Selesai');
    
    if(aktif.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">Semua rencana sudah tuntas! 🚀</div>';
        return;
    }

    let html = '';
    const hariIni = new Date(); hariIni.setHours(0,0,0,0);

    aktif.forEach(k => {
        const tgl = new Date(k.waktu_selesai); tgl.setHours(0,0,0,0);
        const selisih = Math.round((tgl - hariIni) / (1000*60*60*24));
        
        let warnaDeadline = selisih < 0 ? '#ef4444' : selisih <= 3 ? '#f59e0b' : '#3b82f6';
        let labelWaktu = selisih < 0 ? `Terlewat ${Math.abs(selisih)} hari` : selisih === 0 ? 'HARI INI' : `${selisih} hari lagi`;

        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f1f5f9;">
                <div style="min-width:0; flex:1;">
                    <div style="font-weight:600; color:#1e293b; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${k.nama_kegiatan}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:2px;">Target: ${k.jumlah_target} ${k.satuan_target} · Wadah: ${k.triwulan_id ? 'Terkoneksi' : 'Kosong'}</div>
                </div>
                <div style="text-align:right; margin-left:15px; flex-shrink:0;">
                    <div style="font-size:11px; font-weight:700; color:${warnaDeadline}; text-transform:uppercase;">${labelWaktu}</div>
                    <a href="kegiatan.html?id=${k.id}" class="btn-primary" style="font-size:11px; padding:5px 10px; display:inline-block; margin-top:5px; background:var(--primary); text-decoration:none;">Workspace &rarr;</a>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderKPISummary(data, ringkasEl, detailEl) {
    const total = data.length;
    const selesai = data.filter(k => k.status === 'Selesai').length;
    const persen = total > 0 ? Math.round((selesai / total) * 100) : 0;

    if(ringkasEl) {
        ringkasEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:600;">Progress KPI</span>
                <span style="font-size:24px; font-weight:700;">${persen}%</span>
            </div>
            <div style="background:rgba(255,255,255,0.2); height:8px; border-radius:10px; overflow:hidden;">
                <div style="background:white; width:${persen}%; height:100%;"></div>
            </div>
            <div style="font-size:11px; margin-top:8px; opacity:0.8;">${selesai} dari ${total} tugas telah diarsip sebagai Selesai.</div>
        `;
    }

    if(detailEl) {
        const jenis = ['KPI Utama', 'Tugas Rutin', 'Tugas Tambahan', 'Inovasi'];
        detailEl.innerHTML = jenis.map(j => {
            const grup = data.filter(k => k.jenis_pekerjaan === j);
            if(grup.length === 0) return '';
            const p = Math.round((grup.filter(k => k.status === 'Selesai').length / grup.length) * 100);
            return `
                <div style="margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px;">
                        <span>${j}</span><span>${p}%</span>
                    </div>
                    <div style="background:#f1f5f9; height:5px; border-radius:10px;">
                        <div style="background:#3b82f6; width:${p}%; height:100%;"></div>
                    </div>
                </div>`;
        }).join('');
    }
}

document.addEventListener('DOMContentLoaded', loadBeranda);