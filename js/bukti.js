// ============================================================
// bukti.js — Manajemen Bukti Dukung / Lampiran
// Mendukung paste URL manual + multi-dokumen
// ============================================================

// ── UTILITAS GDRIVE ──
function getFileIdFromUrl(url) {
    if (!url) return null;
    let m;
    m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);  if (m) return m[1];
    m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);       if (m) return m[1];
    m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);   if (m) return m[1];
    m = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);       if (m) return m[1];
    return null;
}

function getIkon(url, nama) {
    const s = ((url || '') + ' ' + (nama || '')).toLowerCase();
    if (s.includes('spreadsheet') || s.includes('xlsx') || s.includes('sheet')) return '📊';
    if (s.includes('document')    || s.includes('docx') || s.includes('doc'))   return '📝';
    if (s.includes('presentation')|| s.includes('pptx') || s.includes('slide')) return '📑';
    if (s.includes('pdf'))     return '📕';
    if (s.includes('image')    || s.includes('jpg') || s.includes('png') || s.includes('jpeg')) return '🖼️';
    if (s.includes('video')    || s.includes('mp4') || s.includes('avi'))  return '🎥';
    if (s.includes('forms')    || s.includes('form'))  return '📋';
    if (s.includes('folder'))  return '📁';
    return '📄';
}

function getThumbnailUrl(fileId) {
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w80` : null;
}

function makeShareableUrl(url) {
    if (!url) return url;
    if (url.includes('usp=sharing') || url.includes('/preview')) return url;
    const fileId = getFileIdFromUrl(url);
    if (fileId && url.includes('/file/d/')) {
        return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }
    return url;
}

function autoNamaDariUrl(url) {
    const s = (url || '').toLowerCase();
    if (s.includes('spreadsheet'))  return 'Google Spreadsheet';
    if (s.includes('document'))     return 'Google Document';
    if (s.includes('presentation')) return 'Google Slides';
    if (s.includes('forms'))        return 'Google Form';
    if (s.includes('folder'))       return 'Folder Google Drive';
    if (getFileIdFromUrl(url))      return 'File Google Drive';
    return '';
}

// ── INIT EVENT LISTENERS ──
document.addEventListener('DOMContentLoaded', () => {
    // Tombol Buka Drive
    const btnDrive = document.getElementById('btn-buka-drive');
    if (btnDrive) {
        btnDrive.addEventListener('click', () => {
            window.open(DRIVE_FOLDER_URL, '_blank');
        });
    }

    // Auto-detect saat URL di-paste
    const urlInput  = document.getElementById('bukti-url');
    const namaInput = document.getElementById('bukti-nama');
    const preview   = document.getElementById('bukti-preview');

    if (urlInput) {
        const handleUrl = () => {
            const url = urlInput.value.trim();
            if (!url) { if (preview) preview.innerHTML = ''; return; }

            const fileId = getFileIdFromUrl(url);
            const isGdrive = url.includes('drive.google.com') || url.includes('docs.google.com');

            if (preview) {
                if (isGdrive && fileId) {
                    const thumb = getThumbnailUrl(fileId);
                    preview.innerHTML = `
                        <div style="display:flex; align-items:center; gap:10px; padding:10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; margin-top:8px;">
                            <img src="${thumb}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #ddd;" onerror="this.style.display='none'">
                            <div>
                                <div style="font-size:12px;color:#15803d;font-weight:700;">✓ Google Drive terdeteksi</div>
                                <div style="font-size:11px;color:var(--text-muted);">ID: ${fileId.substring(0,20)}...</div>
                            </div>
                        </div>`;
                } else {
                    preview.innerHTML = `<div style="padding:8px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-top:8px;font-size:12px;color:#92400e;">⚠ Bukan Google Drive — tetap bisa dilampirkan.</div>`;
                }
            }

            // Auto-isi nama jika masih kosong
            if (namaInput && !namaInput.value.trim()) {
                namaInput.value = autoNamaDariUrl(url);
            }
        };

        urlInput.addEventListener('paste', () => setTimeout(handleUrl, 150));
        urlInput.addEventListener('input', handleUrl);
    }

    // Tombol Lampirkan Dokumen
    const btnSimpan = document.getElementById('btn-lampirkan');
    if (btnSimpan) {
        btnSimpan.addEventListener('click', simpanBukti);
    }

    // Enter di field nama = submit
    if (namaInput) {
        namaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); simpanBukti(); }
        });
    }
});

// ── SIMPAN BUKTI ──
async function simpanBukti() {
    const urlInput  = document.getElementById('bukti-url');
    const namaInput = document.getElementById('bukti-nama');
    const statusEl  = document.getElementById('bukti-status');
    const preview   = document.getElementById('bukti-preview');

    if (!window.kegiatanId) { showToast('Pilih kegiatan terlebih dahulu', 'warning'); return; }

    const url  = urlInput  ? urlInput.value.trim()  : '';
    const nama = namaInput ? namaInput.value.trim() : '';

    if (!url)  { showToast('Paste link dokumen terlebih dahulu', 'warning'); return; }
    if (!nama) { showToast('Isi nama dokumen terlebih dahulu', 'warning'); return; }

    try { new URL(url); } catch { showToast('Format URL tidak valid', 'error'); return; }

    const btnSimpan = document.getElementById('btn-lampirkan');
    if (btnSimpan) { btnSimpan.disabled = true; btnSimpan.textContent = 'Menyimpan...'; }

    const shareUrl = makeShareableUrl(url);
    const ikon     = getIkon(url, nama);

    const { error } = await supabase.from('bukti_dukung').insert([{
        kegiatan_id: window.kegiatanId,
        file_url:    shareUrl,
        file_name:   nama,
        file_type:   'link',
        penjelasan:  ikon + ' ' + nama
    }]);

    if (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } else {
        showToast('Dokumen dilampirkan!', 'success');
        if (urlInput)  urlInput.value  = '';
        if (namaInput) namaInput.value = '';
        if (preview)   preview.innerHTML = '';
        await loadDaftarBukti();
    }

    if (btnSimpan) { btnSimpan.disabled = false; btnSimpan.textContent = 'Lampirkan Dokumen'; }
}

// ── LOAD DAFTAR BUKTI ──
async function loadDaftarBukti() {
    const container = document.getElementById('list-bukti');
    if (!container || !window.kegiatanId) return;

    const { data, error } = await supabase
        .from('bukti_dukung')
        .select('*')
        .eq('kegiatan_id', window.kegiatanId)
        .order('created_at', { ascending: true });

    if (error) return;

    if (!data || !data.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📎</div><p>Belum ada lampiran dokumen.</p></div>`;
        return;
    }

    container.innerHTML = data.map(file => {
        const fileId = getFileIdFromUrl(file.file_url);
        const ikon   = getIkon(file.file_url, file.penjelasan);
        const thumb  = fileId ? getThumbnailUrl(fileId) : null;

        const thumbHtml = thumb
            ? `<img src="${thumb}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border);flex-shrink:0;" onerror="this.outerHTML='<div style=\\'width:52px;height:52px;background:var(--info-bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;\\'>${ikon}</div>'">`
            : `<div style="width:52px;height:52px;background:var(--info-bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${ikon}</div>`;

        return `
        <div class="bukti-item">
            ${thumbHtml}
            <div class="bukti-info">
                <div class="bukti-name">${file.penjelasan || file.file_name}</div>
                <a href="${file.file_url}" target="_blank" class="bukti-link">↗ Buka Dokumen</a>
            </div>
            <button class="btn btn-danger btn-xs" onclick="hapusBukti('${file.id}')">Hapus</button>
        </div>`;
    }).join('');
}

// ── HAPUS BUKTI ──
async function hapusBukti(id) {
    const ok = await confirmDialog('Hapus lampiran ini? (File asli di Drive tetap aman)');
    if (!ok) return;
    const { error } = await supabase.from('bukti_dukung').delete().eq('id', id);
    if (error) { showToast('Gagal hapus: ' + error.message, 'error'); return; }
    showToast('Lampiran dihapus', 'success');
    loadDaftarBukti();
}

// Expose untuk global access
window.hapusBukti = hapusBukti;
