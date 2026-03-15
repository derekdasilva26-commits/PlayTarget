import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import Base, engine, check_db_connection, DB_TYPE
from backend.models.game import Game
from backend.models.site import Site
from backend.models.price import Price
from backend.models.user import User
from backend.routes.games import router as games_router
from backend.routes.sites import router as sites_router
from backend.routes.price import router as price_router
from backend.routes.auth import router as auth_router

app = FastAPI(
    title="PlayTarget API",
    description="API para comparação de preços de games",
    version="1.0.0"
)

# ✅ CORS para o frontend se comunicar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Criar tabelas no banco
Base.metadata.create_all(bind=engine)

# ✅ Incluir todas as rotas
app.include_router(auth_router)
app.include_router(games_router)
app.include_router(sites_router)
app.include_router(price_router)

@app.get("/health")
def health_check():
    """Endpoint para verificar se API e banco de dados estão funcionando"""
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "db_type": DB_TYPE,
    }

# ✅ Servir frontend estático (deve vir após as rotas da API)
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

if os.path.isdir(FRONTEND_DIR):
    _js_dir = os.path.join(FRONTEND_DIR, "js")
    _css_dir = os.path.join(FRONTEND_DIR, "css")

    if os.path.isdir(_js_dir):
        app.mount("/js", StaticFiles(directory=_js_dir), name="js")
    if os.path.isdir(_css_dir):
        app.mount("/css", StaticFiles(directory=_css_dir), name="css")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "message": "API PlayTarget rodando com sucesso",
            "docs": "/docs",
            "version": "1.0.0"
        }