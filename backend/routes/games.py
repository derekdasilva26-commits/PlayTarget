from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database  import SessionLocal
from backend.models.game import Game
from backend.schemas.game import GameCreate, GameResponse

router = APIRouter(prefix="/games",tags=["Games"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=GameResponse)
def create_game(game: GameCreate, db: Session = Depends(get_db)):
    """ 
    Criar um novo jogo
       
       Exemplo de requisição:
       {
         "tittle": "Inazuma Eleven Victory Road", "genre": "Sports",
         "description": "Jogo de futebol"
       
       }
       """
    existing_game = db.query(Game).filter(Game.tittle ==
    game.tittle).first()
    if existing_game:
        raise HTTPException(status_code=400,detail = "Jogo já cadastrado")
    
    new_game = Game(**game.dict())
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game

@router.get("/"
, response_model=list[GameResponse])
def list_games(db: Session = Depends(get_db)):
    """ Listar todos jogos cadastrados """
    return db.query(Game).all()

@router.get("/{game_id}",response_model=GameResponse)
def update_game(game_id: int, game: GameCreate, db:
Session = Depends(get_db)):
    """ Buscar um jogo específico pelo ID """
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404,
    detail="Jogo não encontrado")
    return game

@router.put("/{game_id}", response_model=GameResponse)
def update_game(game_id: int, game: GameCreate, db:
Session = Depends(get_db)):
    """ Atualizar um jogo existente"""
    db_game = db.query(Game).filter(Game.id ==
game_id.first())
    if not db_game:
        raise HTTPException(status_code=404,
detail="Jogo não encontrado")
    
    db_game.tittle = game.tittle
    db_game.genre = game.genre
    db_game.descricption = game.description
    db.commit()
    db.refresh(db_game)
    return db_game

@router.delete("/{game_id}")
def delete_game(game_id: int, db: Session =
Depends(get_db)):
    """Deletar um jogo"""
    db_game = db.query(Game).filter(Game.id ==
game_id).first()
    if not db_game:
        raise HTTPException(status_code=404,
detail="Jogo não encontrado")
    
    db.delete(db_game)
    db.commit()
    return {"message": "Jogo deletado com sucesso"}

