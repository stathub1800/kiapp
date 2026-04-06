const urlParams = new URLSearchParams(window.location.search);
const triwulanId = urlParams.get('id');

async function loadTriwulanInfo() {
    if (!triwulanId) return;
    
    // Ambil info nama triwulan
    const { data } = await supabase.from('triwulan').select('*').eq('id', triwulanId).single();
    if (data) {
        document.getElementById('triwulanTitle').innerText = `${data.nama} - Tahun ${data.tahun}`;
    }
}

async function loadKegiatanList() {
    const tableBody = document.getElementById('kegiatanListBody');
    const emptyMessage = document.getElementById('emptyMessage');
    
    const { data, error } = await supabase
        .from('kegiatan')
        .select('*')
        .eq('triwulan_id', triwulanId)
        .order('waktu_pelaksanaan', { ascending: false });

    if (error || !data || data.length === 0) {
        tableBody.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';
    let html = '';
    data.forEach(keg => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">${keg.waktu_pelaksanaan}</td>
                <td style="padding: 12px;"><strong>${keg.nama_kegiatan}</strong></td>
                <td style="padding: 12px; font-size: 14px;">${keg.rencana_kerja_kipapp}</td>
                <td style="padding: 12px;">
                    <a href="kegiatan.html?id=${keg.id}" style="color: var(--secondary); text-decoration: none; font-weight: bold;">Edit/Detail &rarr;</a>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

// Tombol Tambah Kegiatan Baru
document.getElementById('btnTambahKegiatan').addEventListener('click', () => {
    window.location.href = `kegiatan.html?triwulan_id=${triwulanId}`;
});

document.addEventListener('DOMContentLoaded', () => {
    loadTriwulanInfo();
    loadKegiatanList();
});