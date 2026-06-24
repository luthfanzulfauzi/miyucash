# PRD — Product Requirements Document
**MiyuCash: Budgeting & Finance Tracker**
Version 1.0 | 2026-06-24

---

## 1. Product Vision

MiyuCash adalah aplikasi budgeting personal yang sederhana, hangat, dan bisa dipakai bersama pasangan atau anggota keluarga. Tujuannya bukan menjadi software akuntansi yang rumit, melainkan alat yang membantu 1-2 orang memahami ke mana uang mereka pergi setiap bulan — dengan tampilan yang menyenangkan dan tidak terasa intimidasi.

**Tagline**: *"Catat bareng, hemat bareng."*

---

## 2. Problem Statement

Banyak orang Indonesia, terutama pasangan muda dan keluarga kecil, mengalami:
- Tidak tahu ke mana pengeluaran bulanan pergi
- Susah konsisten mencatat keuangan karena aplikasi yang ada terlalu kompleks
- Tidak ada alat yang mudah untuk berbagi catatan keuangan dengan pasangan/anggota keluarga
- Budget yang dibuat di awal bulan tidak terpantau sampai akhir bulan

---

## 3. Target Users

### Persona 1 — Pasangan Muda
- **Profil**: Usia 22–32 tahun, baru menikah atau tinggal bersama
- **Kebiasaan**: Sering pakai e-wallet (GoPay, OVO, DANA), belanja online
- **Pain point**: Tidak tahu siapa yang sudah bayar apa, susah split pengeluaran bersama
- **Harapan**: Satu tempat yang bisa dilihat berdua, tidak perlu aplikasi mahal

### Persona 2 — Individual Teratur
- **Profil**: Usia 20–35 tahun, bekerja, punya gaji tetap
- **Kebiasaan**: Mau budgeting tapi sering lupa input transaksi
- **Pain point**: Aplikasi budgeting yang ada terlalu ribet atau pakai bahasa Inggris semua
- **Harapan**: Aplikasi simpel, cepat input transaksi, bisa lihat sisa budget sekilas

---

## 4. Goals & Success Metrics

### Goals
1. Membantu user memahami pola pengeluaran mereka per cycle
2. Memudahkan 2 user untuk berbagi dan mencatat keuangan bersama
3. Memberikan visibilitas pengeluaran di luar budget (Untracked) tanpa judgement

### Success Metrics (v1)
| Metrik | Target |
|---|---|
| User bisa buat akun & tracker pertama | < 3 menit |
| User bisa input transaksi pertama | < 1 menit setelah onboarding |
| Partner bisa join tracker via invite code | < 2 menit |
| Aplikasi bisa di-install sebagai PWA | Berfungsi di Android & iOS |
| Ukuran bundle JS | < 200kb gzipped |

---

## 5. User Stories

### Auth
- Sebagai user baru, saya ingin bisa register dengan email dan password agar bisa punya akun
- Sebagai user, saya ingin tetap login walau menutup browser (persistent session)

### Tracker & Multi-user
- Sebagai user baru, saya ingin bisa membuat tracker baru setelah login pertama kali
- Sebagai owner tracker, saya ingin generate invite code agar bisa mengajak pasangan join
- Sebagai member baru, saya ingin bisa join tracker existing dengan memasukkan invite code
- Sebagai owner, saya ingin bisa melihat siapa saja yang ada di tracker saya
- Sebagai owner, saya ingin bisa mengeluarkan member dari tracker jika diperlukan

### Akun Keuangan
- Sebagai user, saya ingin bisa membuat multiple akun (BCA, OVO, Cash) agar pengeluaran bisa dikategorikan per sumber dana
- Sebagai user, saya ingin melihat saldo terkini setiap akun di dashboard
- Sebagai user, saya ingin bisa set saldo awal saat membuat akun baru

### Transaksi
- Sebagai user, saya ingin bisa input pengeluaran dengan cepat (minimal: jumlah, kategori, akun)
- Sebagai user, saya ingin bisa input pemasukan (gaji, bonus, dll)
- Sebagai user, saya ingin bisa mencatat transfer antar akun saya (contoh: BCA ke OVO)
- Sebagai user, saya ingin bisa melihat semua transaksi dalam satu list dengan filter
- Sebagai user, saya ingin bisa edit atau hapus transaksi yang salah input
- Sebagai user, saya ingin tahu transaksi mana yang diinput oleh siapa (saya atau partner)

### Budget & Cycle
- Sebagai user, saya ingin bisa membuat cycle dengan tanggal mulai dan selesai bebas (tidak harus awal bulan)
- Sebagai user, saya ingin set budget per kategori untuk cycle aktif
- Sebagai user, saya ingin melihat progress setiap budget kategori (sudah terpakai berapa dari limit)
- Sebagai user, saya ingin mendapat peringatan saat budget hampir habis (>80%)
- Sebagai user, saya ingin bisa melihat riwayat cycle-cycle sebelumnya

### Untracked Budget
- Sebagai user, saya ingin melihat total pengeluaran di luar budget yang sudah di-set, tanpa harus mencarinya manual
- Sebagai user, saya ingin bisa melihat detail transaksi yang masuk ke "Untracked"

### Export
- Sebagai user, saya ingin bisa export transaksi ke CSV untuk diolah di Excel
- Sebagai user, saya ingin bisa export laporan ke PDF untuk disimpan
- Sebagai user, saya ingin bisa memilih rentang data yang diekspor (cycle tertentu atau semua)

### PWA
- Sebagai user mobile, saya ingin bisa install MiyuCash di homescreen HP saya
- Sebagai user, saya ingin app tetap bisa dibuka walau koneksi sedang tidak stabil (offline fallback)

---

## 6. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| Performance | First Contentful Paint < 1.5 detik di koneksi 4G |
| Availability | Uptime mengikuti Vercel & Supabase SLA |
| Security | Semua data terlindungi RLS Supabase — user tidak bisa akses data tracker orang lain |
| Accessibility | Contrast ratio minimum WCAG AA, label form lengkap |
| Responsiveness | Berfungsi penuh di layar 375px – 1440px |
| PWA | Lighthouse PWA score ≥ 90 |
| Browser support | Chrome 90+, Safari 14+, Firefox 90+ |

---

## 7. Out of Scope (v1)

- Lebih dari 2 user per tracker
- Multiple currency / konversi kurs
- Recurring / scheduled transactions
- Push notification
- Attachment foto struk
- Export ke Google Drive (otomatis)
- API publik / integrasi pihak ketiga
- Multiple tracker per user

---

## 8. Assumptions & Dependencies

- User memiliki akses internet untuk sync data (offline hanya untuk fallback page)
- Supabase free tier cukup untuk penggunaan personal (2 user)
- User familiar dengan konsep "budget bulanan" dan "kategori pengeluaran"
- Mata uang default adalah IDR, tidak ada konversi
