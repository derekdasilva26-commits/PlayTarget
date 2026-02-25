import requests

BASE_URL = "http://localhost:8000"

print("✅ Criando Site...")
site = requests.post(f"{BASE_URL}/sites", json={"name": "Steam", "url": "https://store.steampowered.com"})
site_id = site.json()["id"]
print(f"Site ID: {site_id}")

print("✅ Criando Jogo...")
game = requests.post(f"{BASE_URL}/games", json={"title": "Inazuma Eleven", "genre": "Sports", "description": "Jogo de futebol"})
game_id = game.json()["id"]
print(f"Game ID: {game_id}")

print("✅ Criando Preço...")
price = requests.post(f"{BASE_URL}/prices", json={"game_id": game_id, "site_id": site_id, "price": 199.90})
print(f"Preço: {price.json()}")

print("✅ TUDO FUNCIONANDO!")