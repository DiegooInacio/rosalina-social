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

## Perfil do usuário

As rotas abaixo atendem ADMIN e OPERADOR e identificam a conta exclusivamente
pelo token de acesso, sem receber ID de usuário:

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/api/v1/me` | — | `{ id, name, email, role }` |
| PATCH | `/api/v1/me` | `{ "name": "Maria Oliveira" }` | Perfil atualizado no mesmo formato |
| PUT | `/api/v1/me/password` | `{ "currentPassword": "senha-atual", "newPassword": "nova-senha" }` | 204 sem corpo |

O nome é salvo sem espaços nas extremidades, com 1 a 150 caracteres. E-mail,
permissão e situação da conta não podem ser alterados por essas rotas.
A senha atual é obrigatória; a nova deve ser diferente, ter de 8 a 100 caracteres
e ocupar no máximo 72 bytes em UTF-8 (limite do BCrypt). Senhas não são aparadas.
A confirmação da senha fica a cargo do frontend.

Erros de validação retornam 400 no formato padrão `{ message, fields, ... }`.
Senha atual incorreta retorna `fields.currentPassword`, sem invalidar a sessão.
As alterações são transacionais e auditadas sem registrar nomes ou senhas nos
eventos. A troca de senha passa a valer no próximo login; os tokens já emitidos
continuam sujeitos à validade existente e à verificação de conta ativa.
As rotas seguem a segurança atual da API: requisições sem autenticação válida
ou de contas inativas recebem 403.

## Testes

Com Java 21, Maven e Docker disponíveis, execute `mvn test`. Os testes de
integração usam PostgreSQL temporário via Testcontainers, aplicam as migrations
e não acessam o banco de desenvolvimento. Os testes de rascunhos cobrem os dois
tipos de formulário, permissões por dono, conflitos de versão, recuperação de
campos incompletos, descarte, validação final e conclusão simultânea sem duplicação.

Com Docker 29, a versão atual do cliente usado pelo Testcontainers pode exigir
`mvn -Dapi.version=1.44 test` para compatibilidade com a API do daemon.
