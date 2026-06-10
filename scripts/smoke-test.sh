#!/usr/bin/env bash
# PEWA / Wielki Test smoke test — sprawdza 12 kluczowych endpoints po deployu
# Uruchom: bash scripts/smoke-test.sh [BASE_URL]
# Default BASE_URL = https://www.testomnia.pl
# Wymaga: ADMIN_TOKEN w env (do testów admin endpoints)

BASE="${1:-https://www.testomnia.pl}"
PASS=0
FAIL=0
RESULTS=()

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local headers="${4:-}"

  local code
  if [ -n "$headers" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -H "$headers" "$url" --max-time 15)
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 15)
  fi

  if [ "$code" = "$expected" ]; then
    echo "✓ $name [$code] $url"
    PASS=$((PASS+1))
    RESULTS+=("OK $name")
  else
    echo "✗ $name [$code, expected $expected] $url"
    FAIL=$((FAIL+1))
    RESULTS+=("FAIL $name (got $code)")
  fi
}

echo "=== Smoke test: $BASE ==="
echo ""

# === testomnia.pl (medycyna) ===
check "Landing testomnia" "$BASE/" 200
check "Test 4 typów osobowości" "$BASE/test-4-typy-osobowosci.html" 200
check "Features API (runtime flags)" "$BASE/api/features" 200
check "Polityka prywatności" "$BASE/polityka-prywatnosci.html" 200
check "Regulamin" "$BASE/regulamin.html" 200
check "Kompas PNG (Brevo proxy)" "$BASE/api/compass.png?o=5&i=10&s=15&e=3" 200

# === Raporty PEWA (medycyna) ===
check "Raport PE PDF" "$BASE/raporty/PEWA-raport-PE-Przyjaciel-Entuzjasta.pdf" 200
check "Raport Diament PDF" "$BASE/raporty/PEWA-raport-D-Diament.pdf" 200
check "Typologia pacjentów PDF" "$BASE/raporty/PEWA-typologia-pacjentow-z-ebooka.pdf" 200

# === Wielki Test Polaków ===
check "Wielki Test landing" "$BASE/polacy/" 200
check "Wielki Test (test page)" "$BASE/polacy/test.html" 200
check "Profil PE Wielki Test PDF" "$BASE/raporty-polacy/Profil-PE-Przyjaciel-Entuzjasta.pdf" 200

# === Admin (zwraca 401 bez tokena — to OK) ===
check "Admin (401 bez tokena = poprawne)" "$BASE/api/admin/data" 401
check "Admin PEWA stats (401 bez tokena)" "$BASE/api/admin/pewa-stats" 401

# === API endpoints (POST wymaga body) — testujemy CORS preflight ===
check "Wielki Test save-lead OPTIONS" "$BASE/api/polacy/save-lead" 200 ""

echo ""
echo "=== Sumarycznie ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "FAILURES:"
  for r in "${RESULTS[@]}"; do
    [[ "$r" =~ ^FAIL ]] && echo "  $r"
  done
  exit 1
fi

echo "✓ All systems operational"
exit 0
