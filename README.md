# Superapp KPI v2.1
**Sistem Manajemen Kinerja Personal — BPS Provinsi Lampung**

## 🆕 BARU DI v2.1

### 1. Cache Data Bersama (`js/cache.js`) — hemat kuota Supabase
- Satu kali fetch `kegiatan` / `triwulan` / `KPI` dipakai bersama SEMUA tab.
- Pindah-pindah tab TIDAK lagi memicu query baru (TTL kegiatan 1 menit, master data 30 menit).
- Perubahan status/fase langsung "di-patch" ke cache tanpa re-fetch.
- Tombol ↺ Refresh = paksa ambil data terbaru dari server.

### 2. Filter & Pencarian di Tab Input Target
- 🔍 Kotak pencarian bebas (nama, deskripsi, KPI, satuan) — shortcut keyboard `/`
- Chip status: **Aktif · Selesai · Batal · Semua** (mode arsip)
- Filter: Jenis Pekerjaan, Fase, Triwulan, KPI
- Sortir: deadline / nama / status / terbaru
- **Group-by** Triwulan / KPI / Jenis → arsip tertata dengan header grup + statistik
- Semua filter berjalan di sisi klien = NOL query tambahan ke Supabase

### 3. Mode Arsip
- Kegiatan **Batal** tidak hilang: bisa dilihat via chip "Batal", **dipulihkan**, atau dihapus permanen.
- Kegiatan **Selesai** tersimpan rapi via chip "Selesai" + group-by triwulan.

### 4. Export CSV
- Tombol ⬇ CSV mengekspor HASIL FILTER saat itu (pemisah `;` + BOM UTF-8, langsung rapi di Excel Indonesia).

### 5. Tab Realisasi
- Kotak pencarian untuk menyaring dropdown pekerjaan.
- Checkbox "Sembunyikan yang Selesai".
- Navigasi dari Dashboard → Workspace kini andal (tidak lagi gagal saat data belum termuat).

### 6. Tab Report
- Pencarian di daftar Laporan Tersimpan.

### 7. Perbaikan Bug
- `confirmDialog` tidak lagi menggantung jika modal ditutup lewat klik overlay.
- Auto-advance status hemat 2 query per catatan logbook.
- `escAttr` & `debounce` jadi helper global di `ui.js`.

> **Tidak ada perubahan skema database** — TIDAK perlu menjalankan ulang SETUP_DATABASE.sql.
> Cukup timpa file HTML/CSS/JS di GitHub Pages.

---


---

## 🚀 CARA DEPLOY KE GITHUB PAGES

### Langkah 1: Setup Database Supabase

1. Buka Supabase Dashboard → SQL Editor
2. Copy isi file `SETUP_DATABASE.sql`
3. Paste dan klik **Run**
4. Verifikasi di Table Editor: harus ada 6 tabel baru

### Langkah 2: Upload ke GitHub

1. Buka repository GitHub Anda
2. Upload **seluruh isi folder** ini (pertahankan struktur direktori):
   ```
   index.html
   dashboard.html
   view.html
   css/style.css
   js/config.js
   js/supabase.js
   js/auth.js
   js/ui.js
   js/dashboard.js
   js/target.js
   js/realisasi.js
   js/bukti.js
   js/report.js
   js/app.js
   ```
3. Aktifkan GitHub Pages: Settings → Pages → Source: Deploy from branch → Branch: main → Root (/)

### Langkah 3: Update config.js

Edit file `js/config.js` dan ganti:
- `SUPABASE_URL` → URL project Supabase Anda
- `SUPABASE_ANON_KEY` → Anon key Supabase Anda
- `DRIVE_FOLDER_URL` → URL folder Google Drive arsip Anda

### Langkah 4: Buat User Login

Di Supabase Dashboard → Authentication → Users → Invite User
Masukkan email Anda → Cek email → Set password

---

## 📁 STRUKTUR FILE

```
/
├── index.html          → Halaman login
├── dashboard.html      → Aplikasi utama (4 tab)
├── view.html           → Laporan publik (bisa diakses tanpa login)
├── SETUP_DATABASE.sql  → Script setup database Supabase
├── css/
│   └── style.css       → Design system lengkap
└── js/
    ├── config.js       → Konfigurasi (URL, KEY, konstanta)
    ├── cache.js        → Cache data bersama (hemat Supabase) [BARU]
    ├── supabase.js     → Inisialisasi Supabase client
    ├── auth.js         → Login, logout, idle timer, session guard
    ├── ui.js           → Toast, modal, badge, helper
    ├── dashboard.js    → Tab 1: KPI summary, kanban, kalender, to-do
    ├── target.js       → Tab 2: Form input target pekerjaan
    ├── realisasi.js    → Tab 3: Workspace logbook harian
    ├── bukti.js        → Sub-modul: lampiran dokumen GDrive
    ├── report.js       → Tab 4: Generate laporan terpadu
    └── app.js          → Tab router & entry point
```

---

## 🔒 SISTEM KEAMANAN

| Layer | Keterangan |
|---|---|
| SessionStorage | Sesi hilang otomatis saat browser ditutup |
| visibilitychange | Revalidasi sesi saat tab kembali aktif |
| Idle Timer | Auto-logout setelah 30 menit tidak ada aktivitas |
| checkSession() | Guard di setiap halaman protected saat load |
| RLS Supabase | Data hanya bisa diakses oleh authenticated user |

---

## ✨ FITUR UTAMA

### Tab 1 — Dashboard
- Progress KPI (%) + breakdown per jenis pekerjaan
- To-do list sorted by deadline (merah/kuning/biru sesuai urgensi)
- Kanban board otomatis dari status kegiatan
- Kalender interaktif dengan warna per status

### Tab 2 — Input Target
- Form input rencana kerja dengan validasi
- Auto-detect triwulan dari tanggal deadline
- Daftar semua target dengan badge status
- Batalkan/hapus target

### Tab 3 — Realisasi
- Pilih kegiatan → workspace terbuka
- Update status dari dropdown
- Logbook harian dengan timeline
- Lampiran bukti dukung (paste URL GDrive)
- Share link per kegiatan

### Tab 4 — Report
- Generate laporan terpadu per KPI + triwulan
- Himpun semua kegiatan, logbook, bukti dalam 1 halaman
- Buat share link untuk pimpinan (view.html?laporan=TOKEN)
- Daftar laporan tersimpan

### view.html (Publik)
- Tidak butuh login
- Mode 1: ?token=TOKEN → laporan per kegiatan
- Mode 2: ?laporan=TOKEN → laporan terpadu (KPI + triwulan)
- Bisa cetak / save PDF

---

## 🛠 PENGEMBANGAN LANJUTAN (Roadmap)

- [ ] Google Drive File Picker (multi-select langsung dari Drive)
- [ ] Export PDF otomatis tanpa print dialog
- [ ] Notifikasi browser H-3 sebelum deadline
- [ ] Filter dan search di daftar target
- [ ] Dark mode
- [ ] Integrasi AI untuk rangkum laporan otomatis
