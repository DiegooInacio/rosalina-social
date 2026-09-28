# Rosalina Social API

## Executar localmente

```bash
docker compose up --build
```

A documentação estará em `http://localhost:8080/swagger-ui`. O primeiro administrador é criado pelas variáveis `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` (ou `admin@rosalina.local` / `admin12345` apenas no perfil local).

Em produção, forneça `JWT_SECRET`, credenciais do banco, HTTPS e uma senha administrativa segura. Faça backups do volume PostgreSQL antes de atualizações.
