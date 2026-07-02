// ============================================================
// cache.js — Cache Data Bersama (Client-Side)
// Tujuan: mengurangi beban query ke Supabase.
//   - Satu kali fetch dipakai bersama oleh SEMUA tab
//   - TTL (masa berlaku) per jenis data
//   - Invalidate otomatis setiap kali ada tulis (insert/update/delete)
// Semua modul WAJIB pakai AppCache, jangan query kegiatan langsung.
// ============================================================

const AppCache = {
    _data: { kegiatan: null, triwulan: null, kpi: null },
    _time: { kegiatan: 0,   triwulan: 0,   kpi: 0 },
    _pending: {},          // dedup: request paralel share 1 promise

    // Masa berlaku cache (ms)
    TTL: {
        kegiatan: 60 * 1000,        // 1 menit — data operasional
        triwulan: 30 * 60 * 1000,   // 30 menit — jarang berubah
        kpi:      30 * 60 * 1000,   // 30 menit — jarang berubah
    },

    _fresh(key) {
        return this._data[key] && (Date.now() - this._time[key] < this.TTL[key]);
    },

    async _fetch(key, queryFn, force) {
        if (!force && this._fresh(key)) return this._data[key];

        // Dedup: kalau ada fetch yang sedang jalan, tumpangi saja
        if (this._pending[key]) return this._pending[key];

        this._pending[key] = (async () => {
            try {
                const { data, error } = await queryFn();
                if (error) {
                    console.error(`[cache] ${key}:`, error.message);
                    // Kembalikan data lama (stale) jika ada, daripada kosong
                    return this._data[key] || [];
                }
                this._data[key] = data || [];
                this._time[key] = Date.now();
                return this._data[key];
            } finally {
                delete this._pending[key];
            }
        })();
        return this._pending[key];
    },

    // ── SEMUA kegiatan (termasuk Batal — filter di sisi klien) ──
    async getKegiatan(force = false) {
        return this._fetch('kegiatan', () =>
            supabase.from('kegiatan')
                .select('*, triwulan(nama, tahun, periode)')
                .order('waktu_selesai', { ascending: true }),
            force
        );
    },

    async getTriwulan(force = false) {
        return this._fetch('triwulan', () =>
            supabase.from('triwulan').select('*').order('tahun').order('periode'),
            force
        );
    },

    async getKpi(force = false) {
        return this._fetch('kpi', () =>
            supabase.from('rencana_kerja_kipapp').select('*').order('kode'),
            force
        );
    },

    // ── Invalidate: panggil setiap kali habis insert/update/delete ──
    invalidate(key) {
        if (key) { this._time[key] = 0; }
        else     { this._time = { kegiatan: 0, triwulan: 0, kpi: 0 }; }
    },

    // ── Patch lokal: update 1 kegiatan di cache tanpa re-fetch ──
    // (dipakai untuk perubahan status/fase agar UI langsung sinkron
    //  TANPA query tambahan ke Supabase)
    patchKegiatan(id, fields) {
        if (!this._data.kegiatan) return;
        const k = this._data.kegiatan.find(x => x.id === id);
        if (k) Object.assign(k, fields);
    }
};

window.AppCache = AppCache;
