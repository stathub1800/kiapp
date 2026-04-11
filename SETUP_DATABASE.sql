-- ============================================================
-- SUPERAPP KPI v2.0 — SETUP DATABASE SUPABASE
-- Jalankan script ini di Supabase SQL Editor
-- PERHATIAN: Script ini akan menghapus semua tabel lama!
-- ============================================================

-- 1. HAPUS TABEL LAMA (jika ada)
DROP TABLE IF EXISTS bukti_dukung CASCADE;
DROP TABLE IF EXISTS progres_harian CASCADE;
DROP TABLE IF EXISTS laporan_kpi CASCADE;
DROP TABLE IF EXISTS kegiatan CASCADE;
DROP TABLE IF EXISTS rencana_kerja_kipapp CASCADE;
DROP TABLE IF EXISTS triwulan CASCADE;

-- ============================================================
-- 2. BUAT TABEL BARU
-- ============================================================

-- Tabel Triwulan (periode kerja)
CREATE TABLE triwulan (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       text NOT NULL,
  tahun      int NOT NULL,
  periode    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabel Rencana Kinerja (KPI)
CREATE TABLE rencana_kerja_kipapp (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode       text,
  nama       text NOT NULL,
  tahun      int DEFAULT 2025,
  created_at timestamptz DEFAULT now()
);

-- Tabel Kegiatan (Target Pekerjaan)
CREATE TABLE kegiatan (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kegiatan        text NOT NULL,
  deskripsi            text,
  rencana_kerja_kipapp text,
  triwulan_id          uuid REFERENCES triwulan(id),
  jumlah_target        int DEFAULT 1,
  satuan_target        text DEFAULT 'Dokumen',
  waktu_pelaksanaan    date DEFAULT CURRENT_DATE,
  waktu_selesai        date,
  status               text DEFAULT 'Persiapan',
  jenis_pekerjaan      text DEFAULT 'KPI Utama',
  share_token          text UNIQUE,
  created_at           timestamptz DEFAULT now()
);

-- Tabel Progres Harian (Logbook)
CREATE TABLE progres_harian (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kegiatan_id uuid REFERENCES kegiatan(id) ON DELETE CASCADE,
  tanggal     date NOT NULL,
  deskripsi   text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Tabel Bukti Dukung (Lampiran Dokumen)
CREATE TABLE bukti_dukung (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kegiatan_id uuid REFERENCES kegiatan(id) ON DELETE CASCADE,
  file_url    text NOT NULL,
  file_name   text,
  file_type   text DEFAULT 'link',
  penjelasan  text,
  created_at  timestamptz DEFAULT now()
);

-- Tabel Laporan KPI (Laporan Terpadu yang sudah di-generate)
CREATE TABLE laporan_kpi (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token  text UNIQUE NOT NULL,
  nama_kpi     text NOT NULL,
  triwulan_id  uuid REFERENCES triwulan(id),
  judul        text,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE triwulan              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rencana_kerja_kipapp  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kegiatan              ENABLE ROW LEVEL SECURITY;
ALTER TABLE progres_harian        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bukti_dukung          ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_kpi           ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access
CREATE POLICY "auth_all_triwulan"     ON triwulan             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_kpi"          ON rencana_kerja_kipapp FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_kegiatan"     ON kegiatan             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_progres"      ON progres_harian       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bukti"        ON bukti_dukung         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_laporan"      ON laporan_kpi          FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public (anon): read-only untuk halaman view.html (share link)
CREATE POLICY "public_view_kegiatan"  ON kegiatan       FOR SELECT TO anon USING (share_token IS NOT NULL);
CREATE POLICY "public_view_progres"   ON progres_harian FOR SELECT TO anon USING (
  kegiatan_id IN (SELECT id FROM kegiatan WHERE share_token IS NOT NULL)
);
CREATE POLICY "public_view_bukti"     ON bukti_dukung   FOR SELECT TO anon USING (
  kegiatan_id IN (SELECT id FROM kegiatan WHERE share_token IS NOT NULL)
);
CREATE POLICY "public_view_laporan"   ON laporan_kpi    FOR SELECT TO anon USING (share_token IS NOT NULL);
CREATE POLICY "public_view_triwulan"  ON triwulan       FOR SELECT TO anon USING (true);

-- ============================================================
-- 4. DATA AWAL (SEED DATA)
-- ============================================================

-- Triwulan 2025
INSERT INTO triwulan (nama, tahun, periode) VALUES
  ('Triwulan I',   2025, 'Q1'),
  ('Triwulan II',  2025, 'Q2'),
  ('Triwulan III', 2025, 'Q3'),
  ('Triwulan IV',  2025, 'Q4');

-- Rencana Kinerja / KPI (sesuaikan dengan KPI BPS Anda)
INSERT INTO rencana_kerja_kipapp (kode, nama, tahun) VALUES
  ('1.1', 'Koordinasi dan Dukungan Teknis Survei', 2025),
  ('1.2', 'Pemantauan dan Evaluasi Pendataan', 2025),
  ('1.3', 'Penyusunan Laporan Capaian Kinerja', 2025),
  ('1.4', 'Updating dan Pemeliharaan Data Statistik', 2025),
  ('1.5', 'Pembinaan dan Supervisi Lapangan', 2025),
  ('2.1', 'Pengembangan Kompetensi SDM', 2025),
  ('2.2', 'Pengelolaan Administrasi dan Tata Usaha', 2025),
  ('2.3', 'Inovasi dan Pengembangan Layanan', 2025);

-- ============================================================
-- SELESAI! Refresh halaman Supabase Table Editor untuk melihat tabel baru.
-- ============================================================
