# Rosalina Social API

## Executar localmente

```bash
docker compose up --build
```

A documentação estará em `http://localhost:8080/swagger-ui`. O primeiro administrador é criado pelas variáveis `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` (ou `admin@rosalina.local` / `admin12345` apenas no perfil local).

Em produção, forneça `JWT_SECRET`, credenciais do banco, HTTPS e uma senha administrativa segura. Faça backups do volume PostgreSQL antes de atualizações.

## Formulários

O [contrato dos formulários](FORMULARIOS.md) descreve endpoints, campos, validações,
catálogos, exemplos para o frontend, migrations e divisão de responsabilidades.

O backend oferece rascunhos privados para os dois formulários em
`/api/v1/form-drafts`, com recuperação de dados incompletos, controle de versão,
descarte e conclusão transacional. O fluxo de integração está na seção
[Rascunhos de formulários](FORMULARIOS.md#rascunhos-de-formulários).

## Testes

Com Java 21, Maven e Docker disponíveis, execute `mvn test`. Os testes de
integração usam PostgreSQL temporário via Testcontainers, aplicam as migrations
e não acessam o banco de desenvolvimento. Os testes de rascunhos cobrem os dois
tipos de formulário, permissões por dono, conflitos de versão, recuperação de
campos incompletos, descarte, validação final e conclusão simultânea sem duplicação.

Com Docker 29, a versão atual do cliente usado pelo Testcontainers pode exigir
`mvn -Dapi.version=1.44 test` para compatibilidade com a API do daemon.
