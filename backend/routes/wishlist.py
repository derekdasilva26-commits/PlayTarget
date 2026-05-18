from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import SessionLocal
from backend.models.wishlist import Wishlist
from backend.models.game import Game
from backend.models.price import Price
from backend.models.site import Site
from backend.schemas.wishlist import WishlistCreate, WishlistResponse

router = APIRouter(
    prefix="/wishlist",
    tags=["wishlist"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=WishlistResponse)
def create_wishlist_item(payload: WishlistCreate, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == payload.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")

    existing = db.query(Wishlist).filter(Wishlist.game_id == payload.game_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este jogo já está na wishlist")

    item = Wishlist(game_id=payload.game_id, target_price=payload.target_price, active=True)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/", response_model=list[WishlistResponse])
def list_wishlist(db: Session = Depends(get_db)):
    return db.query(Wishlist).all()


@router.delete("/{wishlist_id}")
def delete_wishlist_item(wishlist_id: int, db: Session = Depends(get_db)):
    item = db.query(Wishlist).filter(Wishlist.id == wishlist_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item da wishlist não encontrado")

    db.delete(item)
    db.commit()
    return {"message": "Item removido da wishlist com sucesso"}


@router.get("/alerts")
def get_wishlist_alerts(db: Session = Depends(get_db)):
    items = db.query(Wishlist).filter(Wishlist.active == True).all()
    result = []

    for item in items:
        game = db.query(Game).filter(Game.id == item.game_id).first()
        if not game:
            continue

        subq = (
            db.query(Price.site_id, func.max(Price.checked_at).label("latest"))
            .filter(Price.game_id == item.game_id)
            .group_by(Price.site_id)
            .subquery()
        )

        prices = (
            db.query(Price)
            .join(
                subq,
                (Price.site_id == subq.c.site_id) & (Price.checked_at == subq.c.latest),
            )
            .filter(Price.game_id == item.game_id)
            .all()
        )

        if not prices:
            result.append({
                "wishlist_id": item.id,
                "game_id": item.game_id,
                "game_title": game.title,
                "target_price": item.target_price,
                "current_best_price": None,
                "best_site": None,
                "opportunity": False,
                "message": "Ainda não há preços cadastrados para este jogo"
            })
            continue

        best_price = min(prices, key=lambda x: x.price)
        best_site = db.query(Site).filter(Site.id == best_price.site_id).first()

        current_best = float(best_price.price)
        opportunity = current_best <= float(item.target_price)

        result.append({
            "wishlist_id": item.id,
            "game_id": item.game_id,
            "game_title": game.title,
            "target_price": float(item.target_price),
            "current_best_price": current_best,
            "best_site": best_site.name if best_site else "Desconhecido",
            "opportunity": opportunity,
            "message": "Oportunidade encontrada!" if opportunity else "Ainda acima do preço-alvo"
        })

    return result