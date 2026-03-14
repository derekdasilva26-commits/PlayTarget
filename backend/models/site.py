from sqlalchemy import Column, Integer, String, Boolean, DateTime, Sequence
from datetime import datetime
from backend.database import Base

class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, Sequence("sites_id_seq"), primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    url = Column(String(255), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Site(id={self.id}, name={self.name})>"