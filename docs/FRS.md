# FRS — Functional Requirements Specification
**MiyuCash: Budgeting & Finance Tracker**
Version 1.0 | 2026-06-24

---

## 1. Scope Sistem

MiyuCash adalah aplikasi web (PWA) yang memungkinkan 1–2 user mengelola keuangan bersama dalam satu shared tracker. Sistem ini mencakup autentikasi, manajemen akun keuangan, pencatatan transaksi (expense/income/transfer), pengaturan budget cycle, perhitungan untracked budget, dan export laporan.

---

## 2. User Roles

| Role | Deskripsi | Hak Akses |
|---|---|---|
| **Owner** | User yang membuat tracker | Full access: CRUD semua data, kelola member, regenerate invite code, hapus tracker |
| **Member** | User yang join via invite code | Full access: CRUD semua data kecuali hapus tracker & kelola member |
| **Guest** | User belum login / belum join tracker | Hanya bisa akses halaman join & auth |

---

## 3. Functional Requirements

### FR-01: Autentikasi

| ID | Requirement |
|---|---|
| FR-01.1 | Sistem harus menyediakan form register dengan field: email, password, nama |
| FR-01.2 | Sistem harus menyediakan login dengan email + password |
| FR-01.3 | Sistem harus mempertahankan sesi login (persistent session via Supabase) |
| FR-01.5 | Sistem harus redirect user yang belum login ke halaman `/login` |
| FR-01.6 | Sistem harus redirect user yang sudah login dari halaman auth ke `/dashboard` |
| FR-01.7 | Sistem harus menyediakan fungsi logout yang menghapus session |
| FR-01.8 | Password harus memenuhi syarat minimum: 8 karakter |
| FR-01.9 | Sistem harus menyediakan fitur lupa password via email reset |

### FR-02: Tracker & Multi-User

| ID | Requirement |
|---|---|
| FR-02.1 | Sistem harus menampilkan onboarding "buat tracker" untuk user baru yang belum punya tracker |
| FR-02.2 | Sistem harus generate invite code 6 karakter alphanumeric unik saat tracker dibuat |
| FR-02.3 | Invite code harus case-insensitive saat diinput, disimpan uppercase di database |
| FR-02.4 | Sistem harus menolak join jika tracker sudah memiliki 2 member |
| FR-02.5 | Sistem harus menolak join jika user sudah terdaftar di tracker tersebut |
| FR-02.6 | Owner dapat regenerate invite code; code lama langsung invalid |
| FR-02.7 | Owner dapat remove member (non-owner) dari tracker |
| FR-02.8 | Setiap transaksi harus menyimpan `created_by` (UID user yang input) |
| FR-02.9 | Semua data tracker hanya accessible oleh member tracker tersebut |

### FR-03: Akun Keuangan

| ID | Requirement |
|---|---|
| FR-03.1 | User dapat membuat akun keuangan dengan field: nama, tipe (cash/bank/ewallet), saldo awal |
| FR-03.2 | Sistem harus menghitung saldo terkini dari transaksi — bukan menyimpan saldo langsung |
| FR-03.3 | User dapat mengedit nama dan tipe akun |
| FR-03.4 | User dapat menghapus akun hanya jika tidak ada transaksi yang terhubung |
| FR-03.5 | Saldo terkini ditampilkan di card akun pada halaman accounts dan dashboard |

**Formula saldo:**
```
saldo = initial_balance
      + Σ amount WHERE type='income' AND account_id = akun
      - Σ amount WHERE type='expense' AND account_id = akun
      - Σ amount WHERE type='transfer' AND account_id = akun (transfer keluar)
      + Σ amount WHERE type='transfer' AND to_account_id = akun (transfer masuk)
```

### FR-04: Kategori

| ID | Requirement |
|---|---|
| FR-04.1 | Sistem harus menyediakan kategori default saat tracker pertama dibuat |
| FR-04.2 | User dapat membuat kategori custom dengan field: nama, tipe (expense/income), icon, warna |
| FR-04.3 | User dapat mengedit kategori custom |
| FR-04.4 | User dapat menghapus kategori custom yang tidak digunakan di transaksi manapun |
| FR-04.5 | Kategori default tidak dapat dihapus |

**Kategori default expense:** Makan & Minum, Transport, Belanja, Tagihan & Utilitas, Kesehatan, Hiburan, Pendidikan, Lainnya

**Kategori default income:** Gaji, Bonus, Freelance, Investasi, Lainnya

### FR-05: Transaksi

| ID | Requirement |
|---|---|
| FR-05.1 | User dapat input transaksi tipe **expense** dengan field: tanggal, jumlah, akun, kategori, catatan (opsional) |
| FR-05.2 | User dapat input transaksi tipe **income** dengan field: tanggal, jumlah, akun, kategori, catatan (opsional) |
| FR-05.3 | User dapat input transaksi tipe **transfer** dengan field: tanggal, jumlah, akun asal, akun tujuan, catatan (opsional) |
| FR-05.4 | Transfer tidak boleh memiliki akun asal dan tujuan yang sama |
| FR-05.5 | Jumlah transaksi harus lebih dari 0 |
| FR-05.6 | User dapat melihat list semua transaksi, diurutkan terbaru di atas |
| FR-05.7 | User dapat filter transaksi berdasarkan: tipe, akun, kategori, rentang tanggal |
| FR-05.8 | User dapat mengedit transaksi yang sudah ada |
| FR-05.9 | User dapat menghapus transaksi |
| FR-05.10 | List transaksi menampilkan label siapa yang menginput (nama user) |

### FR-06: Budget Cycle

| ID | Requirement |
|---|---|
| FR-06.1 | User dapat membuat cycle dengan field: nama, tanggal mulai, tanggal selesai |
| FR-06.2 | Tanggal selesai harus setelah tanggal mulai |
| FR-06.3 | Hanya boleh ada 1 cycle aktif per tracker pada satu waktu |
| FR-06.4 | Saat cycle baru diaktifkan, cycle sebelumnya otomatis dinonaktifkan |
| FR-06.5 | User dapat set budget amount per kategori dalam suatu cycle |
| FR-06.6 | Budget per kategori adalah opsional — kategori tanpa budget → Untracked |
| FR-06.7 | Sistem menampilkan progress bar (spent/limit) per kategori yang dibudget |
| FR-06.8 | Sistem memberi visual warning saat pengeluaran ≥ 80% dari budget kategori |
| FR-06.9 | Sistem memberi visual alert saat pengeluaran ≥ 100% dari budget kategori (over budget) |
| FR-06.10 | User dapat melihat riwayat cycle yang sudah selesai (read-only) |
| FR-06.11 | User dapat menduplikasi setting budget cycle sebelumnya ke cycle baru |

### FR-07: Untracked Budget

| ID | Requirement |
|---|---|
| FR-07.1 | Sistem harus menghitung total "Untracked" dari expense pada cycle aktif yang kategorinya tidak memiliki budget |
| FR-07.2 | Transaksi expense dengan `category_id IS NULL` selalu masuk Untracked |
| FR-07.3 | Untracked ditampilkan sebagai blok terpisah di halaman budget dan dashboard |
| FR-07.4 | Untracked tidak memiliki limit — hanya informasional |
| FR-07.5 | User dapat melihat daftar transaksi yang termasuk dalam Untracked dengan klik blok Untracked |

**Query logika Untracked:**
```sql
SELECT SUM(t.amount)
FROM transactions t
JOIN cycles c ON c.tracker_id = t.tracker_id AND c.is_active = true
WHERE t.tracker_id = :tracker_id
  AND t.type = 'expense'
  AND t.date BETWEEN c.start_date AND c.end_date
  AND (
    t.category_id IS NULL
    OR t.category_id NOT IN (
      SELECT b.category_id FROM budgets b WHERE b.cycle_id = c.id
    )
  )
```

### FR-08: Dashboard

| ID | Requirement |
|---|---|
| FR-08.1 | Dashboard menampilkan ringkasan cycle aktif: total income, total expense, net balance |
| FR-08.2 | Dashboard menampilkan saldo terkini setiap akun keuangan |
| FR-08.3 | Dashboard menampilkan progress budget per kategori (cycle aktif) |
| FR-08.4 | Dashboard menampilkan blok Untracked Budget dengan total dan link ke detail |
| FR-08.5 | Dashboard menampilkan donut chart pengeluaran per kategori (Untracked sebagai slice tersendiri) |
| FR-08.6 | Dashboard menampilkan bar chart tren income vs expense per cycle (5 cycle terakhir) |
| FR-08.7 | Jika tidak ada cycle aktif, dashboard menampilkan CTA untuk membuat cycle baru |
| FR-08.8 | Transaksi terbaru (5 terakhir) ditampilkan di dashboard sebagai shortcut |

### FR-09: Export

| ID | Requirement |
|---|---|
| FR-09.1 | User dapat export transaksi dalam format CSV |
| FR-09.2 | User dapat export transaksi dalam format Excel (.xlsx) |
| FR-09.3 | User dapat export laporan dalam format PDF |
| FR-09.4 | User dapat memilih scope export: cycle aktif / cycle tertentu / semua transaksi |
| FR-09.5 | File di-generate sepenuhnya di sisi client (tidak ada upload ke server) |
| FR-09.6 | Nama file mengikuti format: `miyucash-[scope]-[tanggal-export].[ext]` |
| FR-09.7 | Isi export mencakup: tanggal, tipe, akun, kategori, jumlah, catatan, diinput oleh |
| FR-09.8 | PDF export mencakup summary (total income, expense, untracked) di bagian atas |

### FR-10: PWA

| ID | Requirement |
|---|---|
| FR-10.1 | Aplikasi harus memiliki `manifest.json` yang valid dengan nama, icon, dan theme color |
| FR-10.2 | Aplikasi harus bisa di-install ke homescreen di Android (Chrome) dan iOS (Safari) |
| FR-10.3 | Aplikasi harus berjalan dalam mode standalone (tanpa browser bar) saat di-install |
| FR-10.4 | Aplikasi harus menampilkan halaman offline custom saat tidak ada koneksi |
| FR-10.5 | Static assets (CSS, JS, font) harus di-cache oleh service worker |
| FR-10.6 | Splash screen menggunakan icon pixel art kucing Himalaya |

---

## 4. Use Cases

### UC-01: User Baru Onboarding
```
Actor: User baru
1. User register / login
2. Sistem deteksi user belum punya tracker
3. Sistem tampilkan onboarding "Buat Tracker Pertamamu"
4. User input nama tracker
5. Sistem buat tracker, generate invite code
6. Sistem arahkan ke dashboard
7. Dashboard tampilkan empty state dengan CTA: "Buat akun keuangan" & "Buat cycle"
```

### UC-02: Join Tracker via Invite Code
```
Actor: User yang diundang
1. Owner bagikan invite code (contoh: MIYU42) kepada partner
2. Partner buka aplikasi, login
3. Partner navigasi ke /join atau klik "Join Tracker" di dashboard
4. Partner input invite code
5. Sistem validasi: code valid & tracker belum penuh
6. Sistem tambahkan partner sebagai member
7. Partner diarahkan ke dashboard tracker bersama
```

### UC-03: Input Transaksi Expense
```
Actor: User (Owner atau Member)
1. User klik tombol "+" atau "Tambah Transaksi"
2. User pilih tipe: Expense
3. User input: jumlah, pilih akun, pilih kategori, pilih tanggal, isi catatan (opsional)
4. User submit
5. Sistem simpan transaksi dengan created_by = user.id
6. Saldo akun terupdate (kalkulasi ulang)
7. Budget progress kategori terupdate di cycle aktif
```

### UC-04: Melihat Untracked Budget
```
Actor: User
1. User buka dashboard atau halaman budget
2. Sistem tampilkan blok "Untracked" dengan total pengeluaran untracked
3. User klik blok Untracked
4. Sistem tampilkan list transaksi yang masuk untracked (filter otomatis)
5. User bisa lihat detail atau edit transaksi dari list ini
```

### UC-05: Export Laporan PDF
```
Actor: User
1. User buka halaman Transactions atau Budget
2. User klik tombol "Export"
3. Sistem tampilkan modal: pilih format (CSV/Excel/PDF) dan scope (cycle aktif / cycle lain / semua)
4. User pilih PDF, cycle aktif
5. Sistem generate PDF di client menggunakan jsPDF
6. Browser trigger download file: miyucash-juli-2026-20260624.pdf
```
