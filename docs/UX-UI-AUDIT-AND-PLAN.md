# RelGeo Playground — UX/UI Audit & Improvement Plan

**Status:** audit baseline  
**Tanggal:** 2026-09-13  
**Baseline:** `381b29a` (`main`)  
**Ruang lingkup:** browser IDE playground: editor, resolver, preview, inspector, graph, sidebar, responsive behavior, accessibility, share, dan export.

## 1. Ringkasan eksekutif

Playground memiliki fondasi teknis yang sehat dan kemampuan yang cukup lengkap: source editor, worker untuk resolve, preview SVG, model/physical surface, parameter, layer, inspector, graph, serta share/export. Alur produknya sudah terbentuk:

> pilih contoh → baca/edit source → resolve → lihat preview → inspeksi hasil → share/export

Masalah utamanya bukan kekurangan fitur, melainkan kepadatan dan prioritas. Banyak kemampuan ditempatkan sekaligus dalam satu workbench, sementara tugas utama pengguna belum cukup dominan. Dampaknya:

- pengguna baru tidak selalu segera melihat hasil gambar yang berguna;
- navbar, preview toolbar, dan sidebar membagi kontrol ke terlalu banyak tempat;
- inspector dan graph lebih terasa seperti dump data daripada alat diagnosis;
- beberapa kontrol masih mouse-only atau belum mempunyai state semantik yang lengkap;
- responsive CSS masih membawa jejak layout lama;
- visual system belum sepenuhnya mengikuti arah RelGeo: bentuk sederhana, tidak rounded secara default, dan hierarki tegas.

| Prioritas | Fokus | Dampak |
| --- | --- | --- |
| P1 | First-run preview dan kepadatan layout | Pengguna segera tahu playground bekerja |
| P1 | Responsive/mobile dan keyboard access | Lebih banyak kondisi penggunaan menjadi layak |
| P1 | Status, error recovery, dan feedback aksi | Pengguna tahu apa yang terjadi dan cara pulih |
| P1 | Sidebar, inspector, dan graph navigation | Diagnosis tidak terasa seperti mencari data mentah |
| P2 | Visual system dan CSS cleanup | Tampilan tenang, konsisten, mudah dirawat |
| P2 | Persistence, dirty state, dan share semantics | Ekspektasi pengguna lebih aman |

## 2. Batas produk dan prinsip

`docs/README.md` memosisikan playground sebagai **lightweight browser IDE**, bukan pengganti penuh desktop workbench atau Flutter IDE. Audit ini mempertahankan batas tersebut.

### Prinsip yang dipertahankan

- Source tetap menjadi pusat: pengguna dapat membaca, mengedit, dan membagikan DSL.
- Preview harus memberi hasil visual yang cepat dan dapat dipercaya.
- Inspector, graph, layers, dan parameters adalah konteks, bukan layar utama yang bersaing dengan editor/preview.
- Model dan physical surface harus mudah dibedakan.
- Kontrol lanjutan boleh padat pada desktop, tetapi tidak boleh menjadi mouse-only.
- Rounded hanya dipakai jika punya fungsi jelas: selector, status, segmented control, atau target aksi tertentu.
- Jangan menambah sistem preferensi besar sebelum alur utama stabil.

### Non-goals

- Tidak menjadikan playground replika Flutter.
- Tidak mengganti preview RelGeo dengan gambar dekoratif/AI.
- Tidak membangun kolaborasi multi-user.
- Tidak menyembunyikan kemampuan teknis; kemampuan itu hanya ditata menurut konteks.

## 3. Metode dan bukti

Audit mencakup `src/App.tsx`, `Navbar.tsx`, `Sidebar.tsx`, `Inspector.tsx`, `GraphViewer.tsx`, `Preview.tsx`, `index.css`, README, `docs/README.md`, konfigurasi Vite, dan scripts.

Validasi baseline:

- TypeScript check: **lulus**.
- Vite production build: **lulus**.
- Vitest: **48/48 test lulus**.
- ESLint: **lulus**.
- Preview produksi lokal dibuka pada `http://127.0.0.1:4325/playground/`.
- Sweep browser viewport 390×844 dengan reduced-motion: 37 kontrol DOM terlihat, seluruhnya memiliki accessible name, seluruhnya tercapai dengan Tab, dan `scrollWidth` tetap 390.
- AX tree standalone playground: kontrol yang terdeteksi memiliki nama, termasuk editor, combobox, slider, button, dan checkbox.

Validasi itu membuktikan baseline tidak sedang rusak secara teknis. Itu belum membuktikan alur nyaman, jelas, dan optimal pada perangkat fisik.

### Keterbatasan

- Belum ada uji handset fisik.
- Belum ada traversal penuh dengan VoiceOver, TalkBack, atau screen reader nyata.
- Screenshot lokal adalah spot check, bukan usability study.
- Beberapa temuan visual harus dikonfirmasi lagi setelah camera dan responsive layout berubah.

## 4. Peta alur pengguna

| Tahap | Kondisi saat ini | Penilaian |
| --- | --- | --- |
| First open | Banyak kontrol langsung terlihat, tetapi hasil gambar pada spot check berada terlalu rendah dalam canvas | Friksi tinggi |
| Pilih contoh | Selector ada, tetapi nama contoh terpotong pada toolbar | Friksi sedang |
| Edit source | Editor berfungsi dan accessible; feedback resolve belum cukup komunikatif | Friksi sedang |
| Resolve | Status READY/error ada, tetapi feedback aksi belum seragam | Friksi sedang |
| Preview | Kaya fitur, namun kontrol tersebar dan framing awal kurang meyakinkan | Friksi tinggi |
| Inspect | Data tersedia, tetapi object list flat dan panjang | Friksi tinggi |
| Recover error | Jump-to-code ada, tetapi sebagian affordance mouse-only | Friksi tinggi |
| Parameters/layers | Kemampuan ada; grouping dan state panel belum cukup jelas | Friksi sedang |
| Graph | Ada dan berguna dengan mouse; navigasi accessible belum memadai | Friksi tinggi |
| Share/export | Aksi tersedia, tetapi kegagalan dan hasil belum selalu diinformasikan | Friksi sedang |
| Reset/ganti contoh | Source dapat terganti; belum ada dirty-state/konfirmasi | Risiko tinggi |

## 5. Temuan audit

Severity: **P0** memblokir tugas utama; **P1** mengganggu penggunaan normal, aksesibilitas, atau recovery; **P2** adalah kualitas, discoverability, konsistensi, atau maintainability.

### P1 — first-run, layout, dan accessibility

#### U01 — Framing preview awal tidak meyakinkan

**Observasi:** preview produksi lokal menampilkan ruang kosong besar di bagian atas, dengan gambar mulai jauh di bawah viewport. Spot check tombol recenter belum menghasilkan framing yang cukup meyakinkan.

**Dampak:** pengguna baru dapat mengira resolver/renderer gagal, padahal gambar berada di luar fokus visual.

**Perbaikan:** tetapkan camera-fit contract. Setelah resolve sukses, bounding box harus terlihat utuh atau pusat gambar berada di viewport dengan margin konsisten. Bedakan `fit`, `recenter`, dan `reset zoom`.

**Acceptance:** contoh default menampilkan hasil utama tanpa scroll/pan; fit benar untuk gambar kecil, besar, kosong, dan multi-sheet.

#### U02 — Workbench terlalu padat pada desktop umum

**Observasi:** navbar menampung example selector, status, surface toggle, sheet selector, zoom, export, copy/share/reset, layout, dan sidebar controls. Selector contoh terlihat terpotong; banyak aksi hanya icon button.

**Dampak:** hierarki tindakan tidak jelas dan area editor/preview berkurang, terutama sekitar 1024px.

**Perbaikan:** pisahkan global workbench bar dari contextual preview toolbar. Kurangi kontrol yang selalu terlihat; pindahkan aksi jarang dipakai ke menu accessible. Beri ruang minimum untuk example name dan status.

**Acceptance:** pada 1280px dan 1024px label penting tidak terpotong dan hierarki aksi dapat dipahami tanpa tooltip satu per satu.

#### U03 — Responsive rules masih menarget layout lama

**Observasi:** `index.css` masih memiliki media queries untuk `.control-panel`, `.workspace`, `.hero-bar`, `.preview-tools`, dan `.view-mode-strip`, sedangkan layout aktif memakai `.main-area`, `.workspace-split`, `.navbar`, dan sidebar.

**Dampak:** breakpoint dapat terlihat ada tetapi tidak benar-benar mengubah layout aktif; layar sempit berisiko menjadi desktop yang terjepit.

**Perbaikan:** inventaris class aktif, isolasi selector legacy, lalu desain breakpoint aktif untuk 1024/940/720/480px. Pada mobile gunakan surface switch atau drawer untuk sidebar.

**Acceptance:** 390×844 dan 414×896 tidak horizontal overflow; editor, preview, sidebar, sheet, dan error state tetap reachable.

#### U04 — Header sidebar bukan disclosure semantic

**Observasi:** header `SidebarPanel` berupa `div` dengan `onClick`, bukan button/focusable control. Tidak ada `aria-expanded` dan `aria-controls`.

**Perbaikan:** gunakan button/disclosure semantic, id body panel, `aria-expanded`, focus style, dan keyboard activation.

**Acceptance:** semua panel dapat dibuka/ditutup dengan Tab + Enter/Space dan state terbaca di AX tree.

#### U05 — Resizer split/sidebar mouse-only

**Observasi:** `.split-resizer` dan `.sidebar-resizer` memakai `onMouseDown` serta listener mouse global, tanpa separator semantics, keyboard adjustment, atau label.

**Perbaikan:** gunakan `role="separator"`, orientation, `aria-valuenow/min/max`, `tabIndex=0`, Arrow/Home/End, serta preset editor/preview/editor-only/preview-only.

**Acceptance:** ukuran dapat diubah dengan keyboard dan tidak membuat layout unusable pada nilai ekstrem.

#### U06 — Reduced motion belum dihormati CSS playground

**Observasi:** ada pulse, transition, hover transform, dan fade, tetapi belum ada aturan `@media (prefers-reduced-motion: reduce)` khusus playground. Sweep sudah mendeteksi preference reduce, namun animasi belum otomatis dinonaktifkan.

**Perbaikan:** matikan motion non-esensial saat reduce aktif; gunakan perubahan warna/border/teks sebagai feedback.

**Acceptance:** recording/computed style pada reduced-motion tidak menjalankan animasi non-esensial.

#### U07 — Feedback aksi dan clipboard belum kuat

**Observasi:** export dapat return diam-diam saat SVG belum ada; copy tidak menangkap exception clipboard; share menangkap error hanya di log. Reset/ganti contoh belum memiliki dirty-state.

**Perbaikan:** buat feedback terpusat (`idle`, `working`, `success`, `error`), live region ringan, disabled state jujur, fallback copy manual, dirty indicator, dan konfirmasi saat draft berubah.

**Acceptance:** clipboard denied, SVG belum siap, export gagal, share berhasil, dan reset draft menghasilkan feedback berbeda yang dapat dipahami.

#### U08 — Inspector terlalu panjang dan flat

**Observasi:** object list menampilkan banyak object sekaligus, termasuk item generated berulang seperti `bathroom_tiles[i,j]`. Contoh Architectural Floor Plan memiliki sekitar 50 object entries.

**Dampak:** sulit menemukan object relevan dan menghubungkannya dengan gambar/source.

**Perbaikan:** search/filter, grouping role/parent, selected/related only, collapse all/expand selected, count per group, serta highlight dua arah preview/source/graph.

**Acceptance:** object 50+ dapat ditemukan berdasarkan nama dalam satu langkah dan dapat diikuti ke code serta preview.

#### U09 — Error recovery belum menjadi alur ringkas

**Observasi:** error banner dan sebagian dependency/object affordance masih perlu audit affordance menyeluruh. Ringkasan diagnostics dan “Go to first error” kini tersedia di Inspector, tetapi target navigasi tetap bergantung pada path/object id yang diberikan resolver.

**Perbaikan:** `role="alert"` untuk error baru, ringkasan jumlah error, tombol first-error, action semantic untuk object/dependency link, dan pesan recovery dengan lokasi source.

**Acceptance:** error dapat ditemukan dari keyboard, diumumkan screen reader, dan membawa user ke lokasi source yang tepat.

#### U10 — Graph node belum keyboard/screen-reader selectable

**Observasi:** SVG graph memiliki `role="img"` dan label keseluruhan, tetapi node `<g>` hanya `onClick` dengan cursor pointer.

**Perbaikan:** buat node focusable dengan role button, label, Enter/Space, selected state, dan sinkronisasi ke inspector/source; atau sediakan companion object list setara.

**Acceptance:** node penting dapat dicapai keyboard, punya nama, dan memilih node memperbarui inspector.

#### U11 — State control belum seluruhnya semantic

**Observasi:** overlay toggles, Model/Physical, layout, sidebar placement, dan inspector tabs memiliki visual state, tetapi tidak semuanya memakai `aria-pressed`, `aria-selected`, `role=tab`, `aria-controls`, atau equivalent.

**Perbaikan:** petakan control ke primitive tepat: toggle button, radio/segmented control, tab, disclosure, atau checkbox. Jangan mengandalkan `title` sebagai satu-satunya penjelasan.

**Acceptance:** AX tree menunjukkan selected/pressed/expanded/value state yang benar setelah setiap interaksi.

#### U12 — Gesture preview perlu kontrak mobile

**Observasi:** preview memakai `touchAction: none`, pointer capture, wheel modifier, dan pointer-based pan.

**Dampak:** perilaku native touch/scroll dapat tertahan dan gesture tidak otomatis dapat dipahami.

**Perbaikan:** tetapkan gesture contract: pan hanya di canvas, pinch bila didukung, toolbar sebagai alternatif non-gesture, dan halaman tetap dapat scroll di luar canvas.

**Acceptance:** touch user dapat pan/zoom tanpa halaman terjebak; fungsi penting tersedia tanpa gesture.

### P2 — visual language, discoverability, dan maintainability

#### U13 — Rounded/pill terlalu dominan

Radius default, icon button, selector, status pill, graph container, dan beberapa panel/chip membuat workbench terasa seperti kumpulan kartu. Definisikan radius token berdasarkan fungsi: editor/canvas/panel struktural kecil atau square; pill hanya untuk status/segmented control.

#### U14 — Toolbar ganda dan Model/Physical ambigu

Navbar dan Preview sama-sama mengatur surface/overlay/camera. Kelompokkan surface selector dekat preview, beri subtitle yang menjelaskan semantic model vs physical drawing, dan hilangkan duplikasi.

#### U15 — Icon-only action kurang discoverable

Pertahankan icon-only untuk aksi umum yang jelas konteksnya. Pada ruang longgar/mobile gunakan icon + label, tooltip tertunda, focus-visible label, dan disabled explanation.

#### U16 — Typography IBM Plex tidak dijamin

CSS menyebut IBM Plex Sans/Mono, tetapi source tidak memuat font file/import yang memastikan font tersedia. Putuskan self-host subset, import resmi, atau system stack sebagai kontrak; uji fallback.

#### U17 — Empty state memiliki `min-width: 400px`

`min-width` berisiko melampaui viewport 390px. Gunakan width fluid, `min-width: 0`, wrapping, dan ukur ulang pada 320/360/390px.

#### U18 — CSS legacy dan inline styling tersebar

`index.css` besar dan masih memiliki selector layout lama; Navbar/Preview juga memiliki inline style cukup banyak. Inventaris class dari JSX/TSX, hapus selector yang terbukti dead, pindahkan token/layout primitive ke layer jelas, dan pecah stylesheet hanya jika meningkatkan navigability.

#### U19 — README menyebut ISC, paket memakai MIT

Metadata paket dan `LICENSE` memakai MIT, tetapi README masih menyebut ISC. Selaraskan agar package surface dapat dipercaya.

#### U20 — Persistence draft tidak terlihat

Code disimpan ke localStorage dan URL hash setelah jeda, tetapi UI tidak membedakan default example, local draft, dan custom hash source. Tampilkan `Saved locally`/`Unsaved changes`, jelaskan bahwa share link memuat source, dan tetapkan strategi untuk hash panjang.

#### U21 — Graph fixed-layout cepat menjadi tidak terbaca

Graph memiliki overflow tetapi belum memiliki legend, search, zoom/minimap, atau focus mode. Mulai dari filter/focus selected dan legend sederhana; jangan memaksa semua node terlihat sekaligus.

## 6. Arah UX target

Gunakan tiga zona mental yang jelas:

```text
┌─────────────────────────────────────────────────────────────┐
│ identity · example · resolve status · share/export          │
├──────────────────────────────┬──────────────────────────────┤
│ SOURCE                       │ PREVIEW                      │
│ edit, errors, line context   │ fit, surface, overlays       │
├──────────────────────────────┴──────────────────────────────┤
│ optional context: inspector / parameters / layers / graph   │
└─────────────────────────────────────────────────────────────┘
```

Sidebar boleh berada di kanan/kiri pada desktop, tetapi secara mental tetap **optional context**. Pada mobile ia menjadi surface switch atau drawer, bukan kolom ketiga yang dipaksa mengecil.

### Hierarki aksi

1. **Primary:** edit source dan lihat hasil.
2. **Status:** tahu editing, resolving, ready, atau error.
3. **Context:** inspect object, parameter, layer, graph.
4. **Utility:** share, copy, export, reset.

Setiap zona sebaiknya memiliki paling banyak satu baris kontrol utama pada kondisi normal.

## 7. Rencana implementasi bertahap

### Phase 0 — Contract dan measurement

- [ ] Tetapkan viewport QA: 1440×900, 1280×800, 1024×768, 768×1024, 414×896, 390×844, 320×800.
- [ ] Simpan screenshot baseline untuk first open, valid result, error, inspector, graph, dan mobile.
- [ ] Tetapkan acceptance test alur choose → edit → resolve → inspect → share.
- [ ] Inventaris class aktif dan tandai selector CSS legacy.
- [ ] Tetapkan camera-fit contract untuk setiap surface/sheet.

### Phase 1 — Unblock daily loop

- [x] Camera fit/recenter tersedia pada default model desktop; Fit view kini juga tersedia langsung di toolbar Preview, dengan guard frame non-finite. Multi-sheet/mobile masih perlu matrix test.
- [ ] Pisahkan global controls dan preview contextual controls.
- [ ] Pastikan example selector tidak memotong nama penting.
- [x] Status utama diberi `role=status` dan live announcement.
- [x] Feedback copy/share/export dan clipboard fallback dasar sudah diterapkan.
- [x] Reset/ganti contoh sekarang meminta konfirmasi saat draft berubah.
- [x] Mobile surface switch untuk Source/Both/Preview dan sidebar drawer dengan backdrop sudah diimplementasikan; verifikasi viewport matrix dan touch nyata masih tersisa.
- [x] Empty state tidak lagi memaksa lebar 400px.

### Phase 2 — Inspect dan debug

- [x] Sidebar headers menjadi disclosure controls semantic.
- [x] Split/sidebar resizer menjadi keyboard-accessible separator; preset layout masih tersisa.
- [x] Inspector search, count, selected-only filter, generated-object grouping, cross-surface collapse behavior, related-object navigation, automatic related-object highlight, dan pilihan kedalaman relasi 1–3 level sudah tersedia.
- [x] Sinkronkan selection preview ↔ inspector ↔ graph ↔ code definition untuk object yang dipilih langsung; object terkait kini ikut ditandai tanpa mengubah single-selection focus.
- [x] Jadikan error summary/actions keyboard-accessible dan `role=alert`; ringkasan diagnostic mengumumkan jumlah error secara assertive dan tombol first-error serta detail action sudah berupa button native.
- [x] Inspector tabs memiliki tablist/tab/tabpanel semantics.
- [x] Graph node dapat difokuskan, diberi nama, dan dipilih dengan Enter/Space; graph filter, focus selection, dan legend juga tersedia. Tab order graph memakai roving focus agar hanya satu node yang masuk traversal.
- [x] Navigasi graph keyboard memakai ArrowLeft/Right/Up/Down serta Home/End untuk berpindah fokus antarnode tanpa menambah puluhan stop Tab; smoke test browser memverifikasi satu `tabIndex=0` dan perpindahan fokus.
- [x] Graph memberi petunjuk keyboard yang tersembunyi secara visual tetapi tersedia untuk assistive technology melalui `aria-describedby`; style statis graph viewer dipindahkan dari inline ke class CSS.
- [x] Navbar menghapus style inline yang statis pada kontrol preview, status, zoom, dan brand; tombol entry Sheet/View kembali memakai radius kontrol kecil, bukan radius pill.
- [x] Preview memindahkan layout statis shell, toolbar, stage, viewport, dan wrapper SVG ke class CSS; style inline yang tersisa di Preview hanya untuk state geometry/zoom atau overlay interaktif.
- [x] Inspector diagnostics tanpa source target kini tetap memberi recovery cue eksplisit (`Fix source or reset draft`), sementara action jump hanya dirender ketika target object/path memang tersedia.
- [x] Browser error smoke memverifikasi invalid YAML menghasilkan `role=alert` summary/detail tanpa horizontal overflow, lalu `Reset to selected example` mengembalikan editor ke READY dan menghapus error banner.
- [x] Sidebar Layers, Parameters, Profiles, dan Meta Presets memindahkan style statis ke class CSS; metadata entry menggunakan radius kontrol kecil, dan smoke test pergantian contoh tetap tanpa overflow.
- [x] Graph memiliki filter nama/tipe, mode Focus selection berbasis neighborhood, count live, legend tipe/status, dan node keyboard-selectable.

### Phase 3 — Visual system dan cleanup

- [ ] Definisikan tokens warna, border, spacing, radius, type, elevation, dan focus ring.
- [ ] Kurangi rounded default; gunakan radius berdasarkan fungsi.
- [ ] Satukan style control yang tersebar di inline styles/CSS.
- [x] Putuskan strategi font IBM Plex yang eksplisit; token font dan fallback runtime sudah didefinisikan.
- [ ] Hapus selector legacy setelah regression check.
- [ ] Pecah stylesheet hanya pada batas concern yang membantu perawatan.
- [x] README, `package.json`, dan `LICENSE` sudah menyatakan MIT secara konsisten; penyelarasan metadata dasar selesai.

### Phase 4 — Verification dan release gate

- [x] Jalankan typecheck, lint, unit test, dan production build.
- [x] Browser smoke pada viewport aktif 1280×720 tidak menemukan horizontal overflow; audit DOM terhadap 196 control terlihat menemukan nama/label pada seluruh control.
- [x] Keyboard smoke pada viewport aktif 812×667: drawer sidebar mempertahankan fokus sampai ditutup, lalu 90 Tab stops workspace yang terobservasi seluruhnya terlihat dan bernama; kontrol layout desktop yang tersembunyi tidak masuk Tab order.
- [ ] Uji keyboard traversal penuh untuk navbar, editor, preview, sidebar, inspector, graph, error, dan dialog.
- [ ] Uji AX names, roles, expanded/selected/pressed/value states, dan alert announcements.
- [x] Tambahkan reduced-motion rule; verifikasi recording/computed style masih perlu dilakukan.
- [ ] Uji clipboard denied, no SVG, slow resolve, stale worker, syntax error, dan long URL hash.
- [ ] Uji browser responsive pada viewport matrix.
- [ ] Uji handset fisik dan VoiceOver/TalkBack.
- [ ] Smoke test URL deploy serta pin versi playground pada website.

## 8. Acceptance criteria terukur

| Area | Kriteria selesai |
| --- | --- |
| First run | Contoh default, status, source, dan gambar utama terlihat tanpa pengguna menebak tombol fit |
| Camera | Fit/recenter konsisten untuk sheet dan bounding box relevan |
| Responsive | Tidak ada horizontal overflow pada 390px; source/preview/context punya navigasi jelas |
| Keyboard | Semua tindakan utama dan panel dapat dipakai tanpa mouse |
| Semantics | Toggle/tab/disclosure/separator/alert memiliki role dan state sesuai |
| Error | User dapat menemukan error pertama, lompat ke source, dan memahami recovery |
| Inspector | Object 50+ dapat dicari, difilter, dikelompokkan, dan disinkronkan |
| Graph | Node penting keyboard-selectable atau companion list setara |
| Feedback | Copy/share/export/reset tidak pernah mengklaim sukses palsu |
| Motion | Reduced-motion menghentikan animasi non-esensial |
| Visual | Radius, typography, spacing, dan focus treatment mengikuti token |
| Quality | Typecheck, lint, test, build, responsive, dan accessibility smoke test lulus |

## 9. Urutan kerja yang disarankan

1. **U01 + U02:** preview pertama harus memberi keyakinan; toolbar tidak boleh menguasai layar.
2. **U03 + U17 + U12:** selesaikan mobile contract sebelum polish.
3. **U06 + U07 + U09 + U11:** tutup celah feedback dan semantic accessibility.
4. **U04 + U05:** jadikan struktur sidebar dan resizer usable tanpa mouse.
5. **U08 + U10 + U21:** ubah inspector/graph menjadi alat diagnosis.
6. **U13–U20:** lakukan visual dan codebase cleanup setelah interaksi stabil.
7. **Phase 4:** ulangi QA matrix dan lakukan uji fisik.

## 10. Status pekerjaan

### Sudah tersedia pada baseline

- [x] Worker-based resolve dan stale request protection.
- [x] Editor memiliki accessible name dan dapat dilalui keyboard.
- [x] Kontrol utama terlihat memiliki accessible name pada audit browser baseline.
- [x] Production build, typecheck, lint, dan unit test lulus.
- [x] Preview, inspector, parameters, layers, graph, share, dan export tersedia.

### Selesai pada batch implementasi saat ini

- [x] U01 — default model desktop terverifikasi tampil terpusat setelah resolve; pengujian semua frame masih tersisa.
- [x] U01 — Fit view tersedia di toolbar Preview sehingga recenter tetap dapat dilakukan pada surface mobile; frame non-finite ditolak agar zoom tidak menjadi invalid.
- [x] U04 — sidebar panel headers menjadi disclosure semantic.
- [x] U05 — split/sidebar resizer memiliki separator semantics dan keyboard adjustment.
- [x] U06 — reduced-motion override tersedia.
- [x] U07 — copy/share/export memiliki feedback dan clipboard fallback; pengujian permission edge case masih tersisa.
- [x] U10 — graph nodes memiliki role, accessible name, dan keyboard activation.
- [x] U11 — Navbar, preview toggles, dan inspector tabs memiliki state semantics pada bagian yang sudah disentuh.
- [x] U17 — empty state fluid dan tidak lagi memaksa minimum 400px.
- [x] U08 — object hasil generated repeat kini dikelompokkan dan group dapat dibuka/tutup; related-object highlight lintas surface serta pilihan kedalaman relasi tersedia.
- [x] U08 — selection dari preview, inspector, dan graph kini memusatkan source definition di editor; dependency/dependent terkait ikut ditandai di inspector, preview, dan graph.
- [x] U08 — related neighborhood kini mencakup dependency dan dependent langsung maupun tidak langsung hingga dua tingkat, dengan batas agar dokumen besar tetap terbaca.
- [x] U08 — group yang memuat object terpilih atau terkait otomatis terbuka dan summary group kini menjelaskan jumlah selected/related secara ringkas.
- [x] U10 — graph Inspector memiliki filter object/type, focus selection berbasis neighborhood, empty state filter, dan legend visual yang responsif.
- [x] U10/U11 — graph selectable memakai semantic group dengan title dan focusable node, sehingga parent SVG tidak menyamarkan node interaktif sebagai image tunggal.
- [x] U07/U09 — error tanpa fallback kini menjelaskan bahwa belum ada preview sukses dan menyediakan reset ke selected example; fallback tetap menawarkan restore draft sukses terakhir.
- [x] U09 — tab Errors menampilkan jumlah diagnostics dan tombol Go to first error menuju object atau path pertama yang actionable.
- [x] U11 — icon controls Navbar memiliki button type/label, zoom diumumkan saat berubah, dan profile/example controls menyatakan pressed/expanded state.
- [x] U18 — menu More menjelaskan modified draft, penyimpanan lokal browser, dan bahwa share link membawa source melalui URL hash.
- [x] U02 — Navbar memiliki mode compact pada viewport menengah: selector menyusut dengan ellipsis, status detail diringkas, dan preview controls dapat discroll tanpa menghilangkan fungsi.
- [x] U03 — mobile surface switch Source/Both/Preview dan sidebar drawer overlay dengan backdrop sudah tersedia; verifikasi viewport matrix dan touch nyata masih tersisa.
- [x] U09 — error preview/error tab meneruskan error code, punya tombol ke source bila ada object id atau path, dan recovery ke draft sukses terakhir bila fallback tersedia.
- [x] U11 — object row dan child-object drill-down pada inspector kini memiliki kontrol keyboard, tipe button, dan accessible name.
- [x] U11 — object card Inspector tidak lagi memakai `div role="button"` yang membungkus button lain; chevron, nama object, dan source jump kini menjadi kontrol sibling yang semantik.
- [x] U11/U13 — baseline token CSS untuk radius control/card/pill, round control, dan focus ring sudah ditambahkan; tokenisasi spacing/type/elevation secara menyeluruh masih terbuka.
- [x] U11 — tab Inspector memakai roving `tabIndex`, navigasi Arrow/Home/End, dan memindahkan fokus ke tab aktif.
- [x] U08/U11 — clear selection mengembalikan daftar object penuh; Escape membersihkan selection dan menutup mobile drawer lebih dulu.
- [x] U08 — group inspector dapat di-collapse, generated group default tertutup, dan group selection otomatis dibuka serta di-scroll ke object terkait.
- [x] U08 — detail object menampilkan dependency/dependent yang tersedia; related object dapat dipilih untuk navigasi inspector dan source definition.
- [x] U09/U11 — toggle disclosure pada Inspector tidak lagi crash saat React event sudah tidak memiliki `currentTarget`; state `open` ditangkap sebelum state updater dijalankan dan browser mount/toggle sudah terverifikasi.
- [x] U07 — jalur copy mencoba Clipboard API lalu fallback legacy bila API tersedia tetapi ditolak; textarea fallback selalu dibersihkan dan tidak ikut masuk keyboard traversal.
- [x] U03 — mode mobile-workbench diperluas hingga `840px`; pada viewport tablet `812px` sidebar menjadi drawer, surface switcher tampil, dan editor/preview tersusun vertikal tanpa layout tiga-kolom yang terlalu sempit.
- [x] U03/U11 — Escape kini memakai breakpoint `840px` yang sama dan menutup drawer tablet sebelum membersihkan selection; perilaku terverifikasi pada viewport `812px`.
- [x] U05/U12 — resizer sidebar dan split memakai Pointer Events, termasuk `pointercancel`, sehingga jalur drag siap untuk mouse, touch, dan stylus; uji gesture perangkat nyata masih tersisa.
- [x] U11 — mobile surface switcher memiliki `role="group"`, label yang jelas, dan tombol dengan `aria-pressed` untuk Both/Source/Preview; semantics terverifikasi pada browser tablet.
- [x] U08 — Inspector menyediakan pilihan Related depth 1/2/3 levels; kedalaman yang dipilih dipakai konsisten untuk neighborhood highlight, auto-open group, related list, dan graph context.
- [x] U08/U11 — memilih object tetap membuka Objects pada selection baru, tetapi tidak lagi memaksa tab kembali ke Objects saat pengguna berpindah ke Graph/Values/Errors; alur object terpilih → Graph terverifikasi di browser.
- [x] U07/U09 — share URL kini dibatasi secara konservatif; draft yang terlalu besar tetap disimpan lokal dan menampilkan feedback, sementara helper limit memiliki regression test.
- [x] U03/U09 — breakpoint handset `480px` kini mencegah navbar/select/error path/graph count meluber; editor dan preview mendapat minimum height yang lebih realistis untuk layar kecil. Matrix perangkat tetap perlu dijalankan.
- [x] U18 — metadata lisensi Playground diverifikasi konsisten: `package.json` memakai `MIT`, README memiliki bagian License, dan file LICENSE adalah MIT dengan copyright Agus Made.
- [x] U18/U21 — selector CSS orphan dari layout lama sudah diaudit dan dibersihkan; selector status dinamis dan class CodeMirror dipertahankan, sehingga stylesheet turun sekitar 10% (1.846 → 1.659 baris).
- [x] U16 — strategi typography eksplisit: UI memakai IBM Plex Sans dengan Segoe UI fallback, kode memakai IBM Plex Mono dengan SFMono-Regular/Cascadia Code fallback, dan worker memakai metrik sans-serif yang tidak bergantung pada webfont runtime.
- [x] U01 — kontrak camera-fit didokumentasikan lewat helper/test: sheet terpilih mengalahkan bbox, frame logical dipakai untuk geometry dan physical untuk screen scale, frame/container invalid menghasilkan `null`, dan zoom dibatasi `0.01–10000`.
- [x] U11 — mode drawer tablet memindahkan fokus ke panel pertama saat dibuka dan menyimpan kontrol pemicu untuk focus-return saat ditutup; behavior diterapkan untuk Escape, backdrop, dan Hide.
- [x] U11 — drawer tablet kini memiliki focus trap Tab/Shift+Tab di antara control yang terlihat; siklus fokus browser terverifikasi dari kontrol terakhir ke header PARAMETERS dan kembali ke kontrol terakhir.
- [x] U06 — reduced-motion stylesheet menonaktifkan keyframe, transition, delay, dan smooth scrolling; emulasi preference browser nyata masih tersisa.
- [x] U02 — aksi sekunder source dan sidebar placement dipindahkan ke menu More; kepadatan toolbar global pada 1024px masih perlu verifikasi.
- [x] U14 — toolbar preview kini dipisah menjadi kelompok overlay dan line rendering serta wrap aman di mobile; pemisahan global-vs-contextual dan pengurangan duplikasi masih tersisa.
- [x] Performance — dependency graph dikirim dari worker sehingga `@relgeo/core` tidak lagi eager di main bundle; ukuran main chunk turun dari sekitar 584 kB menjadi sekitar 307 kB, sementara worker/core tetap terpisah.
- [x] U01 — coverage camera-fit menambahkan aspect ratio wide/tall, clamp zoom 0.01–10000, frame/container kosong-negatif, dan selected sheet invalid.

### Batch berikutnya yang sebagian sudah diterapkan

- [x] U08 — Inspector sekarang memiliki search, jumlah hasil, selected-only filter, grouping, source jump, related-object highlight lintas surface, dan Related depth 1/2/3 levels.
- [ ] U09 — audit seluruh clickable affordance dan diagnostics tanpa target source masih belum; first-error actionable, recovery tanpa fallback, error path, dan restore draft sukses terakhir sudah tersedia.
- [ ] U11 — control utama, state yang tersentuh, drawer focus trap, dan roving focus graph sudah diaudit di browser; inventaris seluruh affordance dan verifikasi real screen reader masih perlu.

### Sebagian diterapkan, masih perlu verifikasi atau penyempurnaan

- [ ] U03 — responsive CSS, surface switch, dan drawer/sidebar mobile sudah ditambahkan serta gate teknis lulus; viewport 812×667 sudah di-smoke-test tanpa overflow, tetapi viewport matrix dan touch nyata belum selesai.
- [ ] U09 — alert/error actions, error code/path, fallback restore, reset tanpa fallback, dan first-error actionable sudah tersedia; seluruh clickable affordance dan diagnostics tanpa target source belum selesai.
- [ ] U12 — `touch-action` sudah diperlonggar, tetapi gesture contract belum diuji pada touch nyata.

### Belum dikerjakan

- [ ] U01 — verifikasi camera fit/recenter untuk seluruh sheet, frame ekstrem nyata, resize viewport, dan handset.
- [ ] U02 — verifikasi visual kepadatan desktop 1024px setelah mode compact; aksi sekunder sudah dipindahkan ke menu More.
- [ ] U13–U16 — visual language, radius, discoverability, dan typography contract.
- [ ] U18–U21 — cleanup CSS lanjutan dan penghapusan seluruh selector legacy; README/license sudah selesai.
- [ ] Uji handset fisik.
- [ ] Uji screen reader nyata dengan VoiceOver/TalkBack.
- [ ] Verifikasi penuh camera-fit dan responsive contract.
- [ ] Inspector redesign.
- [ ] Visual token cleanup dan penghapusan CSS legacy.

Dokumen ini menjadi baseline diskusi dan checklist perubahan playground. Setiap implementasi sebaiknya menandai checklist yang relevan bersamaan dengan commit yang mengerjakannya.
