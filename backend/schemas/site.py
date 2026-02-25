from pydantic import BaseModel
from datetime import datetime

class SiteBase(BaseModel):
    """Atributos comuns ao criar/atualizar"""
    name: str
    url: str
    active: bool = True

class SiteCreate(SiteBase):
    """Schema para criar um novo site"""
    pass

class SiteUpdate(SiteBase):
    """Schema para atualizar um site"""
    pass

class SiteResponse(SiteBase):
    """Schema para retornar um site (COM id e timestamps)"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Steam",
                "url": "https://store.steampowered.com",
                "active": True,
                "created_at": "2026-02-25T10:00:00",
                "updated_at": "2026-02-25T10:00:00"
            }
        }