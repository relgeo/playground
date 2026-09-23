# RelGeo Playground — UX/UI Audit & Improvement Plan

**Status:** implementasi lokal, browser verification termasuk mobile-device emulation, workflow Pages, dan smoke URL publik selesai; gate perangkat eksternal masih terbuka
**Tanggal audit terakhir:** 2026-09-16
**Implementation baseline:** `e070cd9` (`main`)
**Ruang lingkup:** browser IDE playground: editor, resolver, preview, inspector, graph, sidebar, responsive behavior, accessibility, share, dan export.

## 1. Ringkasan eksekutif

Playground memiliki fondasi teknis yang sehat dan kemampuan yang cukup lengkap: source editor, worker untuk resolve, preview SVG, model/physical surface, parameter, layer, inspector, graph, serta share/export. Alur produknya sudah terbentuk:

> pilih contoh → baca/edit source → resolve → lihat preview → inspeksi hasil → share/export

Audit awal menemukan bahwa masalah utamanya bukan kekurangan fitur, melainkan kepadatan dan prioritas. Banyak kemampuan ditempatkan sekaligus dalam satu workbench, sementara tugas utama pengguna belum cukup dominan. Sebagian besar temuan tersebut kini sudah ditangani pada baseline `e070cd9` melalui pemisahan toolbar, camera-fit, responsive surface switch, semantic controls, inspector/graph navigation, feedback state, CSS token/layer cleanup, dan mobile-device emulation. Dampak yang masih relevan terutama berasal dari validasi perangkat fisik dan assistive technology eksternal.

Temuan baseline yang menjadi alasan pekerjaan ini:

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
- Vitest: **85/85 test lulus** pada validasi terbaru (baseline audit awal: 48/48).
- ESLint: **lulus**.
- Preview produksi lokal dibuka pada `http://127.0.0.1:4325/playground/`.
- Sweep browser viewport 390×844 dengan reduced-motion: 37 kontrol DOM terlihat, seluruhnya memiliki accessible name, seluruhnya tercapai dengan Tab, dan `scrollWidth` tetap 390.
- AX tree standalone playground: kontrol yang terdeteksi memiliki nama, termasuk editor, combobox, slider, button, dan checkbox.
- Baseline screenshot persisted untuk first open/READY, error/recovery, Inspector, Graph, dan handset 410px di `docs/screenshots/ux-baseline-2026-09-15/`; manifest dan SHA-256 tercatat di folder tersebut.
- Workflow `Deploy RelGeo website` run #19 pada commit website `dc3f772` sukses: build, Pages artifact, deploy, dan smoke-test job semuanya hijau.
- Smoke browser publik setelah deploy baru lulus untuk `/`, `/en/`, `/id/`, `/docs/`, `/docs/language-spec/`, dan `/playground/`; semua route terbaca tanpa alert dan Playground memiliki judul `RelGeo Playground`.

Validasi itu membuktikan baseline lokal tidak sedang rusak secara teknis. Itu belum membuktikan alur nyaman, jelas, dan optimal pada perangkat fisik atau screen reader nyata.

### Keterbatasan

- [ ] Belum ada uji handset fisik untuk pan/pinch, target sentuh, dan performa layout.
- [ ] Belum ada traversal penuh dengan VoiceOver, TalkBack, atau screen reader nyata.
- [x] Screenshot lokal adalah spot check yang sudah dipersistenkan, bukan usability study.
- [x] Camera dan responsive layout sudah diuji ulang setelah perubahan lokal; review visual lintas perangkat tetap menjadi gate eksternal/opsional.
- [x] Website publik mengonsumsi baseline Playground `09ac1cb` melalui workflow yang dipin dan sudah ter-deploy.
- [x] Endpoint publik `/sitemap.xml`, `favicon.svg`, dan `apple-touch-icon.png` diverifikasi oleh smoke-test job workflow run #19; browser harness tetap tidak dapat menampilkan XML secara langsung karena `ERR_BLOCKED_BY_CLIENT`.

## 4. Peta alur pengguna

| Tahap | Kondisi saat ini | Penilaian |
| --- | --- | --- |
| First open | Default example kini fit setelah resolve; review handset nyata masih terbuka | Friksi rendah secara lokal |
| Pilih contoh | Selector memiliki nama penuh melalui title/accessible name dan option list; label dapat ellipsis pada handset | Friksi rendah |
| Edit source | Editor keyboard-accessible; status resolve dan recovery memiliki feedback | Friksi rendah secara lokal |
| Resolve | READY/error, diagnostics, fallback, dan stale response memiliki kontrak status | Friksi rendah secara lokal |
| Preview | Kontrol global/contextual terpisah, fit/recenter tersedia, dan surface switch aktif | Friksi rendah secara lokal |
| Inspect | Search, grouping, selected/related filter, depth, source jump, dan cross-surface highlight tersedia | Friksi sedang untuk dokumen sangat besar |
| Recover error | Error summary, first-error, source target, reset/restore, dan dialog konfirmasi tersedia | Friksi rendah secara lokal |
| Parameters/layers | Panel semantic disclosure dan state visual tersedia | Friksi rendah |
| Graph | Filter, focus mode, legend, roving focus, dan keyboard navigation tersedia | Friksi rendah secara lokal |
| Share/export | Feedback, fallback clipboard, batas hash, dan error state tersedia | Friksi rendah secara lokal |
| Reset/ganti contoh | Dirty-state dan confirmation dialog semantic tersedia | Risiko rendah |

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

## 5a. Status temuan pada implementation baseline

Bagian temuan di atas mempertahankan observasi audit awal agar keputusan desain tetap dapat ditelusuri. Status aktualnya pada `e070cd9` adalah:

| ID | Status lokal | Sisa atau batasan |
| --- | --- | --- |
| U01 | [x] Selesai pada browser | Review visual handset nyata masih terbuka |
| U02 | [x] Selesai pada browser | Review visual lintas perangkat tetap opsional |
| U03 | [x] Selesai pada browser | Uji handset fisik masih terbuka |
| U04 | [x] Selesai | — |
| U05 | [x] Selesai pada browser | Uji target sentuh/perangkat nyata masih terbuka |
| U06 | [x] Selesai pada CSS dan audit gate | Verifikasi preference OS dengan VoiceOver/TalkBack belum dilakukan |
| U07 | [x] Selesai pada unit/browser contract | Permission dan clipboard pada perangkat nyata tetap bergantung environment |
| U08 | [x] Selesai | Dokumen graph/inspector yang sangat besar masih dapat membutuhkan focus/filter lebih lanjut |
| U09 | [x] Selesai pada browser | Screen reader nyata masih terbuka |
| U10 | [x] Selesai pada browser | Screen reader nyata masih terbuka |
| U11 | [x] Selesai untuk AX tree dan keyboard lokal | VoiceOver/TalkBack nyata masih terbuka |
| U12 | [x] Selesai pada unit/browser contract | Pan/pinch pada handset fisik masih terbuka |
| U13 | [x] Selesai pada token dan CSS gate | Review estetika manusia lintas perangkat bersifat opsional |
| U14 | [x] Selesai | Duplikasi Fit/Recenter disengaja dan terdokumentasi |
| U15 | [x] Selesai pada browser | Ergonomi sentuh nyata masih terbuka |
| U16 | [x] Selesai pada runtime browser lokal | Fallback font lintas perangkat merupakan QA opsional |
| U17 | [x] Selesai | — |
| U18 | [x] Selesai | — |
| U19 | [x] Selesai | README, `package.json`, dan `LICENSE` memakai MIT |
| U20 | [x] Selesai pada persistence/share contract | Strategi hash sangat panjang masih dapat dikembangkan jika kebutuhan meningkat |
| U21 | [x] Selesai untuk scope filter/focus/legend | Zoom/minimap belum menjadi kebutuhan release saat ini |

Dengan demikian, tidak ada lagi temuan U01–U21 yang menunggu implementasi lokal wajib. Sisa pekerjaan hanya validasi eksternal pada perangkat fisik dan assistive technology; deployment website sudah ditutup oleh workflow Pages dan smoke test publik.

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

- [x] Viewport QA ditetapkan: 1440×900, 1280×800, 1024×768, 768×1024, 414×896, 390×844, 320×800; smoke browser sudah mencakup 1440×900, 1280, 1024, 768×1024, 840, 480, 414, 390, dan 320px tanpa horizontal overflow pada workspace.
- [x] Simpan screenshot baseline untuk first open/READY, error/recovery, Inspector, Graph, dan mobile; artefak tersimpan di `docs/screenshots/ux-baseline-2026-09-15/` dengan manifest viewport/state.
- [x] Acceptance flow choose → edit → resolve → inspect → share sudah diverifikasi melalui smoke browser lokal: contoh dapat dipilih, edit multiline mempertahankan source, resolver kembali `READY`, inspector tetap tersedia, dan share link tersalin dengan hash.
- [x] Inventaris class aktif dan tandai selector CSS legacy; selector orphan sudah disweep dan selector aktif yang dipertahankan terdokumentasi di batch U18/U21.
- [x] Tetapkan camera-fit contract untuk setiap surface/sheet; helper/test sudah mencakup sheet terpilih, logical/physical frame, invalid frame, dan zoom clamp.

### Phase 1 — Unblock daily loop

- [x] Camera fit/recenter tersedia pada default model desktop; Fit view kini juga tersedia langsung di toolbar Preview, dengan guard frame non-finite. Multi-sheet/mobile dan refit saat stage berubah ukuran kini tercakup oleh ResizeObserver serta smoke browser.
- [x] Global controls dan preview contextual controls dipisahkan secara semantik dan visual.
- [x] Pastikan example selector tidak kehilangan nama penting: selector diperlebar proporsional pada desktop/tablet, sementara pada handset label native boleh ellipsis demi menjaga navbar; nama penuh tetap tersedia melalui `title`, accessible name, dan daftar option.
- [x] Status utama diberi `role=status` dan live announcement.
- [x] Feedback copy/share/export dan clipboard fallback dasar sudah diterapkan.
- [x] Reset/ganti contoh sekarang meminta konfirmasi saat draft berubah.
- [x] Mobile surface switch untuk Source/Both/Preview dan sidebar drawer dengan backdrop sudah diimplementasikan; viewport matrix browser sudah diverifikasi tanpa horizontal overflow.
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

- [x] Definisikan semantic tokens warna, border, spacing, radius, type, elevation, line-height, dan focus ring; token file serta keberadaan kategori dijaga oleh `audit:ux`.
- [x] Kurangi rounded default; radius kini berbasis fungsi melalui token control/card/pill/round dan guard mencegah radius mentah tersebar kembali.
- [x] Satukan style control statis yang tersebar di inline styles/CSS; empat inline style dinamis yang tersisa dicatat sebagai state runtime yang sah.
- [x] Putuskan strategi font IBM Plex yang eksplisit; token font dan fallback runtime sudah didefinisikan.
- [x] Hapus selector legacy setelah regression check; selector orphan dari layout lama sudah dibersihkan tanpa menghapus class dinamis yang masih aktif.
- [x] Pecah stylesheet pada batas concern yang membantu perawatan: `foundation`, `layout`, `components`, dan `responsive` kini memiliki layer eksplisit.
- [x] README, `package.json`, dan `LICENSE` sudah menyatakan MIT secara konsisten; penyelarasan metadata dasar selesai.

### Phase 4 — Verification dan release gate

- [x] Jalankan typecheck, lint, unit test, dan production build.
- [x] Browser smoke pada viewport aktif 1280×720 tidak menemukan horizontal overflow; audit DOM terhadap 196 control terlihat menemukan nama/label pada seluruh control.
- [x] Keyboard smoke pada viewport aktif 812×667: drawer sidebar mempertahankan fokus sampai ditutup, lalu 90 Tab stops workspace yang terobservasi seluruhnya terlihat dan bernama; kontrol layout desktop yang tersembunyi tidak masuk Tab order.
- [x] Browser semantics smoke pada contoh kompleks 1280×720: lima tab Inspector diuji satu per satu; seluruh tab aktif benar-benar memiliki `aria-selected=true`, tidak ada horizontal overflow, dan 0 control terlihat tanpa accessible name/title/text.
- [x] Inspector tab keyboard smoke: `End` dari tab Objects memindahkan fokus dan selected state ke tab BOM.
- [x] Inspector geometry smoke pada contoh kompleks: rect dan component dapat dibuka, detail rows/child list tampil tanpa overflow, dan `.inspector-content` tidak memiliki inline style.
- [x] Preview overlay smoke pada contoh kompleks: canvas overlay tetap `pointer-events: none`, layer passive/interactive terpisah, editor memakai class CodeMirror, dan preview tidak overflow.
- [x] Preview toolbar smoke: overlay/line-mode buttons memakai class CSS dan state `active`; static style blocks inline sudah dihapus tanpa mengubah accessible names.
- [x] Uji keyboard traversal penuh untuk navbar, editor, preview, sidebar, inspector, graph, error, dan dialog; fresh-browser sweep mencakup 120 focus transitions, menu More, drawer trap, dan custom confirmation dialog (Tab/Shift+Tab, Escape, Cancel, serta Reset draft). Validasi screen reader nyata tetap terpisah.
- [x] Uji AX names, roles, expanded/selected/pressed/value states, dan alert announcements pada state lokal default, More, Graph, Values, Errors, serta error recovery; screen reader nyata dicatat terpisah.
- [x] Tambahkan reduced-motion rule dan perkuat `audit:ux` agar animation, transition, delay, iteration, serta smooth-scroll reset tidak hilang; verifikasi preference OS melalui recording/computed style masih perlu dilakukan.
- [x] Automated/local contract coverage untuk clipboard denied, partial response tanpa SVG (fallback), slow resolve state, stale worker response, syntax error worker, dan long URL hash sudah tersedia; environment-specific clipboard behavior dan worker timing nyata tetap perlu smoke tambahan bila diperlukan.
- [x] Uji browser responsive pada viewport matrix 1024/940/840/480; tidak ada horizontal overflow dan mode surface/drawer tablet berhasil.
- [x] Dedicated Playwright mobile-device emulation memakai profil iPhone 13 pada Chromium dengan touch capability, viewport 390px, dan `touchscreen.tap` untuk perpindahan Source/Preview; E2E lokal terbaru lulus `2/2` pada child commit `3969d47`; ini memperkuat automation evidence, tetapi bukan pengganti uji handset fisik.
- [x] E2E lokal memiliki fallback `PLAYWRIGHT_EXECUTABLE_PATH` untuk memakai browser Chromium-compatible yang sudah terpasang ketika cache Playwright tidak dapat diunduh; CI tetap menggunakan browser pinned.
- [ ] Uji handset fisik dan VoiceOver/TalkBack.
- [x] Smoke test URL deployment publik saat ini pada 1280px: halaman mencapai `READY`, canvas terlihat ter-render, dan tidak ada alert.
- [x] Playground implementation baseline `e070cd9` sudah di-commit dan di-push ke `relgeo/playground`.
- [x] Pin workflow Pages sudah dipush ke website pada commit `5d103b2`, tetap merujuk commit Playground `09ac1cb`; website `build`, `astro check`, built-output assertions, dan Pages artifact assertions lulus setelah artifact Playground dimasukkan.
- [x] Dokumentasi Getting Started website EN/ID tidak lagi mengklaim Playground belum memiliki URL publik; keduanya kini menaut ke `/playground/` dan build/output assertions tetap lulus.
- [x] Commit/push workflow selesai; Pages run #19 sukses dan smoke publik pascadeploy lulus untuk route HTML utama serta asset/sitemap yang diuji oleh `scripts/smoke-public-site.mjs`.
- [x] Warning workflow dirapikan: action resmi dipindah ke runtime Node 24 dan input checkout `sparse-checkout-cone-mode` digunakan; run #19 tidak lagi memiliki annotation warning.

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

- [x] U01 — default model desktop terverifikasi tampil terpusat setelah resolve; fit ulang saat stage berubah ukuran dan matrix handset/tablet/desktop sudah diverifikasi di Chrome.
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
- [x] U03 — mobile surface switch Source/Both/Preview dan sidebar drawer overlay dengan backdrop sudah tersedia; matrix Chrome 1024/940/840/480 lulus tanpa horizontal overflow.
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
- [x] U02 — aksi sekunder source dan sidebar placement dipindahkan ke menu More; screenshot Chrome 1024px mengonfirmasi toolbar compact tetap terbaca dan preview utama tetap terlihat.
- [x] U14 — toolbar preview kini dipisah menjadi kelompok overlay dan line rendering serta wrap aman di mobile; kontrol global dan contextual kini dibedakan secara semantik dan visual. Fit/recenter tetap tersedia di dua tempat sebagai jalur cepat desktop dan canvas/mobile.
- [x] Performance — dependency graph dikirim dari worker sehingga `@relgeo/core` tidak lagi eager di main bundle; ukuran main chunk turun dari sekitar 584 kB menjadi sekitar 307 kB, sementara worker/core tetap terpisah.
- [x] U01 — coverage camera-fit menambahkan aspect ratio wide/tall, clamp zoom 0.01–10000, frame/container kosong-negatif, dan selected sheet invalid.
- [x] U11/U18 — seluruh Inspector, termasuk detail geometry, metadata, object cards, values tree, BOM, anchors, dan filter controls kini memakai class CSS terpusat; inline style Inspector menjadi 0.
- [x] U11 — Recursive value tree kini memakai button disclosure dengan `aria-expanded`, accessible name, dan keyboard activation; node values tidak lagi bergantung pada `div onClick`.

### Batch UX/UI lanjutan — 2026-09-14

- [x] U14 — kontrol preview global di Navbar kini bernama eksplisit berdasarkan surface aktif, terhubung ke region preview, dan diberi penanda mode Model/Physical.
- [x] U14 — toolbar contextual di canvas kini dibedakan dari kontrol global melalui nama aksesibilitas, penanda mode, aksen visual, dan grouping overlay/line rendering yang tetap terpisah.
- [x] U11/U12 — region canvas memiliki label dan instruksi pan/zoom yang membedakan model preview dari print-oriented preview; line-mode buttons memiliki accessible name eksplisit.
- [x] U16 — typography runtime pada browser lokal terverifikasi: UI memakai IBM Plex Sans dan editor memakai IBM Plex Mono sesuai token, dengan ukuran computed yang valid.
- [x] U09/U11 — ringkasan diagnostics Inspector kini memakai status polite/atomic agar tidak menduplikasi alert kartu error; empty-success state juga diumumkan sebagai status.
- [x] U09 — smoke error-state browser dengan source malformed menampilkan satu preview alert, Errors tab memiliki satu alert Inspector dan tombol first-error, lalu Reset source code mengembalikan status READY.
- [x] U09 — diagnostics tanpa object/path kini tetap memberi recovery hint; error dengan dependency chain memakai node pertama sebagai target “Go to first error”, dan violation global diberi label eksplisit `No source target`.
- [x] U02/U03 — smoke runtime desktop 1280×720 menunjukkan preview, global/contextual toolbar, dan landmark tetap terukur tanpa overflow; matrix breakpoint 1024/840/480 juga sudah dijalankan pada viewport yang dapat diubah.
- [x] U01/U09 — resolver/worker regression kini menjaga 17/17 contoh bawaan tetap compilable; tiga fixture yang sebelumnya gagal (`Ellipse Basics`, `Electronic Faceplate`, `Current Feature Showcase`) sudah diperbaiki sesuai kontrak DSL. Fresh-browser smoke pada origin baru mengulang seluruh 17 fixture: semuanya menghasilkan SVG tanpa alert; console error kosong.
- [x] U02/U08 — urutan contoh dasar pada picker dirapikan menjadi 01–05 tanpa nomor ganda atau lompatan, dan regression test menjaga urutan onboarding tersebut.
- [x] U11 — fresh-browser keyboard traversal melewati sedikitnya 120 focusable control bermakna tanpa kontrol tanpa nama, elemen tak terlihat, atau keluar dari landmark `main`; sweep lintas state/dialog dan real screen reader tetap dicatat terpisah.
- [x] U13 — radius visual dinormalisasi ke token: card/control memakai sudut kecil, dot memakai round, dan kode/path error tidak lagi memakai pill; gate mencegah radius mentah tersebar kembali.
- [x] U18/U21 — gate `audit:ux` kini menjaga kontrak global-vs-contextual preview, mode marker, dan label/description region canvas.

### Batch berikutnya yang sebagian sudah diterapkan

- [x] U08 — Inspector sekarang memiliki search, jumlah hasil, selected-only filter, grouping, source jump, related-object highlight lintas surface, dan Related depth 1/2/3 levels.
- [x] U09 — first-error actionable, recovery tanpa fallback, error path, restore draft sukses terakhir, dan browser smoke error-state sudah tersedia; kontrak status/accessibility diagnostics juga sudah dijaga oleh gate.
- [x] U01/U03 — camera otomatis fit ulang melalui `ResizeObserver` saat split/sidebar/viewport berubah; guard `min-width: 0` pada shell/workspace/stage mencegah intrinsic-width overflow, dan matrix Chrome 1024/840/480 memverifikasi stage tetap pas.
- [x] U11 — control utama, state yang tersentuh, drawer focus trap, roving focus graph, value-tree disclosure, lima tab Inspector, keyboard traversal fresh-browser, dan AX tree state lokal sudah diaudit.
- [ ] U11 — validasi screen reader nyata dengan VoiceOver/TalkBack.

### Batch UX/UI lanjutan — 2026-09-15

- [x] U01/U03 — camera fit sekarang memperhitungkan padding CSS aktual pada viewport, sehingga split/sidebar tidak menggeser frame ke overflow internal; `ResizeObserver` dan guard `min-width: 0` tetap aktif.
- [x] U07 — jalur clipboard dipisah menjadi helper yang dapat diuji; unit test mencakup Clipboard API sukses, penolakan permission yang jatuh ke fallback, cleanup textarea, propagasi kegagalan, dan environment tanpa clipboard.
- [x] U07 — reset, restore draft sukses, dan pergantian contoh meminta konfirmasi ketika source sedang berubah; pembatalan mempertahankan draft aktif.
- [x] U12 — preview stage kini mendukung pan satu pointer dan pinch-zoom dua pointer melalui Pointer Events; helper test mencakup jarak, rasio zoom, serta input invalid/zero-distance. Validasi perangkat touch nyata masih terbuka.
- [x] U12 — pinch zoom mempertahankan focal point di bawah midpoint dua jari dan mengikuti perpindahan midpoint; helper/test menjaga kalkulasi pan terhadap zoom, stage origin, dan input invalid.
- [x] U18/U21 — gate `audit:ux` kini menjaga keberadaan kontrak fit-resize, intrinsic-width guard, dan pinch gesture agar regresi layout/gesture terdeteksi sebelum release.
- [x] U18/U21 — gate `audit:ux` juga menjaga dirty-draft confirmation agar reset, restore, dan switch example tidak kembali menjadi silent replacement.
- [x] U11 — runtime AX tree lokal diverifikasi pada state default, menu More terbuka, serta tab Graph, Values, dan Errors; named landmark, tab selection, graph instruction, dan no-error status terbaca. VoiceOver/TalkBack nyata tetap merupakan validasi terpisah.
- [x] U11/U12 — Inspector handset dipadatkan tanpa memotong tab atau nama object: tab strip dapat digeser horizontal, object heading boleh wrap, action tetap terlihat, dan related-depth select dapat turun baris pada lebar sangat sempit.
- [x] U18/U21 — design tokens dipisahkan ke `src/styles/tokens.css`; stylesheet utama tetap memuat layout/component/responsive rules, dan hasil build tidak berubah secara fungsional.
- [x] U11 — kontrol icon-only pada menu More memiliki `aria-label` eksplisit untuk copy source, share link, reset source, dan tiga pilihan sidebar; kontraknya dijaga oleh `audit:ux` dan label DOM diverifikasi pada browser lokal.
- [x] U18/U21 — cascade stylesheet kini memiliki layer `base` dan `responsive`; aturan breakpoint dipisahkan secara eksplisit tanpa memindahkan selector, dan gate menjaga kedua layer tetap ada.
- [x] U18/U21 — layer `base` kini dibagi lagi menjadi `foundation`, `layout`, dan `components`; selector tetap pada urutan asal, sementara empat dynamic inline style yang mewakili state runtime tetap dipertahankan.
- [x] U01/U08 — smoke browser lokal pada origin bersih kembali memverifikasi pemilihan contoh, resolving ke READY, preview kompleks, serta keberadaan inspector dan objek; state ini dibersihkan setelah pengujian.
- [x] U07/U09 — display fallback kini mensyaratkan SVG aktual sebagai render contract; respons parsial tanpa SVG tidak lagi menggantikan preview terakhir yang valid, dengan regression coverage untuk status resolving dan stale preview.
- [x] U02/U03/U09 — smoke deployment publik pascadeploy run #19 selesai pada 1280px (`READY`, canvas terlihat, tanpa alert); baseline publik dan baseline lokal sudah selaras untuk scope release ini.
- [x] U07 — share hash baru memakai Base64URL tanpa padding agar lebih stabil saat disalin, sementara decoder tetap kompatibel dengan hash Base64 legacy.
- [x] U03/U11 — smoke browser tambahan pada viewport 1440×900 dan 768×1024 menunjukkan editor serta preview tetap terlihat, lebar dokumen sama dengan viewport, dan tidak ada horizontal overflow.
- [x] U11 — keyboard sweep fresh-browser tambahan merekam 120 perpindahan fokus; seluruh target terlihat, berada di dalam `#root`, dan memiliki label/name yang dapat dibaca, termasuk kontrol utama, Inspector, dan anchor SVG.
- [x] U11 — saat menu More terbuka, traversal keyboard melewati keenam aksi sekundernya (copy source, copy share, reset, dan tiga posisi sidebar) dengan label serta visibility yang benar, lalu berlanjut ke kontrol layout.
- [x] U06/U18/U21 — gate `audit:ux` kini memeriksa lima deklarasi inti reduced-motion, sehingga kontrak CSS tetap terlindungi meski preference OS belum dapat diemulasikan oleh harness.
- [x] U11 — state sweep Inspector tambahan mengaktifkan Objects, Values, Errors, Graph, dan BOM; setiap tab mempertahankan `aria-selected` yang benar dan tidak memiliki control terlihat tanpa nama.
- [x] U03/U11 — pada viewport handset 390×844, drawer mempertahankan 40 perpindahan fokus tetap di dalam sidebar, tombol Close sidebar dapat diaktifkan dengan keyboard, dan penutupan tidak menimbulkan horizontal overflow.
- [x] U11/U15 — focus trap drawer kini memasukkan tombol backdrop `Close sidebar`; verifikasi browser menunjukkan Shift+Tab dari control pertama mencapai tombol Close dan penutupan mengembalikan fokus ke trigger pembuka tanpa overflow.
- [x] U07/U11 — native confirmation diganti `ConfirmDialog` semantic dengan `role=dialog`, `aria-modal`, title/description, fokus awal Cancel, Tab trap, Escape/Cancel, aksi konfirmasi, dan focus return; browser smoke memverifikasi reset draft mempertahankan/mengganti source sesuai aksi.

### Sebagian diterapkan, masih perlu verifikasi atau penyempurnaan

- [x] U03 — responsive CSS, surface switch, dan drawer/sidebar mobile sudah ditambahkan serta gate teknis lulus; Chrome smoke pada viewport CSS 1024, 940, 840, dan 480 tidak menemukan horizontal overflow, dan pada 840/480 surface switcher, mode Source/Preview, serta penutupan drawer berhasil.
- [x] U03/U05 — suite E2E mobile memakai profil iPhone 13 pada Chromium dan touchscreen tap; touch capability, viewport 390px, serta perpindahan surface Source/Preview terverifikasi otomatis. Uji target sentuh pada handset fisik tetap terbuka.
- [x] U12 — preview stage memakai `touch-action: none` dan implementasi Pointer Events untuk pan/pinch touch/stylus; browser/unit contract dan mobile-device emulation sudah lulus, sedangkan gesture pada perangkat touch nyata belum tersedia.

### Rekap verifikasi lokal dan sisa terbuka

- [x] U01 — fresh-browser smoke seluruh 17 fixture dan tiga pilihan sheet sudah lolos dengan SVG serta tanpa alert; ResizeObserver kini melakukan fit ulang saat resize/split berubah, dan smoke 840/480/1024 menjaga stage tetap pas tanpa horizontal overflow.
- [x] U02 — screenshot visual desktop 1024px setelah mode compact menunjukkan hierarchy toolbar tetap terbaca, preview utama utuh, dan aksi sekunder berada di menu More; nama example yang dipendekkan tetap tersedia melalui title/accessible name.
- [ ] U12 — uji gesture pan/zoom touch pada perangkat nyata; implementasi pan/pinch dan responsive matrix browser sudah lulus, tetapi perangkat touch/custom gesture belum tersedia dalam sesi ini.
- [x] U09 — sweep local seluruh clickable affordance dan diagnostics selesai: target source/path/dependency tersedia bila ada, sedangkan diagnostics global tanpa target diberi penjelasan; verifikasi screen reader tetap masuk U11.
- [x] U11 — AX tree lokal lintas state sudah diverifikasi; validasi screen reader nyata dipisahkan sebagai item terbuka.
- [x] E2E mobile — `e2e/mobile-playground.spec.ts` lulus bersama suite desktop (`pnpm run test:e2e`: **2/2**); browser emulation memverifikasi tap surface switcher, bukan validasi handset/assistive technology nyata.
- [x] U13 — radius/control language sudah konsisten di stylesheet; validasi visual lintas viewport dan keputusan estetika final tetap memerlukan review manusia pada screenshot.
- [x] U14 — control global dan contextual sudah dipisahkan lebih tegas secara semantik/visual; duplikasi Fit/Recenter dinyatakan intentional karena melayani fokus dan surface yang berbeda.
- [x] U15 — target minimum control toolbar, resizer, chevron Inspector, dan source-jump diperbesar agar kontrol icon-only dan separator lebih mudah dioperasikan; validasi perangkat sentuh nyata masih tersisa.
- [x] U18/U21 — gate `audit:ux` ditambahkan untuk menjaga type button, breakpoint, reduced-motion, focus ring, overscroll, dan jumlah inline style dinamis yang diizinkan.
- [x] U11 — shell memakai landmark `main` dan skip link kondisional ke editor/preview dengan target fokusable serta label region; verifikasi keyboard lintas mode dan screen reader nyata masih tersisa.
- [x] U09 — tab Errors kini mempertahankan error code aktual dari worker dan hanya memakai fallback code bila data tidak menyediakannya; regression test ditambahkan.
- [x] U11/U15 — anchor overlay kini dapat dipilih dengan pointer maupun keyboard, memiliki nama semantik, state pressed, dan focus ring; uji screen reader nyata masih tersisa.
- [x] U16 — typography runtime/browser lokal sudah diverifikasi terhadap token dan fallback contract; verifikasi font rendering pada perangkat pengguna lain tetap menjadi QA visual opsional.
- [x] U18–U21 — inline style dinamis untuk split ratio, preview geometry/zoom/size, dan sidebar width dipertahankan karena merupakan state runtime yang sah; stylesheet kini sudah memiliki layer `foundation`, `layout`, `components`, dan `responsive`.
- [x] Inspector redesign lanjutan — pemadatan visual handset sudah diterapkan dan dijaga oleh kontrak audit; validasi perangkat nyata/visual final tetap menjadi QA eksternal opsional.

### Gate eksternal yang masih tersisa

Item berikut tidak dapat dibuktikan hanya melalui unit test atau browser emulation di sesi ini:

- [ ] **Perangkat touch nyata:** uji pan, pinch-zoom, target sentuh, keyboard virtual, dan scroll halaman pada handset/tablet.
- [ ] **Screen reader nyata:** traversal dan pengumuman state dengan VoiceOver atau TalkBack, termasuk dialog konfirmasi, drawer, tab Inspector, error alert, dan graph node.
- [x] **Persiapan deployment website:** workflow lokal `relgeo.github.io` sudah mem-pin Playground ke `09ac1cb`; build website dan Pages artifact assertions lulus.
- [x] **Konsistensi dokumentasi publik:** Getting Started EN/ID sudah menunjuk ke hosted Playground `/playground/`.
- [x] **Deployment website:** website commit `dc3f772` sudah dipush; workflow run #19 sukses dan hosted route HTML utama sudah di-smoke-test setelah deploy.
- [x] **Sitemap publik:** `/sitemap.xml` lulus pada smoke-test workflow run #19 bersama `favicon.svg` dan `apple-touch-icon.png`; browser harness hanya tidak dapat merender/download XML secara langsung.

Semua item lain pada U01–U21 sudah memiliki implementasi lokal dan bukti browser/unit yang memadai untuk baseline ini. Review estetika lintas perangkat, pengujian font pada perangkat lain, dan zoom/minimap graph dicatat sebagai peningkatan opsional, bukan blocker release.

### Handoff release yang sudah siap

`push --dry-run` lulus untuk ketiga repository. Push aktual sudah dilakukan berurutan agar pointer submodule dan checkout Pages merujuk commit yang tersedia:

1. [x] Push `relgeo/playground` pada commit `e070cd9` yang memuat mobile-device emulation dan audit handoff terbaru.
2. [x] Push `relgeo/relgeo.github.io` pada commit `c998bb9`, lalu workflow cleanup pada `5d103b2`; keduanya mem-pin baseline fungsional Playground `09ac1cb`.
3. [x] Push `relgeo/workspace` pada commit `dcdcd2d`, lalu sinkronisasi workflow terbaru pada `2c05f16`.
4. [x] Workflow Pages run #19 selesai sukses dan smoke URL publik pascadeploy lulus untuk route HTML utama.

### Bukti penutupan gate yang harus dicatat

- **Touch fisik:** catat model/OS/viewport, hasil pan satu jari, pinch-zoom, scroll di luar canvas, pembukaan drawer, target sentuh, dan tidak adanya halaman yang terjebak pada `touch-action: none`.
- **Screen reader:** catat platform/reader, urutan landmark, pengumuman status READY/error, operasi drawer dan dialog, selected state tab/graph, serta jalur kembali ke source.
- **Deployment:** website `dc3f772`, run [#19](https://github.com/relgeo/relgeo.github.io/actions/runs/34932656409), Playground checkout `09ac1cb`, URL Pages `https://relgeo.github.io/`, serta smoke lulus untuk `/`, `/en/`, `/id/`, `/docs/`, `/docs/language-spec/`, `/playground/`, `/sitemap.xml`, `/favicon.svg`, dan `/apple-touch-icon.png`. Browser harness tidak dapat menampilkan XML secara langsung karena `ERR_BLOCKED_BY_CLIENT`, tetapi fetch workflow lulus.

Dokumen ini menjadi baseline diskusi dan checklist perubahan playground. Setiap implementasi sebaiknya menandai checklist yang relevan bersamaan dengan commit yang mengerjakannya.
