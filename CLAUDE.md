# MiyuCash — CLAUDE.md
> Instruksi untuk Claude Code dalam project ini. Baca dokumen ini sebelum melakukan implementasi apapun.

---

## Project Overview

**MiyuCash** adalah aplikasi budgeting dan finance tracker berbasis web (PWA) untuk 2 user yang berbagi satu tracker bersama. Dibangun dengan Next.js 14, Supabase, dan di-deploy ke Vercel.

Dokumen acuan implementasi ada di folder `docs/`:
- `docs/PRD.md` — Product vision, personas, user stories
- `docs/FRS.md` — Functional requirements specification
- `docs/FRD.md` — Detailed feature specs & acceptance criteria
- `docs/ERD.md` — Database schema & entity relationships
- `PLAN.md` — Tech stack, fase development, branding

**Selalu baca dokumen relevan sebelum mengimplementasikan fitur baru.**

---

## Tech Stack

| Layer | Library/Tool | Versi |
|---|---|---|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL) | latest |
| Auth | Supabase Auth (email/password only) | latest |
| Styling | Tailwind CSS | 3.x |
| UI Components | shadcn/ui | latest |
| State | Zustand | 4.x |
| Form | React Hook Form + Zod | latest |
| Charts | Recharts | 2.x |
| Export | SheetJS (xlsx) + jsPDF | latest |
| PWA | next-pwa | latest |
| Icons | Lucide React | latest |

---

## Project Structure

```
miyucash2/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth layout group
│   │   ├── login/
│   │   └── register/
│   ├── (app)/                    # Main app layout group (requires auth)
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── accounts/
│   │   ├── budget/
│   │   ├── categories/
│   │   └── settings/
│   ├── join/                     # Join tracker via invite code
│   ├── api/                      # API routes (minimal — prefer Supabase direct)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui components (DO NOT EDIT)
│   ├── layout/                   # Navbar, sidebar, shell
│   ├── transactions/             # Transaction-specific components
│   ├── budget/                   # Budget & cycle components
│   ├── dashboard/                # Dashboard widgets
│   └── shared/                   # Reusable components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client (SSR)
│   │   └── middleware.ts         # Auth middleware helper
│   ├── utils.ts                  # cn(), formatCurrency(), dll
│   ├── validations/              # Zod schemas
│   └── export/                   # Export helpers (csv, xlsx, pdf)
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores
├── types/                        # TypeScript type definitions
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icon-192.png              # PWA icon (pixel art cat)
│   ├── icon-512.png
│   └── mascot/                   # Pixel art assets
├── supabase/
│   └── migrations/               # SQL migration files
├── docs/                         # Semua dokumen acuan
└── PLAN.md
```

---

## Commands

```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Build & deploy
npm run build        # Build production
npm run start        # Start production server

# Database
npx supabase db push          # Push migrations ke Supabase
npx supabase gen types typescript --local > types/supabase.ts  # Generate types

# Linting
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

---

## Coding Conventions

### TypeScript
- **Selalu gunakan TypeScript** — tidak ada file `.js` di `app/` atau `components/`
- Generate Supabase types dari schema: `types/supabase.ts`
- Definisikan domain types di `types/index.ts`

### Components
- Server Components by default — tambahkan `"use client"` hanya jika butuh interaktivitas
- Penamaan: PascalCase untuk components, kebab-case untuk file
- Satu component per file

### Data Fetching
- **Server Components**: fetch data langsung via Supabase server client
- **Client Components**: gunakan custom hooks dengan Supabase browser client
- Hindari API routes kecuali benar-benar perlu — manfaatkan Supabase RLS

### Supabase
- Semua query harus respek **Row Level Security (RLS)** — jangan bypass dengan service key di client
- Gunakan `lib/supabase/server.ts` untuk Server Components
- Gunakan `lib/supabase/client.ts` untuk Client Components
- Semua tabel harus punya RLS policy aktif

### Styling
- Gunakan Tailwind utility classes — hindari CSS custom kecuali untuk animasi kompleks
- Warna tema via CSS variables (didefinisikan di `globals.css`)
- Komponen dari shadcn/ui di `components/ui/` — **jangan edit langsung**, extend jika perlu

### Currency
- Semua amount disimpan sebagai `numeric(15,2)` di database
- Format tampilan: `Rp 1.250.000` — gunakan helper `formatCurrency(amount)` di `lib/utils.ts`
- Jangan pernah lakukan kalkulasi floating point langsung — gunakan helper yang ada

---

## Environment Variables

```env
# .env.local (tidak di-commit — sudah berisi nilai yang benar)
NEXT_PUBLIC_SUPABASE_URL=https://jjiryrgstsakpjwivrno.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<lihat credentials/.supabase>

# .env.example (di-commit, tanpa nilai)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Credentials disimpan di `credentials/.supabase`** (tidak di-commit via .gitignore):
- `anon_public` → dipakai di frontend (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `service_role` → **JANGAN dipakai di frontend** — hanya untuk operasi server-side admin jika diperlukan

**Aturan credentials:**
- `credentials/` masuk `.gitignore` — tidak pernah di-commit
- `.env.local` masuk `.gitignore` — tidak pernah di-commit
- Anon key aman di-expose ke client (sudah by design oleh Supabase, dilindungi oleh RLS)
- Service role key bypass semua RLS — jangan pernah ke client

---

## Supabase Setup

- **Region**: `ap-southeast-1` (Singapore)
- **Auth providers**: Email+Password, Google OAuth
- **RLS**: Aktif di semua tabel
- **Realtime**: Tidak digunakan di v1

Migration files ada di `supabase/migrations/`. Jalankan secara berurutan.

---

## Vercel Deployment

- **Region**: `sin1` (Singapore)
- Konfigurasi region di `vercel.json`:
  ```json
  { "regions": ["sin1"] }
  ```
- Environment variables di Vercel Dashboard → Settings → Environment Variables

---

## PWA

- Konfigurasi di `next.config.js` via `next-pwa`
- Manifest di `public/manifest.json`
- Icon pixel art harus tersedia dalam ukuran: 192×192 dan 512×512
- Service worker di-generate otomatis — jangan edit manual
- Test PWA install di Chrome DevTools → Application → Manifest

---

## Aturan Penting

1. **Idempotent migrations** — setiap SQL migration harus aman dijalankan ulang
2. **Jangan hardcode user ID atau tracker ID** — selalu ambil dari session/context
3. **Untracked budget** dihitung via query, bukan kolom — lihat `docs/FRD.md` untuk logikanya
4. **Transfer tidak masuk expense/income** — pastikan query summary mengecualikan type `transfer`
5. **Saldo akun** dihitung dari transaksi, bukan disimpan langsung — jangan cache saldo di DB
6. **Invite code** bersifat case-insensitive di input user, simpan uppercase di DB
7. **Hanya 1 cycle aktif** per tracker — enforce di DB level dengan partial unique index

---

## Skills yang Digunakan

Gunakan skills berikut pada fase yang sesuai. Jangan implementasi tanpa menjalankan skill yang relevan.

| Skill | Command | Kapan digunakan |
|---|---|---|
| **frontend-design** | `/frontend-design` | Setiap kali membangun halaman atau komponen UI baru. Skill ini menghasilkan UI production-grade dengan desain yang distinctive — bukan tampilan generic. Wajib dijalankan untuk semua halaman di `app/(app)/` dan komponen di `components/`. |
| **security-review** | `/security-review` | Sebelum deploy ke production. Jalankan untuk cek RLS Supabase, validasi input, XSS, dan keamanan auth flow. |
| **simplify** | `/simplify` | Setelah selesai implementasi fitur. Review kode yang baru ditulis untuk efisiensi dan kualitas. |
| **init** | `/init` | Sudah dijalankan — menghasilkan CLAUDE.md ini. Tidak perlu dijalankan ulang kecuali ada perubahan struktur besar. |

### Panduan penggunaan `frontend-design` skill:

Saat membangun UI, sertakan konteks ini ke skill:
- Tema: pastel, family-friendly, pixel art Himalayan cat mascot
- Palet: krem `#F5F0E8`, biru muda `#B8D4E8`, lavender `#C9B8E8`, peach `#F2C4A0`
- Font: Nunito untuk heading, Geist Sans untuk body
- Komponen shadcn/ui sudah tersedia — extend, jangan replace
- Pixel art mascot muncul di empty states dan loading

---

## Referensi Dokumen

| Dokumen | Path | Digunakan saat |
|---|---|---|
| Plan | `PLAN.md` | Tech stack, fase, branding decisions |
| PRD | `docs/PRD.md` | Memahami tujuan produk & user stories |
| FRS | `docs/FRS.md` | Memahami scope sistem & use cases |
| FRD | `docs/FRD.md` | Implementasi detail per fitur |
| ERD | `docs/ERD.md` | Membuat/memodifikasi tabel database |
