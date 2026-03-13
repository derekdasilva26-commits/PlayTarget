import requests

BASE_URL = "http://localhost:8000"

# ==========================
# AUTH
# ==========================
print("Registrando usuario de teste...")
requests.post(f"{BASE_URL}/auth/register", json={"username": "testuser", "password": "senha123"})

print("Fazendo login...")
login_res = requests.post(f"{BASE_URL}/auth/login", json={"username": "testuser", "password": "senha123"})
assert login_res.status_code == 200, f"Login falhou: {login_res.text}"
token = login_res.json()["access_token"]
print(f"Token obtido: {token[:30]}...")

AUTH = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ==========================
# CRUD
# ==========================
print("Criando Site...")
site_res = requests.post(f"{BASE_URL}/sites", json={"name": "Steam", "url": "https://store.steampowered.com"}, headers=AUTH)
if site_res.status_code == 400:
    sites_list = requests.get(f"{BASE_URL}/sites").json()
    site_id = next(s["id"] for s in sites_list if s["name"] == "Steam")
else:
    site_id = site_res.json()["id"]
print(f"Site ID: {site_id}")

print("Criando Jogo...")
game_res = requests.post(f"{BASE_URL}/games", json={"title": "Inazuma Eleven", "genre": "Sports", "description": "Jogo de futebol"}, headers=AUTH)
if game_res.status_code == 400:
    games_list = requests.get(f"{BASE_URL}/games").json()
    game_id = next(g["id"] for g in games_list if g["title"] == "Inazuma Eleven")
else:
    game_id = game_res.json()["id"]
print(f"Game ID: {game_id}")

print("Criando Preco...")
price_res = requests.post(f"{BASE_URL}/prices", json={"game_id": game_id, "site_id": site_id, "price": 199.90}, headers=AUTH)
assert price_res.status_code in (200, 201), f"Erro ao criar preco: {price_res.text}"
print(f"Preco: {price_res.json()}")

print("TUDO FUNCIONANDO!")
