from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import httpx

from backend.database import Base, engine
from backend.models.game import Game
from backend.models.site import Site
from backend.models.price import Price
from backend.models.wishlist import Wishlist
from backend.routes.games import router as games_router
from backend.routes.sites import router as sites_router
from backend.routes.price import router as price_router
from backend.routes.wishlist import router as wishlist_router
from backend.services.price_updater import update_all_games

app = FastAPI(
    title="PlayTarget API",
    description="API para comparação de preços de games",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(games_router)
app.include_router(sites_router)
app.include_router(price_router)
app.include_router(wishlist_router)

scheduler = BackgroundScheduler()
scheduler.add_job(update_all_games, "interval", hours=1, id="atualizar_precos")

@app.on_event("startup")
def start_scheduler():
    scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()


@app.get("/")
def root():
    return {
        "message": "API PlayTarget rodando com sucesso",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/exchange-rate/usd-brl")
async def get_usd_brl_rate():
    """
    Busca a cotação oficial PTAX de venda do dólar no Banco Central.
    Consulta os últimos dias para garantir retorno mesmo em fins de semana/feriados.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    start_str = start_date.strftime("%m-%d-%Y")
    end_str = end_date.strftime("%m-%d-%Y")

    url = (
        "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
        f"CotacaoDolarPeriodo(dataInicial='{start_str}',dataFinalCotacao='{end_str}')"
        "?$top=100&$orderby=dataHoraCotacao%20desc&$format=json"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Falha ao consultar cotação no Banco Central")

        data = response.json()
        values = data.get("value", [])

        if not values:
            raise HTTPException(status_code=502, detail="Nenhuma cotação retornada pelo Banco Central")

        latest = values[0]
        rate = float(latest["cotacaoVenda"])
        raw_dt = latest["dataHoraCotacao"]

        updated_at = raw_dt
        try:
            dt = datetime.fromisoformat(raw_dt.replace("Z", ""))
            updated_at = dt.strftime("%d/%m/%Y %H:%M:%S")
        except Exception:
            pass

        return {
            "pair": "USD/BRL",
            "rate": rate,
            "updated_at": updated_at,
            "source": "Banco Central do Brasil (PTAX venda)"
        }

    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Erro de conexão ao buscar cotação no Banco Central")