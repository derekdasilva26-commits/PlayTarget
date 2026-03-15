# PlayTarget API

API para comparação de preços de games (FastAPI + SQLAlchemy + DuckDB/PostgreSQL).

## Rodar localmente (Windows / PowerShell)

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run_server.py
```

> **Sem configuração adicional!** Por padrão a API usa **DuckDB** como banco de dados local.
> O arquivo `playtarget.duckdb` é criado automaticamente na primeira execução.

## Rodar com Docker

```bash
docker compose up --build
```

A API ficará disponível em `http://localhost:8000`.

## Deploy em produção — Render.com (grátis)

1. Faça um fork ou push deste repositório para o GitHub.
2. Acesse [render.com](https://render.com) e crie uma conta gratuita.
3. Clique em **New → Blueprint** e selecione este repositório.
   O arquivo `render.yaml` já contém toda a configuração necessária.
4. Clique em **Apply** — o Render vai fazer o build e publicar a API automaticamente.

A URL pública será exibida no painel do Render (ex.: `https://playtarget-api.onrender.com`).

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste se necessário:

```powershell
copy .env.example .env
```

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DB_TYPE` | `duckdb` | Tipo de banco: `duckdb` (local) ou `postgresql` |
| `DATABASE_URL` | `duckdb:///playtarget.duckdb` | URL de conexão com o banco |
| `SECRET_KEY` | `playtarget-secret-key-change-in-production` | Chave para tokens JWT (**alterar em produção**) |

### Usar PostgreSQL em produção

Defina as variáveis antes de iniciar:

```powershell
$env:DB_TYPE="postgresql"
$env:DATABASE_URL="postgresql+psycopg2://playtarget_user:playtarget_pass@localhost:5432/playtarget"
uvicorn backend.main:app --reload
```

## Endpoints úteis

- **Swagger:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health

## Autenticação

As rotas de escrita (POST / PUT / DELETE) exigem um token JWT no header `Authorization: Bearer <token>`.

### Registrar usuário

```http
POST /auth/register
Content-Type: application/json

{"username": "meuuser", "password": "minhasenha"}
```

### Login (obter token)

```http
POST /auth/login
Content-Type: application/json

{"username": "meuuser", "password": "minhasenha"}
```

Resposta:
```json
{"access_token": "eyJ...", "token_type": "bearer"}
```

### Usar token nas requisições protegidas

```http
POST /games/
Authorization: Bearer eyJ...
Content-Type: application/json

{"title": "Elden Ring", "genre": "RPG"}
```

## Rotas públicas (GET — sem autenticação)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/games/` | Listar jogos |
| GET | `/games/{id}` | Buscar jogo |
| GET | `/sites/` | Listar sites |
| GET | `/sites/{id}` | Buscar site |
| GET | `/prices/` | Listar preços |
| GET | `/prices/{id}` | Buscar preço |
| GET | `/prices/game/{game_id}` | Preços de um jogo |

## Rotas protegidas (requerem token JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Registrar usuário |
| POST | `/auth/login` | Login (retorna token) |
| POST | `/games/` | Criar jogo |
| PUT | `/games/{id}` | Atualizar jogo |
| DELETE | `/games/{id}` | Remover jogo |
| POST | `/sites/` | Criar site |
| PUT | `/sites/{id}` | Atualizar site |
| DELETE | `/sites/{id}` | Remover site |
| POST | `/prices/` | Criar preço |
| PUT | `/prices/{id}` | Atualizar preço |
| DELETE | `/prices/{id}` | Remover preço |

## Sites suportados

Steam, Epic Games, Nuuvem, Eneba (e qualquer outro que você cadastrar via `/sites`).
