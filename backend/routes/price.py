from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.price import Price
from backend.models.game import Game
from backend.models.site import Site
from backend.schemas.price import PriceCreate, PriceResponse, PriceUpdate

router = APIRouter(prefix="/prices", tags=["Prices"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=PriceResponse)
def create_price(price: PriceCreate, db: Session = Depends(get_db)):
    """Criar um novo preço"""
    # Validar se jogo existe
    game = db.query(Game).filter(Game.id == price.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Validar se site existe
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
        raise HTTPException(status_code=404, detail="Nenhum preço encontrado para este jogo")
    return prices

@router.put("/{price_id}", response_model=PriceResponse)
def update_price(price_id: int, price_update: PriceUpdate, db: Session = Depends(get_db)):
    """Atualizar o preço"""
    db_price = db.query(Price).filter(Price.id == price_id).first()
    if not db_price:
        raise HTTPException(status_code=404, detail="Preço não encontrado")
    
    db_price.price = price_update.price
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