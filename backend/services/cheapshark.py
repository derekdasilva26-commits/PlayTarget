import httpx

CHEAPSHARK_URL = "https://www.cheapshark.com/api/1.0"

# Mapeamento: nome da loja no CheapShark → nome que você usa no banco
STORE_NAME_MAP = {
    "Steam": "Steam",
    "GOG": "GOG",
    "Epic Games Store": "Epic Games",
    "Fanatical": "Fanatical",
    "Humble Store": "Humble Store",
    "GamersGate": "GamersGate",
    "Green Man Gaming": "Green Man Gaming",
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
            params={"title": title, "limit": 5},
            timeout=10.0,
        )
        response.raise_for_status()
        games = response.json()

        if not games:
            return []

        # Pega o primeiro resultado (mais relevante)
        game_id = games[0]["gameID"]

        # Busca detalhes do jogo (incluindo preços por loja)
        detail_response = httpx.get(
            f"{CHEAPSHARK_URL}/games",
            params={"id": game_id},
            timeout=10.0,
        )
        detail_response.raise_for_status()
        detail = detail_response.json()

        results = []
        deals = detail.get("deals", [])

        for deal in deals:
            store_name = deal.get("storeName", "")
            # Só inclui lojas que temos mapeadas
            mapped_name = STORE_NAME_MAP.get(store_name)
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

        return results

    except httpx.RequestError:
        # API fora do ar ou sem internet — retorna lista vazia sem derrubar o servidor
        return []
    except Exception:
        return []
