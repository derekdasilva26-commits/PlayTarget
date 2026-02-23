from fastapi import FastAPI
from database import Base, engine
from routes.games import router as games_router

app = FastAPI(title="PlayTarget API")

Base.metadata.create_all(bind=engine)

app.include_router(games_router)

@app.get("/")
def home():
    return {"message": "PlayTarget API está rodando"}