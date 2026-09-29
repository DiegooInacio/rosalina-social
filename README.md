# Rosalina Social

Sistema web para cadastro de alunos e levantamento populacional da Comunidade
Rosalina.

## Tecnologias

- Frontend: React, TypeScript, Vite e Tailwind CSS
- Backend: Java 21, Spring Boot e Maven
- Banco de dados: PostgreSQL
- Ambiente local: Docker Compose

## Pré-requisitos

- Docker com Docker Compose
- Node.js e npm

## Executar o projeto

Na raiz do repositório, execute:

```bash
./start.sh
```

Na primeira execução, o script instala as dependências do frontend, constrói o
backend, inicia o PostgreSQL e abre o servidor de desenvolvimento do Vite.

Serviços disponíveis:

- Frontend: http://localhost:5173
- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui

Administrador do ambiente local:

```text
E-mail: admin@rosalina.local
Senha: admin12345
```

Use `Ctrl+C` para encerrar o frontend e os containers iniciados pelo script.

## Estrutura

```text
rosalina-social/
├── backend/    API e banco de dados
├── frontend/   Interface web
└── start.sh    Inicialização do ambiente local
```
