// ============================================================
// ui.js — Komponen UI yang Dipakai di Semua Halaman
// ============================================================

// ── TOAST NOTIFICATION ──
(function initToast() {
    if (document.getElementById('toast-container')) return;
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
})();

function showToast(msg, type = 'default', duration = 4000) {
    const icons = { success: '✓', error: '✕', warning: '⚠', default: 'ℹ' };
    const tc   = document.getElementById('toast-container');
    const el   = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.default}</span><span>${msg}</span>`;
    tc.appendChild(el);
    setTimeout(() => el.remove(), duration);
}

// ── MODAL ──
(function initModal() {
    if (document.getElementById('modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-box">
        <div class="modal-header">
            <h3 class="modal-title" id="modal-title"></h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
})();

function openModal(title, bodyHtml, maxWidth) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML    = bodyHtml;
    const box = document.querySelector('.modal-box');
    if (maxWidth) box.style.maxWidth = maxWidth;
    else box.style.maxWidth = '560px';
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
}

// ── BADGE STATUS ──
function renderBadge(status) {
    const map = {
        'Persiapan':              'badge-persiapan',
        'Pelaksanaan':            'badge-pelaksanaan',
        'Pelaporan':              'badge-pelaporan',
        'Monitoring dan Evaluasi':'badge-monev',
        'Selesai':                'badge-selesai',
        'Batal':                  'badge-batal',
    };
    const cls = map[status] || 'badge-persiapan';
    return `<span class="badge ${cls}">${status}</span>`;
}

// ── CONFIRM DIALOG ──
function confirmDialog(msg) {
    return new Promise(resolve => {
        openModal('Konfirmasi', `
            <p style="font-size:14px; color:var(--text); margin:0 0 20px;">${msg}</p>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="btn btn-secondary" onclick="closeModal(); window._confirmResolve(false)">Batal</button>
                <button class="btn btn-danger"    onclick="closeModal(); window._confirmResolve(true)">Hapus</button>
            </div>`, '420px');
        window._confirmResolve = resolve;
    });
}

// ── SKELETON LOADER ──
function skeletonRows(n = 3, cols = 4) {
    let html = '';
    for (let i = 0; i < n; i++) {
        html += '<tr>';
        for (let j = 0; j < cols; j++) {
            html += `<td><div class="skeleton" style="height:14px; border-radius:4px; width:${60+Math.random()*30}%;"></div></td>`;
        }
        html += '</tr>';
    }
    return html;
}

// ── FORMAT TANGGAL ──
function formatTgl(dateStr, opts) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', opts || { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTglLong(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── DEADLINE LABEL ──
function deadlineLabel(dateStr) {
    if (!dateStr) return { label: '-', cls: '' };
    const tgl = new Date(dateStr); tgl.setHours(0,0,0,0);
    const hari = new Date(); hari.setHours(0,0,0,0);
    const diff = Math.round((tgl - hari) / 86400000);
    if (diff < 0)  return { label: `Terlewat ${Math.abs(diff)} hari`, cls: 'deadline-red' };
    if (diff === 0) return { label: 'HARI INI!', cls: 'deadline-orange' };
    if (diff <= 3)  return { label: `${diff} hari lagi`, cls: 'deadline-yellow' };
    return { label: `${diff} hari lagi`, cls: 'deadline-blue' };
}

// ── PROGRESS BAR ──
function progressBar(persen) {
    const cls = persen < 30 ? 'low' : persen < 60 ? 'mid' : persen < 100 ? 'high' : 'full';
    return `<div class="progress-bar"><div class="progress-fill ${cls}" style="width:${persen}%"></div></div>`;
}

// ── GENERATE TOKEN ──
function generateToken(len = 20) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── AUTO TRIWULAN DARI TANGGAL ──
function kuartalDariTanggal(dateStr) {
    if (!dateStr) return null;
    const bulan = new Date(dateStr).getMonth() + 1;
    return Math.ceil(bulan / 3);
}
