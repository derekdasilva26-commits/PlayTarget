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
    """Criar um novo preço manualmente"""
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
    """Listar todos os preços"""
    return db.query(Price).all()


@router.get("/{price_id}", response_model=PriceResponse)
def get_price(price_id: int, db: Session = Depends(get_db)):
    """Buscar um preço específico"""
    price = db.query(Price).filter(Price.id == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Preço não encontrado")
    return price


@router.get("/game/{game_id}", response_model=list[PriceResponse])
def get_prices_by_game(game_id: int, db: Session = Depends(get_db)):
    """Buscar todos os preços de um jogo"""
    prices = db.query(Price).filter(Price.game_id == game_id).all()
    if not prices:
        raise HTTPException(
            status_code=404,
            detail="Nenhum preço encontrado para este jogo",
        )
    return prices


@router.put("/{price_id}", response_model=PriceResponse)
def update_price(price_id: int, price_update: PriceUpdate, db: Session = Depends(get_db)):
    """Atualizar o preço manualmente"""
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
    """Deletar um preço"""
    db_price = db.query(Price).filter(Price.id == price_id).first()
    if not db_price:
        raise HTTPException(status_code=404, detail="Preço não encontrado")

    db.delete(db_price)
    db.commit()
    return {"message": "Preço deletado com sucesso"}


@router.get("/game/{game_id}/comparison")
def compare_prices(game_id: int, db: Session = Depends(get_db)):
    """
    Comparação automática de preços para um game específico.
    Usa apenas o preço MAIS RECENTE de cada site para comparar corretamente.
    """
    # Subquery: pega o checked_at mais recente por site para este jogo
    subq = (
        db.query(Price.site_id, func.max(Price.checked_at).label("latest"))
        .filter(Price.game_id == game_id)
        .group_by(Price.site_id)
        .subquery()
    )

    # Busca apenas os preços mais recentes por site
    prices = (
        db.query(Price)
        .join(
            subq,
            (Price.site_id == subq.c.site_id) & (Price.checked_at == subq.c.latest),
        )
        .filter(Price.game_id == game_id)
        .all()
    )

    if len(prices) < 2:
        raise HTTPException(
            status_code=404,
            detail="Preços insuficientes para comparar (precisa de pelo menos 2 lojas)",
        )

    min_price = min(prices, key=lambda x: x.price)
    max_price = max(prices, key=lambda x: x.price)

    menor_valor = float(min_price.price)
    maior_valor = float(max_price.price)
    economy = maior_valor - menor_valor

    site = db.query(Site).filter(Site.id == min_price.site_id).first()

    return {
        "menor_preco": menor_valor,
        "maior_preco": maior_valor,
        "diferenca": economy,
        "economia": economy,
        "site_melhor_preco": site.name if site else "Desconhecido",
    }


@router.post("/refresh/{game_id}")
def refresh_prices_by_game(game_id: int, db: Session = Depends(get_db)):
    """
    Busca e atualiza automaticamente os preços de um jogo na API externa (CheapShark).
    """
    resultado = update_game_prices(game_id, db)
    if "erro" in resultado:
        raise HTTPException(status_code=404, detail=resultado["erro"])
    return resultado


@router.post("/refresh/all")
def refresh_all_prices():
    """
    Busca e atualiza automaticamente os preços de TODOS os jogos na API externa.
    """
    resultados = update_all_games()
    return {
        "status": "concluído",
        "total_jogos_processados": len(resultados),
        "detalhes": resultados,
    }
