from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.site import Site
from backend.schemas.site import SiteCreate, SiteResponse, SiteUpdate

router = APIRouter(prefix="/sites", tags=["Sites"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=SiteResponse)
def create_site(site: SiteCreate, db: Session = Depends(get_db)):
    """Criar um novo site"""
    # Verificar se site já existe
    existing_site = db.query(Site).filter(Site.name == site.name).first()
    if existing_site:
        raise HTTPException(status_code=400, detail="Site já cadastrado")
    
    new_site = Site(**site.dict())
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    return new_site

@router.get("/", response_model=list[SiteResponse])
def list_sites(db: Session = Depends(get_db)):
    """Listar todos os sites"""
    return db.query(Site).all()

@router.get("/{site_id}", response_model=SiteResponse)
def get_site(site_id: int, db: Session = Depends(get_db)):
    """Buscar um site específico"""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site não encontrado")
    return site

@router.put("/{site_id}", response_model=SiteResponse)
def update_site(site_id: int, site: SiteUpdate, db: Session = Depends(get_db)):
    """Atualizar um site"""
    db_site = db.query(Site).filter(Site.id == site_id).first()
    if not db_site:
        raise HTTPException(status_code=404, detail="Site não encontrado")
    
    db_site.name = site.name
    db_site.url = site.url
    db_site.active = site.active
    db.commit()
    db.refresh(db_site)
    return db_site

@router.delete("/{site_id}")
def delete_site(site_id: int, db: Session = Depends(get_db)):
    """Deletar um site"""
    db_site = db.query(Site).filter(Site.id == site_id).first()
    if not db_site:
        raise HTTPException(status_code=404, detail="Site não encontrado")
    
    db.delete(db_site)
    db.commit()
    return {"message": "Site deletado com sucesso"}