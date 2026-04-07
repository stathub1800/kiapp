// ==========================================
// 1. LOGIKA TAB NAVIGASI
// ==========================================
function openTab(tabId, btnElement) {
    // Sembunyikan semua tab content
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Hapus status active dari semua tombol
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Tampilkan tab yang diklik
    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');

    // Jika tab kalender dibuka, render ulang kalender agar ukurannya pas
    if(tabId === 'tab-kalender' && window.calendarAPI) {
        window.calendarAPI.render();
    }
}

// ==========================================
// 2. MODUL TRIWULAN (Fungsi Asli)
// ==========================================
async function loadTriwulan() {
    const listContainer = document.getElementById('triwulanList');
    if (!listContainer) return;

    const { data, error } = await supabase.from('triwulan').select('*').order('tahun', { ascending: false }).order('periode', { ascending: true });

    if (error) { listContainer.innerHTML = `<p style="color:var(--danger)">Error: ${error.message}</p>`; return; }
    if (data.length === 0) { listContainer.innerHTML = "<p>Belum ada data triwulan.</p>"; return; }

    let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
    data.forEach(item => {
        html += `
            <div style="padding: 15px; border: 1px solid var(--border); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: #fff;">
                <div>
                    <strong style="font-size: 16px; color: var(--primary);">${item.nama}</strong><br>
                    <span style="font-size: 13px; color: var(--text-muted);">Tahun ${item.tahun}</span>
                </div>
                <a href="triwulan.html?id=${item.id}" class="btn-primary" style="text-decoration: none;">Buka Triwulan &rarr;</a>
            </div>
        `;
    });
    html += '</div>';
    listContainer.innerHTML = html;
}

const formTriwulan = document.getElementById('formTriwulan');
if (formTriwulan) {
    formTriwulan.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('namaTriwulan').value;
        const tahun = document.getElementById('tahunTriwulan').value;
        const periode = document.getElementById('periodeTriwulan').value;

        const { error } = await supabase.from('triwulan').insert([{ nama, tahun: parseInt(tahun), periode: parseInt(periode) }]);

        if (error) { alert("Gagal: " + error.message); } 
        else { formTriwulan.reset(); loadTriwulan(); }
    });
}

// ==========================================
// 3. MODUL KANBAN BOARD
// ==========================================
async function loadKanban() {
    const { data, error } = await supabase.from('kegiatan').select('id, nama_kegiatan, status').order('created_at', { ascending: false });
    if (error || !data) return;

    // Kosongkan kolom terlebih dahulu
    document.getElementById('col-Persiapan').innerHTML = '';
    document.getElementById('col-Pelaksanaan').innerHTML = '';
    document.getElementById('col-Evaluasi').innerHTML = '';
    document.getElementById('col-Selesai').innerHTML = '';

    // Masukkan kartu ke kolom masing-masing
    data.forEach(keg => {
        const status = keg.status || 'Persiapan'; // Default jika kosong
        const col = document.getElementById(`col-${status}`);
        if(col) {
            col.innerHTML += `
                <div class="kanban-card" data-id="${keg.id}">
                    <h5>${keg.nama_kegiatan}</h5>
                    <a href="kegiatan.html?id=${keg.id}" style="font-size: 12px; color: var(--secondary); text-decoration: none;">Lihat Detail</a>
                </div>
            `;
        }
    });

    // Inisialisasi Drag-and-Drop (SortableJS) untuk ke-4 kolom
    const statuses = ['Persiapan', 'Pelaksanaan', 'Evaluasi', 'Selesai'];
    statuses.forEach(status => {
        new Sortable(document.getElementById(`col-${status}`), {
            group: 'shared', // Mengizinkan tarik-lepas antar kolom
            animation: 150,
            onEnd: async function (evt) {
                const itemEl = evt.item;  // Kartu yang ditarik
                const newStatus = evt.to.parentElement.parentElement.getAttribute('data-status'); // Kolom tujuan
                const kegiatanId = itemEl.getAttribute('data-id');

                // Update status di database Supabase secara diam-diam!
                await supabase.from('kegiatan').update({ status: newStatus }).eq('id', kegiatanId);
            },
        });
    });
}

// ==========================================
// 4. MODUL KALENDER (FullCalendar)
// ==========================================
async function loadKalender() {
    const calendarEl = document.getElementById('calendar');
    
    // Ambil data kegiatan
    const { data } = await supabase.from('kegiatan').select('id, nama_kegiatan, waktu_pelaksanaan, waktu_selesai');
    
    // Format data agar sesuai dengan standar FullCalendar
    const events = data ? data.map(keg => {
        // FullCalendar butuh H+1 untuk tanggal selesai (exclusive end date)
        let endObj = new Date(keg.waktu_selesai || keg.waktu_pelaksanaan);
        endObj.setDate(endObj.getDate() + 1); 
        let endString = endObj.toISOString().split('T')[0];

        return {
            title: keg.nama_kegiatan,
            start: keg.waktu_pelaksanaan,
            end: endString,
            url: `kegiatan.html?id=${keg.id}`,
            color: 'var(--secondary)'
        };
    }) : [];

    // Render Kalender
    window.calendarAPI = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        events: events,
        eventClick: function(info) {
            info.jsEvent.preventDefault(); // Mencegah buka tab baru otomatis
            if (info.event.url) { window.location.href = info.event.url; }
        }
    });
    window.calendarAPI.render();
}

// ==========================================
// INISIALISASI SAAT HALAMAN DIMUAT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadTriwulan();
    loadKanban();
    loadKalender();
});