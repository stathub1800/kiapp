// Fetch dan tampilkan data Triwulan
async function loadTriwulan() {
    const listContainer = document.getElementById('triwulanList');
    if (!listContainer) return;

    const { data, error } = await supabase
        .from('triwulan')
        .select('*')
        .order('tahun', { ascending: false })
        .order('periode', { ascending: true });

    if (error) {
        listContainer.innerHTML = `<p style="color:red">Error loading data: ${error.message}</p>`;
        return;
    }

    if (data.length === 0) {
        listContainer.innerHTML = "<p>Belum ada data triwulan.</p>";
        return;
    }

    let html = '<ul style="list-style:none; padding:0;">';
    data.forEach(item => {
        html += `
            <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                <span><strong>${item.nama}</strong> - Tahun ${item.tahun}</span>
                <a href="kegiatan.html?triwulan_id=${item.id}" style="color: var(--secondary); text-decoration: none;">Lihat Kegiatan &rarr;</a>
            </li>
        `;
    });
    html += '</ul>';
    listContainer.innerHTML = html;
}

// Tambah Triwulan Baru
const formTriwulan = document.getElementById('formTriwulan');
if (formTriwulan) {
    formTriwulan.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('namaTriwulan').value;
        const tahun = document.getElementById('tahunTriwulan').value;
        const periode = document.getElementById('periodeTriwulan').value;

        const { error } = await supabase.from('triwulan').insert([
            { nama: nama, tahun: parseInt(tahun), periode: parseInt(periode) }
        ]);

        if (error) {
            alert("Gagal menambah data: " + error.message);
        } else {
            formTriwulan.reset();
            loadTriwulan(); // Reload list
        }
    });
}

// Inisialisasi saat dokumen siap
document.addEventListener('DOMContentLoaded', () => {
    loadTriwulan();
});