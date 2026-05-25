from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base


class Wishlist(Base):
    __tablename__ = "wishlist"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False, index=True)
    target_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    game = relationship("Game", backref="wishlist_items")

    def __repr__(self):
        return f"<Wishlist(id={self.id}, game_id={self.game_id}, target_price={self.target_price})>"
