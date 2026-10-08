# KasirPro - Aplikasi Kasir

Aplikasi kasir berbasis web dengan **Bootstrap 5** dan penyimpanan data di
`localStorage`. Tidak perlu install server atau database, dan tidak perlu
koneksi internet saat dijalankan.

## Cara menjalankan

Buka `index.html` langsung di browser (Chrome/Edge/Firefox).

Alternatif dengan server lokal (opsional):

```bash
npx serve .
```

## Akun demo

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | `admin`  | `admin123` |
| Kasir | `kasir`  | `kasir123` |
| Kasir | `siti`   | `siti123`  |

## Yang baru di versi ini

**Foto produk menggantikan emoji.** Semua 12 produk memakai foto sungguhan,
disimpan lokal di `assets/img/products/`. Foto muncul di kartu produk POS,
keranjang, struk, tabel riwayat, detail transaksi, halaman produk, dan
laporan. Sumber foto dan lisensinya tercatat di
`assets/img/products/credits.json` (semua dari Wikimedia Commons: CC0,
CC BY, CC BY-SA, atau public domain).

Form tambah/edit produk punya pemilih foto: unggah file dari komputer
(dibatasi 400 KB, disimpan sebagai data URL) atau tempel path/URL gambar.
Produk tanpa foto otomatis memakai `placeholder.svg`.

**Bootstrap 5 untuk layout.** Grid, spacing, form, dan utility class
sekarang pakai Bootstrap. `style.css` hanya menangani identitas visual
aplikasi (tema, sidebar, kartu produk, keranjang, struk, grafik). Kartu
produk dan kartu statistik memakai `col-xl-3`, sehingga **4 per baris** di
layar lebar.

**Struktur kelas lama dibersihkan.** Class custom `grid-4`, `mb-16`,
`flex-between`, dan kolom teks `right` digantikan padanan Bootstrap
(`row`/`col`, spacing utility, `text-end`).

## Fitur

**Login & role** — admin dan kasir, penolakan password salah atau akun nonaktif,
sesi bertahan selama tab terbuka, route admin dicegah untuk kasir.

**Dashboard** — omzet hari ini, omzet 7 hari + perbandingan ke minggu lalu,
rata-rata transaksi, stok menipis, grafik harian, jam tersibuk, produk
terlaris, daftar restock, dan transaksi terbaru.

**Kasir / POS** — katalog dengan foto, filter kategori, pencarian live,
keranjang interaktif, diskon nominal/persen, pembayaran TUNAI dengan hitung
kembalian dan tombol cepat atau DEBIT/QRIS/KREDIT, struk digital, stok
otomatis berkurang.

**Riwayat Transaksi** — tabel dengan foto produk, ringkasan total, paging,
pencarian, filter tanggal/pembayaran/kasir, scope transaksi saya, detail per
item, hapus transaksi (admin), ekspor CSV.

**Manajemen Produk (admin)** — CRUD produk beserta foto, atur stok, badge
status stok, pengaturan nama/alamat/pajak toko, reset data demo.

**Manajemen Pengguna (admin)** — CRUD akun, role, status aktif, reset password.

**Laporan (admin)** — periode 7/14/30 hari, tren omzet, performa per kasir,
komposisi pembayaran, produk terlaris, cetak laporan.

## Struktur berkas

```
index.html
assets/vendor/bootstrap.min.css       # Bootstrap 5.3.3 (lokal)
assets/vendor/bootstrap.bundle.min.js
assets/css/style.css                  # tema aplikasi di atas Bootstrap
assets/img/products/p1..p12.jpg       # foto produk
assets/img/products/placeholder.svg   # fallback foto
assets/img/products/credits.json      # sumber foto & lisensi
assets/js/store.js                    # data layer, migrasi, statistik
assets/js/ui.js                       # toast, modal, konfirmasi
assets/js/auth.js                     # login, sesi, hak akses
assets/js/app.js                      # router hash-based + shell
assets/js/views/                      # dashboard, pos, transactions,
                                      # products, users, report
```

## Catatan

- Data disimpan di `localStorage` dengan kunci `kasirpro_db_v1`, jadi lokal per
  browser/perangkat.
- Data versi lama yang produknya masih memakai emoji akan otomatis
  di-backfill dengan path foto saat aplikasi dibuka.
- Untuk multi-mesin atau riwayat permanen, ganti lapisan `Store` dengan
  pemanggilan API backend.
- Foto produk berlisensi bebas dari Wikimedia Commons; wajib menyertakan
  atribusi bila foto dipakai ulang di luar aplikasi ini.
