# FRD — Functional Requirements Document
**MiyuCash: Budgeting & Finance Tracker**
Version 1.0 | 2026-06-24

> Dokumen ini berisi spesifikasi detail per halaman/fitur, termasuk behavior, validasi, dan acceptance criteria.
> Untuk high-level use cases lihat `FRS.md`. Untuk data model lihat `ERD.md`.

---

## 1. Halaman Auth

### 1.1 Register (`/register`)

**Fields:**
| Field | Type | Validasi |
|---|---|---|
| Nama | text | Required, min 2 karakter, max 50 karakter |
| Email | email | Required, format email valid, unik di sistem |
| Password | password | Required, min 8 karakter |
| Konfirmasi Password | password | Required, harus sama dengan Password |

**Behavior:**
- Submit → call Supabase `auth.signUp()` → insert row ke tabel `users`
- Sukses → redirect ke `/dashboard`
- Email sudah terdaftar → tampilkan error "Email sudah digunakan"
- Tampilkan link "Sudah punya akun? Login"

---

### 1.2 Login (`/login`)

**Fields:**
| Field | Type | Validasi |
|---|---|---|
| Email | email | Required |
| Password | password | Required |

**Behavior:**
- Submit → call Supabase `auth.signInWithPassword()`
- Sukses → redirect ke `/dashboard`
- Kredensial salah → tampilkan error "Email atau password salah"
- Tampilkan link "Belum punya akun? Daftar"
- Tampilkan link "Lupa password?" → `/forgot-password`

---

### 1.3 Lupa Password (`/forgot-password`)

**Fields:**
| Field | Type | Validasi |
|---|---|---|
| Email | email | Required, format email valid |

**Behavior:**
- Submit → call Supabase `auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
- Selalu tampilkan pesan sukses "Cek email kamu untuk link reset password" (tidak reveal apakah email terdaftar)
- Di halaman `/reset-password` (dibuka dari link email) → form input password baru + konfirmasi → call `auth.updateUser({ password })`

---

## 2. Onboarding — Buat Tracker (`/onboarding`)

Ditampilkan saat user login pertama kali dan belum terdaftar di tracker manapun.

**Fields:**
| Field | Type | Validasi |
|---|---|---|
| Nama Tracker | text | Required, min 3 karakter, max 50 karakter |

**Behavior:**
- Submit → insert `trackers` (owner_id = user.id, invite_code = generate6()) + insert `tracker_members`
- Insert kategori default untuk tracker ini
- Sukses → redirect ke `/dashboard`
- Tampilkan opsi alternatif: "Punya kode undangan? Join tracker" → link ke `/join`

---

## 3. Join Tracker (`/join`)

**Fields:**
| Field | Type | Validasi |
|---|---|---|
| Invite Code | text | Required, 6 karakter, alphanumeric |

**Behavior:**
- Input code dikonversi uppercase sebelum query
- Validasi server-side:
  - Code tidak ditemukan → "Kode tidak valid"
  - Tracker sudah penuh (2 member) → "Tracker sudah penuh"
  - User sudah di tracker ini → "Kamu sudah bergabung di tracker ini"
- Sukses → insert `tracker_members` → redirect ke `/dashboard`

---

## 4. Dashboard (`/dashboard`)

### Layout sections (atas ke bawah):

**Section 1 — Cycle Header**
- Nama cycle aktif + rentang tanggal
- Badge hari tersisa dalam cycle
- Jika tidak ada cycle aktif → banner CTA "Buat Cycle Baru"

**Section 2 — Summary Cards (3 kartu)**
- Total Income cycle aktif
- Total Expense cycle aktif (budgeted + untracked)
- Net Balance (income - expense)

**Section 3 — Saldo Akun**
- Card per akun: nama, tipe icon, saldo terkini
- Jika belum ada akun → empty state + CTA "Tambah Akun"

**Section 4 — Budget Progress**
- Per kategori yang dibudget: nama, progress bar, "Rp X / Rp Y"
- Warna progress bar:
  - 0–79%: mint green
  - 80–99%: kuning pastel (warning)
  - 100%+: merah pastel (over budget)
- Blok **Untracked** di bawah semua kategori budget:
  - Label "Untracked", total amount, tombol "Lihat Detail"

**Section 5 — Charts**
- Donut chart: pengeluaran per kategori (cycle aktif), Untracked sebagai slice abu-abu
- Bar chart: income vs expense per 5 cycle terakhir

**Section 6 — Transaksi Terbaru**
- 5 transaksi terbaru: icon tipe, nama kategori, akun, jumlah, tanggal, avatar user
- Link "Lihat semua" ke `/transactions`

---

## 5. Transaksi

### 5.1 List Transaksi (`/transactions`)

**Filter bar:**
- Tipe: All / Expense / Income / Transfer
- Akun: dropdown semua akun
- Kategori: dropdown semua kategori
- Rentang tanggal: date picker from–to

**List item menampilkan:**
- Icon tipe transaksi
- Nama kategori (atau "Transfer" untuk transfer)
- Nama akun (+ nama akun tujuan untuk transfer)
- Catatan (jika ada, truncated)
- Tanggal
- Avatar + nama user yang input
- Jumlah (merah untuk expense/transfer keluar, hijau untuk income/transfer masuk)

**Behavior:**
- Default sort: tanggal terbaru di atas
- Klik item → buka halaman detail/edit
- Infinite scroll atau pagination (10 item per halaman)

---

### 5.2 Form Transaksi (`/transactions/new` dan `/transactions/[id]`)

**Tab pilihan tipe:** Expense | Income | Transfer

**Fields untuk Expense & Income:**
| Field | Type | Validasi |
|---|---|---|
| Jumlah | number | Required, > 0, format IDR |
| Akun | select | Required |
| Kategori | select | Required untuk expense, required untuk income |
| Tanggal | date | Required, default: hari ini |
| Catatan | textarea | Opsional, max 200 karakter |

**Fields untuk Transfer:**
| Field | Type | Validasi |
|---|---|---|
| Jumlah | number | Required, > 0 |
| Dari Akun | select | Required |
| Ke Akun | select | Required, tidak boleh sama dengan Dari Akun |
| Tanggal | date | Required, default: hari ini |
| Catatan | textarea | Opsional |

**Behavior edit:**
- Halaman `/transactions/[id]` pre-fill form dengan data existing
- Tombol "Simpan Perubahan" dan tombol "Hapus" (dengan konfirmasi)
- Hapus → confirm dialog → delete → redirect ke `/transactions`

---

## 6. Akun Keuangan (`/accounts`)

### List Akun
- Card per akun: nama, tipe badge, saldo terkini
- Tombol "Tambah Akun"
- Klik card → buka form edit

### Form Tambah/Edit Akun
| Field | Type | Validasi |
|---|---|---|
| Nama Akun | text | Required, min 2 karakter, max 30 karakter |
| Tipe | select | Required: Cash / Bank / E-Wallet |
| Saldo Awal | number | Required, ≥ 0, default: 0 |

**Behavior delete:**
- Cek apakah akun digunakan di transaksi manapun
- Jika ada transaksi → tampilkan error "Akun tidak bisa dihapus karena masih ada transaksi terhubung"
- Jika kosong → konfirmasi → hapus

---

## 7. Kategori (`/categories`)

### Layout
- Dua tab: **Expense** | **Income**
- List kategori dengan icon, nama, badge (default/custom)
- Tombol "Tambah Kategori"

### Form Tambah/Edit Kategori
| Field | Type | Validasi |
|---|---|---|
| Nama | text | Required, min 2 karakter, max 30 karakter |
| Tipe | select | Required: Expense / Income |
| Icon | icon picker | Required (dari set icon Lucide yang dikurasi) |
| Warna | color picker | Required (pilih dari palette pastel yang disediakan) |

**Behavior delete:**
- Kategori default tidak bisa dihapus (tombol delete tidak muncul)
- Kategori custom yang digunakan di transaksi tidak bisa dihapus
- Kategori custom yang tidak dipakai → konfirmasi → hapus

---

## 8. Budget Cycle (`/budget`)

### 8.1 Halaman Budget Utama

**Jika ada cycle aktif:**
- Header: nama cycle, tanggal mulai–selesai, sisa hari
- Progress per kategori budget (sama seperti di dashboard)
- Blok Untracked
- Tombol "Edit Budget" → modal set/edit budget per kategori
- Tombol "Tutup Cycle" (owner only) → konfirmasi → set `is_active = false`

**Jika tidak ada cycle aktif:**
- Empty state dengan CTA "Buat Cycle Baru"

### 8.2 Form Buat/Edit Budget per Kategori (Modal)

- List semua kategori expense
- Per kategori: input jumlah budget (bisa dikosongkan = tidak dibudget = masuk Untracked)
- Tombol "Simpan Budget"

---

### 8.3 Riwayat Cycle (`/budget/cycles`)

- List semua cycle (aktif di atas, selesai di bawah, diurutkan terbaru)
- Per cycle: nama, tanggal, badge status (Aktif / Selesai), total expense vs total budget
- Klik cycle → halaman detail cycle (read-only untuk cycle selesai)

### 8.4 Form Buat Cycle Baru (`/budget/cycles/new`)

| Field | Type | Validasi |
|---|---|---|
| Nama Cycle | text | Required, min 3 karakter, max 50 karakter |
| Tanggal Mulai | date | Required |
| Tanggal Selesai | date | Required, harus setelah Tanggal Mulai |
| Salin budget dari cycle sebelumnya | checkbox | Opsional |

**Behavior:**
- Submit → insert `cycles` (is_active = true) → update cycle sebelumnya `is_active = false`
- Jika "salin budget" dicentang → copy semua rows `budgets` dari cycle sebelumnya ke cycle baru

---

## 9. Settings

### 9.1 Profil (`/settings`)
- Edit nama dan avatar (upload gambar atau pilih avatar preset pixel art)
- Ganti password (untuk akun email/password)

### 9.2 Tracker & Members (`/settings/members`)

**Tampilan:**
- Nama tracker (owner bisa edit)
- List member: avatar, nama, email, badge "Owner"/"Member", tanggal join
- Invite code: ditampilkan dengan tombol copy & tombol regenerate (owner only)
- Tombol "Keluarkan Member" di baris member non-owner (owner only)

**Invite code behavior:**
- Klik copy → salin code ke clipboard → toast "Code disalin!"
- Klik regenerate → konfirmasi "Code lama akan tidak berlaku" → generate code baru → tampilkan code baru

---

## 10. Export (Modal/Sheet)

Diakses dari tombol "Export" di halaman Transactions dan Budget.

**Step 1 — Pilih format:**
- CSV
- Excel (.xlsx)
- PDF

**Step 2 — Pilih scope:**
- Cycle aktif
- Cycle tertentu (dropdown pilih dari riwayat)
- Semua transaksi

**Behavior generate:**
- CSV: build string CSV di client, trigger download via Blob URL
- Excel: gunakan SheetJS (`xlsx`) di client, trigger download
- PDF: gunakan jsPDF + jspdf-autotable di client, trigger download
- Nama file: `miyucash-[scope-slug]-[YYYYMMDD].[ext]`

**Kolom export:**
| Kolom | Keterangan |
|---|---|
| Tanggal | Format: DD/MM/YYYY |
| Tipe | Expense / Income / Transfer |
| Akun | Nama akun asal |
| Akun Tujuan | Nama akun tujuan (hanya untuk Transfer) |
| Kategori | Nama kategori atau "-" untuk transfer |
| Jumlah | Angka tanpa format (untuk CSV/Excel) atau "Rp X.XXX" (untuk PDF) |
| Catatan | Teks catatan atau kosong |
| Diinput oleh | Nama user |

---

## 11. PWA & Offline

**Offline fallback page:**
- Tampilkan pixel art kucing Himalaya sedang tidur
- Pesan: "MiyuCash sedang offline. Koneksi internet diperlukan untuk sync data."
- Tombol "Coba Lagi" yang refresh halaman

**Service worker caching strategy:**
- Static assets (JS, CSS, font, gambar): Cache First
- Supabase API calls: Network First (tidak di-cache — data harus fresh)
- Halaman navigasi: Network First dengan fallback ke offline page

---

## 12. Design System & UI

> Implementasi UI menggunakan **frontend-design skill** (`/frontend-design`).
> Jalankan skill ini saat membangun setiap halaman untuk mendapatkan kualitas UI production-grade.

**Prinsip desain:**
- Family-friendly, warm, tidak intimidatif
- Pixel art mascot (kucing Himalaya) muncul di: splash screen, empty states, error pages, onboarding
- Semua interaksi ada loading state dan feedback visual

**Palet warna:**
```css
--color-bg:         #FFFFFF
--color-surface:    #F5F0E8   /* krem */
--color-primary:    #B8D4E8   /* biru muda */
--color-secondary:  #C9B8E8   /* lavender */
--color-warm:       #F2C4A0   /* peach */
--color-success:    #A8D8B9   /* mint */
--color-warning:    #F5E6A3   /* kuning pastel */
--color-danger:     #F2A8A8   /* merah pastel */
--color-text:       #2D2D2D
--color-muted:      #8A8A8A
```

**Typography:**
- Heading: Nunito (rounded, friendly)
- Body: Geist Sans
- Monospace (angka keuangan): Geist Mono

**Component states yang wajib ada:**
- Loading skeleton (bukan spinner tunggal)
- Empty state dengan pixel art mascot
- Error state dengan pesan actionable
- Success toast notification

---

## 13. Acceptance Criteria Kunci

| Fitur | Kriteria |
|---|---|
| Auth | User bisa register, login email, login Google dalam < 30 detik |
| Invite | Partner bisa join dengan code dalam < 2 menit dari terima code |
| Input transaksi | Form bisa diisi dan disimpan dalam < 20 tap/klik di mobile |
| Dashboard | Load pertama < 2 detik pada koneksi 4G |
| Budget progress | Angka budget akurat sesuai transaksi yang ada di cycle |
| Untracked | Total untracked akurat: hanya expense dalam cycle yang tidak punya budget |
| Export | File ter-download dalam < 3 detik untuk dataset 1000 transaksi |
| PWA | App bisa di-install di Android Chrome dan iOS Safari |
| Offline | Halaman offline muncul jika tidak ada koneksi, tidak crash |
| RLS | User tidak bisa mengakses data tracker yang bukan miliknya (test dengan curl) |
