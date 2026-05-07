from datetime import datetime
from sqlalchemy.orm import Session

from backend.models.game import Game
from backend.models.site import Site
from backend.models.price import Price
from backend.database import SessionLocal
from backend.services.cheapshark import fetch_prices


def update_game_prices(game_id: int, db: Session) -> dict:
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        return {"erro": f"Jogo com id={game_id} não encontrado"}

    precos_externos = fetch_prices(game.title)

    if not precos_externos:
        return {
            "game_id": game_id,
            "titulo": game.title,
            "status": "nenhum preço encontrado na API externa",
            "novos_precos": [],
            "total_inserido": 0,
        }

    novos_precos = []

    for item in precos_externos:
        site = (
            db.query(Site)
            .filter(Site.name.ilike(f"%{item['store_name']}%"))
            .filter(Site.active == True)
            .first()
        )

        if not site:
            continue

        # UPSERT: atualiza se já existe, insere se não existe
        preco_existente = (
            db.query(Price)
            .filter(Price.game_id == game_id, Price.site_id == site.id)
            .first()
        )

        if preco_existente:
            preco_existente.price = item["price"]
            preco_existente.currency = item["currency"]
            preco_existente.checked_at = datetime.utcnow()
        else:
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