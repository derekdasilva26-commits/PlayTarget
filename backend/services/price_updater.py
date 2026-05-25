from datetime import datetime
from sqlalchemy.orm import Session

from backend.models.game import Game
from backend.models.site import Site
from backend.models.price import Price
from backend.database import SessionLocal
from backend.services.cheapshark import fetch_prices


def update_game_prices(game_id: int, db: Session) -> dict:
    """
    Atualiza os preços de um jogo específico buscando na API CheapShark.
    Retorna um dict com o resultado da operação.
    """
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        return {"erro": f"Jogo com id={game_id} não encontrado"}

    # Busca preços externos pelo título do jogo
    precos_externos = fetch_prices(game.title)

    if not precos_externos:
        return {
            "game_id": game_id,
            "titulo": game.title,
            "status": "nenhum preço encontrado na API externa",
            "novos_precos": [],
        }

    novos_precos = []

    for item in precos_externos:
        # Procura o site no banco pelo nome (busca parcial, ignora maiúsculas)
        site = (
            db.query(Site)
            .filter(Site.name.ilike(f"%{item['store_name']}%"))
            .filter(Site.active == True)
            .first()
        )

        if not site:
            continue  # Loja não cadastrada no banco, ignora

        # Insere NOVA linha de preço (não sobrescreve — mantém histórico)
        novo_preco = Price(
            game_id=game_id,
            site_id=site.id,
            price=item["price"],
            currency=item["currency"],
            source="cheapshark",
            checked_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(novo_preco)
        novos_precos.append({
            "site": site.name,
            "preco": item["price"],
            "moeda": item["currency"],
        })

    db.commit()

    return {
        "game_id": game_id,
        "titulo": game.title,
        "status": "atualizado com sucesso",
        "novos_precos": novos_precos,
        "total_inserido": len(novos_precos),
    }


def update_all_games() -> list[dict]:
    """
    Atualiza preços de TODOS os jogos. Usado pelo agendador automático.
    Cria sua própria sessão de banco (não depende do FastAPI).
    """
    db = SessionLocal()
    resultados = []
    try:
        games = db.query(Game).all()
        for game in games:
            resultado = update_game_prices(game.id, db)
            resultados.append(resultado)
    finally:
        db.close()
    return resultados