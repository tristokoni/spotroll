# SPOTROLL v2: tutoriál nasadenia

## Čo je nové
- **Účty**: registrácia/prihlásenie (`/login`), prezývka, heslo min. 10 znakov.
- **Návrhy spotov** (`/submit`): prihlásený používateľ navrhne spot -> stav `pending`, vidí svoje návrhy aj dôvod zamietnutia. Limit 5 čakajúcich a 10 návrhov / 24 h.
- **Admin** (`/admin`): fronta na schválenie (Schváliť / Zamietnuť s dôvodom), správa spotov (deaktivovať, zmazať), správa používateľov (spraviť/odobrať admina, ban/unban s dôvodom, hľadanie).
- **Domov**: nový dizajn, filter podľa vybavenia (ohnisko, voda...), farebná paleta a písma (Bricolage Grotesque + Figtree).

## Opravené zraniteľnosti
| Problém | Oprava |
|---|---|
| **XSS** v popupe mapy (názov/popis sa vkladali ako HTML) – kritické, keď spoty pridávajú používatelia | Popup sa skladá cez `textContent` (`MapView.tsx`) |
| **Mass assignment** v `PATCH /api/admin/spots` (`...patch` = ľubovoľné stĺpce) | Whitelist akcií `approve/reject/toggle/edit` + validácia `clean()` |
| **Únik presnej polohy**: `approximate_location` spoty sa filtrovali a počítala sa vzdialenosť z presných súradníc, takže sa dali vytriangulovať | Rádius aj vzdialenosť sa počítajú z rozmazanej polohy |
| API vracalo `select('*')` vrátane interných `notes` | Explicitný zoznam stĺpcov |
| `security definer` funkcie bez `search_path` | `set search_path=public` v `002_upgrade.sql` |
| Zabanovaný používateľ mal ďalej platný token | `auth()` kontroluje `banned` pri každom volaní + Supabase `ban_duration` zruší refresh tokeny |
| Neobmedzené vstupy, `image` mohlo byť akékoľvek URL | Limity dĺžok, iba `https://` obrázky, iba známe atribúty |
| Admin sa mohol zbaniť/odobrať sám sebe, zabanovať iného admina | Zakázané v `/api/admin/users` |
| Žiadne security hlavičky | CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy v `next.config.js` |
| Koleso točilo len prvých 12 spotov v poradí DB (nie náhodný výber) | Fisher-Yates shuffle cez `crypto` |

## Implementácia krok za krokom
1. **Záloha**: v Supabase Dashboard -> Database -> Backups (alebo `pg_dump`).
2. **Nahraď súbory** v projekte súbormi z tohto balíka.
3. **SQL**: SQL Editor -> spusti `supabase/migrations/002_upgrade.sql` (001 už máš).
   Existujúce spoty sa automaticky namapujú na `status` podľa `approved`.
4. **Admin**: zaregistruj sa v aplikácii, potom v SQL: `update profiles set role='admin' where id=(select id from auth.users where email='TVOJ@EMAIL');`
   Ďalších adminov už dávaš v `/admin` -> Používatelia.
5. **`.env.local`**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (**nikdy** s prefixom `NEXT_PUBLIC_`, nikdy do gitu).
6. `npm install && npm run dev`.
7. **Supabase Dashboard -> Authentication**:
   - Providers -> Email: zapni *Confirm email*, minimálna dĺžka hesla 10, zapni *leaked password protection* (ak je dostupné na tvojom pláne).
   - URL Configuration: nastav *Site URL* a *Redirect URLs* na svoju doménu.
   - Rate Limits: nechaj predvolené alebo sprísni; zapni CAPTCHA (hCaptcha/Turnstile) proti botom pri registrácii.
8. **Nasadenie** (Vercel): pridaj tri env premenné, `git push`. Skontroluj hlavičky na securityheaders.com.

## Testovací checklist
- [ ] Neprihlásený: `/submit` ponúkne prihlásenie; `POST /api/spots` vráti 401.
- [ ] Obyčajný user: navrhne spot -> vidí ho v "Moje návrhy" ako čakajúci, na domovskej stránke ho nevidno.
- [ ] Obyčajný user: `/admin` ho nepustí; `curl -X PATCH /api/admin/spots` s jeho tokenom -> 403.
- [ ] Admin: schváli -> spot sa objaví na mape; zamietne s dôvodom -> user ho vidí.
- [ ] Admin zabanuje usera -> jeho ďalšie volania vrátia 401 a nevie sa prihlásiť.
- [ ] Do názvu spotu skús `<img src=x onerror=alert(1)>` -> v popupe sa zobrazí ako text.
- [ ] Spot s `approximate_location`: súradnice v odpovedi `/api/spots` sú zaokrúhlené.

## Čo som nestihol (úlohy pre tím)
1. **Nahrávanie fotiek** do Supabase Storage (teraz iba https URL) + kontrola obsahu.
2. **Editácia/zmazanie vlastného návrhu** používateľom, e-mailové notifikácie o schválení.
3. **Rate limiting na úrovni API** (napr. Upstash Ratelimit); teraz je len limit návrhov v DB a limity Supabase Auth.
4. **Obľúbené** (tabuľka `favorites` existuje, chýba UI).
5. **Vlastný routing server**: verejný `router.project-osrm.org` je demo, nie pre produkciu, a posiela polohu používateľa tretej strane (spomeň v zásadách súkromia).
6. **Admin audit log** (kto koho zabanoval) a testy (Playwright pre hlavné flowy).
7. Kód som v tomto prostredí **nemohol skompilovať ani spustiť** (bez siete), takže pred nasadením spusti `npm run build` a prejdi checklist vyššie.
