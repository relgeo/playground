# Playground UX screenshot baseline — 2026-09-15

Baseline ini direkam dari source lokal Playground melalui `http://127.0.0.1:4335/playground/` setelah production-oriented browser smoke selesai. Capture dilakukan pada state yang disengaja agar perubahan layout, framing, hierarchy, dan responsive behavior dapat dibandingkan kembali.

| File | State | Viewport CSS | Catatan |
| --- | --- | ---: | --- |
| `01-ready-default.png` | First open setelah resolve ke READY | 1440 × 670 | Architectural Floor Plan, Model Preview, editor/preview/Inspector terlihat, tanpa error |
| `02-error-recovery.png` | Invalid YAML dan recovery cue | 1440 × 670 | Error banner, pesan fallback preview, dan tombol restore terlihat |
| `03-inspector-selected.png` | Inspector dengan `exterior_walls` terpilih | 1440 × 670 | Selection dan detail geometry/metadata terlihat |
| `04-graph-selected.png` | Graph dengan selection context | 1440 × 670 | Graph tab aktif untuk inspeksi relasi |
| `05-mobile-410px.png` | Handset responsive state | 410 × 667 | Surface switch dan drawer Inspector terlihat; `scrollWidth === 410` |

Desktop capture berukuran 2880 × 1320 dan handset 820 × 1331 karena device pixel ratio 2. Capture sudah dipotong ke area UI Playground; chrome/debug banner dan dock tidak termasuk artefak baseline.

## Cara menggunakan

- Gunakan file-file ini sebagai referensi visual manual untuk perubahan UX/UI.
- Jangan menjadikan screenshot sebagai pixel-perfect test; font rendering, OS chrome, dan ukuran device dapat berubah.
- Untuk regresi perilaku, tetap jalankan `pnpm audit:ux`, `pnpm lint`, `pnpm test -- --run`, `pnpm build`, dan browser smoke.
- Jika layout berubah dengan sengaja, rekam baseline baru di folder bertanggal baru dan jelaskan perbedaannya pada checklist audit.

## Integrity

SHA-256 saat baseline dibuat:

```text
4d1043d59bf59b04d446be5aefb4106db55d7ff330344b37e833e868d18a7358  01-ready-default.png
2a2872555243b01d9731c4d79802eb75ba43bc0690d8335cd651cdf0481257e8  02-error-recovery.png
74ba50cee6eccc60089e35b6dfae0b30481cc5b34875e1ad0282c36e36b3ddbd  03-inspector-selected.png
5084f01e30b2f075111a86b46dacca31bc7254d676b5925885c3d55fc367e7b4  04-graph-selected.png
bbd1e15245587b41f1dec77f0ff9efdd3f68e5601c18cdb5e464cb6dbc6a524c  05-mobile-410px.png
```
