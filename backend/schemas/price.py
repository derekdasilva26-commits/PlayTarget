from pydantic import BaseModel
from datetime import datetime

class PriceBase(BaseModel):
    """Atributos comuns ao criar/atualizar"""
    game_id: int
    site_id: int
    price: float
    currency: str = "BRL"

class PriceCreate(PriceBase):
    """Schema para criar um novo preço"""
    pass

class PriceUpdate(BaseModel):
    """Schema para atualizar apenas o preço"""
    price: float

class PriceResponse(PriceBase):
    """Schema para retornar um preço (COM id e timestamps)"""
    id: int
    checked_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "game_id": 1,
                "site_id": 1,
                "price": 199.90,
                "currency": "BRL",
                "checked_at": "2026-02-25T10:00:00",
                "created_at": "2026-02-25T10:00:00"
            }
        }