# Release Checklist — testomnia + Wielki Test

Dyscyplina release dla bety i produkcji. **Każdy deploy** przechodzi przez te kroki.

---

## Schemat środowisk

| Środowisko | Branch | URL | Cel |
|---|---|---|---|
| **Local** | feature branch | localhost | Twoja praca, eksperymenty |
| **Preview** | feature branch pushed | `testomnia-git-<branch>-katarzynskimike-...vercel.app` | Test przed merge — Vercel auto |
| **Production** | `main` | testomnia.pl + /polacy/ | Real users, real money |

---

## Pre-deploy (przed pushem do `main`)

### 1. Lokalna walidacja
- [ ] `node --check` na wszystkich zmienionych .js
- [ ] `node scripts/run-pewa-tests.js` (jeśli zmiana w classifyPewa)
- [ ] Manualny test flow w przeglądarce (lokalnie lub na preview branch)

### 2. Feature flags
- [ ] Nowa funkcjonalność za flagą? `ENABLE_<NAZWA>` w Vercel env vars
- [ ] Default flagi to **bezpieczna wartość** (zwykle OFF dla nowości, ON dla istniejącego)
- [ ] Kod ma fallback do legacy zachowania gdy flag OFF

### 3. DB migracja
- [ ] Schema zmiany są idempotentne (`ALTER TABLE … IF NOT EXISTS`)
- [ ] Nowe kolumny mają DEFAULT lub NULL OK
- [ ] Brak `DROP COLUMN` / `RENAME` bez planu rollbacka

---

## Preview deploy (na branchu)

Vercel automatycznie buduje preview na każdy push do branch'a (nie-main).

### 4. Push branch
```bash
git checkout -b feat/pewa-v1.3-calibration
git push -u origin feat/pewa-v1.3-calibration
```

### 5. Vercel sprawdza preview
- [ ] Otwórz `https://testomnia-git-<branch>-katarzynskimike-...vercel.app`
- [ ] **Bash:** `bash scripts/smoke-test.sh <preview-url>` — wszystkie 12 checków zielone

### 6. Manualny test funkcjonalności
- [ ] Wszedłeś flow który zmieniłeś end-to-end (test → email → wynik)
- [ ] Sprawdziłeś Vercel function logs — brak błędów 5xx
- [ ] Sprawdziłeś że feature flag działa (włącz w env → przeładuj → sprawdź zachowanie)

---

## Production deploy

### 7. Merge do main
- [ ] PR opisuje **co**, **dlaczego**, **co jeśli zepsuje** (rollback plan)
- [ ] Merge **w godzinach low-traffic** (rano lub wieczór, nie w piątek po południu)
- [ ] Vercel auto-deploy odpala się na main

### 8. Post-deploy smoke
- [ ] `bash scripts/smoke-test.sh https://www.testomnia.pl` — wszystkie zielone
- [ ] Sprawdź Vercel deployment URL — status READY
- [ ] Sprawdź jeden test flow na produkcji (z prawdziwym mailem testowym)

### 9. Monitor 30 minut
- [ ] Vercel logs — brak nowych 5xx
- [ ] Neon DB — `SELECT count(*) FROM events WHERE type='*_failed' AND created_at > now() - interval '30 min'` powinno być 0
- [ ] Brevo dashboard — wysyłki idą, brak bounce'ów

---

## Rollback (gdy coś idzie nie tak)

### 10. Instant rollback
- Vercel → Project → Deployments → poprzedni "Ready" → **"Promote to Production"** = jeden klik
- Czas: ~10 sekund

### 11. Feature flag OFF
- Vercel → Settings → Environment Variables → `ENABLE_<NAZWA>` → `false` → Redeploy
- Bezpieczniejsze niż code rollback bo nie ruszamy DB schema

### 12. Krytyczny problem
- Jeśli rollback nie wystarcza (np. uszkodzona DB): zatrzymaj Meta Ads (nie pal budżetu na slipowanej stronie), kontakt na #dev-emergency

---

## Wielki Test / Meta Ads — dodatkowy checklist

### 13. Przed pierwszym uruchomieniem Meta Ads
- [ ] `META_PIXEL_ID` w Vercel env vars
- [ ] Test w **Meta Pixel Helper** (Chrome extension) — zdarzenia PageView, InitiateCheckout, Lead, Purchase widoczne
- [ ] Conversions API endpoint `/api/meta-cv` server-side weryfikacja (jeśli implementujemy)
- [ ] Polityka prywatności zawiera klauzulę profilowania + Meta cookies
- [ ] Test reklamy z budżetem **20 zł/dzień** przez 48h — sprawdź czy events docierają

### 14. Skalowanie
- [ ] Po 48h obserwacji bez błędów: skok do **50-100 zł/dzień**
- [ ] Monitoruj CPL, CTR, jakość leadów (Brevo open rate)
- [ ] Po **CPL < 3 zł stabilnie 1 tydzień** → skalujemy do 200-500 zł/dzień

---

## Anti-patterns (czego NIE robić)

❌ **Push prosto do main bez preview** — ryzyko zerwania produkcji
❌ **Wiele features w jednym commit** — nie da się rollbackować pojedynczo
❌ **Deploy w piątek po południu** — nikt nie naprawi w weekend
❌ **Feature flag OFF + kod usunięty z repo** — nie ma rollbacka do flagi
❌ **Bezpośrednie ALTER TABLE DROP w produkcji** — utrata danych
❌ **Test tylko na localhost** — środowiska różnią się (Vercel functions vs local)

---

## Cykl rozwojowy testomnia (proponowany)

```
poniedziałek  │ Plan tygodnia, decyzje produktowe
wtorek-czwart │ Praca: feature branche, preview deploys
piątek rano   │ Merge gotowych features do main
piątek po pol.│ ❌ ŻADNYCH MERGÓW
weekend       │ Monitor + reakcja jeśli coś poszło
```

---

© 2026 Excellent Patient Service Sp. z o.o.
