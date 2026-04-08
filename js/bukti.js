const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const listContainer = document.getElementById('listBuktiDukung');
const penjelasanInput = document.getElementById('penjelasanFile'); 

// Elemen untuk Input Link
const btnSimpanLink = document.getElementById('btnSimpanLink');
const namaLinkInput = document.getElementById('namaLink');
const urlLinkInput = document.getElementById('urlLink');
const linkStatus = document.getElementById('linkStatus');

const MAX_FILE_SIZE = 20 * 1024 * 1024; 

// =====================================
// OPSI 1: LOGIKA UPLOAD FILE LOKAL
// =====================================
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const teksPenjelasan = penjelasanInput.value.trim() || file.name;

    if (file.size > MAX_FILE_SIZE) {
        alert("Ukuran file terlalu besar! Maksimal 20MB.");
        fileInput.value = ''; 
        return;
    }

    uploadStatus.innerText = `Mengunggah ${file.name}...`;
    
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${kegiatanId}/${uniqueFileName}`; 

    const { error: uploadError } = await supabase.storage.from('bukti_dukung').upload(filePath, file);

    if (uploadError) {
        uploadStatus.innerText = "Gagal mengunggah file: " + uploadError.message;
        uploadStatus.style.color = "var(--danger)";
        return;
    }

    const { data: publicUrlData } = supabase.storage.from('bukti_dukung').getPublicUrl(filePath);

    // Simpan ke database
    const { error: dbError } = await supabase.from('bukti_dukung').insert([{
        kegiatan_id: kegiatanId,
        file_url: publicUrlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        penjelasan: teksPenjelasan 
    }]);

    if (dbError) {
        uploadStatus.innerText = "Gagal simpan ke database: " + dbError.message;
    } else {
        uploadStatus.innerText = "File berhasil diunggah!";
        uploadStatus.style.color = "var(--success)";
        penjelasanInput.value = ''; 
        loadDaftarBukti(); 
    }
    fileInput.value = ''; 
});

// =====================================
// OPSI 2: LOGIKA TAUTKAN LINK DRIVE
// =====================================
if(btnSimpanLink) {
    btnSimpanLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const nama = namaLinkInput.value.trim();
        const url = urlLinkInput.value.trim();

        if(!nama || !url) {
            alert("Penjelasan Tautan dan URL wajib diisi!");
            return;
        }

        linkStatus.innerText = "Menyimpan tautan...";
        
        const { error: dbError } = await supabase.from('bukti_dukung').insert([{
            kegiatan_id: kegiatanId,
            file_url: url,
            file_name: 'Tautan Eksternal',
            file_type: 'link', // Penanda identitas ini adalah link, bukan file
            penjelasan: nama 
        }]);

        if (dbError) {
            linkStatus.innerText = "Gagal menyimpan: " + dbError.message;
            linkStatus.style.color = "var(--danger)";
        } else {
            linkStatus.innerText = "Tautan berhasil disimpan!";
            linkStatus.style.color = "var(--success)";
            namaLinkInput.value = '';
            urlLinkInput.value = '';
            loadDaftarBukti();
            
            // Kembalikan status teks ke awal setelah 3 detik
            setTimeout(() => { 
                linkStatus.innerText = "Otomatis embed untuk Google Drive/Docs/Sheets."; 
                linkStatus.style.color = "var(--text-muted)"; 
            }, 3000);
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
        listContainer.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>Belum ada lampiran atau tautan.</p>";
        return;
    }

    let html = '';
    data.forEach(file => {
        let previewHtml = '';
        
        // Bedakan ikon untuk Link dan File Fisik
        if (file.file_type === 'link') {
            previewHtml = `<div style="width: 70px; height: 70px; background: #e0f2fe; color: #0284c7; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:bold; font-size:12px; border: 1px solid #bae6fd;">LINK</div>`;
        } else if (file.file_type && file.file_type.startsWith('image/')) {
            previewHtml = `<img src="${file.file_url}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px;">`;
        } else {
            previewHtml = `<div style="width: 70px; height: 70px; background: #f1f5f9; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:bold; font-size:12px; border: 1px solid #cbd5e1;">FILE</div>`;
        }

        html += `
            <div style="display: flex; align-items: center; padding: 15px; border: 1px solid #eee; background: #fff; border-radius: 8px; margin-bottom: 10px; gap: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                ${previewHtml}
                <div style="flex-grow: 1;">
                    <strong style="color: var(--primary); font-size: 15px;">${file.penjelasan}</strong><br>
                    <a href="${file.file_url}" target="_blank" style="color: var(--secondary); font-size: 12px; text-decoration: none; display: inline-block; margin-top: 5px;">&#8599; Buka Tautan/File Asli</a>
                </div>
                <button onclick="hapusBukti('${file.id}', '${file.file_url}', '${file.file_type}')" style="background: var(--danger); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Hapus</button>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

// =====================================
// LOGIKA HAPUS (Membedakan File vs Link)
// =====================================
window.hapusBukti = async function(idDB, fileUrl, fileType) {
    if(!confirm("Yakin ingin menghapus lampiran ini?")) return;
    
    // Jika BUKAN link, hapus fisik file-nya dari Supabase Storage
    if (fileType !== 'link') {
        const fileName = fileUrl.split('/').pop();
        const filePathStorage = `${kegiatanId}/${fileName}`;
        await supabase.storage.from('bukti_dukung').remove([filePathStorage]);
    }
    
    // Hapus datanya dari Database (Baik Link maupun File)
    await supabase.from('bukti_dukung').delete().eq('id', idDB);
    loadDaftarBukti();
}

document.addEventListener('DOMContentLoaded', () => {
    if (kegiatanId) loadDaftarBukti();
});