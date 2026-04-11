// ============================================================
// supabase.js — Inisialisasi Supabase Client
// Menggunakan sessionStorage agar sesi hilang saat browser ditutup
// ============================================================

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage:          window.sessionStorage,
        autoRefreshToken: true,
        persistSession:   true,
        detectSessionInUrl: true
    }
});

// Timpa variabel global agar semua modul pakai client ini
window.supabase = _sb;
