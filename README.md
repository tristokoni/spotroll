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
5. V Supabase SQL editore postupne spusti `supabase/migrations/001_init.sql`, potom `002_upgrade.sql` a nakoniec `003_outings.sql`. Voliteľné ukážkové údaje sú v `supabase/seed.sql`.
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

## Stránky a funkcie

- `/`: mapa a náhodný výber miesta.
- `/explore`: vyhľadávanie podľa názvu/obce, filter vybavenia a radenie.
- `/spots/[id]`: detail miesta, mapa, navigácia a zdieľanie odkazu.
- `/favorites`: obľúbené miesta uložené v účte, synchronizované cez existujúcu tabuľku `favorites`.
- `/account`: profil, úprava prezývky a odhlásenie.
- `/my-spots`: vlastné návrhy s filtrom stavu a dôvodom zamietnutia.
- `/submit`: pridanie miesta cez mapu a formulár.
- `/admin`, `/admin/spots`, `/admin/users`: schvaľovanie, úprava miest, filtre, aktivácia a správa používateľov.

Svetlý/tmavý režim sa predvolene riadi systémom; ručná voľba sa uchováva v prehliadači. Komunitné funkcie vyžadujú aj migráciu 003. API profilu a obľúbených miest overuje prihlásenie a pracuje iba s údajmi daného používateľa; administrátorské API vyžaduje aktívny admin účet.

## Zážitky – iba pre prihlásených

Od tejto verzie vyžadujú všetky funkcie účet vrátane mapy, losovania a čítania API miest. Neprihlásený používateľ uvidí výzvu na prihlásenie; po prihlásení sa vráti na pôvodnú adresu. Zakázané účty nemajú prístup k dátam.

- `/activities`: rozcestník šiestich nových funkcií.
- `/moods`: rande, partia, pokoj, opekačka, výlet s deťmi. Odporúčania podľa vybavenia, voliteľne vzdialenosť od aktuálnej polohy; nejde o garanciu bezpečnosti.
- `/trips`: súkromné plány s 1–10 zastávkami, poradie, dátum, poznámky, úprava, odstránenie, navigácia. Voliteľné zdieľanie cez odkaz iba prihláseným, úpravy iba autorovi.
- `/polls`: 2–8 miest, odkaz pre partiu, jeden meniteľný hlas na účet, výsledky, uzavretie/otvorenie autorom. Výsledky sa obnovujú tlačidlom a po vlastnom hlasovaní.
- `/journal`: súkromné návštevy, poznámky a fotografia JPG/PNG/WebP do 3 MB na zápis. Fotografie sú v neverejnom buckete a zobrazujú sa cez dočasný odkaz platný hodinu. Rovnaké miesto a dátum aktualizuje existujúci zápis.
- `/tips`: komunitné informácie s dátumom a kategóriou, pre členov viditeľné 30 dní; autor môže odstrániť svoj tip, admin ho skryť/obnoviť. Najviac 10 nových tipov za deň.
- `/challenges`: päť výziev s automatickým pokrokom z denníka, mesačný progres v časovom pásme Europe/Bratislava. Návštevy zaznamenáva používateľ, GPS overovanie sa nepoužíva.

Migrácia `003_outings.sql` pridáva iba nové tabuľky, pravidlá prístupu a neverejný bucket `visit-photos`. Spusti ju raz po 002; zachová existujúce miesta, profily a obľúbené. Nové tabuľky nepripúšťajú priamy prístup cez klientské API; server overuje účet, vlastníctvo a dostupnosť miest. Hlasovanie navyše kontroluje databázový trigger pod zámkom, aby hlas nemohol obísť uzavretie súbežnou požiadavkou.

## Integračný test

`scripts/test-community.py` testuje skutočné API s dvoma dočasnými účtami. Vyžaduje bežiacu aktuálnu aplikáciu, tri Supabase premenné a aspoň dve dostupné miesta. `TEST_APP_URL` predvolene ukazuje na `http://127.0.0.1:3002`. Test vytvára označené dočasné účty a záznamy a v bloku `finally` ich odstráni; jeden dočasný účet používa na test moderácie. Použi prednostne testovací Supabase projekt. Nikdy nevkladaj kľúče do repozitára.

```sh
python scripts/test-community.py
```
