// js/share.js

async function initSharePanel() {
    // Ambil ID kegiatan langsung dari URL untuk memastikan
    const params = new URLSearchParams(window.location.search);
    const currentId = params.get('id');
    
    const panelShare = document.getElementById('panelShare');
    const btnGenerateLink = document.getElementById('btnGenerateLink');
    const shareLinkContainer = document.getElementById('shareLinkContainer');
    const shareLinkUrl = document.getElementById('shareLinkUrl');
    const openShareLink = document.getElementById('openShareLink');

    if (!currentId || !panelShare) return;

    // Munculkan panel karena ID sudah ada
    panelShare.style.display = 'block';

    // Cek jika link sudah pernah dibuat sebelumnya di database
    const { data, error } = await supabase
        .from('kegiatan')
        .select('share_token')
        .eq('id', currentId)
        .single();

    if (data && data.share_token) {
        tampilkanLink(data.share_token);
    }

    // Fungsi untuk menampilkan link di input box
    function tampilkanLink(token) {
        const baseUrl = window.location.href.split('kegiatan.html')[0];
        const fullUrl = `${baseUrl}view.html?token=${token}`;
        
        shareLinkUrl.value = fullUrl;
        openShareLink.href = fullUrl;
        shareLinkContainer.style.display = 'block';
        btnGenerateLink.innerText = "Regenerate Link Baru";
    }

    // Event Klik Tombol Generate
    btnGenerateLink.onclick = async () => {
        btnGenerateLink.innerText = "Membuat link...";
        
        // Buat token acak
        const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const { error } = await supabase
            .from('kegiatan')
            .update({ share_token: newToken })
            .eq('id', currentId);

        if (error) {
            alert("Gagal membuat link: " + error.message);
            btnGenerateLink.innerText = "Generate Share Link";
        } else {
            tampilkanLink(newToken);
        }
    };
}

// Jalankan fungsi setelah halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Beri jeda sedikit agar koneksi supabase siap
    setTimeout(initSharePanel, 800);
});