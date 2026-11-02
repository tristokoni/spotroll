# Spotroll

Slovenská aplikácia na objavovanie miest v okolí. Next.js 15, React 19, Leaflet a Supabase.

## Lokálne spustenie

Vyžaduje Node.js 22 alebo novší.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

V `.env.local` nastav údaje vlastného Supabase projektu. Bez nich sa stránka otvorí, ale načítanie miest a účty nie sú dostupné.

## Spustenie z GitHubu (Vercel)

1. Nahraj obsah tohto repozitára na GitHub vrátane `package-lock.json`.
2. Vo Vercel vyber **Add New → Project**, pripoj GitHub a importuj `tristokoni/spotroll`.
3. Framework je **Next.js**, root directory ponechaj koreň repozitára. Node.js nastav na 22.
4. Pridaj premenné `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `SUPABASE_SERVICE_ROLE_KEY` z vlastného Supabase projektu. Service role kľúč patrí iba do serverových premenných, nikdy do GitHubu ani do premennej s prefixom `NEXT_PUBLIC_`.
5. V Supabase SQL editore postupne spusti `supabase/migrations/001_init.sql`, potom `002_upgrade.sql`. Voliteľné ukážkové údaje sú v `supabase/seed.sql`.
6. V Supabase Authentication → URL Configuration nastav Site URL na pridelenú Vercel doménu a pridaj povolené návratové URL pre túto doménu.
7. Vo Vercel klikni **Deploy**. Ďalšie pushnutia do hlavnej vetvy spustia nové nasadenie automaticky.

GitHub Pages nepodporuje serverové API tejto aplikácie. GitHub uchováva zdrojový kód a spúšťa kontrolu zostavenia; aplikáciu prevádzkuje Vercel, databázu a účty Supabase.

## Kontroly

```sh
npm run build
npm run lint
```

`lint` momentálne spúšťa TypeScript kontrolu. GitHub Actions vykoná `npm ci` a produkčné zostavenie pri pushi aj pull requeste. Samostatná automatizovaná testovacia sada zatiaľ nie je súčasťou projektu.

Mapové podklady poskytuje OpenStreetMap. Výpočet trasy používa verejné OSRM API; čas a vhodnosť pešej trasy je potrebné overiť, verejný server negarantuje peší profil.
