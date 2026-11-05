# Publicar no Heroku

## Como a aplicação é publicada

O `Dockerfile` da raiz compila o React e inclui os arquivos gerados na aplicação
Spring Boot. O `heroku.yml` instrui o Heroku a construir essa imagem e iniciar o
processo `web`. Site e API usam o mesmo domínio; não é necessário hospedar o
frontend separadamente nem configurar `VITE_API_URL` ou CORS para esse acesso.

O perfil `heroku` usa a porta `PORT` fornecida pela plataforma e interpreta a
`DATABASE_URL` do Heroku Postgres, exigindo SSL por padrão. O pool usa até cinco
conexões. As migrações existentes do Flyway executam na inicialização. Não foi
criada migração nova para a hospedagem.

## 1. Ativar o benefício de estudante

Ative o GitHub Student Developer Pack e solicite o benefício em
[Heroku for GitHub Students](https://www.heroku.com/github-students/).
Confira no painel se o crédito foi aplicado antes de criar recursos pagos.
O cadastro exige os dados de cobrança solicitados pelo Heroku.

Na consulta de 04/11/2026, o programa anuncia US$ 13 por mês durante 24 meses.
A combinação inicial indicada é:

| Recurso | Plano | Preço mensal |
| --- | --- | --- |
| Aplicação Java + React | Basic, 512 MB | US$ 7 |
| PostgreSQL | Essential-0, 1 GB | US$ 5 |
| Total | | US$ 12 |

Essa combinação cabe no crédito mensal anunciado. Outros recursos, uso acima
do benefício e os serviços mantidos depois do fim do crédito podem ser cobrados.
Confira os valores e a duração efetivamente concedida à sua conta antes de criar
os recursos: [preços](https://www.heroku.com/pricing/) e
[termos do programa](https://help.heroku.com/Z3RHNRHD/how-does-the-heroku-for-github-students-program-work).

## 2. Instalar a CLI e salvar as alterações

Instale a [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) e entre:

```bash
heroku login
```

Na raiz do projeto, revise e faça commit dos arquivos que deseja publicar.
O deploy envia o último commit; mudanças sem commit não entram na publicação.
Não inclua senhas ou arquivos `.env` no Git.

```bash
git status
git add .
git commit -m "Prepara publicação no Heroku e corrige operações assíncronas"
```

## 3. Criar a aplicação e o banco

Nos comandos abaixo, substitua `SEU-APP` por um nome disponível no Heroku.
Execute na raiz do repositório, onde estão `Dockerfile` e `heroku.yml`:

```bash
heroku create SEU-APP --stack container --region us
heroku addons:create heroku-postgresql:essential-0 --app SEU-APP
```

O primeiro comando configura o remoto Git `heroku`. O segundo provisiona um
banco persistente e adiciona `DATABASE_URL` automaticamente. Não substitua essa
variável por uma URL local ou por uma URL JDBC. Não é necessário instalar Docker
na sua máquina para esse fluxo: o Heroku constrói a imagem remotamente.

Se a aplicação já existe, associe o repositório e configure a stack:

```bash
heroku git:remote --app SEU-APP
heroku stack:set container --app SEU-APP
```

Crie o banco apenas se a aplicação ainda não tiver um conectado.

## 4. Configurar as credenciais de produção

Abra sua aplicação no painel Heroku e entre em **Settings → Reveal Config Vars**.
Cadastre estas variáveis antes do primeiro deploy:

| Variável | Valor |
| --- | --- |
| `JWT_SECRET` | Segredo aleatório exclusivo dessa aplicação |
| `BOOTSTRAP_ADMIN_EMAIL` | E-mail do administrador inicial |
| `BOOTSTRAP_ADMIN_PASSWORD` | Senha forte do administrador inicial |

Para gerar um segredo, execute localmente e copie o resultado para `JWT_SECRET`:

```bash
openssl rand -hex 32
```

A senha deve ter no mínimo 8 caracteres e no máximo 72 bytes em UTF-8. Caracteres
acentuados podem ocupar mais de um byte. Não use as credenciais padrão do ambiente
local. No perfil de produção, as três variáveis são obrigatórias.

`SPRING_PROFILES_ACTIVE=heroku` já está definido na imagem. `PORT` vem da
plataforma e `DATABASE_URL` vem do banco; não é preciso cadastrá-los manualmente.
`JAVA_TOOL_OPTIONS` também está definido na imagem para limitar o heap da JVM a
60% da memória disponível.

O administrador inicial só é criado quando a tabela de usuários está vazia.
Alterar as variáveis de bootstrap depois disso **não altera a senha de um usuário
existente**. Use a área de perfil da aplicação para trocar sua senha.

## 5. Publicar e ligar o processo web

```bash
git push heroku HEAD:main
heroku ps:scale web=1:basic --app SEU-APP
heroku open --app SEU-APP
```

A primeira construção pode demorar enquanto baixa Node, Java e as dependências.
O deploy usa o `Dockerfile` da raiz; o `backend/Dockerfile` continua destinado ao
ambiente local. As migrações preparam o banco na primeira inicialização.

Use o endereço **HTTPS** exibido pelo Heroku. Entre com o e-mail e a senha
configurados no passo anterior. Confira o carregamento das listas, crie um
cadastro de teste e abra uma página interna diretamente em outra aba para
verificar o funcionamento da publicação.

Os dados do PostgreSQL local não são enviados pelo deploy. Uma instalação nova
começa com um banco novo. Se precisar levar cadastros existentes, planeje a
transferência com backup e restauração antes de começar a usar o banco de
produção; não sobrescreva um banco que já recebeu cadastros sem preservar seus
dados.

## Atualizações e diagnóstico

Para publicar uma atualização, faça commit e execute novamente:

```bash
git push heroku HEAD:main
```

Para conferir a situação da aplicação e do banco:

```bash
heroku ps --app SEU-APP
heroku pg:info --app SEU-APP
heroku logs --tail --app SEU-APP
```

Se a aplicação não iniciar, confira as três variáveis obrigatórias e se o banco
foi provisionado. A aplicação deve ouvir em `PORT`; essa configuração já está no
perfil `heroku`. Não publique logs que contenham credenciais ou tokens.

Antes de alterações importantes no banco, capture um backup e acompanhe sua
conclusão:

```bash
heroku pg:backups:capture --app SEU-APP
heroku pg:backups --app SEU-APP
```

Consulte também a configuração de backups automáticos e as instruções de
restauração em [Heroku PGBackups](https://devcenter.heroku.com/articles/heroku-postgres-backups).

## Referências

- [Construção com Dockerfile e heroku.yml](https://devcenter.heroku.com/articles/build-docker-images-heroku-yml)
- [Provisionamento do PostgreSQL](https://devcenter.heroku.com/articles/provisioning-heroku-postgres)
- [Conexão e SSL do PostgreSQL](https://devcenter.heroku.com/articles/connecting-heroku-postgres)
- [Escala dos processos](https://devcenter.heroku.com/articles/scaling)
