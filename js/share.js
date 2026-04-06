const btnGenerateLink = document.getElementById('btnGenerateLink');
const shareLinkContainer = document.getElementById('shareLinkContainer');
const shareLinkUrl = document.getElementById('shareLinkUrl');
const openShareLink = document.getElementById('openShareLink');
const panelShare = document.getElementById('panelShare');

// Fungsi pembuat Token Unik
function generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function initSharePanel() {
    if (!kegiatanId) return;
    panelShare.style.display = 'block';

    // Cek jika link sudah pernah dibuat sebelumnya
    const { data, error } = await supabase.from('kegiatan').select('share_token').eq('id', kegiatanId).single();
    if (data && data.share_token) {
        tampilkanLink(data.share_token);
    }
}

function tampilkanLink(token) {
    // Format URL dinamis (mendukung saat di localhost maupun GitHub Pages)
    const baseUrl = window.location.href.split('kegiatan.html')[0];
    const fullUrl = `${baseUrl}view.html?token=${token}`;
    
    shareLinkUrl.value = fullUrl;
    openShareLink.href = fullUrl;
    shareLinkContainer.style.display = 'block';
    btnGenerateLink.innerText = "Regenerate Link Baru (Batalkan yang lama)";
}

if (btnGenerateLink) {
    btnGenerateLink.addEventListener('click', async () => {
        const newToken = generateToken();
        btnGenerateLink.innerText = "Membuat link...";
        
        const { error } = await supabase.from('kegiatan').update({ share_token: newToken }).eq('id', kegiatanId);

        if (error) {
            alert("Gagal membuat link: " + error.message);
            btnGenerateLink.innerText = "Generate Share Link";
        } else {
            tampilkanLink(newToken);
        }
    });
}

// Jalankan jika sedang berada di mode detail/edit kegiatan
document.addEventListener('DOMContentLoaded', () => {
    if (typeof kegiatanId !== 'undefined' && kegiatanId) {
        setTimeout(initSharePanel, 500); 
    }
});