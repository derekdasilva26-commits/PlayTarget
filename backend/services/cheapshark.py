import httpx

CHEAPSHARK_URL = "https://www.cheapshark.com/api/1.0"

# Mapeamento: storeID da CheapShark → nome que você usa no banco
STORE_NAME_MAP = {
    "1": "Steam",
    "7": "GOG",
    "25": "Epic Games",
    "31": "Fanatical",
    "11": "Humble Store",
    "8": "GamersGate",
    "23": "Green Man Gaming",
}


def fetch_prices(title: str) -> list[dict]:
    """
    Busca preços de um jogo pelo título na API CheapShark.
    Retorna lista de dicts: [{store_name, price, currency}]
    """
    try:
        # Busca o jogo pelo título
        response = httpx.get(
            f"{CHEAPSHARK_URL}/games",
            params={"title": title.strip().strip("'\"")},
            timeout=10.0,
            headers={"User-Agent": "PlayTarget/1.0"}
        )
        response.raise_for_status()
        games = response.json()

        print(f"DEBUG cheapshark >>> games encontrados: {games}")

        if not games:
            return []

        game_id = games[0]["gameID"]
        print(f"DEBUG cheapshark >>> usando gameID: {game_id}")

        # Busca detalhes do jogo (incluindo preços por loja)
        detail_response = httpx.get(
            f"{CHEAPSHARK_URL}/games",
            params={"id": game_id},
            timeout=10.0,
            headers={"User-Agent": "PlayTarget/1.0"}
        )
        detail_response.raise_for_status()
        detail = detail_response.json()

        deals = detail.get("deals", [])
        print(f"DEBUG cheapshark >>> deals: {deals}")

        results = []
        for deal in deals:
            store_id = str(deal.get("storeID", ""))
            print(f"DEBUG cheapshark >>> storeID: {store_id}")
            mapped_name = STORE_NAME_MAP.get(store_id)
            if mapped_name:
                try:
                    price = float(deal.get("price", 0))
                    results.append({
                        "store_name": mapped_name,
                        "price": price,
                        "currency": "USD",
                    })
                except (ValueError, TypeError):
                    continue

        print(f"DEBUG cheapshark >>> results finais: {results}")
        return results

    except httpx.RequestError as e:
        print(f"DEBUG cheapshark >>> httpx.RequestError: {e}")
        return []
    except Exception as e:
        print(f"DEBUG cheapshark >>> Exception: {e}")
        return []