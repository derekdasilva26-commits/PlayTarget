from pydantic import BaseModel

class GameBase(BaseModel):
    title: str
    genre: str
    price: float

class GameCreate(GameBase):
    id: int

class GameResponse(GameBase):
    id: int

    class Config:
        from_attributes = True