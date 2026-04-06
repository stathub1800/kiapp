// Inisialisasi Supabase client dan timpa ke variabel global agar dikenali oleh semua file JS lainnya
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);