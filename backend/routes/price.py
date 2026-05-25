from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from backend.database import SessionLocal
from backend.models.price import Price
from backend.models.game import Game
from backend.models.site import Site
from backend.schemas.price import PriceCreate, PriceResponse, PriceUpdate
from backend.services.price_updater import update_game_prices, update_all_games

router = APIRouter(
    prefix="/prices",
    tags=["prices"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=PriceResponse)
def create_price(price: PriceCreate, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == price.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")

    site = db.query(Site).filter(Site.id == price.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site não encontrado")

    new_price = Price(**price.dict())
    db.add(new_price)
    db.commit()
    db.refresh(new_price)
    return new_price


@router.get("/", response_model=list[PriceResponse])
def list_prices(db: Session = Depends(get_db)):
    return db.query(Price).all()


@router.get("/{price_id}", response_model=PriceResponse)
def get_price(price_id: int, db: Session = Depends(get_db)):
    price = db.query(Price).filter(Price.id == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Preço não encontrado")
    return price


@router.get("/game/{game_id}", response_model=list[PriceResponse])
def get_prices_by_game(game_id: int, db: Session = Depends(get_db)):
    # Retorna apenas o preço mais recente por site (sem duplicatas)
    subq = (
        db.query(Price.site_id, func.max(Price.checked_at).label("latest"))
        .filter(Price.game_id == game_id)
        .group_by(Price.site_id)
        .subquery()
    )

    prices = (
        db.query(Price)
        .join(
            subq,
            (Price.site_id == subq.c.site_id) & (Price.checked_at == subq.c.latest),
        )
        .filter(Price.game_id == game_id)
        .all()
    )

    if not prices:
        raise HTTPException(status_code=404, detail="Nenhum preço encontrado para este jogo")
    return prices


@router.put("/{price_id}", response_model=PriceResponse)
def update_price(price_id: int, price_update: PriceUpdate, db: Session = Depends(get_db)):
    db_price = db.query(Price).filter(Price.id == price_id).first()
    if not db_price:
        raise HTTPException(status_code=404, detail="Preço não encontrado")

    db_price.price = price_update.price
    db_price.checked_at = datetime.utcnow()
    db.commit()
    db.refresh(db_price)
    return db_price


@router.delete("/{price_id}")
def delete_price(price_id: int, db: Session = Depends(get_db)):
    db_price = db.query(Price).filter(Price.id == price_id).first()
    if not db_price:
        raise HTTPException(status_code=404, detail="Preço não encontrado")

    db.delete(db_price)
    db.commit()
    return {"message": "Preço deletado com sucesso"}


@router.get("/game/{game_id}/comparison")
def compare_prices(game_id: int, db: Session = Depends(get_db)):
    """
    Comparação de preços. Funciona mesmo com apenas 1 loja.
    """
    # Pega o preço mais recente por site
    subq = (
        db.query(Price.site_id, func.max(Price.checked_at).label("latest"))
        .filter(Price.game_id == game_id)
        .group_by(Price.site_id)
        .subquery()
    )

    prices = (
        db.query(Price)
        .join(
            subq,
            (Price.site_id == subq.c.site_id) & (Price.checked_at == subq.c.latest),
        )
        .filter(Price.game_id == game_id)
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="Nenhum preço encontrado para este jogo",
        )

    # Monta lista com nome do site
    precos_com_site = []
    for p in prices:
        site = db.query(Site).filter(Site.id == p.site_id).first()
        precos_com_site.append({
            "site": site.name if site else f"Site #{p.site_id}",
            "preco": float(p.price),
            "currency": p.currency or "USD",
        })

    min_item = min(precos_com_site, key=lambda x: x["preco"])
    max_item = max(precos_com_site, key=lambda x: x["preco"])

    return {
        "menor_preco": min_item["preco"],
        "maior_preco": max_item["preco"],
        "diferenca": max_item["preco"] - min_item["preco"],
        "economia": max_item["preco"] - min_item["preco"],
        "site_melhor_preco": min_item["site"],
        "currency": min_item["currency"],
        "todos_os_precos": precos_com_site,
    }


@router.post("/refresh/all")
def refresh_all_prices_route():
    """Atualiza preços de todos os jogos via CheapShark"""
    resultados = update_all_games()
    return {
        "status": "concluído",
        "total_jogos_processados": len(resultados),
        "detalhes": resultados,
    }


@router.post("/refresh/{game_id}")
def refresh_prices_by_game(game_id: int, db: Session = Depends(get_db)):
    resultado = update_game_prices(game_id, db)
    if "erro" in resultado:
        raise HTTPException(status_code=404, detail=resultado["erro"])
    return resultado


@router.get("/game/{game_id}/history")
def get_price_history(game_id: int, db: Session = Depends(get_db)):
    """
    Retorna o histórico completo de preços de um jogo,
    incluindo loja, valor, moeda, fonte e data da coleta.
    """
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")

    prices = (
        db.query(Price, Site.name.label("site_name"))
        .join(Site, Site.id == Price.site_id)
        .filter(Price.game_id == game_id)
        .order_by(Price.checked_at.asc())
        .all()
    )

    if not prices:
        raise HTTPException(status_code=404, detail="Nenhum histórico encontrado para este jogo")

    return [
        {
            "id": price.id,
            "game_id": price.game_id,
            "site_id": price.site_id,
            "site_name": site_name,
            "price": float(price.price),
            "currency": price.currency,
            "source": price.source,
            "checked_at": price.checked_at,
            "created_at": price.created_at,
        }
        for price, site_name in prices
    ]


@router.get("/game/{game_id}/insight")
def get_price_insight(game_id: int, db: Session = Depends(get_db)):
    """
    Gera um insight simples sobre o momento de compra com base
    no menor preço histórico e no menor preço atual entre lojas.
    """
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")

    all_prices = db.query(Price).filter(Price.game_id == game_id).all()
    if not all_prices:
        raise HTTPException(status_code=404, detail="Nenhum preço encontrado para este jogo")

    historical_low = min(all_prices, key=lambda x: x.price)
    historical_low_value = float(historical_low.price)

    subq = (
        db.query(Price.site_id, func.max(Price.checked_at).label("latest"))
        .filter(Price.game_id == game_id)
        .group_by(Price.site_id)
        .subquery()
    )

    latest_prices = (
        db.query(Price)
        .join(
            subq,
            (Price.site_id == subq.c.site_id) & (Price.checked_at == subq.c.latest),
        )
        .filter(Price.game_id == game_id)
        .all()
    )

    if not latest_prices:
        raise HTTPException(status_code=404, detail="Sem preços atuais para análise")

    current_best = min(latest_prices, key=lambda x: x.price)
    current_best_value = float(current_best.price)

    historical_site = db.query(Site).filter(Site.id == historical_low.site_id).first()
    current_site = db.query(Site).filter(Site.id == current_best.site_id).first()

    is_good_time = current_best_value <= historical_low_value

    return {
        "game_id": game.id,
        "game_title": game.title,
        "historical_low": historical_low_value,
        "historical_low_site": historical_site.name if historical_site else "Desconhecido",
        "historical_low_date": historical_low.checked_at,
        "historical_low_currency": historical_low.currency or "USD",
        "current_best": current_best_value,
        "current_best_site": current_site.name if current_site else "Desconhecido",
        "current_best_currency": current_best.currency or "USD",
        "is_good_time_to_buy": is_good_time,
        "message": (
            "Ótimo momento para comprar! O preço atual está no menor nível histórico."
            if is_good_time
            else "Ainda não é o melhor momento: o preço atual está acima do menor valor histórico."
        ),
    }
