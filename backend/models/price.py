from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    price = Column(Float, nullable=False)
    currency = Column(String(3), default="BRL")
    checked_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamentos
    game = relationship("Game", backref="prices")
    site = relationship("Site", backref="prices")

    def __repr__(self):
        return f"<Price(id={self.id}, game_id={self.game_id}, site_id={self.site_id}, price={self.price})>"

