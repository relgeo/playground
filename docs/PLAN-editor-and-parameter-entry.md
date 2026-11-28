# Rencana: Editor DSL dan Input Parameter Playground

**Status:** Implemented in Playground child revision `33631d930adc01efbdf25caccdd95e1af55e2526`  
**Tanggal:** 2026-11-28  
**Cakupan:** Playground browser — editor DSL dan panel parameter.

Dokumen ini menjadi catatan kontrak dan hasil implementasi. Browser execution
dan Node `>=24` parity tetap merupakan batas evidence terpisah bila host tidak
menyediakannya.

## Tujuan

Mempercepat penulisan DSL dan pengaturan ukuran pola dengan keyboard serta input angka langsung, tanpa mengurangi aksesibilitas, kejelasan nilai, atau kestabilan preview.

## Kontrak implementasi saat ini

- `src/components/Editor.tsx` menggunakan CodeMirror 6 dengan keymap lokal untuk Tab, Shift+Tab, dan Escape. Tab/Shift+Tab mengubah indentasi dua spasi pada editor editable; read-only tetap tidak mengubah source. Escape menutup autocomplete terlebih dahulu lalu memindahkan fokus ke kontrol berikutnya.
- Header editor memiliki tombol `Toggle word wrap` dengan `aria-pressed`. Word wrap dimulai mati untuk setiap halaman baru dan hanya hidup selama sesi.
- `src/components/Sidebar/ParametersCard.tsx` merender parameter numerik sebagai `input type="number"` dan mempertahankan metadata bounds/step hingga leaf parameter. Tidak ada batas sintetis `0–100`.
- `src/parameter-controls.ts` menerima hanya angka finite, menghormati bounds eksplisit, memakai fallback step `0.1` atau algoritma step sederhana, dan tidak menolak nilai manual yang bukan kelipatan step.
- `src/App.tsx` hanya meneruskan override numerik yang valid ke worker. Draft kosong/tidak lengkap/invalid tetap lokal di field dan preview memakai nilai baseline.
- Profile aktif memasok baseline melalui `getProfileOverrides`; Reset mengembalikan profile aktif atau default dokumen dan menghapus draft/error state.

## Rencana perubahan

### 1. Tab untuk indentasi DSL

Aktifkan perilaku Tab CodeMirror untuk indentasi YAML.

- Tab menyisipkan indentasi spasi sesuai indentasi YAML, bukan karakter tab literal.
- Indentasi standar editor adalah dua spasi.
- Seleksi beberapa baris dapat diindentasi dan didedentasi.
- Editor read-only tidak mengubah source.
- Tab selalu mengindentasi ketika editor editable sedang fokus; Tab tidak dipakai untuk keluar dari editor.
- Escape menjadi cara keyboard terpisah untuk memindahkan fokus keluar dari editor.
- Jika autocomplete terbuka, Escape pertama hanya menutup autocomplete dan fokus tetap di editor. Escape berikutnya, saat autocomplete sudah tertutup, memindahkan fokus ke kontrol berikutnya.

**Kriteria penerimaan**

- Menekan Tab di editor mengindentasi baris/konten yang dipilih.
- Pergeseran indentasi tetap berupa spasi dan mempertahankan YAML yang valid.
- Pengguna keyboard dapat keluar dari editor tanpa harus memakai mouse atau Ctrl+Tab.
- Pada mode read-only, Tab tidak mengubah source.

### 2. Toggle word wrap

Tambahkan tombol toggle pada ujung kanan title bar editor.

- Keadaan awal: word wrap mati.
- Toggle menyalakan dan mematikan `EditorView.lineWrapping`.
- Gunakan tombol dengan accessible name dan state `aria-pressed` yang sesuai.
- Simpan pilihan dalam state aplikasi selama sesi agar tidak hilang saat panel editor dirender ulang atau layout berubah. Pilihan tidak disimpan sebagai preferensi permanen; halaman baru kembali ke keadaan mati.
- Perubahan wrap mempertahankan source, posisi kursor, seleksi, dan konteks scroll sejauh yang didukung CodeMirror.

**Kriteria penerimaan**

- Baris panjang tidak membungkus saat keadaan awal.
- Tombol mengubah wrapping secara langsung dan state-nya dapat dibaca teknologi bantu.
- Toggle tetap bisa digunakan dengan keyboard dan tidak menyebabkan header meluap pada layar sempit.
- Mengubah wrap tidak mengubah isi DSL.

### 3. Input angka langsung untuk parameter

Ganti range slider dengan `input type="number"` untuk parameter numerik di panel parameter.

- Nilai parameter dapat diketik langsung.
- Hormati `min` dan `max` yang dinyatakan oleh parameter.
- Jika parameter memiliki `step` positif, gunakan sebagai kenaikan spinner. Jika tidak, usulan algoritmanya: hitung rentang `max - min`, bagi 100, lalu bulatkan ke atas ke angka sederhana pertama pada pola `1, 2, 5 × 10ⁿ`. Contoh: rentang 100 memberi step 1; rentang 10 memberi 0.1; rentang 5 memberi 0.05.
- Jika rentang tidak tersedia atau tidak valid, gunakan step `0.1`.
- `step` hanya mengatur kenaikan spinner, bukan validator nilai. Nilai desimal manual tetap valid meski bukan kelipatan step. Validasi aplikasi hanya memakai nilai numerik finite dan batas `min`/`max` yang dinyatakan.
- Jangan menerapkan batas bawaan slider `0–100` sebagai batas input angka jika parameter tidak mendeklarasikan batas tersebut.
- Simpan draft teks per parameter selama pengguna mengetik. Kirim override ke aplikasi hanya ketika nilainya merupakan angka finite dan valid; field kosong atau input sementara tidak boleh menghasilkan `NaN` pada resolver.
- Jika input tidak valid, pertahankan teks yang diketik dan tandai field (misalnya border merah disertai `aria-invalid` dan pesan yang terhubung ke field). Nilai invalid tidak dikirim ke worker; preview mempertahankan override finite terakhir, atau memakai baseline profile/default bila belum ada override. Saat input valid kembali, hapus tanda invalid dan gunakan nilai yang diketik.
- Jika `min` atau `max` eksplisit dilanggar, tandai field dan berikan pesan yang dapat diakses. Jangan diam-diam membulatkan atau membatasi nilai.
- Pertahankan aksi Reset dan pembaruan preview saat angka valid berubah.

### 4. Reset parameter yang mengikuti profile aktif

Tambahkan icon button Reset pada sisi kanan header panel Parameters, tepat di kiri kontrol collapse.

- Saat tidak ada profile aktif, Reset mengembalikan semua parameter ke nilai default dokumen.
- Saat profile aktif, Reset mengembalikan parameter ke nilai profile tersebut.
- Reset menghapus draft input yang belum valid dan pesan/error state terkait.
- Beri tombol accessible name dan tooltip yang menjelaskan target reset; nonaktifkan bila semua nilai sudah sama dengan baseline aktif dan tidak ada draft invalid.
- Tombol reset harus menjadi sibling dari kontrol collapse; jangan menempatkan button di dalam disclosure button yang sudah ada.

**Kriteria penerimaan**

- Pengguna dapat mengetik bilangan bulat maupun desimal, termasuk nilai seperti `12.35`.
- Nilai sementara seperti field kosong tidak merusak override atau preview.
- Reset mengembalikan nilai parameter ke default.
- Pada profile aktif, Reset mengembalikan nilai ke profile aktif, bukan ke default dokumen.
- Input invalid tetap terlihat dan ditandai, tetapi tidak pernah dikirim sebagai `NaN`; preview mempertahankan nilai valid terakhir atau baseline default/profile bila belum ada override.
- Nilai batas yang dideklarasikan tetap dihormati; nilai tanpa batas eksplisit tidak terikat pada rentang `0–100`. Step mengatur kenaikan spinner dan tidak menolak nilai manual yang bukan kelipatannya.
- Label, nilai, satuan bila tersedia, dan pesan validasi tetap jelas serta dapat diakses.
- Reset menghapus draft invalid dan mengembalikan state field ke baseline yang sesuai.

## Urutan implementasi

1. Tetapkan kontrak interaksi editor: indentasi Tab, dedent seleksi, jalur keluar keyboard, dan state word wrap.
2. Tambahkan state word wrap pada tingkat aplikasi lalu pasang/lepas extension CodeMirror sesuai state.
3. Ubah ekstraksi parameter agar metadata tipe dan step tetap tersedia sampai ke setiap leaf parameter.
4. Ganti slider dengan input angka dan tambahkan draft string serta validasi/fallback yang menjaga input invalid dari resolver.
5. Tambahkan reset profile-aware pada header panel Parameters; refaktor header agar reset dan collapse menjadi kontrol sibling yang aksesibel.
6. Rapikan CSS untuk tombol header dan input angka pada desktop serta layout sempit.
7. Perbarui dokumentasi shortcut editor dan catatan parameter-entry Playground.

## Berkas yang kemungkinan disentuh

- `src/components/Editor.tsx` — indentasi Tab, word wrap, kontrol title bar.
- `src/App.tsx` — state word wrap tingkat aplikasi dan integrasi parameter yang sudah valid.
- `src/components/Sidebar/ParametersCard.tsx` — field angka, draft teks, validasi, metadata parameter.
- `src/components/Sidebar.tsx` — kontrol reset pada header panel Parameters, sejajar dengan kontrol collapse.
- `src/components/Sidebar/ProfilesCard.tsx` — koordinasi pilihan profile dan baseline parameter untuk reset.
- `src/index.css` — tata letak title bar, toggle, input angka, dan pesan validasi.
- `docs/KEYBOARD-SHORTCUTS.md` — perilaku Tab dan cara keluar dari editor.
- `src/__tests__/` dan `e2e/playground.spec.ts` — verifikasi perilaku keyboard, parameter, dan UI.

## Verifikasi sebelum rilis

- Pemeriksaan type/lint dan build Playground.
- Uji editor: Tab, dedent seleksi, read-only, keluar dengan keyboard, serta word wrap default dan toggle.
- Uji parameter: ketik angka bulat/desimal, draft kosong, nilai batas, step, invalid/NaN fallback, Reset pada default dan profile aktif, serta pembaruan preview.
- Uji browser pada desktop dan layar sempit; pastikan title bar serta parameter tidak overflow.
- Periksa accessible name, state toggle, label field, dan hubungan pesan validasi dengan field.

## Keputusan UX yang disepakati

1. Keputusan: Tab selalu mengindentasi di editor editable. Escape pertama menutup autocomplete saja bila terbuka; Escape berikutnya memindahkan fokus keluar dari editor.
2. Keputusan: nilai manual yang bukan kelipatan step tetap diterima. Step hanya mengatur kenaikan spinner.
3. Keputusan step otomatis: hitung `rentang / 100`, lalu bulatkan ke atas ke nilai pertama dalam pola `1, 2, 5 × 10ⁿ`. Jika rentang tidak tersedia atau tidak valid, gunakan fallback `0.1`. Step hanya mengatur kenaikan spinner, bukan memvalidasi nilai manual.
4. Keputusan: semua parameter numerik memakai input angka pada lingkup implementasi ini. Struktur sebaiknya memungkinkan pengaturan default jenis input per tipe data melalui panel Settings pada iterasi mendatang; panel Settings itu sendiri di luar cakupan sekarang.
