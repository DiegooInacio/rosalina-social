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

## Publicar no Heroku

O projeto inclui uma imagem de produção que serve o frontend e a API no mesmo
domínio, com PostgreSQL separado. Consulte o [passo a passo de publicação](docs/HEROKU.md)
para configurar a conta, o banco, as credenciais e fazer o deploy.

## Privacidade e LGPD

A [revisão de privacidade](docs/LGPD.md) registra o inventário de dados, fontes
oficiais consultadas, melhorias técnicas e decisões pendentes da associação.
O checkbox de autorização não define, por si só, a base legal de um tratamento.

## Estrutura do repositório

```text
rosalina-social/
├── backend/    API e banco de dados
├── frontend/   Interface web
└── start.sh    Inicialização do ambiente local
```
