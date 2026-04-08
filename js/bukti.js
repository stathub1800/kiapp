// PASTE URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI:
const GOOGLE_APP_SCRIPT_URL = "PASTE_URL_WEB_APP_ANDA_DI_SINI";

const listContainer = document.getElementById('listBuktiDukung');

// Elemen Opsi 1 (Sinkronisasi Drive)
const driveDropdown = document.getElementById('driveDropdown');
const btnRefreshDrive = document.getElementById('btnRefreshDrive');
const btnSimpanDrive = document.getElementById('btnSimpanDrive');
const penjelasanDrive = document.getElementById('penjelasanDrive');
const driveStatus = document.getElementById('driveStatus');

// Elemen Opsi 2 (Link Manual)
const btnSimpanLink = document.getElementById('btnSimpanLink');
const namaLinkInput = document.getElementById('namaLink');
const urlLinkInput = document.getElementById('urlLink');
const linkStatus = document.getElementById('linkStatus');

// =====================================
// OPSI 1: TARIK DATA DARI GOOGLE DRIVE
// =====================================
async function fetchDriveFiles() {
    if(!driveDropdown) return;
    
    driveDropdown.innerHTML = '<option value="">-- Menarik data terbaru dari Drive... --</option>';
    try {
        const response = await fetch(GOOGLE_APP_SCRIPT_URL);
        const files = await response.json();

        if (files.error) throw new Error(files.error);

        driveDropdown.innerHTML = '<option value="">-- Pilih Dokumen (Terbaru di atas) --</option>';
        
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.url;
            
            // Format Tanggal agar lebih cantik (Opsional)
            const d = new Date(file.date);
            const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes() < 10 ? '0' : ''}${d.getMinutes()}`;
            
            option.textContent = `[${dateStr}] - ${file.name}`;
            driveDropdown.appendChild(option);
        });
    } catch (error) {
        driveDropdown.innerHTML = '<option value="">Gagal memuat folder Drive. Cek URL GAS.</option>';
        console.error(error);
    }
}

// Event Refresh Manual
if(btnRefreshDrive) {
    btnRefreshDrive.addEventListener('click', (e) => {
        e.preventDefault(); // Mencegah form reload
        fetchDriveFiles();
    });
}

// Event Simpan dari Dropdown
if(btnSimpanDrive) {
    btnSimpanDrive.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = driveDropdown.value;
        const namaFileLengkap = driveDropdown.options[driveDropdown.selectedIndex].text;
        
        if(!url) { alert("Pilih dokumen dari dropdown terlebih dahulu!"); return; }

        // Bersihkan nama file dari embel-embel tanggal untuk disimpan ke database
        const namaFileBersih = namaFileLengkap.replace(/\[.*?\]\s-\s/, ''); 
        const teksPenjelasan = penjelasanDrive.value.trim() || namaFileBersih;

        driveStatus.innerText = "Melampirkan dokumen ke laporan...";
        
        const { error: dbError } = await supabase.from('bukti_dukung').insert([{
            kegiatan_id: kegiatanId,
            file_url: url,
            file_name: namaFileBersih,
            file_type: 'link', 
            penjelasan: teksPenjelasan 
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

// =====================================
// OPSI 2: LOGIKA TAUTKAN LINK MANUAL
// =====================================
if(btnSimpanLink) {
    btnSimpanLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const nama = namaLinkInput.value.trim();
        const url = urlLinkInput.value.trim();

        if(!nama || !url) { alert("Penjelasan Tautan dan URL wajib diisi!"); return; }

        linkStatus.innerText = "Menyimpan tautan...";
        
        const { error: dbError } = await supabase.from('bukti_dukung').insert([{
            kegiatan_id: kegiatanId,
            file_url: url,
            file_name: 'Tautan Eksternal',
            file_type: 'link', 
            penjelasan: nama 
        }]);

        if (dbError) {
            linkStatus.innerText = "Gagal menyimpan: " + dbError.message;
            linkStatus.style.color = "var(--danger)";
        } else {
            linkStatus.innerText = "Tautan berhasil disimpan!";
            linkStatus.style.color = "var(--success)";
            namaLinkInput.value = ''; urlLinkInput.value = '';
            loadDaftarBukti();
            setTimeout(() => { linkStatus.innerText = ""; }, 3000);
        }
    });
}

// =====================================
// RENDER DAFTAR BUKTI DUKUNG
// =====================================
async function loadDaftarBukti() {
    if (!kegiatanId) return;

    const { data, error } = await supabase.from('bukti_dukung').select('*').eq('kegiatan_id', kegiatanId).order('created_at', { ascending: true });
    if (error || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>Belum ada lampiran dokumen.</p>";
        return;
    }

    let html = '';
    data.forEach(file => {
        let previewHtml = `<div style="width: 70px; height: 70px; background: #e0f2fe; color: #0284c7; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:bold; font-size:12px; border: 1px solid #bae6fd; text-align:center;">DOKUMEN<br>DRIVE</div>`;

        html += `
            <div style="display: flex; align-items: center; padding: 15px; border: 1px solid #eee; background: #fff; border-radius: 8px; margin-bottom: 10px; gap: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                ${previewHtml}
                <div style="flex-grow: 1;">
                    <strong style="color: var(--primary); font-size: 15px;">${file.penjelasan}</strong><br>
                    <a href="${file.file_url}" target="_blank" style="color: var(--secondary); font-size: 12px; text-decoration: none; display: inline-block; margin-top: 5px;">&#8599; Buka Dokumen</a>
                </div>
                <button onclick="hapusBukti('${file.id}')" style="background: var(--danger); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Hapus</button>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

// =====================================
// LOGIKA HAPUS 
// =====================================
window.hapusBukti = async function(idDB) {
    if(!confirm("Yakin ingin mencopot lampiran ini dari laporan? (File asli di Drive tetap aman)")) return;
    
    // Hanya menghapus datanya dari Database (File fisik di Google Drive tidak akan terhapus)
    await supabase.from('bukti_dukung').delete().eq('id', idDB);
    loadDaftarBukti();
}

document.addEventListener('DOMContentLoaded', () => {
    if (kegiatanId) {
        loadDaftarBukti();
        fetchDriveFiles(); // Panggil data dari drive saat halaman dibuka
    }
});