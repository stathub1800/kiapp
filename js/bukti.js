// ============================================================
// KONFIGURASI URL GOOGLE APPS SCRIPT
// ============================================================
const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFkFGUCWqFP4wb8-3KWsXQDKMZXUquDOeZvUxgTV-fEaxjanTOMJpbBkZoGKa-28wdOQ/exec";

// ============================================================
// AMBIL ELEMEN HTML
// ============================================================
const listContainer = document.getElementById('listBuktiDukung');

// Elemen Opsi 1 (Sinkronisasi Drive)
const driveDropdown   = document.getElementById('driveDropdown');
const btnRefreshDrive = document.getElementById('btnRefreshDrive');
const btnSimpanDrive  = document.getElementById('btnSimpanDrive');
const penjelasanDrive = document.getElementById('penjelasanDrive');
const driveStatus     = document.getElementById('driveStatus');
const searchFile      = document.getElementById('searchFile');   // <-- BARU (opsional, bisa tidak ada)
const cacheInfo       = document.getElementById('cacheInfo');    // <-- BARU (opsional, bisa tidak ada)

// Elemen Opsi 2 (Link Manual)
const btnSimpanLink = document.getElementById('btnSimpanLink');
const namaLinkInput = document.getElementById('namaLink');
const urlLinkInput  = document.getElementById('urlLink');
const linkStatus    = document.getElementById('linkStatus');

// ============================================================
// VARIABEL INTERNAL (jangan diubah)
// ============================================================
let allDriveFiles = []; // Menyimpan semua file untuk filter lokal tanpa fetch ulang

// ============================================================
// OPSI 1: TARIK DATA DARI GOOGLE DRIVE
// ============================================================

// Fungsi untuk menentukan ikon berdasarkan tipe file
function getIkon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))       return '📊';
    if (mimeType.includes('document')    || mimeType.includes('word'))        return '📝';
    if (mimeType.includes('presentation')|| mimeType.includes('powerpoint'))  return '📑';
    if (mimeType.includes('pdf'))   return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    return '📄';
}

// Fungsi untuk render ulang dropdown dari array (dipakai juga saat filter)
function renderDropdown(files) {
    if (!driveDropdown) return;
    driveDropdown.innerHTML = '<option value="">-- Pilih Dokumen (Terbaru di atas) --</option>';

    if (files.length === 0) {
        driveDropdown.innerHTML = '<option value="">Tidak ada file yang cocok.</option>';
        return;
    }

    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file.url;

        const d = new Date(file.date);
        const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
        const ikon = getIkon(file.mimeType);

        option.textContent = `${ikon} [${dateStr}] ${file.name}`;
        driveDropdown.appendChild(option);
    });
}

// Fungsi utama fetch dari GAS
// forceRefresh = true  → bypass cache GAS, ambil data terbaru dari Drive
// forceRefresh = false → pakai cache GAS kalau masih ada (lebih cepat)
async function fetchDriveFiles(forceRefresh = false) {
    if (!driveDropdown) return;

    driveDropdown.innerHTML = '<option value="">-- Menarik data dari Drive... --</option>';
    if (btnRefreshDrive) btnRefreshDrive.disabled = true;

    try {
        const url = forceRefresh
            ? GOOGLE_APP_SCRIPT_URL + "?action=refresh"
            : GOOGLE_APP_SCRIPT_URL;

        const response = await fetch(url);
        const files = await response.json();

        if (files.error) throw new Error(files.error);

        allDriveFiles = files; // Simpan untuk keperluan filter lokal
        renderDropdown(files);

        // Tampilkan info waktu & jumlah file (jika elemen cacheInfo ada di HTML)
        if (cacheInfo) {
            cacheInfo.textContent = `${files.length} file dimuat · ${new Date().toLocaleTimeString('id-ID')}`;
        }

    } catch (error) {
        driveDropdown.innerHTML = '<option value="">Gagal memuat folder Drive. Cek URL GAS.</option>';
        console.error('fetchDriveFiles error:', error);
    } finally {
        if (btnRefreshDrive) btnRefreshDrive.disabled = false;
    }
}

// Event: Tombol Refresh Manual → paksa bypass cache
if (btnRefreshDrive) {
    btnRefreshDrive.addEventListener('click', (e) => {
        e.preventDefault();
        fetchDriveFiles(true); // forceRefresh = true
    });
}

// Event: Filter pencarian lokal (tidak fetch ulang ke server!)
// Hanya aktif jika ada elemen <input id="searchFile"> di HTML
if (searchFile) {
    searchFile.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        const filtered = keyword
            ? allDriveFiles.filter(f => f.name.toLowerCase().includes(keyword))
            : allDriveFiles;
        renderDropdown(filtered);
    });
}

// Event: Tombol Simpan dari Dropdown
if (btnSimpanDrive) {
    btnSimpanDrive.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = driveDropdown.value;
        const namaFileLengkap = driveDropdown.options[driveDropdown.selectedIndex].text;

        if (!url) { alert("Pilih dokumen dari dropdown terlebih dahulu!"); return; }

        // Bersihkan nama file dari embel-embel ikon, tanggal, dan spasi berlebih
        // Contoh: "📊 [12/7 09:30] Laporan/Rekap.xlsx" → "Laporan/Rekap.xlsx"
        const namaFileBersih = namaFileLengkap
            .replace(/^[\S\s]*?\]\s/, '') // Hapus semua sebelum "] " (ikon + tanggal)
            .trim();
        const teksPenjelasan = penjelasanDrive.value.trim() || namaFileBersih;

        driveStatus.innerText = "Melampirkan dokumen ke laporan...";
        driveStatus.style.color = "";

        const { error: dbError } = await supabase.from('bukti_dukung').insert([{
            kegiatan_id: kegiatanId,
            file_url:    url,
            file_name:   namaFileBersih,
            file_type:   'link',
            penjelasan:  teksPenjelasan
        }]);

        if (dbError) {
            driveStatus.innerText = "Gagal menyimpan: " + dbError.message;
            driveStatus.style.color = "var(--danger)";
        } else {
            driveStatus.innerText = "Dokumen berhasil dilampirkan!";
            driveStatus.style.color = "var(--success)";
            penjelasanDrive.value = '';
            loadDaftarBukti();
            setTimeout(() => { driveStatus.innerText = ""; }, 3000);
        }
    });
}

// ============================================================
// OPSI 2: TAUTKAN LINK MANUAL
// ============================================================
if (btnSimpanLink) {
    btnSimpanLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const nama = namaLinkInput.value.trim();
        const url  = urlLinkInput.value.trim();

        if (!nama || !url) { alert("Penjelasan Tautan dan URL wajib diisi!"); return; }

        linkStatus.innerText = "Menyimpan tautan...";
        linkStatus.style.color = "";

        const { error: dbError } = await supabase.from('bukti_dukung').insert([{
            kegiatan_id: kegiatanId,
            file_url:    url,
            file_name:   'Tautan Eksternal',
            file_type:   'link',
            penjelasan:  nama
        }]);

        if (dbError) {
            linkStatus.innerText = "Gagal menyimpan: " + dbError.message;
            linkStatus.style.color = "var(--danger)";
        } else {
            linkStatus.innerText = "Tautan berhasil disimpan!";
            linkStatus.style.color = "var(--success)";
            namaLinkInput.value = '';
            urlLinkInput.value  = '';
            loadDaftarBukti();
            setTimeout(() => { linkStatus.innerText = ""; }, 3000);
        }
    });
}

// ============================================================
// RENDER DAFTAR BUKTI DUKUNG (dari Supabase)
// ============================================================
async function loadDaftarBukti() {
    if (!kegiatanId) return;

    const { data, error } = await supabase
        .from('bukti_dukung')
        .select('*')
        .eq('kegiatan_id', kegiatanId)
        .order('created_at', { ascending: true });

    if (error || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>Belum ada lampiran dokumen.</p>";
        return;
    }

    let html = '';
    data.forEach(file => {
        const previewHtml = `
            <div style="width:70px; height:70px; background:#e0f2fe; color:#0284c7;
                        display:flex; align-items:center; justify-content:center;
                        border-radius:4px; font-weight:bold; font-size:12px;
                        border:1px solid #bae6fd; text-align:center; flex-shrink:0;">
                DOKUMEN<br>DRIVE
            </div>`;

        html += `
            <div style="display:flex; align-items:center; padding:15px; border:1px solid #eee;
                        background:#fff; border-radius:8px; margin-bottom:10px; gap:15px;
                        box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                ${previewHtml}
                <div style="flex-grow:1; min-width:0;">
                    <strong style="color:var(--primary); font-size:15px;
                                   display:block; white-space:nowrap; overflow:hidden;
                                   text-overflow:ellipsis;">
                        ${file.penjelasan}
                    </strong>
                    <a href="${file.file_url}" target="_blank"
                       style="color:var(--secondary); font-size:12px; text-decoration:none;
                              display:inline-block; margin-top:5px;">
                        &#8599; Buka Dokumen
                    </a>
                </div>
                <button onclick="hapusBukti('${file.id}')"
                        style="background:var(--danger); color:white; border:none;
                               padding:6px 12px; border-radius:4px; cursor:pointer; flex-shrink:0;">
                    Hapus
                </button>
            </div>`;
    });

    listContainer.innerHTML = html;
}

// ============================================================
// HAPUS LAMPIRAN (data DB saja, file Drive tetap aman)
// ============================================================
window.hapusBukti = async function(idDB) {
    if (!confirm("Yakin ingin mencopot lampiran ini dari laporan?\n(File asli di Drive tetap aman)")) return;
    await supabase.from('bukti_dukung').delete().eq('id', idDB);
    loadDaftarBukti();
}

// ============================================================
// INIT: Jalankan saat halaman selesai dimuat
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (kegiatanId) {
        loadDaftarBukti();
        fetchDriveFiles(false); // Pakai cache GAS dulu (cepat), refresh manual kalau perlu
    }
});