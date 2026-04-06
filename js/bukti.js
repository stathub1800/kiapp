const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const listContainer = document.getElementById('listBuktiDukung');
const penjelasanInput = document.getElementById('penjelasanFile'); // Ambil elemen penjelasan

const MAX_FILE_SIZE = 20 * 1024 * 1024; 

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Ambil teks dari kolom penjelasan (Jika kosong, beri default)
    const teksPenjelasan = penjelasanInput.value.trim() || "Tidak ada penjelasan";

    if (file.size > MAX_FILE_SIZE) {
        alert("Ukuran file terlalu besar! Maksimal 20MB.");
        fileInput.value = ''; 
        return;
    }

    uploadStatus.innerText = `Mengunggah ${file.name}... mohon tunggu.`;
    
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

    // Simpan metadata beserta penjelasannya ke PostgreSQL
    const { error: dbError } = await supabase.from('bukti_dukung').insert([{
        kegiatan_id: kegiatanId,
        file_url: publicUrlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        penjelasan: teksPenjelasan // Data penjelasan disisipkan di sini
    }]);

    if (dbError) {
        uploadStatus.innerText = "File terunggah, tapi gagal simpan ke database: " + dbError.message;
    } else {
        uploadStatus.innerText = "File berhasil diunggah!";
        uploadStatus.style.color = "var(--success)";
        penjelasanInput.value = ''; // Kosongkan form penjelasan setelah berhasil
        loadDaftarBukti(); 
    }
    
    fileInput.value = ''; 
});

async function loadDaftarBukti() {
    if (!kegiatanId) return;

    const { data, error } = await supabase
        .from('bukti_dukung')
        .select('*')
        .eq('kegiatan_id', kegiatanId)
        .order('created_at', { ascending: true });

    if (error) return;

    if (data.length === 0) {
        listContainer.innerHTML = "<p style='color: var(--text-muted);'>Belum ada file bukti dukung.</p>";
        return;
    }

    let html = '';
    data.forEach(file => {
        let previewHtml = '';
        if (file.file_type && file.file_type.startsWith('image/')) {
            previewHtml = `<img src="${file.file_url}" style="max-width: 80px; max-height: 80px; object-fit: cover; border-radius: 4px;">`;
        } else {
            previewHtml = `<div style="width: 80px; height: 80px; background: #eef2f3; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:bold; font-size:12px; border: 1px solid #ccc;">${file.file_name.split('.').pop().toUpperCase()}</div>`;
        }

        html += `
            <div style="display: flex; align-items: center; padding: 15px; border: 1px solid #eee; background: #fff; border-radius: 8px; margin-bottom: 10px; gap: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                ${previewHtml}
                <div style="flex-grow: 1;">
                    <strong style="color: var(--primary); font-size: 16px;">${file.penjelasan}</strong><br>
                    <span style="font-size: 13px; color: var(--text-muted);">${file.file_name}</span><br>
                    <a href="${file.file_url}" target="_blank" style="color: var(--secondary); font-size: 13px; text-decoration: none; display: inline-block; margin-top: 5px;">Buka File &#8599;</a>
                </div>
                <button onclick="hapusBukti('${file.id}', '${kegiatanId}/${file.file_url.split('/').pop()}')" style="background: var(--danger); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Hapus</button>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

window.hapusBukti = async function(idDB, filePathStorage) {
    if(!confirm("Yakin ingin menghapus bukti ini?")) return;
    await supabase.storage.from('bukti_dukung').remove([filePathStorage]);
    await supabase.from('bukti_dukung').delete().eq('id', idDB);
    loadDaftarBukti();
}

document.addEventListener('DOMContentLoaded', () => {
    if (kegiatanId) loadDaftarBukti();
});