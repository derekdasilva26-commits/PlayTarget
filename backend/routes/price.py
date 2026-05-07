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
        "todos_os_precos": precos_com_site,
    }


@router.post("/refresh/{game_id}")
def refresh_prices_by_game(game_id: int, db: Session = Depends(get_db)):
    resultado = update_game_prices(game_id, db)
    if "erro" in resultado:
        raise HTTPException(status_code=404, detail=resultado["erro"])
    return resultado


@router.post("/refresh/all")
def refresh_all_prices():
    resultados = update_all_games()
    return {
        "status": "concluído",
        "total_jogos_processados": len(resultados),
        "detalhes": resultados,
    }