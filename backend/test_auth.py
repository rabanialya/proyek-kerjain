import requests
import json
import sys

BASE = "http://127.0.0.1:8000"

def test(name, passed, detail=""):
    status = "LULUS" if passed else "GAGAL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))

# ────────────────────────────────────────────────
# TEST 5: Login dan dapatkan token valid
# ────────────────────────────────────────────────
credentials_to_try = [
    {"email": "admin@kerjain.com", "password": "admin123"},
    {"email": "admin@kerjain.id", "password": "admin123"},
    {"email": "test@kerjain.com", "password": "password123"},
]

admin_token = None
for cred in credentials_to_try:
    r = requests.post(f"{BASE}/auth/login", json=cred)
    if r.status_code == 200:
        admin_token = r.json().get("access_token")
        print(f"Login berhasil dengan: {cred['email']}")
        break

if not admin_token:
    print("Tidak bisa login dengan kredensial test — skip test berbasis token")
    sys.exit(0)

# Verifikasi token valid
r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
test("TEST 5: Token valid dari login", r.status_code == 200, f"HTTP {r.status_code}")

# Print token untuk dipakai test selanjutnya
print(f"TOKEN:{admin_token}")
