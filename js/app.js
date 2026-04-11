// ============================================================
// app.js — Main Entry Point & Tab Router
// ============================================================

// ── TAB NAVIGATION ──
function openTab(tabId, btnEl) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    btnEl.classList.add('active');

    switch (tabId) {
        case 'tab-dashboard':  loadDashboard();   break;
        case 'tab-target':     loadTargetTab();   break;
        case 'tab-realisasi':  loadRealisasiTab(); break;
        case 'tab-report':     loadReportTab();   break;
    }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

    // Delegasi untuk tab buttons (agar bisa dipanggil dari dashboard.js)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId) openTab(tabId, this);
        });
    });
});
