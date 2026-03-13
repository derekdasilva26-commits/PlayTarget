from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.deps import get_current_user
from backend.database import get_db
from backend.models.game import Game
from backend.models.user import User
from backend.schemas.game import GameCreate, GameResponse, GameUpdate

router = APIRouter(prefix="/games", tags=["Games"])

@router.post("/", response_model=GameResponse)
def create_game(game: GameCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """
    Criar um novo jogo
    
    📝 Exemplo de requisição:
    {
        "title": "Inazuma Eleven Victory Road",
        "genre": "Sports",
        "description": "Jogo de futebol"
    }
    """
    # Validação: Verificar se o jogo já existe
    existing_game = db.query(Game).filter(Game.title == game.title).first()
    if existing_game:
        raise HTTPException(status_code=400, detail="Jogo já cadastrado")
    
    new_game = Game(**game.dict())
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game

@router.get("/", response_model=list[GameResponse])
def list_games(db: Session = Depends(get_db)):
    """Listar todos os jogos cadastrados"""
    return db.query(Game).all()

@router.get("/{game_id}", response_model=GameResponse)
def get_game(game_id: int, db: Session = Depends(get_db)):
    """Buscar um jogo específico pelo ID"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return game

@router.put("/{game_id}", response_model=GameResponse)
def update_game(game_id: int, game: GameUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Atualizar um jogo existente"""
    db_game = db.query(Game).filter(Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    db_game.title = game.title
    db_game.genre = game.genre
    db_game.description = game.description
    db.commit()
    db.refresh(db_game)
    return db_game

@router.delete("/{game_id}")
def delete_game(game_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Deletar um jogo"""
    db_game = db.query(Game).filter(Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    db.delete(db_game)
    db.commit()
    return {"message": "Jogo deletado com sucesso"}

