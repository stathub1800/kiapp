// ============================================================
// KONFIGURASI
// Ganti dengan URL folder Google Drive root kamu
// ============================================================
const DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1ArVY1k4bT1lQM60wHGQiJzYdOpmjb1s8";

// ============================================================
// AMBIL ELEMEN HTML
// ============================================================
const listContainer = document.getElementById('listBuktiDukung');
const urlLinkInput  = document.getElementById('urlLink');
const namaLinkInput = document.getElementById('namaLink');
const btnSimpanLink = document.getElementById('btnSimpanLink');
const linkStatus    = document.getElementById('linkStatus');
const btnBukaDrive  = document.getElementById('btnBukaDrive');
const previewNama   = document.getElementById('previewNama');

// ============================================================
// UTILITAS
// ============================================================

// Ambil File ID dari berbagai format URL Google Drive
function getFileIdFromUrl(url) {
    if (!url) return null;
    var match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
}

// Deteksi ikon berdasarkan URL / nama file
function getIkon(url, nama) {
    const str = (url + ' ' + nama).toLowerCase();
    if (str.includes('spreadsheet') || str.includes('xlsx') || str.includes('sheet')) return '📊';
    if (str.includes('document')    || str.includes('docx') || str.includes('doc'))   return '📝';
    if (str.includes('presentation')|| str.includes('pptx') || str.includes('slide')) return '📑';
    if (str.includes('pdf'))    return '📕';
    if (str.includes('image')   || str.includes('jpg') || str.includes('png')) return '🖼️';
    if (str.includes('video')   || str.includes('mp4')) return '🎥';
    if (str.includes('form'))   return '📋';
    if (str.includes('folder')) return '📁';
    return '📄';
}

// Buat URL thumbnail dari file ID
function getThumbnailUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w100`;
}

// Ubah URL edit/view menjadi URL sharing yang bisa dibuka siapa saja
function makeShareableUrl(url) {
    if (!url) return url;
    if (url.includes('usp=sharing')) return url;
    const fileId = getFileIdFromUrl(url);
    if (fileId && url.includes('/file/d/')) {
        return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }
    return url;
}

// ============================================================
// AUTO-DETECT SAAT URL DI-PASTE
// ============================================================
if (urlLinkInput) {
    urlLinkInput.addEventListener('paste', function() {
        setTimeout(() => {
            const url = urlLinkInput.value.trim();
            if (!url) return;

            const fileId = getFileIdFromUrl(url);

            // Tampilkan preview deteksi
            if (previewNama) {
                if (fileId) {
                    previewNama.innerHTML = `
                        <div style="display:flex; align-items:center; gap:10px; padding:8px;
                                    background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; margin-top:8px;">
                            <img src="${getThumbnailUrl(fileId)}"
                                 style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #ddd;"
                                 onerror="this.style.display='none'">
                            <div>
                                <div style="font-size:12px; color:#15803d; font-weight:bold;">✓ Link Google Drive terdeteksi</div>
                                <div style="font-size:11px; color:#6b7280;">File ID: ${fileId}</div>
                            </div>
                        </div>`;
                } else {
                    previewNama.innerHTML = `
                        <div style="padding:8px; background:#fefce8; border:1px solid #fde68a;
                                    border-radius:6px; margin-top:8px; font-size:12px; color:#92400e;">
                            ⚠️ Link ini bukan dari Google Drive. Tetap bisa disimpan.
                        </div>`;
                }
            }

            // Auto-isi nama jika kolom nama masih kosong
            if (namaLinkInput && !namaLinkInput.value.trim()) {
                if      (url.includes('spreadsheet'))  namaLinkInput.value = 'Google Spreadsheet';
                else if (url.includes('document'))     namaLinkInput.value = 'Google Document';
                else if (url.includes('presentation')) namaLinkInput.value = 'Google Slides';
                else if (url.includes('forms'))        namaLinkInput.value = 'Google Form';
                else if (url.includes('folder'))       namaLinkInput.value = 'Folder Drive';
                else if (fileId)                       namaLinkInput.value = 'File Google Drive';
            }
        }, 100);
    });

    // Bersihkan preview saat input dikosongkan
    urlLinkInput.addEventListener('input', function() {
        if (!urlLinkInput.value.trim() && previewNama) {
            previewNama.innerHTML = '';
        }
    });
}

// ============================================================
// TOMBOL BUKA DRIVE — shortcut ke folder arsip
// ============================================================
if (btnBukaDrive) {
    btnBukaDrive.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(DRIVE_FOLDER_URL, '_blank');
    });
}

// ============================================================
// SIMPAN LAMPIRAN KE SUPABASE
// ============================================================
if (btnSimpanLink) {
    btnSimpanLink.addEventListener('click', async (e) => {
        e.preventDefault();

        const nama = namaLinkInput.value.trim();
        const url  = urlLinkInput.value.trim();

        if (!nama) { alert("Isi kolom Nama / Penjelasan dokumen terlebih dahulu!"); return; }
        if (!url)  { alert("Paste link dokumen terlebih dahulu!"); return; }

        try { new URL(url); } catch(_) { alert("Format URL tidak valid!"); return; }

        linkStatus.innerText = "Menyimpan lampiran...";
        linkStatus.style.color = "";

        const shareableUrl = makeShareableUrl(url);
        const ikon         = getIkon(url, nama);

        const { error: dbError } = await supabase.from('bukti_dukung').insert([{
            kegiatan_id: kegiatanId,
            file_url:    shareableUrl,
            file_name:   nama,
            file_type:   'link',
            penjelasan:  ikon + ' ' + nama
        }]);

        if (dbError) {
            linkStatus.innerText = "Gagal menyimpan: " + dbError.message;
            linkStatus.style.color = "var(--danger)";
        } else {
            linkStatus.innerText = "✓ Dokumen berhasil dilampirkan!";
            linkStatus.style.color = "var(--success)";
            namaLinkInput.value = '';
            urlLinkInput.value  = '';
            if (previewNama) previewNama.innerHTML = '';
            loadDaftarBukti();
            setTimeout(() => { linkStatus.innerText = ""; }, 3000);
        }
    });
}

// ============================================================
// RENDER DAFTAR BUKTI DUKUNG
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
        listContainer.innerHTML = `
            <p style="text-align:center; color:var(--text-muted); padding:20px 0;">
                Belum ada lampiran dokumen.
            </p>`;
        return;
    }

    let html = '';
    data.forEach(file => {
        const fileId = getFileIdFromUrl(file.file_url);
        const ikon   = getIkon(file.file_url, file.penjelasan);

        const previewHtml = fileId
            ? `<img src="${getThumbnailUrl(fileId)}"
                    style="width:70px; height:70px; object-fit:cover; border-radius:4px;
                           border:1px solid #ddd; flex-shrink:0; background:#f3f4f6;"
                    onerror="this.outerHTML='<div style=&quot;width:70px;height:70px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:28px;flex-shrink:0;&quot;>${ikon}</div>'">`
            : `<div style="width:70px; height:70px; background:#e0f2fe; color:#0284c7;
                           display:flex; align-items:center; justify-content:center;
                           border-radius:4px; font-size:28px; flex-shrink:0;">${ikon}</div>`;

        html += `
            <div style="display:flex; align-items:center; padding:15px; border:1px solid #eee;
                        background:#fff; border-radius:8px; margin-bottom:10px; gap:15px;
                        box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                ${previewHtml}
                <div style="flex-grow:1; min-width:0;">
                    <strong style="color:var(--primary); font-size:15px; display:block;
                                   white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
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
// HAPUS LAMPIRAN
// ============================================================
window.hapusBukti = async function(idDB) {
    if (!confirm("Yakin ingin mencopot lampiran ini?\n(File asli di Drive tetap aman)")) return;
    await supabase.from('bukti_dukung').delete().eq('id', idDB);
    loadDaftarBukti();
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (kegiatanId) {
        loadDaftarBukti();
    }
});