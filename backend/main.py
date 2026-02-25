from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import Base, engine
from backend.models.game import Game
from backend.routes.games import router as games_router

app = FastAPI(title="PlayTarget API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metada.create_all(bind=engine)

app.include_router(games_router)

@app.get("/")
def root():
    return {"message": "API PlayTarget rodando com sucesso"}

