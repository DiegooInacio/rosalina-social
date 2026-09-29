# Especificação de Requisitos dos Formulários Web

## 1. Objetivo

Este documento apresenta os requisitos para implementação de dois formulários web:

1. Ficha de Cadastro de Aluno
2. Levantamento Populacional da Comunidade Rosalina

Os requisitos foram elaborados a partir dos campos existentes nos formulários fornecidos.

Além dos requisitos diretamente derivados dos formulários, são apresentados requisitos complementares de validação, comportamento e qualidade necessários para implementação dos formulários em ambiente web.

Os requisitos complementares que não aparecem explicitamente nos formulários são identificados como **propostos**.

---

# 2. Convenções

Os requisitos foram classificados em:

- **RF** — Requisito Funcional
- **RN** — Regra de Negócio
- **RNF** — Requisito Não Funcional

Cada requisito funcional possui, quando aplicável:

- Identificador
- Nome
- Descrição
- Ator
- Pré-condições
- Entradas
- Fluxo principal
- Fluxos alternativos e exceções
- Pós-condições
- Prioridade
- Critérios de aceitação

> **Observação:** os formulários não identificam quem poderá utilizá-los. Por isso, neste documento será utilizado o ator genérico **Usuário responsável pelo cadastro**.

---

# 3. Requisitos Funcionais

# 3.1 Formulário de Cadastro de Aluno

## RF01 — Cadastrar dados do aluno

**Descrição:**  
O sistema deverá permitir o preenchimento e registro dos dados de identificação do aluno.

**Ator:**  
Usuário responsável pelo cadastro.

**Pré-condição:**  
O formulário de cadastro de aluno deve estar disponível para preenchimento.

**Entradas:**

- Status
- Nome
- Atividade matriculada
- Data de nascimento
- RG
- CPF
- Indicação de Cadastro Único
- NIS
- Cartão Nacional de Saúde
- Endereço
- Bairro
- Ponto de referência
- Cidade
- CEP
- Data de início
- Telefone do responsável
- E-mail do responsável
- Telefone do aluno
- E-mail do aluno

**Fluxo principal:**

1. O usuário acessa o formulário de cadastro de aluno.
2. O sistema apresenta os campos de identificação do aluno.
3. O usuário informa os dados disponíveis.
4. O sistema verifica os formatos dos campos que possuem regras de validação.
5. Os dados permanecem disponíveis para conclusão do cadastro.

**Fluxos alternativos e exceções:**

- Caso um campo possua formato inválido, o sistema deverá informar o problema ao usuário.
- Caso um campo definido como obrigatório não seja preenchido, o sistema deverá informar que o preenchimento é necessário.
- Caso existam erros de preenchimento, o sistema não deverá concluir o envio enquanto os erros obrigatórios não forem corrigidos.

**Pós-condição:**  
Os dados informados deverão compor o cadastro do aluno.

**Prioridade proposta:** Alta.

**Critérios de aceitação:**

- O usuário deve conseguir preencher os campos existentes na seção de identificação do aluno.
- Os campos com opções predefinidas devem apresentar apenas as alternativas permitidas.
- Campos com formato definido devem ser validados antes da conclusão do cadastro.

---

## RF02 — Definir status do aluno

**Descrição:**  
O sistema deverá permitir informar a situação atual do aluno.

**Entrada:**

- Ativo
- Inativo

**Regra associada:**  
O aluno deverá possuir apenas um status por vez.

**Critério de aceitação:**  
O sistema deverá permitir selecionar uma das opções disponíveis e armazenar a opção selecionada.

---

## RF03 — Registrar informações familiares do aluno

**Descrição:**  
O sistema deverá permitir registrar informações referentes ao pai, mãe e responsável pelo aluno.

**Ator:**  
Usuário responsável pelo cadastro.

**Pré-condição:**  
O formulário de cadastro de aluno deve estar em preenchimento.

**Dados do pai:**

- Nome
- Data de nascimento
- Ocupação
- Sabe ler e escrever
- Escolaridade
- Telefone
- RG
- CPF
- Título de eleitor

**Dados da mãe:**

- Nome
- Data de nascimento
- Ocupação
- Sabe ler e escrever
- Escolaridade
- Telefone
- RG
- CPF
- Título de eleitor

**Dados do responsável:**

- Grau de parentesco
- Nome
- Data de nascimento
- Ocupação
- Sabe ler e escrever
- Escolaridade
- Telefone
- RG
- CPF
- Título de eleitor

**Fluxo principal:**

1. O sistema apresenta as seções referentes ao pai, à mãe e ao responsável.
2. O usuário preenche os dados correspondentes.
3. O usuário seleciona as opções de ocupação e escolaridade quando aplicável.
4. O sistema valida os campos que possuam formato definido.
5. Os dados são associados ao cadastro do aluno.

**Pós-condição:**  
As informações familiares ficam vinculadas ao aluno cadastrado.

**Critérios de aceitação:**

- O sistema deverá apresentar separadamente os dados de pai, mãe e responsável.
- O sistema deverá permitir indicar se cada pessoa sabe ler e escrever.
- As opções de ocupação e escolaridade deverão respeitar as alternativas definidas no formulário.

---

## RF04 — Registrar situação familiar dos pais

**Descrição:**  
O sistema deverá permitir registrar a situação dos pais do aluno.

**Opções disponíveis:**

- Casados
- Solteiros
- Divorciados
- União estável
- Mãe viúva
- Pai viúvo
- Falecidos

**Critério de aceitação:**  
O usuário deverá conseguir selecionar uma das situações previstas no formulário.

---

## RF05 — Registrar informações socioeconômicas do aluno

**Descrição:**  
O sistema deverá permitir registrar as condições socioeconômicas da família do aluno.

**Entradas relacionadas à moradia:**

- Tipo de moradia
- Forma de aquisição
- Tipo de vedação
- Tipo de piso
- Disponibilidade de energia elétrica

**Entradas relacionadas ao saneamento:**

- Água
- Esgoto
- Coleta de lixo

**Entradas relacionadas aos gastos mensais:**

- Água
- Luz
- Telefone
- Aluguel ou financiamento
- Alimentação

**Outras entradas:**

- Renda familiar
- Existência de outros bens patrimoniais
- Outro imóvel
- Veículo
- Bolsa Família
- Benefício de Prestação Continuada
- Aposentadoria ou equivalente

**Fluxo principal:**

1. O usuário acessa a seção socioeconômica.
2. O sistema apresenta as opções relacionadas à moradia.
3. O usuário registra informações de infraestrutura.
4. O usuário informa os gastos mensais.
5. O usuário informa a renda familiar.
6. O usuário registra patrimônio e benefícios existentes.
7. O sistema valida valores numéricos e monetários quando aplicável.

**Fluxo alternativo proposto:**

Caso o usuário informe que não possui outros bens patrimoniais, os campos referentes a outro imóvel e veículo poderão ser ocultados ou desabilitados.

**Pós-condição:**  
As informações socioeconômicas ficam associadas ao cadastro do aluno.

**Critérios de aceitação:**

- Valores monetários deverão aceitar valores numéricos válidos.
- O usuário deverá conseguir informar todos os tipos de gastos existentes no formulário.
- Benefícios sociais deverão poder ser selecionados independentemente uns dos outros.

---

# 3.2 Formulário de Levantamento Populacional

## RF06 — Cadastrar responsável familiar

**Descrição:**  
O sistema deverá permitir registrar os dados pessoais e documentais do responsável familiar.

**Ator:**  
Usuário responsável pelo cadastro.

**Entradas:**

- Nome
- Idade
- Nome social
- Sexo atribuído ao nascimento
- Identificação racial
- Data de nascimento
- Identificação de gênero
- Orientação sexual
- Estado civil
- RG ou CIN
- CPF
- Telefone
- Naturalidade
- Nacionalidade
- NIS
- Escolaridade
- Tipo de escola
- E-mail
- Título eleitoral

**Fluxo principal:**

1. O usuário acessa o formulário de levantamento populacional.
2. O sistema apresenta os campos de identificação do responsável familiar.
3. O usuário preenche os dados.
4. O usuário seleciona as alternativas existentes nos campos de escolha.
5. O sistema verifica os campos que possuem formato específico.
6. Os dados passam a compor o cadastro familiar.

**Fluxos alternativos e exceções:**

- Campos com formato inválido deverão apresentar mensagem de erro.
- Campos contendo alternativas predefinidas não deverão aceitar valores fora das opções disponibilizadas, exceto quando existir opção aberta correspondente.

**Pós-condição:**  
O responsável familiar estará identificado no levantamento.

**Prioridade proposta:** Alta.

**Critérios de aceitação:**

- Todos os campos existentes no formulário original devem estar disponíveis na interface.
- Os campos de seleção devem respeitar as opções definidas.
- O preenchimento inválido de CPF, e-mail, telefone ou outros campos validados deverá ser informado ao usuário.

---

## RF07 — Cadastrar endereço do responsável familiar

**Descrição:**  
O sistema deverá permitir registrar o endereço residencial do responsável familiar.

**Entradas:**

- Rua
- Número
- CEP
- Cidade
- UF
- Bairro
- Complemento

**Fluxo principal:**

1. O usuário informa o CEP e os demais dados do endereço.
2. O sistema valida os campos que possuam formato específico.
3. O endereço é associado ao cadastro familiar.

**Comportamento proposto:**  
O sistema poderá utilizar o CEP para preencher automaticamente informações de endereço, caso futuramente seja integrada uma fonte externa de consulta.

**Critério de aceitação:**  
O sistema deverá permitir registrar todos os componentes de endereço previstos no formulário.

---

## RF08 — Registrar informações da moradia

**Descrição:**  
O sistema deverá permitir registrar informações relacionadas à residência da família.

**Entradas:**

- Tipo de moradia
- Quantidade de compartimentos
- Nome do proprietário do aluguel
- Telefone do proprietário
- Tempo de moradia na comunidade
- Tempo de moradia no endereço
- Água encanada/CAGECE
- Energia
- Esgoto
- Quantidade de pessoas residentes

**Tipos de moradia disponíveis:**

- Própria
- Alugada
- Cedida
- Financiada

**Fluxo principal:**

1. O usuário informa o tipo de moradia.
2. O usuário informa a quantidade de compartimentos.
3. O usuário informa o tempo de residência.
4. O usuário registra as condições de infraestrutura.
5. O usuário informa a quantidade de pessoas residentes.

**Fluxo alternativo proposto:**

Caso seja selecionada a opção **Alugada**, o sistema deverá disponibilizar os campos referentes ao nome e telefone do proprietário.

Para os demais tipos de moradia, esses campos poderão permanecer ocultos ou não obrigatórios.

**Critérios de aceitação:**

- O tipo de moradia deverá ser selecionado entre as opções existentes.
- A quantidade de compartimentos e de moradores deverá aceitar apenas valores compatíveis com quantidades.
- As informações sobre infraestrutura deverão possuir controles apropriados para respostas do tipo Sim/Não.

---

## RF09 — Registrar informações profissionais e benefícios

**Descrição:**  
O sistema deverá permitir registrar informações sobre trabalho, benefícios e cadastro habitacional do responsável familiar.

**Entradas:**

- Trabalha
- Em que trabalha
- Recebe algum benefício
- Qual benefício
- Cadastro no Minha Casa, Minha Vida

**Fluxo principal:**

1. O usuário informa se o responsável trabalha.
2. Caso positivo, informa a atividade profissional.
3. O usuário informa se recebe algum benefício.
4. Caso positivo, informa o benefício recebido.
5. O usuário informa se possui cadastro no Minha Casa, Minha Vida.

**Fluxos condicionais propostos:**

- O campo **Em que trabalha** poderá ser habilitado apenas quando a resposta para **Trabalha** for positiva.
- O campo **Qual benefício** poderá ser habilitado apenas quando a resposta para **Recebe algum benefício** for positiva.

**Critério de aceitação:**  
As informações adicionais deverão estar relacionadas à resposta que as habilitou.

---

## RF10 — Registrar informações de saúde

**Descrição:**  
O sistema deverá permitir registrar informações de saúde previstas no formulário.

**Entradas:**

- Possui deficiência ou necessidade especial
- Qual deficiência ou necessidade especial
- Faz uso contínuo de medicamentos
- Quais medicamentos
- Apresenta atestado médico
- Possui alergia

**Fluxo principal:**

1. O usuário informa se existe deficiência ou necessidade especial.
2. Quando aplicável, informa qual.
3. O usuário informa se existe uso contínuo de medicamentos.
4. Quando aplicável, informa quais medicamentos.
5. O usuário informa se foi apresentado atestado médico.
6. O usuário registra eventual alergia.

**Fluxos condicionais propostos:**

- O campo que especifica a deficiência deverá ser utilizado quando houver resposta positiva.
- O campo que especifica os medicamentos deverá ser utilizado quando houver resposta positiva.

**Pós-condição:**  
As informações de saúde ficam associadas ao levantamento familiar.

**Critério de aceitação:**  
O usuário deverá conseguir registrar todas as informações de saúde presentes no formulário.

---

## RF11 — Gerenciar integrantes da família

**Descrição:**  
O sistema deverá permitir registrar uma quantidade variável de integrantes da família.

**Ator:**  
Usuário responsável pelo cadastro.

**Dados de cada integrante:**

- Nome completo
- CPF ou CIN
- Idade
- Data de nascimento
- Parentesco
- Renda

**Fluxo principal:**

1. O sistema apresenta uma área destinada aos integrantes familiares.
2. O usuário seleciona a opção para adicionar integrante.
3. O sistema disponibiliza os campos do novo integrante.
4. O usuário preenche os dados.
5. O usuário poderá repetir o procedimento para outros integrantes.
6. Os integrantes são associados ao mesmo cadastro familiar.

**Fluxo alternativo:**

1. O usuário seleciona um integrante previamente adicionado.
2. Solicita sua remoção.
3. O sistema remove o integrante da composição familiar antes da conclusão do cadastro.

**Pós-condição:**  
A composição familiar deverá refletir os integrantes informados pelo usuário.

**Prioridade proposta:** Alta.

**Critérios de aceitação:**

- Deve ser possível adicionar mais de um integrante.
- Cada integrante deverá possuir seus próprios campos.
- A remoção de um integrante não deverá remover os demais.
- Os dados de um integrante não deverão sobrescrever os dados de outro.

---

## RF12 — Apresentar resumo financeiro familiar

**Descrição:**  
O sistema deverá registrar ou apresentar as informações consolidadas referentes à renda familiar.

**Informações:**

- Total da renda
- Número de integrantes
- Renda per capita mensal

**Comportamento proposto:**

O sistema deverá calcular automaticamente o número de integrantes cadastrados.

O sistema poderá calcular automaticamente o total da renda familiar a partir das rendas registradas para os integrantes.

O sistema deverá calcular a renda per capita utilizando:

`Renda per capita = Total da renda familiar / Número de integrantes`

**Fluxo principal proposto:**

1. O usuário registra os integrantes e suas rendas.
2. O sistema contabiliza os integrantes.
3. O sistema obtém o total da renda.
4. O sistema calcula a renda per capita.
5. O sistema apresenta o resumo financeiro.

**Exceção:**

Caso não exista nenhum integrante válido para o cálculo, o sistema não deverá executar divisão por zero.

**Critérios de aceitação:**

- O número de integrantes deverá corresponder aos integrantes considerados no cálculo.
- A renda per capita deverá ser atualizada quando houver alteração relevante nos dados financeiros.
- O sistema não deverá apresentar valores matematicamente inválidos.

> **Observação:** o formulário original possui os campos de total da renda, número de integrantes e renda per capita, mas não especifica que os valores devam ser calculados automaticamente. A automação é uma proposta de implementação.

---

## RF13 — Registrar autorizações

**Descrição:**  
O sistema deverá permitir registrar as autorizações existentes no levantamento populacional.

**Autorizações:**

- Uso de imagem e som
- Tratamento de dados pessoais

**Fluxo principal:**

1. O sistema apresenta cada autorização separadamente.
2. O usuário registra a resposta correspondente.
3. O sistema mantém a resposta associada ao cadastro.

**Regra associada:**  
Uma autorização não deverá determinar automaticamente a resposta da outra.

**Critério de aceitação:**  
O sistema deverá registrar separadamente as respostas referentes às duas autorizações.

---

## RF14 — Registrar declaração e assinaturas

**Descrição:**  
O sistema deverá permitir registrar os dados referentes à declaração final do levantamento.

**Entradas:**

- Local
- Dia
- Mês
- Ano
- Assinatura do responsável
- Assinatura do responsável pelo cadastro

**Critério de aceitação:**  
Os dados da declaração deverão ser associados ao respectivo levantamento familiar.

> **Observação:** o formulário não define se a assinatura será digitada, desenhada, realizada digitalmente ou enviada como imagem. Esse comportamento deverá ser definido pela equipe antes da implementação.

---

# 3.3 Requisitos Funcionais Gerais

## RF15 — Validar formulário

**Descrição:**  
O sistema deverá verificar a validade dos dados informados antes da conclusão do formulário.

**Comportamento proposto:**

1. O usuário solicita o envio ou salvamento.
2. O sistema analisa os campos.
3. Caso existam erros, os campos correspondentes são identificados.
4. O sistema apresenta mensagens indicando os problemas encontrados.
5. O envio somente é concluído após a correção dos erros considerados impeditivos.

**Critérios de aceitação:**

- A mensagem deverá permitir identificar qual campo possui problema.
- Dados inválidos não deverão ser aceitos silenciosamente.
- Dados já preenchidos corretamente não deverão ser apagados devido ao erro de outro campo.

---

## RF16 — Salvar formulário

**Descrição:**  
O sistema deverá permitir concluir o preenchimento e registrar os dados do formulário.

**Pré-condições propostas:**

- O formulário deve estar disponível.
- Os campos obrigatórios definidos pela equipe devem estar preenchidos.
- Não devem existir erros impeditivos de validação.

**Fluxo principal:**

1. O usuário preenche o formulário.
2. Solicita o salvamento.
3. O sistema executa as validações.
4. O sistema registra os dados.
5. O sistema informa que a operação foi concluída.

**Fluxo de exceção:**

Caso ocorra uma falha durante o registro, o sistema deverá informar que a operação não foi concluída.

**Pós-condição:**  
O cadastro deverá estar registrado no sistema.

---

## RF17 — Editar dados antes da conclusão

**Descrição:**  
O sistema deverá permitir alterar os valores informados durante o preenchimento do formulário.

**Critérios de aceitação:**

- O usuário poderá retornar a campos previamente preenchidos.
- A alteração de um campo deverá substituir somente o valor correspondente.
- Alterações em campos condicionais deverão atualizar os campos relacionados.

---

## RF18 — Cancelar ou limpar preenchimento

**Descrição proposta:**  
O sistema deverá permitir abandonar ou limpar um formulário em preenchimento.

**Comportamento recomendado:**  
Caso existam informações já preenchidas, o sistema deverá solicitar confirmação antes de descartá-las.

**Critério de aceitação:**  
O usuário não deverá perder acidentalmente todo o conteúdo devido a uma ação de limpeza sem confirmação.

---

# 4. Regras de Negócio

## RN01 — Status do aluno

O status do aluno deverá assumir uma das opções:

- Ativo
- Inativo

---

## RN02 — Ocupação dos familiares

A ocupação de pai, mãe ou responsável deverá utilizar uma das classificações disponíveis no formulário:

- CTPS
- Autônomo
- Desempregado
- Informal
- Aposentado
- Pensionista

---

## RN03 — Escolaridade dos familiares

A escolaridade deverá utilizar as opções:

- Sem escolaridade
- Fundamental Completo
- Fundamental Incompleto
- Médio Completo
- Médio Incompleto
- Superior
- Pós-superior
- Técnico

---

## RN04 — Situação dos pais

A situação dos pais deverá utilizar uma das opções:

- Casados
- Solteiros
- Divorciados
- União estável
- Mãe viúva
- Pai viúvo
- Falecidos

---

## RN05 — Tipo de moradia do aluno

O tipo de moradia deverá utilizar:

- Casa
- Apartamento
- Cômodo
- Outros

---

## RN06 — Forma de aquisição da moradia

A forma de aquisição deverá utilizar:

- Própria
- Alugada
- Cedida
- Ocupação
- Doada
- Financiamento
- Outros

---

## RN07 — Tipo de vedação

O tipo de vedação deverá utilizar:

- Alvenaria
- Madeira
- Taipa
- Lona
- Outros

---

## RN08 — Tipo de piso

O tipo de piso deverá utilizar:

- Cerâmica
- Cimento
- Tijolo
- Terra batida

---

## RN09 — Tipo de moradia do levantamento populacional

No levantamento populacional, a situação da moradia deverá utilizar:

- Própria
- Alugada
- Cedida
- Financiada

---

## RN10 — Informações do proprietário

**Regra proposta:**  
Os dados do proprietário do imóvel deverão ser solicitados quando a residência for informada como alugada.

---

## RN11 — Informação de trabalho

**Regra proposta:**  
Quando o responsável informar que trabalha, o sistema deverá permitir especificar em que trabalha.

---

## RN12 — Informação de benefício

**Regra proposta:**  
Quando o responsável informar que recebe benefício, o sistema deverá permitir informar qual benefício recebe.

---

## RN13 — Deficiência ou necessidade especial

**Regra proposta:**  
Quando for registrada existência de deficiência ou necessidade especial, o sistema deverá permitir sua especificação.

---

## RN14 — Medicamentos de uso contínuo

**Regra proposta:**  
Quando houver uso contínuo de medicamentos, o sistema deverá permitir informar quais medicamentos são utilizados.

---

## RN15 — Integrantes da família

Um cadastro familiar poderá possuir múltiplos integrantes.

Cada integrante deverá possuir seu próprio conjunto de informações.

---

## RN16 — Renda per capita

**Regra proposta:**  
Caso o cálculo seja automatizado, a renda per capita mensal deverá corresponder ao total da renda familiar dividido pelo número de integrantes considerado no cálculo.

---

## RN17 — Autorizações independentes

A autorização para uso de imagem e som e a autorização para tratamento de dados deverão ser tratadas como decisões independentes.

---

# 5. Regras de Validação

As validações abaixo são propostas para a versão web.

## RV01 — CPF

O campo CPF deverá aceitar somente valores em formato compatível com CPF.

Recomenda-se também validar os dígitos verificadores.

---

## RV02 — CEP

O CEP deverá aceitar formato compatível com CEP brasileiro.

Exemplo:

`60744-390`

---

## RV03 — E-mail

Campos de e-mail deverão aceitar apenas valores em formato válido de endereço eletrônico.

---

## RV04 — Telefone

Campos de telefone deverão aceitar números de telefone em formato compatível com os utilizados no sistema.

A interface poderá aplicar máscara durante o preenchimento.

---

## RV05 — Datas

Campos de data deverão impedir datas estruturalmente inválidas.

Exemplos de valores inválidos:

- 31/02/2026
- 40/15/2026

---

## RV06 — Idade

Campos de idade deverão aceitar apenas números inteiros não negativos.

---

## RV07 — Quantidade de pessoas

A quantidade de pessoas residentes deverá aceitar apenas números inteiros compatíveis com quantidade de indivíduos.

---

## RV08 — Quantidade de compartimentos

O número de compartimentos deverá aceitar apenas valores inteiros não negativos.

---

## RV09 — Valores monetários

Campos referentes a:

- Renda
- Água
- Luz
- Telefone
- Aluguel
- Financiamento
- Alimentação

deverão aceitar valores monetários válidos.

---

## RV10 — Campos condicionais

Campos dependentes de uma resposta anterior deverão possuir comportamento coerente.

Exemplos:

- Trabalha → Em que trabalha
- Recebe benefício → Qual benefício
- Possui deficiência → Qual
- Usa medicamentos continuamente → Quais
- Moradia alugada → Dados do proprietário

---

# 6. Requisitos Não Funcionais

Os requisitos desta seção são **propostos**, pois os formulários fornecidos descrevem principalmente dados e não características técnicas do sistema.

## RNF01 — Usabilidade

O sistema deverá organizar os campos em seções relacionadas ao assunto, evitando apresentar todos os campos de forma desorganizada em uma única área.

Exemplos de seções:

- Identificação
- Endereço
- Família
- Moradia
- Situação socioeconômica
- Saúde
- Autorizações

---

## RNF02 — Responsividade

O formulário deverá ser utilizável em diferentes tamanhos de tela, incluindo computadores e dispositivos móveis.

---

## RNF03 — Feedback de validação

Mensagens de erro deverão ser apresentadas próximas ao campo relacionado ao problema sempre que possível.

As mensagens deverão informar claramente o motivo do erro.

Exemplo:

`Informe um CPF válido.`

em vez de:

`Erro no campo.`

---

## RNF04 — Preservação do preenchimento

Quando houver erro de validação em determinado campo, os demais dados preenchidos corretamente não deverão ser apagados.

---

## RNF05 — Segurança das informações

O sistema deverá adotar mecanismos adequados para evitar acesso não autorizado às informações cadastradas.

Esse requisito é especialmente relevante devido à presença de dados pessoais, documentais e informações de saúde nos formulários.

---

## RNF06 — Proteção de dados durante transmissão

Caso os formulários sejam enviados por rede, a comunicação deverá utilizar conexão segura.

---

## RNF07 — Controle de acesso

**Requisito proposto, caso exista autenticação no sistema.**

Somente usuários autorizados deverão conseguir visualizar ou alterar os dados dos formulários.

Os perfis de acesso deverão ser definidos pela equipe de projeto.

---

## RNF08 — Consistência visual

Campos com funções equivalentes deverão utilizar os mesmos componentes visuais.

Exemplos:

- Campos Sim/Não deverão possuir padrão visual semelhante
- Campos de data deverão possuir o mesmo formato
- Campos monetários deverão possuir o mesmo padrão
- Mensagens de erro deverão possuir padrão consistente

---

## RNF09 — Acessibilidade

A interface deverá permitir a identificação dos campos por meio de rótulos visíveis.

Campos obrigatórios, caso existam, deverão possuir indicação compreensível.

A navegação pelo formulário deverá possuir ordem lógica.

---

## RNF10 — Compatibilidade

O formulário deverá funcionar nos navegadores definidos como suportados pelo projeto.

> A lista de navegadores e versões ainda deverá ser definida pela equipe.

---

# 7. Questões que ainda precisam ser definidas pela equipe

Os formulários originais não possuem informações suficientes para definir os seguintes aspectos:

1. Quais campos são obrigatórios
2. Quem poderá preencher os formulários
3. Quem poderá consultar os cadastros
4. Quem poderá editar cadastros já concluídos
5. Se haverá autenticação
6. Se haverá diferentes níveis de acesso
7. Se será permitido excluir cadastros
8. Se haverá salvamento de formulário incompleto
9. Como as assinaturas serão realizadas
10. Se idade será digitada ou calculada automaticamente pela data de nascimento
11. Se o total da renda será digitado ou calculado
12. Se o número de integrantes será digitado ou calculado
13. Quais integrantes entram no cálculo de renda per capita
14. Quais campos deverão ser obrigatórios
15. Se haverá impressão ou geração de PDF
16. Se haverá histórico de alterações

Esses itens não devem ser definidos apenas com base nos campos dos formulários e precisam ser discutidos com a equipe ou com a organização responsável.

---

# 8. Resumo dos Requisitos Funcionais

| ID | Requisito |
|---|---|
| RF01 | Cadastrar dados do aluno |
| RF02 | Definir status do aluno |
| RF03 | Registrar informações familiares do aluno |
| RF04 | Registrar situação familiar dos pais |
| RF05 | Registrar informações socioeconômicas do aluno |
| RF06 | Cadastrar responsável familiar |
| RF07 | Cadastrar endereço do responsável familiar |
| RF08 | Registrar informações da moradia |
| RF09 | Registrar informações profissionais e benefícios |
| RF10 | Registrar informações de saúde |
| RF11 | Gerenciar integrantes da família |
| RF12 | Apresentar resumo financeiro familiar |
| RF13 | Registrar autorizações |
| RF14 | Registrar declaração e assinaturas |
| RF15 | Validar formulário |
| RF16 | Salvar formulário |
| RF17 | Editar dados antes da conclusão |
| RF18 | Cancelar ou limpar preenchimento |

---

# 9. Observação Final

Os requisitos RF01 a RF14 foram derivados principalmente da estrutura e dos campos existentes nos formulários originais.

Os requisitos RF15 a RF18, as regras de validação e os requisitos não funcionais representam propostas para transformar os formulários originais em formulários web utilizáveis.

Os pontos relacionados a obrigatoriedade de campos, autenticação, permissões, exclusão, edição posterior, armazenamento, assinatura digital e geração de documentos deverão ser definidos durante o levantamento de requisitos com os responsáveis pelo sistema.
