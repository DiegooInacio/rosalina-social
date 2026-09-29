#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/backend/docker-compose.yml"

cleanup() {
  echo
  echo "Encerrando os serviços do backend..."
  docker compose -f "$COMPOSE_FILE" down
}

trap cleanup EXIT INT TERM

command -v docker >/dev/null 2>&1 || {
  echo "Docker não encontrado. Instale o Docker antes de continuar." >&2
  exit 1
}

command -v npm >/dev/null 2>&1 || {
  echo "npm não encontrado. Instale o Node.js antes de continuar." >&2
  exit 1
}

if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
  echo "Instalando dependências do frontend..."
  npm --prefix "$PROJECT_DIR/frontend" install
fi

echo "Iniciando PostgreSQL e API..."
docker compose -f "$COMPOSE_FILE" up --build --detach

echo "Iniciando frontend..."
echo "Frontend: http://localhost:5173"
echo "API:      http://localhost:8080"
echo "Swagger:  http://localhost:8080/swagger-ui"
echo

npm --prefix "$PROJECT_DIR/frontend" run dev
