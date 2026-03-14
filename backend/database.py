import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_TYPE = os.getenv("DB_TYPE", "sqlite")

if DB_TYPE == "postgresql":
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://playtarget_user:playtarget_pass@localhost:5432/playtarget",
    )
    engine = create_engine(DATABASE_URL)
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./playtarget.db")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

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
