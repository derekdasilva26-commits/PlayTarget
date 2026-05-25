from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class WishlistCreate(BaseModel):
    game_id: int
    target_price: float


class WishlistResponse(BaseModel):
    id: int
    game_id: int
    target_price: float
    created_at: datetime

    class Config:
        from_attributes = True


class WishlistAlertItem(BaseModel):
    wishlist_id: int
    game_id: int
    game_title: str
    target_price: float
    current_best_price: Optional[float]
    best_site: Optional[str]
    currency: str
    opportunity: bool
    message: str
