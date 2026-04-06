const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const listContainer = document.getElementById('listBuktiDukung');

// Maksimal 20MB sesuai SDD
const MAX_FILE_SIZE = 20 * 1024 * 1024; 

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        alert("Ukuran file terlalu besar! Maksimal 20MB.");
        fileInput.value = ''; // reset
        return;
    }

    uploadStatus.innerText = `Mengunggah ${file.name}... mohon tunggu.`;
    
    // 1. Buat nama file unik untuk menghindari bentrok
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${kegiatanId}/${uniqueFileName}`; // Simpan di dalam folder berdasar ID Kegiatan

    // 2. Upload ke Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bukti_dukung')
        .upload(filePath, file);

    if (uploadError) {
        uploadStatus.innerText = "Gagal mengunggah file: " + uploadError.message;
        uploadStatus.style.color = "var(--danger)";
        return;
    }

    // 3. Dapatkan URL Publik file yang baru diupload
    const { data: publicUrlData } = supabase.storage
        .from('bukti_dukung')
        .getPublicUrl(filePath);

    // 4. Simpan metadata ke tabel PostgreSQL 'bukti_dukung'
    const { error: dbError } = await supabase.from('bukti_dukung').insert([{
        kegiatan_id: kegiatanId,
        file_url: publicUrlData.publicUrl,
        file_name: file.name,
        file_type: file.type
    }]);

    if (dbError) {
        uploadStatus.innerText = "File terunggah, tapi gagal simpan ke database: " + dbError.message;
    } else {
        uploadStatus.innerText = "File berhasil diunggah!";
        uploadStatus.style.color = "var(--success)";
        loadDaftarBukti(); // Refresh list file
    }
    
    fileInput.value = ''; // reset input
});

async function loadDaftarBukti() {
    if (!kegiatanId) return;

    const { data, error } = await supabase
        .from('bukti_dukung')
        .select('*')
        .eq('kegiatan_id', kegiatanId)
        .order('created_at', { ascending: true });

    if (error) {
        listContainer.innerHTML = `<p>Gagal memuat bukti dukung: ${error.message}</p>`;
        return;
    }

    if (data.length === 0) {
        listContainer.innerHTML = "<p style='color: var(--text-muted);'>Belum ada file bukti dukung.</p>";
        return;
    }

    let html = '';
    data.forEach(file => {
        // Logic preview sederhana (Bisa dipercanggih pakai PDF.js nanti sesuai Fase 3)
        let previewHtml = '';
        if (file.file_type && file.file_type.startsWith('image/')) {
            previewHtml = `<img src="${file.file_url}" style="max-width: 100px; max-height: 100px; border-radius: 4px;">`;
        } else {
            previewHtml = `<div style="width: 80px; height: 80px; background: #eee; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:bold; font-size:12px;">${file.file_name.split('.').pop().toUpperCase()}</div>`;
        }

        html += `
            <div style="display: flex; align-items: center; padding: 10px; border: 1px solid #eee; border-radius: 5px; margin-bottom: 10px; gap: 15px;">
                ${previewHtml}
                <div style="flex-grow: 1;">
                    <strong>${file.file_name}</strong><br>
                    <a href="${file.file_url}" target="_blank" style="color: var(--secondary); font-size: 14px; text-decoration: none;">Buka File &#8599;</a>
                </div>
                <button onclick="hapusBukti('${file.id}', '${kegiatanId}/${file.file_url.split('/').pop()}')" style="background: var(--danger); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Hapus</button>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

// Fungsi Hapus File (Hapus dari DB & Storage)
window.hapusBukti = async function(idDB, filePathStorage) {
    if(!confirm("Yakin ingin menghapus bukti ini?")) return;

    // Hapus dari Storage
    await supabase.storage.from('bukti_dukung').remove([filePathStorage]);
    
    // Hapus dari DB
    await supabase.from('bukti_dukung').delete().eq('id', idDB);
    
    loadDaftarBukti();
}

// Load otomatis saat halaman dibuka
document.addEventListener('DOMContentLoaded', () => {
    if (kegiatanId) {
        loadDaftarBukti();
    }
});