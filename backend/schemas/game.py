from pydantic import BaseModel
from datetime import datetime

class GameBase(BaseModel):
    """Atributos comuns ao criar/atualizar"""
    title: str
    genre: str
    description: str | None = None

class GameCreate(GameBase):
    """Schema para criar um novo jogo (SEM id)"""
    pass

class GameUpdate(GameBase):
    """Schema para atualizar um jogo"""
    pass

class GameResponse(GameBase):
    """Schema para retornar um jogo (COM id e timestamps)"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "title": "Inazuma Eleven Victory Road",
                "genre": "Sports",
                "description": "Jogo de futebol",
                "created_at": "2026-02-25T10:00:00",
                "updated_at": "2026-02-25T10:00:00"
            }
        }