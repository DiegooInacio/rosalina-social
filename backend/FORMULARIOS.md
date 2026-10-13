# Contrato dos formulários

A API usa `/api/v1`, autenticação `Authorization: Bearer <accessToken>` e JSON.
`ADMIN` e `OPERADOR` podem cadastrar, consultar e editar os dois formulários.
Ambos podem consultar catálogos; somente `ADMIN` pode administrá-los e administrar usuários.

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

Flyway aplica V3 (opções conhecidas) e V4 (levantamentos/integrantes) sobre V1/V2.
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

Não há frontend novo, fluxo de rascunhos/conclusão, exclusão, PDF, consulta externa
de CEP, assinatura em imagem ou histórico completo de valores anteriores.
A interface deve preservar os dados preenchidos e confirmar ações de limpeza.
