from pydantic import BaseModel
from datetime import datetime


class WishlistCreate(BaseModel):
    game_id: int
    target_price: float


class WishlistResponse(BaseModel):
    id: int
    game_id: int
    target_price: float
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True