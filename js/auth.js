// ============================================================
// auth.js — Autentikasi & Keamanan Sesi
// Layer keamanan berlapis:
//   1. SessionStorage (sesi hilang saat browser ditutup)
//   2. Revalidasi saat tab kembali aktif (visibilitychange)
//   3. Idle timer (auto-logout setelah N menit tidak aktif)
//   4. checkSession() di setiap halaman protected
// ============================================================

// ── 1. CHECK SESI SAAT HALAMAN DIMUAT ──
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    const path = window.location.pathname;

    const isPublicPage = path.includes('index.html')
        || path.includes('view.html')
        || path === '/'
        || path.endsWith('/');

    if (!session && !isPublicPage) {
        window.location.replace('index.html');
        return false;
    }
    if (session && (path.includes('index.html') || path === '/' || path.endsWith('/'))) {
        window.location.replace('dashboard.html');
        return false;
    }
    return true;
}
checkSession();

// ── 2. VISIBILITYCHANGE: revalidasi saat tab kembali aktif ──
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        const path = window.location.pathname;
        if (path.includes('view.html') || path.includes('index.html')) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.replace('index.html');
        }
    }
});

// ── 3. IDLE TIMER ──
let _idleTime = 0;
function _resetIdle() { _idleTime = 0; }
['mousemove','keypress','click','scroll','touchstart'].forEach(e =>
    document.addEventListener(e, _resetIdle, { passive: true })
);
setInterval(() => {
    _idleTime++;
    if (_idleTime >= IDLE_TIMEOUT_MINUTES) {
        alert(`Sesi berakhir karena tidak ada aktivitas selama ${IDLE_TIMEOUT_MINUTES} menit.\nSilakan login kembali.`);
        logout();
    }
}, 60000);

// ── LOGIN FORM ──
const _loginForm = document.getElementById('loginForm');
if (_loginForm) {
    _loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errEl    = document.getElementById('errorMessage');
        const btn      = _loginForm.querySelector('button[type=submit]');

        btn.disabled = true;
        btn.textContent = 'Memproses...';
        if (errEl) errEl.style.display = 'none';

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            if (errEl) {
                errEl.textContent = 'Login gagal: ' + (error.message === 'Invalid login credentials' ? 'Email atau password salah.' : error.message);
                errEl.style.display = 'block';
            }
            btn.disabled = false;
            btn.textContent = 'Masuk';
        } else {
            window.location.replace('dashboard.html');
        }
    });
}

// ── LOGOUT ──
async function logout() {
    await supabase.auth.signOut();
    window.location.replace('index.html');
}

// ── TOPBAR DATE ──
function renderTopbarDate() {
    const el = document.getElementById('topbar-date');
    if (!el) return;
    const now  = new Date();
    const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
    const tgl  = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    el.textContent = `${hari}, ${tgl}`;
}
document.addEventListener('DOMContentLoaded', renderTopbarDate);
