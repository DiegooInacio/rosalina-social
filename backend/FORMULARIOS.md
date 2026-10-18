# Contrato dos formulários

A API usa `/api/v1`, autenticação `Authorization: Bearer <accessToken>` e JSON.
`ADMIN` e `OPERADOR` podem cadastrar, consultar e editar os dois formulários.
Ambos podem consultar catálogos; somente `ADMIN` pode administrá-los e administrar usuários.

## Rascunhos de formulários

`/api/v1/form-drafts` atende alunos (`STUDENT`) e levantamento populacional
(`POPULATION_SURVEY`). Rascunhos ficam em tabela separada: não aparecem nas
listagens de cadastros, não reservam CPF e não criam integrantes ou familiares.
Cada usuário, inclusive administrador, acessa somente os próprios rascunhos.
É possível manter vários rascunhos de cada tipo.

| Método | Endpoint | Resultado |
|---|---|---|
| POST | `/form-drafts` | 201 + Location; cria um rascunho |
| GET | `/form-drafts?formType=STUDENT` | 200; lista somente os próprios rascunhos pendentes |
| GET | `/form-drafts/{id}` | 200; recupera estado e versão |
| PUT | `/form-drafts/{id}` | 200; substitui o estado completo, mediante versão atual |
| DELETE | `/form-drafts/{id}?version=0` | 204; descarta um rascunho pendente |
| POST | `/form-drafts/{id}/complete` | 200; valida e cria o cadastro definitivo |

### Estado bruto e recuperação

O campo `data` é um **objeto JSON** de até 256 KiB, e deve conter o estado bruto
da interface, antes da transformação para o payload final. Preserva strings
vazias, valores booleanos, arrays e campos pela metade, sem normalizar ou validar
CPF, datas, dinheiro, UUIDs ou obrigatoriedade. Assim, um reload não depende de o
usuário já ter terminado um campo. JSON inválido e valores fora de um objeto
continuam sendo recusados. `title` é opcional e aceita até 150 caracteres.

```json
{
  "formType": "STUDENT",
  "title": "Cadastro de Ana em preenchimento",
  "data": {
    "name": "Ana",
    "birthDate": "20/0",
    "cpf": "529.",
    "guardian": {"name": "Maria"},
    "socioeconomic": {"householdIncome": "120,"}
  }
}
```

A resposta contém `id`, `formType`, `status: "DRAFT"`, `title`, `data`, `version`
(inicialmente 0), `createdAt` e `updatedAt`. O frontend deve guardar o ID e a versão
retornada. Para recuperar sem um ID local, pode listar os próprios rascunhos por
tipo, selecionar um e buscar seu conteúdo em `GET /form-drafts/{id}`.
A listagem é paginada, não inclui `data`, limita páginas a 100 itens e ordena por
`updatedAt,desc` por padrão. Aceita ordenação por `id`, `title`, `formType`,
`createdAt` e `updatedAt`.

Um `PUT` envia `version`, `title` e `data` completos; campos omitidos de `data`
não são mesclados com o conteúdo anterior. `formType` é fixado na criação.
Toda atualização confirmada devolve uma versão incrementada. Exemplo:

```json
{"version": 0, "title": "Cadastro de Ana", "data": {"name": "Ana Silva"}}
```

Uma versão antiga retorna **409**, sem sobrescrever nem excluir dados. O frontend
deve recuperar a versão atual e resolver o conflito, em vez de repetir a gravação
automaticamente com outra versão. Isso vale para salvar, descartar e concluir.
Rascunhos inexistentes ou pertencentes a outro usuário retornam **404**.

### Conclusão e repetição segura

Ao concluir, o frontend valida o formulário e transforma o estado bruto para o
contrato final descrito nas seções abaixo. Envia esse payload em `submission`,
junto da versão do rascunho:

```json
{
  "version": 0,
  "submission": {
    "responsible": {"name": "Maria Silva"},
    "authorizations": {"imageAndSound": false, "personalData": true}
  }
}
```

Esse exemplo conclui um rascunho `POPULATION_SURVEY`. Para `STUDENT`, `submission`
deve respeitar `StudentRequest`, incluindo atividade, nascimento e responsável.
As validações de formato, obrigatoriedade e negócio são as mesmas dos endpoints
normais; o rascunho não serve para contorná-las. Erros de campos da conclusão
usam os caminhos do payload final (por exemplo, `responsible.birthDate` ou
`relatives[0].cpf`), sem o prefixo `submission.`. Erros do envelope usam `version`
ou `submission`.

Em caso de erro, o rascunho mantém o conteúdo e a versão. Se concluir com sucesso,
a resposta contém `draftId`, `formType` e `recordId`. A criação do cadastro e a
conclusão do rascunho ocorrem na mesma transação. O estado bruto e o título são
apagados, e o rascunho deixa a lista de pendentes. É mantido um recibo com status
`COMPLETED` e o ID do registro criado; `GET` passa a retornar `data: {}`.

Repetir `/complete` de um rascunho já concluído, mesmo usando a versão enviada
na primeira tentativa, retorna o mesmo `recordId`, sem duplicar o cadastro.
O recibo não pode ser reaberto, sobrescrito ou descartado por `PUT`/`DELETE`.
Operações simultâneas são serializadas por rascunho. A auditoria registra ações
e identificadores, sem copiar o conteúdo pessoal de `data` ou `submission`.

Na integração, o frontend deve serializar os envios de autosave e concluir
pelo endpoint `/complete` (em vez de criar o cadastro por fora e tentar apagar o
rascunho depois). Os endpoints existentes continuam disponíveis para criação
direta; o frontend usa o fluxo de rascunhos descrito nesta seção.

## Alunos

Endpoints existentes: `POST /students`, `GET /students`, `GET /students/{id}`,
`PUT /students/{id}` e `PATCH /students/{id}/status`.

Obrigatórios: `status`, `name`, `activityId`, `birthDate`, `guardianPhone` e
`relatives` com exatamente um item `RESPONSAVEL` com nome. Pai e mãe são opcionais;
cada tipo pode aparecer uma vez. Cada familiar incluído precisa de `type` e `name`.

```json
{
  "status": "ATIVO",
  "name": "Ana Silva",
  "activityId": "UUID-de-uma-atividade-ativa",
  "birthDate": "2015-05-20",
  "guardianPhone": "85999999999",
  "relatives": [{"type": "RESPONSAVEL", "name": "Maria Silva"}]
}
```

As opções socioeconômicas e de ocupação/escolaridade são UUIDs de catálogo.
Patrimônio: `hasOtherProperty: true` ou `hasVehicle: true` exige
`socioeconomic.hasOtherAssets: true`. Benefícios são independentes.
A listagem mantém a ocultação parcial do CPF; a consulta detalhada retorna o CPF normalizado.

## Levantamento populacional

| Método | Endpoint | Resultado |
|---|---|---|
| POST | `/population-surveys` | 201, cadastro completo |
| GET | `/population-surveys` | 200, página resumida |
| GET | `/population-surveys/{id}` | 200, cadastro completo |
| PUT | `/population-surveys/{id}` | 200, cadastro substituído |

A listagem aceita `name`, `cpf`, `page`, `size` e `sort` (padrão `responsibleName`).
`name` busca trecho do nome, sem distinguir maiúsculas; `cpf` busca valor exato e aceita máscara.

Cadastro mínimo:

```json
{"responsible": {"name": "Maria Silva"}}
```

Somente `responsible` e seu `name` são obrigatórios. As seções opcionais são:

| Seção | Campos |
|---|---|
| `responsible` | `name`, `age`, `socialName`, `birthSexId`, `racialIdentityId`, `birthDate`, `genderIdentityId`, `sexualOrientationId`, `maritalStatusId`, `documentType`, `documentNumber`, `cpf`, `phone`, `birthplace`, `nationality`, `nis`, `educationId`, `schoolTypeId`, `email`, `voterRegistration` |
| `address` | `street`, `number`, `zipCode`, `city`, `state`, `neighborhood`, `complement` |
| `housing` | `type`, `roomCount`, `landlordName`, `landlordPhone`, `monthsInCommunity`, `monthsAtAddress`, `pipedWater`, `electricity`, `sewage`, `residentCount` |
| `workAndBenefits` | `works`, `occupation`, `receivesBenefit`, `benefit`, `minhaCasaMinhaVidaRegistered` |
| `health` | `hasDisability`, `disabilityDescription`, `continuousMedication`, `medications`, `medicalCertificatePresented`, `allergies` |
| `members[]` | `id`, `name`, `documentType`, `documentNumber`, `age`, `birthDate`, `kinship`, `income`, `isResponsible` |
| `authorizations` | `imageAndSound`, `personalData` |
| `declaration` | `location`, `date`, `responsibleSignatureName`, `registrarSignatureName` |

`referenceDate` fica na raiz. O padrão na criação é a data atual em
`America/Fortaleza`; na edição, omitir preserva a data de referência anterior.
Idades calculadas referem-se a essa data, não mudam com o passar do tempo.
`birthDate` substitui a necessidade de informar idade; se ambas forem enviadas,
a idade precisa corresponder. Sem nascimento, `age` aceita inteiro não negativo.
Nascimento não pode ser posterior à data de referência.

`housing.type`: `PROPRIA`, `ALUGADA`, `CEDIDA`, `FINANCIADA`.
`responsible.documentType`: `RG` ou `CIN`; CPF vai no campo próprio.
`members[].documentType`: `CPF` ou `CIN`. Ao informar número, enviar também o tipo.
RG/CIN são texto; CPF tem validação dos dígitos verificadores.
`state` usa sigla de uma UF brasileira. Tempos de residência são meses inteiros.
Booleanos opcionais distinguem `null`/não informado, `false` e `true`.

### Integrantes e renda

```json
{
  "referenceDate": "2026-01-01",
  "responsible": {"name": "Maria Silva", "birthDate": "1986-01-01"},
  "members": [
    {"name": "Maria Silva", "isResponsible": true, "income": 1000.10},
    {"name": "Filho", "age": 10, "kinship": "Filho", "income": 0},
    {"name": "Filha", "kinship": "Filha", "income": 0}
  ],
  "authorizations": {"imageAndSound": false, "personalData": true},
  "declaration": {
    "location": "Fortaleza",
    "date": "2026-01-01",
    "responsibleSignatureName": "Maria Silva",
    "registrarSignatureName": "Operador"
  }
}
```

Cada integrante precisa de nome. Se a lista não for vazia, exatamente um item deve
ter `isResponsible: true`; nome, nascimento, idade e documentos conhecidos devem
corresponder à identificação principal. Documentos repetidos na lista são rejeitados.
A lista vazia ou omitida é aceita. CPF não é único entre levantamentos: a mesma
família pode ser pesquisada novamente.

A resposta atribui UUID a cada integrante. No PUT, manter os UUIDs dos integrantes
existentes, omitir `id` para novos e omitir da lista os integrantes removidos.
IDs repetidos ou de outro cadastro são rejeitados. PUT substitui todas as seções:
campos opcionais omitidos são removidos, exceto a data de referência.

A resposta inclui `financialSummary`, calculado exclusivamente pelo servidor:

```json
{
  "memberCount": 3,
  "incomeComplete": true,
  "totalIncome": 1000.10,
  "perCapitaIncome": 333.37
}
```

Lista vazia ou alguma renda não informada resulta em `incomeComplete: false`,
`totalIncome: null` e `perCapitaIncome: null`. Renda zero precisa ser explícita.
O responsável conta uma vez, como integrante da lista. `housing.residentCount`
é uma informação independente e não entra na divisão. Arredondamento: duas casas,
`HALF_UP`. O resumo é somente leitura; não deve ser enviado no cadastro.

### Condicionais e declaração

Detalhes preenchidos exigem a condição correspondente:

- `landlordName`/`landlordPhone`: moradia `ALUGADA`.
- `occupation`: `works: true`.
- `benefit`: `receivesBenefit: true`.
- `disabilityDescription`: `hasDisability: true`.
- `medications`: `continuousMedication: true`.

Detalhes continuam opcionais quando habilitados. Incoerência retorna 400 sem
salvar parcialmente. As duas autorizações são independentes; não são exigidas
respostas positivas para salvar. Assinaturas são nomes digitados, sem upload ou
certificação digital. `createdBy` identifica o usuário autenticado criador;
a auditoria registra também quem altera.

## Formatos e erros

CPF, NIS, CNS, telefone e CEP são normalizados para dígitos; CPF/CEP/telefone
aceitam suas máscaras. Letras em campos numéricos são rejeitadas. RG preserva
letras e pontuação; textos têm espaços nas pontas removidos. NIS/CNS têm limite
normalizado de 20 dígitos, sem verificação específica de dígitos verificadores.
Datas usam `YYYY-MM-DD`. Valores monetários são números JSON não negativos,
com até dez dígitos inteiros e duas casas decimais; limite por campo `9999999999.99`.

Exemplo de erro:

```json
{
  "status": 400,
  "code": "BAD_REQUEST",
  "message": "Informe um CPF válido.",
  "fields": {"responsible.cpf": "Informe um CPF válido."},
  "path": "/api/v1/population-surveys"
}
```

A resposta também inclui `timestamp`. Caminhos aninhados usam, por exemplo,
`members[0].income` e `relatives[0].cpf`. JSON inválido retorna 400; documento
conflitante no cadastro de aluno retorna 409; UUID de cadastro inexistente retorna
404. Edições falhas preservam a versão salva anteriormente.

## Catálogos e operação

Consultar `GET /catalogs?category=...`; usar somente itens `active: true` no front.
Referências enviadas são verificadas quanto à categoria e à situação ativa.

Categorias adicionais: `SEXO_NASCIMENTO`, `IDENTIFICACAO_RACIAL`, `GENERO`,
`ORIENTACAO_SEXUAL`, `ESTADO_CIVIL`, `TIPO_ESCOLA`. Elas começam sem opções:
a organização deve cadastrar as alternativas aprovadas. Escolaridade reutiliza
`ESCOLARIDADE`; saneamento do aluno usa `AGUA`, `ESGOTO`, `COLETA_LIXO`, também
administráveis. Não foram inventadas opções ausentes no documento.

Flyway aplica V3 (opções conhecidas), V4 (levantamentos/integrantes), V5 (estrutura
legada de status no levantamento) e V6 (rascunhos privados dos dois formulários)
sobre V1/V2. O fluxo novo de rascunhos usa `form_draft`, sem flexibilizar as
restrições das tabelas de cadastros concluídos.
As seções do levantamento são armazenadas em JSONB tipado pelos DTOs; integrantes
possuem linhas e UUIDs próprios. Nome/CPF do responsável têm colunas para consulta.
Validações de catálogo das seções JSONB são realizadas pelo serviço.
Auditoria registra usuário, ação e cadastro, sem copiar informações de saúde
ou documentos para o evento.

Antes de atualizar um ambiente existente, fazer backup do PostgreSQL. Aplicar
as migrations antes de disponibilizar a nova API. Em produção, configurar HTTPS,
certificado/chave para SSL direto ou terminação HTTPS no proxy, segredos JWT e
credenciais fora do repositório. `SSL_ENABLED=false` só deve ser usado quando o
proxy já fornece HTTPS e a API está em rede privada. Não usar credenciais locais
em produção. O Swagger permanece desabilitado no perfil de produção.

Teste: `mvn -q test` em `backend`, com Java 21 e acesso ao Docker para Testcontainers.

## Divisão e limites

Pessoa 1: aluno, validações/erros compartilhados, permissões, Swagger e V3.
Pessoa 2: módulo population, regras de idade/renda/integrantes, auditoria e V4.

O backend oferece o fluxo de rascunhos e conclusão descrito acima, integrado ao
autosave do frontend. Não há exclusão de cadastros concluídos,
PDF, consulta externa de CEP, assinatura em imagem ou histórico completo de
valores anteriores. A interface deve preservar os dados preenchidos e confirmar
ações de limpeza.
