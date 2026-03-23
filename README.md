# PlayTarget API

API para comparação de preços de games (FastAPI + SQLAlchemy + SQLPostgree).

## Rodar localmente (Windows / PowerShell)

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

## Endpoints úteis
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health
