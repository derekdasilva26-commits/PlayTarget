from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database  import SessionLocal
from models.game import Game
from schemas.game import GameCreate

router = APIRouter(prefix="/games",tags=["Games"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_game(game: GameCreate, db: Session = Depends(get_db)):
    new_game = Game(**game.dict())
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game

@router.get("/")
def list_games(db: Session = Depends(get_db)):
    return db.query(Game).all()
