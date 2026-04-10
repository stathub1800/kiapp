// 1. Inisialisasi Supabase menggunakan konfigurasi keamanan baru
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: window.sessionStorage, // Sesi aman (hilang saat browser ditutup)
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// 2. Timpa variabel global 'supabase' dengan client yang baru dibuat.
// Ini sangat penting agar auth.js dan file lain tidak perlu diubah kodenya.
window.supabase = supabaseClient;