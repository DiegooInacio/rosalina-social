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
eventos. A troca de senha invalida os tokens emitidos anteriormente. Os novos acessos ficam sujeitos à validade existente e à verificação de conta ativa.
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

## Administração de usuários

Todas as rotas `/api/v1/users` exigem `ADMIN`:

| Método | Rota | Corpo |
| --- | --- | --- |
| GET | `/api/v1/users` | — |
| POST | `/api/v1/users` | `{ name, email, role, password }` |
| PUT | `/api/v1/users/{id}` | `{ name, role }` |
| PATCH | `/api/v1/users/{id}` | `{ active }` (booleano obrigatório) |
| PUT | `/api/v1/users/{id}/password` | `{ newPassword }` (204 ao concluir) |

Os cargos são `ADMIN` e `OPERADOR`. O e-mail é único, inclusive entre contas
inativas, e não é alterado por essas rotas. Nomes são aparados e limitados a 150
caracteres. Senhas respeitam a mesma política de **Meu perfil**, incluindo o limite
de 72 bytes UTF-8 do BCrypt. Respostas nunca contêm senhas ou hashes.

A própria conta administrativa não pode ser desativada nem rebaixada; sua senha
é alterada por `/api/v1/me/password`. Alterações administrativas são transacionais,
com bloqueio do usuário durante a gravação e eventos de auditoria sem senhas.

A migration V8 adiciona `session_version`, transportada nos tokens. Reset de
senha e mudanças de situação incrementam a versão, invalidando acessos e refresh
anteriores, inclusive depois da reativação. Tokens anteriores à migration são
aceitos somente enquanto a versão da conta é zero. O reset administrativo não
envia e-mail; recuperação pública por e-mail exige um fluxo adicional de entrega
e tokens de uso único.

## Proteções de autenticação

O perfil `local` é exclusivo do desenvolvimento. O Compose o ativa, publica API e
PostgreSQL somente em `127.0.0.1` e gera uma chave JWT temporária a cada início da
API. `./start.sh` continua sendo o comando local. Reiniciar a API local pede novo
login. Para executar Java diretamente em desenvolvimento, ative
`SPRING_PROFILES_ACTIVE=local`. Os perfis de produção exigem `JWT_SECRET` exclusivo
(com pelo menos 32 bytes; gere com `openssl rand -hex 32`) e credenciais de
bootstrap próprias. A antiga chave pública de desenvolvimento é recusada.

A migration V9 cria sessões de renovação e contadores persistentes de login e
invalida as sessões anteriores à atualização. Login emite um refresh token com
identificador de sessão e de uso. `/api/v1/auth/refresh` troca esse identificador
atomicamente sob bloqueio da conta; o token anterior não pode ser reapresentado.
Reutilização revoga todas as sessões da conta e registra `REFRESH_REUSE` sem tokens
na auditoria. A duração máxima da sessão é de sete dias por padrão, contados do
login; renovar não estende esse prazo.

`POST /api/v1/auth/logout` recebe `{ refreshToken }` e responde 204, revogando
**todas as sessões da conta**, inclusive acessos já emitidos. Um access token
válido em `Authorization` também permite revogar quando o refresh expirou.
Trocar a própria senha, redefinir a senha administrativamente e mudar a situação
da conta invalidam os tokens anteriores. Após trocar a própria senha, entre
novamente. A API mantém o 204 do contrato de troca de senha.

Login permite até dez tentativas por conta e cem por IP em uma janela de quinze
minutos. Os limites incluem tentativas com sucesso, retornam 429 ao exceder e
persistem no PostgreSQL, inclusive entre reinícios e réplicas da API. Os nomes de
contas/IPs são representados por hash nos contadores; não se armazenam senhas.
As propriedades `app.auth.login-account-limit` e `app.auth.login-ip-limit` ajustam
os limites. A contagem por conta é independente de IP/cabeçalhos encaminhados.
