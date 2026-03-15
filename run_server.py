"""Script para iniciar o servidor PlayTarget com verificacoes de ambiente."""

import os
import sys

import uvicorn


def main():
    print("🎮 PlayTarget API")
    print(f"📁 Diretório: {os.getcwd()}")
    print(f"🐍 Python: {sys.version.split()[0]}")

    # Carregar variáveis do .env se existir
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())
        print("✅ .env carregado")

    # Verificar imports
    print("\n📦 Verificando módulos...")
    try:
        from backend.database import DB_TYPE, check_db_connection  # noqa: F401
        from backend.main import app as _app  # noqa: F401

        print(f"✅ Banco: {DB_TYPE}")
        ok = check_db_connection()
        print(f"✅ Conexão: {'OK' if ok else 'FALHA'}")
    except Exception as exc:
        print(f"❌ Erro ao importar módulos: {exc}")
        sys.exit(1)

    port = int(os.environ.get("PORT", 8000))

    print(f"\n🚀 Iniciando servidor em http://0.0.0.0:{port}")
    print(f"📖 Documentação em  http://localhost:{port}/docs\n")

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
