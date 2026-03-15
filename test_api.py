import time

import requests

BASE_URL = "http://localhost:8000"


def test_auth_and_crud_flow():
	username = f"ci_user_{int(time.time())}"
	password = "123456"

	register = requests.post(
		f"{BASE_URL}/auth/register",
		json={"username": username, "password": password},
		timeout=10,
	)
	assert register.status_code == 201, register.text

	login = requests.post(
		f"{BASE_URL}/auth/login",
		json={"username": username, "password": password},
		timeout=10,
	)
	assert login.status_code == 200, login.text
	token = login.json().get("access_token")
	assert token, login.text

	headers = {"Authorization": f"Bearer {token}"}

	site = requests.post(
		f"{BASE_URL}/sites/",
		json={"name": f"Steam {username}", "url": "https://store.steampowered.com", "active": True},
		headers=headers,
		timeout=10,
	)
	assert site.status_code == 200, site.text
	site_id = site.json()["id"]

	game = requests.post(
		f"{BASE_URL}/games/",
		json={"title": f"Inazuma Eleven {username}", "genre": "Sports", "description": "Jogo de futebol"},
		headers=headers,
		timeout=10,
	)
	assert game.status_code == 200, game.text
	game_id = game.json()["id"]

	price = requests.post(
		f"{BASE_URL}/prices/",
		json={"game_id": game_id, "site_id": site_id, "price": 199.90, "currency": "BRL"},
		headers=headers,
		timeout=10,
	)
	assert price.status_code == 200, price.text