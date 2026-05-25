import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/exchange-rate", tags=["Exchange Rate"])

_FALLBACK_RATE = 5.70


@router.get("/usd-brl")
def get_usd_brl():
    """
    Retorna a cotação atual do dólar (USD) em reais (BRL).
    Fonte: AwesomeAPI / Banco Central do Brasil.
    Retorna valor de fallback se a API externa estiver indisponível.
    """
    try:
        res = httpx.get(
            "https://economia.awesomeapi.com.br/json/last/USD-BRL",
            timeout=5.0,
            headers={"User-Agent": "PlayTarget/1.0"},
        )
        res.raise_for_status()
        data = res.json()["USDBRL"]
        return {
            "rate": round(float(data["bid"]), 4),
            "updated_at": data.get("create_date", ""),
            "source": "AwesomeAPI / Banco Central do Brasil",
        }
    except Exception:
        return {
            "rate": _FALLBACK_RATE,
            "updated_at": "",
            "source": "valor padrão (API indisponível)",
        }
