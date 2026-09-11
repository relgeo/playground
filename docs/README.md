# relgeo-playground Docs

Status dokumen: `Active Package Docs`

Dokumen ini adalah rumah awal untuk dokumentasi package `relgeo-playground`.

Website docs boleh memberi pengantar dan framing surface, tetapi dokumentasi yang lebih dekat ke perilaku package sebaiknya hidup di sini, berdampingan dengan source package-nya.

---

## 1. Peran Package

`relgeo-playground` adalah lightweight browser IDE resmi untuk RelGeo.

Package ini digunakan ketika pengguna ingin:

1. menulis source RelGeo secara interaktif
2. melihat preview geometri secara langsung
3. memeriksa dependency graph dan geometry inspector
4. mendemokan loop `edit -> resolve -> preview -> inspect`

Package ini mengikuti kontrak bahasa aktif repo saat ini, yaitu `RelGeo DSL v0.5`.

---

## 2. Positioning

Playground sengaja diposisikan sebagai:

1. lightweight browser IDE
2. cepat dibuka
3. cepat dipakai untuk authoring loop
4. tidak membawa preference system seberat workbench lokal yang lebih kaya

Dalam bahasa singkat:

1. `Playground = lightweight browser IDE`
2. `Flutter workbench = richer local workbench`

---

## 3. Bentuk Surface Saat Ini

Pada snapshot repo aktif saat ini:

1. package ini adalah aplikasi workspace
2. package ini bersifat `private`
3. package ini bukan target publish registry
4. package ini berfungsi sebagai browser IDE resmi yang ringan

---

## 4. Core Capabilities

Surface yang saat ini sudah cukup jelas di package ini:

1. source editor RelGeo
2. live SVG preview
3. geometry inspector
4. dependency graph inspection
5. parameter controls
6. lightweight persistence
7. model-preview oriented workflow
8. optional print-oriented sheet or view preview path

---

## 5. Preview Semantics

Playground harus pertama-tama dibaca sebagai `model preview`.

Artinya:

1. preview utama berorientasi authoring dan inspection
2. zoom UI dibaca sebagai zoom viewport layar
3. sheet or view preview adalah jalur baca lain, bukan identitas utama playground

Boundary ini penting agar playground tidak drift menjadi print workbench penuh.

---

## 6. Boundary Penting

`relgeo-playground` bukan:

1. pengganti CLI untuk workflow automation terminal
2. source of truth normatif bahasa
3. workbench lokal kaya yang membawa seluruh preference model desktop

Playground adalah surface browser ringan yang task-centric.

---

## 7. Architecture Snapshot

Secara konseptual, playground menggabungkan:

1. `@relgeo/core`
2. `@relgeo/language-service`
3. renderer SVG aktif
4. surface editor
5. inspection overlays

Tujuannya adalah memberi satu workspace ringan untuk membaca, mengedit, resolve, dan inspect dokumen RelGeo.

---

## 8. Development

Untuk menjalankan playground:

```bash
pnpm dev
```

Untuk build:

```bash
pnpm build
```

Untuk test:

```bash
pnpm test
```

---

## 9. Hubungan Dengan Website Docs

Halaman website docs untuk `Playground` sebaiknya dibaca sebagai:

1. entry surface
2. onboarding singkat
3. pengarah ke surface browser IDE yang tepat

Sedangkan dokumen ini adalah rumah yang lebih dekat ke package playground itu sendiri.
