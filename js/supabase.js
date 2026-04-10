// Menggunakan konfigurasi keamanan ekstra: Sesi mati saat tab/browser ditutup
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: window.sessionStorage, // Sesi tidak permanen
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});