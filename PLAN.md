# MiyuCash — Budgeting & Finance Tracker
**Plan Dokumen v1.2 — 2026-06-24**

> Logo: Kucing Himalaya **pixel art** — warna pastel soft (putih, krem, biru muda), tema family-friendly

---

## 1. Overview

Aplikasi budgeting dan finance tracker berbasis web yang dapat digunakan bersama oleh 2 user (shared tracker). Mendukung pencatatan expense, income, dan transfer antar akun, dengan siklus anggaran yang dapat dikonfigurasi manual per periode. Pengeluaran di luar kategori yang sudah dibudget masuk ke **Untracked Budget**.

---

## 2. Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Full-stack, optimal di Vercel |
| Deployment | Vercel (region `sin1` Singapore) | Gratis, CDN dekat Indonesia |
| Database | Supabase (region `ap-southeast-1` Singapore) | PostgreSQL, familiar, region dekat |
| Auth | Supabase Auth (email/password) | Terintegrasi dengan database |
| Styling | Tailwind CSS + shadcn/ui | Cepat, konsisten |
| State | Zustand | Ringan, simple |
| Form | React Hook Form + Zod | Validasi client-side |
| Chart | Recharts | Visualisasi data keuangan |
| Export | SheetJS (xlsx) + jsPDF | Generate file client-side |
| PWA | next-pwa | Install ke homescreen, offline support |

> **Catatan Supabase**: Free tier pause setelah 7 hari tidak aktif. Mitigasi:
> - Setup cron ping via `cron-job.org` setiap 3 hari
> - Atau upgrade ke Pro ($25/bulan) jika sudah production

---

## 3. Fitur Utama

### 3.1 Auth & User
- [x] Register / Login via Email+Password
- [x] Lupa password via email reset
- [x] Setiap user punya profil (nama, avatar)

### 3.2 Shared Tracker (Multi-User)
- [x] User bisa **create tracker** (jadi owner)
- [x] Owner generate **invite code** (6 karakter unik, contoh: `MIYU42`)
- [x] Member join dengan masukkan invite code di halaman `/join`
- [x] Maksimal 2 user per tracker
- [x] Keduanya bisa input transaksi, lihat semua data
- [x] Owner bisa regenerate invite code, remove member, atau hapus tracker

### 3.3 Akun Keuangan
- [x] Buat multiple akun (Contoh: Cash, BCA, OVO, GoPay)
- [x] Setiap akun punya: nama, tipe (cash/bank/e-wallet), saldo awal
- [x] Saldo dihitung otomatis dari transaksi

### 3.4 Transaksi
- [x] **Expense** — pengeluaran dari akun, masuk ke kategori
- [x] **Income** — pemasukan ke akun, dari sumber
- [x] **Transfer** — pindah saldo antar akun (contoh: BCA → OVO)
- [x] Field transaksi: tanggal, jumlah, akun, kategori, catatan
- [x] Edit & delete transaksi
- [x] Filter transaksi: by akun, kategori, tanggal, tipe

### 3.5 Kategori
- [x] Preset kategori default (Makan, Transport, Belanja, Tagihan, dll)
- [x] Bisa tambah / edit / hapus kategori custom
- [x] Kategori berbeda untuk expense dan income

### 3.6 Budget Cycle
- [x] **Manual cycle** — user set tanggal mulai dan selesai sendiri
- [x] Contoh: cycle 25 Juni – 24 Juli, atau 1–30 per bulan
- [x] Bisa set budget per kategori per cycle
- [x] Progress bar per kategori: sudah terpakai vs limit
- [x] Alert jika budget mendekati (80%) atau melewati limit (100%)
- [x] Riwayat cycle sebelumnya bisa dilihat

### 3.7 Untracked Budget
- [x] Kategori khusus otomatis bernama **"Untracked"**
- [x] Expense yang kategorinya **tidak memiliki budget** di cycle aktif → masuk Untracked
- [x] Expense yang memilih kategori **"Other" / tidak dikategorikan** → masuk Untracked
- [x] Di dashboard, Untracked ditampilkan terpisah sebagai blok sendiri
- [x] Total Untracked = total pengeluaran di luar budgeted categories
- [x] User bisa klik Untracked untuk lihat detail transaksi di dalamnya
- [x] Tidak ada limit untuk Untracked — hanya monitoring/awareness

### 3.8 Export
- [x] Tombol **Export** tersedia di halaman Transactions dan Budget/Cycle
- [x] Format pilihan: **CSV**, **Excel (.xlsx)**, **PDF**
- [x] Scope export yang bisa dipilih:
  - Transaksi cycle aktif
  - Transaksi cycle tertentu (dari riwayat)
  - Semua transaksi (all time)
- [x] File di-generate **client-side** (tidak perlu server) — pakai library:
  - CSV: native (manual string build)
  - Excel: `xlsx` (SheetJS)
  - PDF: `jsPDF` + `jspdf-autotable`
- [x] Isi export: tanggal, tipe, akun, kategori, jumlah, catatan, dibuat oleh
- [x] Nama file otomatis: `miyucash-[cycle-name]-[tanggal].csv`

### 3.9 Dashboard & Laporan
- [x] Ringkasan cycle aktif: total income, expense (budgeted + untracked), saldo
- [x] Budget progress per kategori (progress bar)
- [x] Blok **Untracked Budget** — total & shortcut ke list transaksinya
- [x] Grafik: pengeluaran per kategori (pie/donut chart, untracked masuk sebagai slice tersendiri)
- [x] Grafik: tren income vs expense per cycle (bar chart)
- [x] Saldo per akun (card summary)

---

## 4. Data Model (Supabase / PostgreSQL)

```sql
-- Users (dikelola Supabase Auth, extend dengan tabel ini)
users
  id            uuid PRIMARY KEY  -- sama dengan auth.users.id
  email         text
  name          text
  avatar_url    text
  created_at    timestamptz

-- Tracker (shared workspace)
trackers
  id            uuid PRIMARY KEY
  name          text
  owner_id      uuid REFERENCES users(id)
  invite_code   text UNIQUE       -- 6 karakter, contoh: MIYU42
  created_at    timestamptz

-- Tracker members (max 2 per tracker)
tracker_members
  tracker_id    uuid REFERENCES trackers(id)
  user_id       uuid REFERENCES users(id)
  joined_at     timestamptz
  PRIMARY KEY (tracker_id, user_id)

-- Akun keuangan
accounts
  id            uuid PRIMARY KEY
  tracker_id    uuid REFERENCES trackers(id)
  name          text
  type          text              -- cash | bank | ewallet
  initial_balance numeric(15,2)
  currency      text DEFAULT 'IDR'
  created_by    uuid REFERENCES users(id)
  created_at    timestamptz

-- Kategori
categories
  id            uuid PRIMARY KEY
  tracker_id    uuid REFERENCES trackers(id)
  name          text
  type          text              -- expense | income
  icon          text
  color         text
  is_default    boolean DEFAULT false
  created_at    timestamptz

-- Budget Cycle
cycles
  id            uuid PRIMARY KEY
  tracker_id    uuid REFERENCES trackers(id)
  name          text              -- contoh: "Juli 2026"
  start_date    date
  end_date      date
  is_active     boolean DEFAULT false
  created_at    timestamptz

-- Budget per kategori per cycle
budgets
  id            uuid PRIMARY KEY
  cycle_id      uuid REFERENCES cycles(id)
  category_id   uuid REFERENCES categories(id)
  amount        numeric(15,2)    -- limit budget
  UNIQUE (cycle_id, category_id)

-- Transaksi
transactions
  id            uuid PRIMARY KEY
  tracker_id    uuid REFERENCES trackers(id)
  type          text              -- expense | income | transfer
  amount        numeric(15,2)
  date          date
  account_id    uuid REFERENCES accounts(id)
  to_account_id uuid REFERENCES accounts(id)  -- khusus transfer
  category_id   uuid REFERENCES categories(id) -- null untuk transfer
  note          text
  created_by    uuid REFERENCES users(id)
  created_at    timestamptz
```

**Logika Untracked:**
```
Transaksi expense dikategorikan sebagai "Untracked" jika:
  category_id IS NULL
  ATAU category_id tidak ada entry di tabel budgets untuk cycle aktif
```
Tidak perlu kolom khusus — dihitung secara query.

---

## 5. Halaman (Routes)

```
/                        → Redirect ke /dashboard atau /login
/login                   → Login
/register                → Register
/dashboard               → Overview cycle aktif + untracked budget
/transactions            → List semua transaksi
/transactions/new        → Form tambah transaksi
/transactions/[id]       → Detail / edit transaksi
/accounts                → Kelola akun keuangan
/budget                  → Budget cycle aktif, progress per kategori
/budget/cycles           → Riwayat & kelola cycle
/budget/cycles/new       → Buat cycle baru
/categories              → Kelola kategori
/settings                → Profil, tracker settings
/settings/members        → Kelola member, invite code
/join                    → Form input invite code untuk join tracker
```

---

## 6. Invite Code Flow

```
Owner                              Member
  |                                  |
  | Create Tracker                   |
  | → invite_code = "MIYU42"         |
  |                                  |
  | Bagikan code "MIYU42"  ------->  |
  |                                  | Buka /join
  |                                  | Input code "MIYU42"
  |                                  | Login jika belum
  |                                  | Klik "Join Tracker"
  |                                  | → INSERT tracker_members
  |                                  |
  | Keduanya akses tracker sama      |
  |                                  |
  | Owner bisa regenerate code       |
  | (code lama invalid)              |
```

---

## 7. Untracked Budget — Detail Logic

```
Cycle aktif: 1 Juli – 31 Juli
Budgeted categories: Makan (300k), Transport (200k), Tagihan (500k)

Transaksi expense bulan Juli:
  - Makan siang       → kategori: Makan      → BUDGETED
  - Grab              → kategori: Transport   → BUDGETED
  - Beli buku         → kategori: Belanja     → UNTRACKED (tidak ada budget)
  - Nonton bioskop    → kategori: Hiburan     → UNTRACKED (tidak ada budget)
  - Transfer listrik  → kategori: Tagihan     → BUDGETED

Dashboard menampilkan:
  ┌─────────────────────────────────┐
  │ Makan        Rp 150k / 300k 50% │
  │ Transport    Rp 180k / 200k 90% │
  │ Tagihan      Rp 450k / 500k 90% │
  ├─────────────────────────────────┤
  │ Untracked    Rp 120k            │ ← klik untuk lihat detail
  └─────────────────────────────────┘
```

---

## 8. Business Rules

- **Transfer** tidak masuk hitungan expense/income — hanya memindahkan saldo
- **Saldo akun** = `initial_balance + Σincome - Σexpense - Σtransfer_out + Σtransfer_in`
- **Hanya 1 cycle aktif** pada satu waktu
- **Invite code** berlaku sampai di-regenerate oleh owner
- **Untracked** tidak memiliki limit — hanya untuk awareness/monitoring
- Transaksi di luar rentang cycle tetap tersimpan, tidak masuk kalkulasi budget cycle

---

## 9. Supabase Row Level Security (RLS)

- User hanya bisa akses data tracker yang dia terdaftar di `tracker_members`
- Invite code lookup boleh tanpa auth (untuk cek validitas sebelum join)
- Semua operasi INSERT/UPDATE/DELETE membutuhkan auth

---

## 10. Fase Development

### Fase 1 — Foundation (Week 1)
- [ ] Setup Next.js 14 + Tailwind + shadcn/ui
- [ ] Setup Supabase project (region Singapore)
- [ ] Konfigurasi Vercel deployment region `sin1`
- [ ] Auth: Login, Register, Google OAuth via Supabase Auth
- [ ] Buat tracker pertama, invite code system

### Fase 2 — Core Features (Week 2)
- [ ] Kelola akun keuangan (CRUD)
- [ ] Kelola kategori (CRUD)
- [ ] Input transaksi: expense, income, transfer
- [ ] List & filter transaksi

### Fase 3 — Budget & Cycle (Week 3)
- [ ] Setup cycle (manual tanggal)
- [ ] Set budget per kategori
- [ ] Progress bar budget
- [ ] Untracked Budget calculation & display
- [ ] Dashboard ringkasan

### Fase 4 — Polish (Week 4)
- [ ] Chart & visualisasi (pie chart dengan slice Untracked)
- [ ] Export CSV / Excel / PDF (client-side)
- [ ] Riwayat cycle
- [ ] Mobile responsive optimization
- [ ] Loading states, empty states (dengan pixel art maskot), error handling
- [ ] Cron ping untuk cegah Supabase pause

---

## 11. Branding

- **Nama**: MiyuCash
- **Maskot**: Kucing Himalaya — **pixel art style**, ekspresi lucu/cute, family-friendly
- **Palet warna**:
  - Background: putih `#FFFFFF`, krem `#F5F0E8`
  - Accent utama: biru muda `#B8D4E8`
  - Accent sekunder: ungu lavender `#C9B8E8`
  - Accent hangat: peach `#F2C4A0`
  - Success: mint `#A8D8B9`
  - Warning: kuning pastel `#F5E6A3`
  - Danger: merah pastel `#F2A8A8`
- **Font**: Geist Sans (body) + Nunito/Fredoka (heading — rounded, friendly)
- **Tone**: Friendly, warm, tidak terasa seperti software korporat — cocok semua umur
- **Pixel art usage**: maskot muncul di loading screen, empty states, onboarding, dan achievement kecil

---

## 12. PWA (Progressive Web App)

MiyuCash bisa di-install seperti aplikasi native di Android dan iOS langsung dari browser, tanpa perlu App Store.

### Yang didapat dengan PWA:
- [x] **Install ke homescreen** — muncul seperti app biasa di Android & iOS
- [x] **Splash screen** — dengan pixel art kucing Himalaya saat buka app
- [x] **App icon** — pixel art maskot sebagai icon di homescreen
- [x] **Standalone mode** — berjalan tanpa browser bar (fullscreen app-like)
- [x] **Offline fallback** — halaman "Kamu sedang offline" jika tidak ada koneksi
- [x] **Cache static assets** — load lebih cepat setelah kunjungan pertama
- [x] **Theme color** — status bar Android menyesuaikan warna tema MiyuCash

### Yang TIDAK bisa tanpa native app:
- Push notification di iOS (terbatas, perlu iOS 16.4+)
- Akses kamera/gallery untuk foto struk (bisa sebagian via browser API)
- Background sync data saat offline (data baru tersimpan saat online kembali)

### Implementasi di Next.js:
```
Library: next-pwa (wrapper Workbox untuk Next.js)

File yang dibuat:
  public/manifest.json     → nama app, icon, warna, display mode
  public/icon-*.png        → icon pixel art berbagai ukuran (192x192, 512x512)
  service worker           → di-generate otomatis oleh next-pwa
```

### Manifest config:
```json
{
  "name": "MiyuCash",
  "short_name": "MiyuCash",
  "description": "Budgeting & Finance Tracker",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#F5F0E8",
  "theme_color": "#B8D4E8",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Ditambahkan ke fase development:
- Week 1: Setup `next-pwa`, buat `manifest.json`, siapkan icon pixel art
- Week 4: Test install di Android & iOS, pastikan offline fallback bekerja

---

## 14. Out of Scope (v1)

- Multiple currency conversion
- Recurring transaction otomatis
- Notifikasi push/email
- Lebih dari 2 user per tracker
- Attachment foto struk

---

## 15. Estimasi Biaya (Free Tier)

| Service | Free Tier | Catatan |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth | Aman untuk personal use |
| Supabase Free | 500 MB DB, 2 project | Perlu cron ping anti-pause |
| cron-job.org | Gratis | Ping Supabase tiap 3 hari |

**Total biaya: Rp 0 / bulan**
