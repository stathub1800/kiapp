const urlParams = new URLSearchParams(window.location.search);
const triwulanId = urlParams.get('triwulan_id'); // Muncul jika dari Dashboard -> Tambah
const kegiatanId = urlParams.get('id'); // Muncul jika sedang Edit/Detail

async function loadDropdownKipapp() {
    const dropdown = document.getElementById('rencana_kerja');
    const { data, error } = await supabase.from('rencana_kerja_kipapp').select('*').eq('aktif', true);
    
    if (data) {
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nama; // Menyimpan nama ke database sesuai SDD
            option.textContent = `[${item.kode}] ${item.nama}`;
            dropdown.appendChild(option);
        });
    }
}

async function loadKegiatanDetail() {
    if (!kegiatanId) return;

    document.getElementById('formTitle').innerText = "Edit Kegiatan";
    const { data, error } = await supabase.from('kegiatan').select('*').eq('id', kegiatanId).single();

    if (data) {
        document.getElementById('nama_kegiatan').value = data.nama_kegiatan;
        document.getElementById('waktu_pelaksanaan').value = data.waktu_pelaksanaan;
        document.getElementById('rencana_kerja').value = data.rencana_kerja_kipapp;
        document.getElementById('deskripsi').value = data.deskripsi;
        
        // Tampilkan panel bukti dukung karena data kegiatan sudah ada
        document.getElementById('panelBuktiDukung').style.display = 'block';
    }
}

document.getElementById('formKegiatan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSimpan = document.getElementById('btnSimpanKegiatan');
    btnSimpan.innerText = "Menyimpan...";
    btnSimpan.disabled = true;

    const payload = {
        nama_kegiatan: document.getElementById('nama_kegiatan').value,
        waktu_pelaksanaan: document.getElementById('waktu_pelaksanaan').value,
        rencana_kerja_kipapp: document.getElementById('rencana_kerja').value,
        deskripsi: document.getElementById('deskripsi').value
    };

    let result;
    if (kegiatanId) {
        // Mode Update
        result = await supabase.from('kegiatan').update(payload).eq('id', kegiatanId);
    } else {
        // Mode Insert
        payload.triwulan_id = triwulanId;
        const { data: { user } } = await supabase.auth.getUser();
        payload.created_by = user.id;
        
        result = await supabase.from('kegiatan').insert([payload]).select().single();
    }

    btnSimpan.innerText = "Simpan Kegiatan";
    btnSimpan.disabled = false;

    if (result.error) {
        alert("Gagal menyimpan: " + result.error.message);
    } else {
        alert("Kegiatan berhasil disimpan!");
        // Jika baru insert, refresh halaman ke mode edit agar bisa upload file
        if (!kegiatanId) {
            window.location.href = `kegiatan.html?id=${result.data.id}`;
        }
    }
});

// Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    await loadDropdownKipapp();
    if (kegiatanId) {
        await loadKegiatanDetail();
    }
});