import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

_SUPPORTED_DB_TYPES = ("duckdb", "postgresql")

DB_TYPE = os.getenv("DB_TYPE", "duckdb")

if DB_TYPE not in _SUPPORTED_DB_TYPES:
    raise ValueError(
        f"DB_TYPE='{DB_TYPE}' não é suportado. "
        f"Use um dos tipos suportados: {_SUPPORTED_DB_TYPES}. "
        "SQLite não é suportado neste projeto."
    )

if DB_TYPE == "duckdb":
    DATABASE_URL = os.getenv("DATABASE_URL", "duckdb:///playtarget.duckdb")
    engine = create_engine(DATABASE_URL, connect_args={"read_only": False})
else:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://playtarget_user:playtarget_pass@localhost:5432/playtarget",
    )
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """Dependency para obter sessão do banco"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Verifica se a conexão com o banco está funcionando"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
