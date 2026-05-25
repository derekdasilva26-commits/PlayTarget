from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import SessionLocal
from backend.models.wishlist import Wishlist
from backend.models.game import Game
from backend.models.site import Site
from backend.models.price import Price
from backend.schemas.wishlist import WishlistCreate, WishlistResponse, WishlistAlertItem

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=WishlistResponse)
def create_wishlist_item(item: WishlistCreate, db: Session = Depends(get_db)):
    """Adiciona um jogo à wishlist com um preço-alvo"""
    game = db.query(Game).filter(Game.id == item.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")

    new_item = Wishlist(game_id=item.game_id, target_price=item.target_price)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.get("/alerts", response_model=list[WishlistAlertItem])
def get_wishlist_alerts(db: Session = Depends(get_db)):
    """
    Retorna a wishlist com o melhor preço atual e indica
    se o preço-alvo foi atingido.
    """
    items = db.query(Wishlist).all()
    result = []

    for item in items:
        game = db.query(Game).filter(Game.id == item.game_id).first()
        if not game:
            continue

        # Pega o preço mais recente por site para este jogo
        subq = (
            db.query(Price.site_id, func.max(Price.checked_at).label("latest"))
            .filter(Price.game_id == item.game_id)
            .group_by(Price.site_id)
            .subquery()
        )

        latest_prices = (
            db.query(Price)
            .join(
                subq,
                (Price.site_id == subq.c.site_id) & (Price.checked_at == subq.c.latest),
            )
            .filter(Price.game_id == item.game_id)
            .all()
        )

        current_best_price = None
        best_site = None
        currency = "USD"

        if latest_prices:
            best = min(latest_prices, key=lambda x: x.price)
            current_best_price = float(best.price)
            currency = best.currency or "USD"
            site = db.query(Site).filter(Site.id == best.site_id).first()
            best_site = site.name if site else None

        opportunity = current_best_price is not None and current_best_price <= item.target_price

        if opportunity:
            message = (
                f"✅ Preço atual ({current_best_price:.2f} {currency}) "
                f"está abaixo do seu alvo de R$ {item.target_price:.2f}!"
            )
        elif current_best_price is not None:
            message = (
                f"Melhor preço atual: {current_best_price:.2f} {currency}. "
                f"Ainda acima do preço-alvo de R$ {item.target_price:.2f}."
            )
        else:
            message = "Nenhum preço disponível para este jogo ainda."

        result.append(
            WishlistAlertItem(
                wishlist_id=item.id,
                game_id=game.id,
                game_title=game.title,
                target_price=item.target_price,
                current_best_price=current_best_price,
                best_site=best_site,
                currency=currency,
                opportunity=opportunity,
                message=message,
            )
        )

    return result


@router.delete("/{wishlist_id}")
def delete_wishlist_item(wishlist_id: int, db: Session = Depends(get_db)):
    """Remove um item da wishlist"""
    item = db.query(Wishlist).filter(Wishlist.id == wishlist_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado na wishlist")

    db.delete(item)
    db.commit()
    return {"message": "Item removido da wishlist com sucesso"}
