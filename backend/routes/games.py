from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import SessionLocal
from models.game import Game
from schemas.game import GameCreate, GameResponse

router = APIRouter(prefix="/games", tags=["Games"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=GameResponse)
def create_game(game: GameCreate, db: Session = Depends(get_db)):
    db_game = Game(**game.dict())
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return db_game

@router.get("/", response_model=list[GameResponse])
def list_games(db: Session = Depends(get_db)):
    return db.query(Game).all()