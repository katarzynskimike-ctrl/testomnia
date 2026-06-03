# Testomnia · Landing + 7 testów + Regulamin

## Struktura
- `index.html` — landing testomnia.pl
- `regulamin.html` — pełny regulamin (16 paragrafów, do uzupełnienia danych firmy)
- `404.html`, `payment-confirmed.html`, `thanks-test.html` — strony pomocnicze
- `og-image.svg` — Open Graph 1200×630
- `testomnia-logo.png` — oficjalne logo
- `test-*.html` (7 plików) — testy
- `macierz-suwerennosci.html` — 8 test (bonus, nie ma karty na landingu)

## Co jest gotowe
- Spójne brandowanie: navy + champagne + Cormorant Garamond
- Landing CTA → linki do realnych testów
- W teście link „← Wszystkie testy" → `index.html#testy`
- Stopki testów + landingu z disclaimerem + linkiem do regulaminu
- Język landingu: „testy rozwojowe i psychometryczne" (zamiast „diagnostyczne")

## Do uzupełnienia w regulaminie
W `regulamin.html` szukaj `<span class="placeholder">` — wszystkie wymagają wpisania:
- nazwa firmy, adres, NIP, REGON/KRS
- adres e-mail kontaktowy
- data wejścia w życie regulaminu

## Wdrożenie
Vercel → New → Other → drag & drop folder → Deploy.

---
© 2026 Testomnia
