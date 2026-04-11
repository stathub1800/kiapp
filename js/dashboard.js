// ============================================================
// dashboard.js — Tab 1: Dashboard Utama
// ============================================================

let _calInstance = null;
let _allKegiatan = [];

// ── ENTRY POINT ──
async function loadDashboard() {
    const { data, error } = await supabase
        .from('kegiatan')
        .select('*, triwulan(nama, periode)')
        .neq('status', 'Batal')
        .order('waktu_selesai', { ascending: true });

    if (error) { showToast('Gagal memuat data: ' + error.message, 'error'); return; }
    _allKegiatan = data || [];

    renderKPISummary(_allKegiatan);
    renderTodoDashboard(_allKegiatan);
    renderKanban(_allKegiatan);
    renderKalender(_allKegiatan);
}

// ── KPI SUMMARY CARDS ──
function renderKPISummary(data) {
    const el = document.getElementById('dash-kpi-summary');
    if (!el) return;

    const total   = data.length;
    const selesai = data.filter(k => k.status === 'Selesai').length;
    const aktif   = data.filter(k => k.status !== 'Selesai').length;
    const persen  = total > 0 ? Math.round((selesai / total) * 100) : 0;

    const jenis = ['KPI Utama', 'Tugas Rutin', 'Tambahan', 'Inovasi'];

    let detailHtml = jenis.map(j => {
        const grup = data.filter(k => k.jenis_pekerjaan === j);
        if (!grup.length) return '';
        const p = Math.round((grup.filter(k => k.status === 'Selesai').length / grup.length) * 100);
        return `
            <div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; color:var(--text-muted);">
                    <span>${j}</span>
                    <span style="font-weight:700; color:var(--text);">${p}%</span>
                </div>
                ${progressBar(p)}
            </div>`;
    }).join('');

    el.innerHTML = `
        <div style="background:linear-gradient(135deg, #1e2d5e 0%, #1e3a8a 100%); border-radius:var(--radius); padding:20px; color:#fff; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div>
                    <div style="font-size:13px; opacity:.75; margin-bottom:4px;">Capaian Kinerja</div>
                    <div style="font-size:40px; font-weight:700; font-family:'Fraunces',serif; line-height:1;">${persen}%</div>
                    <div style="font-size:11px; opacity:.7; margin-top:4px;">${selesai} dari ${total} target selesai</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:24px; font-weight:700;">${aktif}</div>
                    <div style="font-size:11px; opacity:.7;">Sedang berjalan</div>
                </div>
            </div>
            <div style="background:rgba(255,255,255,.2); height:6px; border-radius:99px; overflow:hidden;">
                <div style="background:#fff; width:${persen}%; height:100%; border-radius:99px; transition:width .8s;"></div>
            </div>
        </div>
        ${detailHtml}
    `;
}

// ── TO-DO LIST DASHBOARD ──
function renderTodoDashboard(data) {
    const el = document.getElementById('dash-todo');
    if (!el) return;

    const aktif = data.filter(k => k.status !== 'Selesai');

    if (!aktif.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">🚀</div><p>Semua tugas telah selesai!</p></div>`;
        return;
    }

    const items = aktif.slice(0, 8);
    let html = items.map(k => {
        const dl = deadlineLabel(k.waktu_selesai);
        return `
        <div class="todo-item">
            <div style="flex:1; min-width:0;">
                <div class="todo-name">${k.nama_kegiatan}</div>
                <div class="todo-meta">${k.rencana_kerja_kipapp || '-'} &bull; ${renderBadge(k.status)}</div>
            </div>
            <div style="text-align:right; flex-shrink:0;">
                <div class="${dl.cls}" style="font-size:11px;">${dl.label}</div>
                <button class="btn btn-primary btn-xs" style="margin-top:5px;" onclick="bukaWorkspaceKegiatan('${k.id}')">Workspace →</button>
            </div>
        </div>`;
    }).join('');

    if (aktif.length > 8) {
        html += `<div style="text-align:center; padding:10px; font-size:12px; color:var(--text-muted);">+ ${aktif.length - 8} kegiatan lainnya di tab Realisasi</div>`;
    }

    el.innerHTML = html;
}

// ── KANBAN ──
function renderKanban(data) {
    const el = document.getElementById('dash-kanban');
    if (!el) return;

    const statuses = [
        { key: 'Persiapan',             color: '#64748b' },
        { key: 'Pelaksanaan',           color: '#3b82f6' },
        { key: 'Pelaporan',             color: '#f59e0b' },
        { key: 'Monitoring dan Evaluasi', color: '#8b5cf6' },
        { key: 'Selesai',               color: '#10b981' },
    ];

    el.innerHTML = statuses.map(s => {
        const items = data.filter(k => k.status === s.key);
        const cards = items.slice(0, 4).map(k => {
            const dl = deadlineLabel(k.waktu_selesai);
            return `
            <div class="kanban-card" onclick="bukaWorkspaceKegiatan('${k.id}')" style="border-left-color:${s.color}">
                <div class="kanban-card-name">${k.nama_kegiatan}</div>
                <div class="kanban-card-meta ${dl.cls}">${dl.label}</div>
            </div>`;
        }).join('');

        const more = items.length > 4
            ? `<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:4px;">+${items.length - 4} lainnya</div>`
            : '';

        return `
        <div class="kanban-col">
            <div class="kanban-col-header">
                <span class="kanban-col-title">${s.key.split(' ')[0]}</span>
                <span class="kanban-count" style="background:${s.color}">${items.length}</span>
            </div>
            ${cards}${more}
            ${!items.length ? '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:10px;">Kosong</div>' : ''}
        </div>`;
    }).join('');
}

// ── KALENDER ──
function renderKalender(data) {
    const el = document.getElementById('dash-calendar');
    if (!el) return;

    const events = data.map(k => ({
        title: k.nama_kegiatan,
        start: k.waktu_selesai,
        color: {
            'Persiapan': '#94a3b8',
            'Pelaksanaan': '#3b82f6',
            'Pelaporan': '#f59e0b',
            'Monitoring dan Evaluasi': '#8b5cf6',
            'Selesai': '#10b981',
        }[k.status] || '#94a3b8',
        extendedProps: { id: k.id }
    }));

    if (_calInstance) {
        _calInstance.setOption('events', events);
        return;
    }

    _calInstance = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        height: 380,
        locale: 'id',
        headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
        buttonText: { today: 'Hari Ini' },
        events,
        eventClick: (info) => {
            const id = info.event.extendedProps.id;
            bukaWorkspaceKegiatan(id);
        },
        eventDidMount: (info) => {
            info.el.title = info.event.title;
        }
    });
    _calInstance.render();
}

// ── NAVIGASI KE WORKSPACE ──
function bukaWorkspaceKegiatan(id) {
    // Switch ke tab realisasi dan pilih kegiatan
    const tabBtn = document.querySelector('[data-tab="tab-realisasi"]');
    if (tabBtn) tabBtn.click();
    // Set dropdown value setelah tab terbuka
    setTimeout(() => {
        const ddl = document.getElementById('pilih-realisasi');
        if (ddl) {
            ddl.value = id;
            ddl.dispatchEvent(new Event('change'));
        }
    }, 100);
}
