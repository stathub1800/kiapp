// Cek jika user sudah login, redirect ke dashboard
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    const currentPage = window.location.pathname;

    if (session && (currentPage.endsWith('index.html') || currentPage === '/')) {
        window.location.href = 'dashboard.html';
    } else if (!session && !currentPage.endsWith('index.html') && !currentPage.includes('view.html')) {
        // Proteksi halaman admin
        window.location.href = 'index.html';
    }
}

// Eksekusi cek sesi saat halaman dimuat
checkSession();

// Logic Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMessage');

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            errorMsg.innerText = "Login gagal: " + error.message;
            errorMsg.style.display = 'block';
        } else {
            window.location.href = 'dashboard.html';
        }
    });
}

// Logic Logout
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = 'index.html';
}
// ==========================================
// SISTEM KEAMANAN: AUTO-LOGOUT (IDLE TIMER)
// ==========================================
let idleTime = 0;
const MAX_IDLE_MINUTES = 30; // Logout otomatis setelah 30 menit tidak ada aktivitas

// Reset timer setiap kali ada pergerakan mouse atau ketikan keyboard
function resetTimer() { idleTime = 0; }
document.addEventListener('mousemove', resetTimer);
document.addEventListener('keypress', resetTimer);
document.addEventListener('click', resetTimer);
document.addEventListener('scroll', resetTimer);

// Cek setiap 1 menit
setInterval(() => {
    idleTime++;
    if (idleTime >= MAX_IDLE_MINUTES) {
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali demi keamanan.");
        logout(); // Fungsi logout akan dipanggil
    }
}, 60000); // 60.000 ms = 1 menit