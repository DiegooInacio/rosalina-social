# Revisão de privacidade e LGPD — Rosalina Social

Revisão e consulta às fontes: **11/11/2026**. Escopo: código React/TypeScript,
Java/Spring Boot, migrations PostgreSQL, testes e documentação de implantação.
Não foram consultados registros reais, credenciais, painel Heroku, contratos ou
backups de produção. Não foram encontrados `AGENTS.md` no projeto ou nas pastas
ancestrais examinadas; `.agents`, `.codex` e `.aws` estavam vazias.

**Resultado:** há controles de autenticação e isolamento de rascunhos, mas faltam
decisões institucionais e evidências para concluir pela adequação. A resposta
“Não autorizo” ainda não governa a coleta ou o armazenamento. As alterações desta
revisão reduzem riscos técnicos; não tornam esse fluxo juridicamente resolvido.

## Critério e fontes primárias

Neste relatório, **obrigação** significa comando legal/regulamentar;
**orientação** significa recomendação de guia da ANPD; **interpretação** é a
aplicação proposta ao projeto, sujeita aos fatos e à validação jurídica.
**Constatação** é comportamento verificável no repositório.

Todas as fontes abaixo foram consultadas em **11/11/2026**. Datas de atos e de
publicação são diferentes da data de consulta. A agenda regulatória não foi
tratada como norma já aprovada.

| Ref. | Fonte, data e natureza | Aplicação à revisão |
| --- | --- | --- |
| R1 | [LGPD, Lei 13.709, de 14/08/2018, texto consolidado no Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm). Obrigação legal. | Arts. 5º–11, 14–19, 33, 37–41 e 46–50: princípios, hipóteses legais, transparência, direitos, registros e segurança. |
| R2 | [Enunciado CD/ANPD 1, de 22/05/2023, publicado em 24/05/2023](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes/Enunciado1ANPD.pdf). Interpretação oficial. | Admite hipóteses dos arts. 7º ou 11 para crianças/adolescentes, com prevalência do melhor interesse avaliado concretamente. |
| R3 | [Guia ANPD — Legítimo Interesse, fevereiro/2024](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file). Orientação. | Não se aplica a dados sensíveis; avaliar finalidade, necessidade, balanceamento e salvaguardas. |
| R4 | [Guia ANPD — Segurança da Informação para Agentes de Pequeno Porte, v1.0, outubro/2021](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf/@@display-file/file). Orientação. | Contas individuais, acesso mínimo, treinamento, segurança de armazenamento/comunicação, backups, contratos e nuvem. |
| R5 | [Resolução CD/ANPD 2, de 27/01/2022, publicada em 28/01/2022, com alterações](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022). Obrigação regulamentar. | Associação sem fins lucrativos não fica automaticamente dispensada. Alto risco exige combinação de critério geral e específico; dados sensíveis/menores são critério específico. Eventual dispensa de encarregado não elimina canal de contato. |
| R6 | [Resolução CD/ANPD 15, de 24/04/2024, publicada em 26/04/2024 — exemplar oficial no MJ](https://bibliotecadigital.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html) e [procedimento oficial de comunicação](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis), atualizado em 26/08/2026. Norma e orientação operacional. | Incidentes com risco/dano relevante: comunicar ANPD e titulares; prazo geral de três dias úteis, com regras específicas e eventual prazo diferenciado apenas se elegível. |
| R7 | [Resolução CD/ANPD 18, de 16/07/2024, publicada em 17/07/2024 — exemplar oficial](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/encarregado-completo_ocultado.pdf) e [guia anunciado em 19/12/2024](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-sobre-atuacao-do-encarregado). Norma e orientação. | Formalizar responsabilidades e divulgação do contato; decisões de tratamento continuam com o controlador. |
| R8 | [Resolução CD/ANPD 19, de 23/08/2024, com retificação de 18/08/2025](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024). Obrigação regulamentar. | Validar mecanismo de transferência internacional e contratos. SSL não resolve o fundamento da transferência. O prazo de incorporação das cláusulas-padrão, para quem utiliza cláusulas contratuais, era de doze meses da publicação. |
| R9 | [Índice oficial de regulamentações da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/) e [agenda 2025–2026](https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1), tabela consultada com atualização em 20/10/2026. Referência de vigência/planejamento. | Índice indica R5–R8 e R2 vigentes, com alterações indicadas. A ação sobre consentimento ainda aparece em elaboração interna. A Resolução 32/2026 trata da adequação da União Europeia; não comprova adequação de qualquer região Heroku. |
| R10 | [Lei 15.211, de 17/09/2025 — ECA Digital, publicação oficial no Senado](https://legis.senado.leg.br/norma/41465823/publicacao/41471709). Obrigação legal, conforme enquadramento. | Avaliar alcance a produto direcionado ou de acesso provável por menores. O código observado oferece contas administrativas/operacionais, sem conta de aluno; isso não basta para concluir o enquadramento de toda a atividade. |

A URL direta do DOU para R6 retornou erro durante a consulta; o PDF do processo
na ANPD excedeu o limite de leitura da ferramenta. Foi usado o exemplar HTML
da Biblioteca Digital do Ministério da Justiça. O Planalto bloqueou o acesso à Lei
15.211; foi consultado o texto no Senado. Esses limites não foram substituídos
por opiniões comerciais.

## Requisitos legais e leitura para o projeto

**Obrigação (R1):** identificar hipóteses legais por operação; observar finalidade,
necessidade e transparência. Consentimento deve ser demonstrável e específico;
autorização genérica não basta. Dados sensíveis exigem análise do art. 11.
Se a hipótese escolhida for consentimento para dados de criança, observar
responsável legal e verificação razoável. Direitos, término do tratamento e
retenções excepcionais devem ser operacionalizados. Segurança e registro de
operações também se aplicam a rascunhos.

Para confirmação/acesso, o art. 19 prevê resposta simplificada imediata ou
declaração completa em até quinze dias, observadas regras diferenciadas
efetivamente aplicáveis. Esse prazo não foi generalizado a todo pedido.

**Interpretação para este projeto (R2/R3):** não há fundamento para obrigar toda
família a marcar “Autorizo”. Também não há evidência para assumir que toda a
coleta atual pode prosseguir sem consentimento. Benefício comunitário não
substitui a avaliação concreta. A avaliação do melhor interesse deve considerar
necessidade, compreensão, representação, exposição de familiares e risco de
discriminação, mesmo quando outra hipótese for aplicável.

**Orientação (R4):** aplicar privilégio mínimo, revisar acessos, capacitar equipe,
testar restauração e limitar cópias. Criptografia adicional, MFA e relatório de
impacto são recomendações de evolução para este contexto; não foram apresentados
como uma obrigação universal de usar um produto ou algoritmo específico.

## Inventário técnico e finalidades observadas

“Uso observado” abaixo descreve funções do software, **não constitui finalidade
institucional aprovada nem base legal**. Todo grupo permanece com fundamento,
necessidade e retenção a confirmar. Dados de responsáveis, familiares, locadores
e funcionários também pertencem a titulares próprios.

| Grupo e titulares | Dados encontrados | Uso observado / armazenamento |
| --- | --- | --- |
| Aluno, inclusive menor | Nome, situação, atividade, nascimento, RG/CPF/CIN, CadÚnico, NIS, cartão SUS, início, telefones/e-mails, endereço/CEP/referência e relação dos pais | Cadastro, busca e edição; tabela `student`. Cartão SUS merece proteção reforçada pelo contexto. |
| Familiares do aluno | Mãe/pai/responsável, parentesco, nome, nascimento, ocupação, alfabetização, escolaridade, telefone, RG/CPF e título eleitoral | Vínculos do aluno; `student_relative`. O vínculo de parentesco não comprova poderes de representação. |
| Perfil socioeconômico | Moradia/aquisição, paredes/piso, saneamento, despesas de água/luz/telefone/alimentação/aluguel, renda, bens/imóvel/veículo e benefícios | Ficha socioeconômica; `socioeconomic_profile`. Renda e vulnerabilidade têm risco relevante, embora não sejam automaticamente dados sensíveis pela definição legal. |
| Responsável pelo levantamento | Nome/social, idade/nascimento, sexo de nascimento, raça, gênero, orientação sexual, estado civil, RG/CIN/CPF, telefone/e-mail, naturalidade/nacionalidade, NIS, escolaridade/escola e título eleitoral | Levantamento e buscas; `population_survey.data` JSONB, mais nome/CPF duplicados em colunas para busca. Raça, saúde e vida sexual demandam tratamento do art. 11; tratar orientação sexual com esse nível de proteção. Gênero/sexo também apresentam risco de discriminação. |
| Domicílio, trabalho e saúde | Endereço, condição da moradia, cômodos/tempo/residentes/saneamento, nome/telefone do locador, ocupação/benefícios/programa habitacional, deficiência, medicamentos, atestado e alergias | Seções JSONB do levantamento; não foram encontrados uploads de atestados, fotos, áudio ou documentos. Texto livre pode receber dados excedentes. |
| Integrantes da família | Nome, CPF/CIN, idade/nascimento, parentesco, renda e indicação de responsável | `population_member`; cálculo de total/per capita. Não foi encontrada decisão automática de concessão/negação de benefício. |
| Autorizações e declaração | `imageAndSound` e `personalData` independentes e trivalentes; local/data e nomes declarados como assinantes/registrador | JSONB do levantamento. São nomes digitados, sem mecanismo observado de assinatura ou prova de poderes. O aluno não possui esses campos em seu contrato próprio. |
| Contas da equipe | Nome, e-mail, cargo, situação, hash BCrypt da senha, versão de sessão, timestamps | `app_user`; login/perfil/administração. “OPERADOR” é cargo da aplicação, não determina o papel jurídico de operador da LGPD. |
| Sessões e limite de login | JWT com identidade/cargo/validade; IDs de sessão/token e expiração; hashes SHA-256 de conta/IP, contagem e janela | Tokens no `localStorage`; `auth_refresh_session` e `auth_login_limit`. Hash de IP/e-mail não equivale a anonimização garantida. |
| Auditoria | Ator, ação, tipo/UUID da entidade, instante, metadados | `audit_event`; alterações e eventos de autenticação. Nesta revisão, criação/alteração do levantamento passa a registrar estados das autorizações, sem conteúdo clínico ou familiar. Não existe histórico completo de valores de cada ficha. |

Evidências: [contratos dos formulários](../backend/FORMULARIOS.md),
[entidades de aluno](../backend/src/main/java/br/org/rosalina/social/student/Student.java),
[contratos populacionais](../backend/src/main/java/br/org/rosalina/social/population/PopulationDtos.java),
[migrations](../backend/src/main/resources/db/migration),
[serviço de rascunhos](../backend/src/main/java/br/org/rosalina/social/draft/FormDraftService.java).

## Fluxo, cópias, acessos e compartilhamentos

1. Operador autenticado digita no navegador. Campos podem ser coletados antes de
   qualquer resposta de autorização. O React mantém valores em memória.
2. Novos formulários mantêm pendências em `sessionStorage`, com chave por conta e
   tipo; após aproximadamente um segundo, enviam o estado incompleto à API. A API
   aceita JSON de rascunho até 256 KiB, sem validar integralmente os campos.
3. `form_draft` armazena dono, tipo, título (normalmente nome), JSONB e versão.
   Apenas o dono acessa pela API, inclusive para ADMIN. Rascunho descartado é
   excluído; ao concluir, conteúdo/título são limpos e fica recibo com IDs e datas.
4. Conclusão valida e grava o cadastro na mesma transação. POST direto também
   existe. Edição usa `If-Match`, preserva cópia/recibo no `sessionStorage` e envia
   PUT; não utiliza o rascunho de novo cadastro.
5. ADMIN e OPERADOR podem listar, abrir e alterar **todos** os cadastros concluídos,
   inclusive saúde e outras informações sensíveis. Não há restrição por equipe,
   atividade ou campo. Somente ADMIN administra contas e catálogos. Não foi
   encontrado endpoint público de dados cadastrais, exportação em lote ou acesso
   de aluno/responsável. Listas usam DTOs reduzidos, mas a de alunos inclui CPF.
6. Busca põe nome/CPF em query strings da API e do frontend, inclusive links de
   navegação. Isso pode deixar cópias no histórico do navegador e logs de proxies.
   A revisão adicionou `Referrer-Policy: no-referrer`; isso não remove histórico,
   query strings ou registros já existentes em infraestrutura.
7. Consulta de CEP chama ViaCEP diretamente: CEP na URL e IP da conexão chegam ao
   serviço externo. Não são enviados nome, CPF ou ficha. Cache em memória por dez
   minutos. A revisão torna explícita a omissão de credenciais e de Referer;
   isso não esconde o IP. Validar esse fornecedor/uso ou considerar consulta local.
8. Heroku serve React/API; PostgreSQL recebe registros, rascunhos e auditoria.
   `docs/HEROKU.md` sugere região `us`; região efetiva, suboperadores, DPA e mecanismo
   internacional não foram verificados. Conexão PostgreSQL exige SSL por padrão
   no parser, mas permite parâmetro explícito diferente; validar configuração real.
9. Código não contém integração de analytics, publicidade ou envio de cadastros
   por e-mail. Isso não comprova ausência de add-ons, integrações manuais,
   planilhas, impressão, WhatsApp ou compartilhamentos fora do software.

Evidências: [segurança da API](../backend/src/main/java/br/org/rosalina/social/config/SecurityConfig.java),
[armazenamento de pendências](../frontend/src/features/drafts/draft-storage.ts),
[autosave](../frontend/src/features/drafts/useFormDraft.ts),
[edição](../frontend/src/features/records/RecordEditPage.tsx),
[busca](../frontend/src/features/records/RecordListPage.tsx),
[CEP](../frontend/src/lib/cep.ts), [Heroku](HEROKU.md).

| Cópia / log / backup | Estado observado e limite |
| --- | --- |
| Banco principal | Dados pessoais sem criptografia por campo na aplicação. A proteção em disco, plano, credenciais e acessos da plataforma não foram verificados. Inativar aluno/usuário não elimina o registro. |
| Rascunhos pendentes e recibos | Sem expiração automática. A coluna legada `population_survey.draft_data` e registros `DRAFT` da V5 continuam no esquema; verificar eventual conteúdo antes de decidir migração/limpeza. |
| Cópias no navegador | Valores de edição, estado original e submissão podem duplicar a ficha na mesma aba. Nesta revisão, saída explícita com sucesso remove chaves de rascunho/edição e avisa outras abas abertas; callbacks antigos não as recriam. Rascunhos confirmados no servidor permanecem. |
| Expiração/falha de rede | Recuperação local é preservada na expiração involuntária. Falha de logout no servidor mantém sessão e cópias e apresenta erro. A troca direta de conta mantém isolamento por chave; não substitui a saída explícita em computador compartilhado. |
| Tokens e tema | JWT de acesso/refresh persistem no `localStorage` até limpeza. Não há cookie HttpOnly nesse fluxo. O tema não contém ficha; não é removido na saída. XSS e acesso ao perfil do navegador continuam riscos. |
| Cache HTTP | Spring Security já fornece `no-store`; mantido e verificado nos testes. Não há service worker encontrado. Isso não apaga cópias de sessão ou capturas de tela. |
| Auditoria de negócio | Não copia formulário; histórico novo de respostas contém apenas estados, IDs, ator e data. Sem expiração. Leituras/listagens não são auditadas individualmente. Login inicial pode ter ator ausente, mantendo UUID da conta como entidade. |
| Logs técnicos | Não foram encontrados logs explícitos de corpo/senha no código; erros públicos são genéricos. Spring, driver, roteador Heroku e add-ons podem produzir outros logs. Configuração, retenção e permissões reais não foram verificadas. |
| Limites/sessões | Contadores antigos são apagados após um dia quando ocorre novo login; sessões expiradas são limpas em login. Não há job periódico, portanto não é prazo máximo garantido de armazenamento. |
| Backups | README recomenda backup e `HEROKU.md` mostra captura/restauração. Não há política/versionamento/expurgo ou comprovação de agenda automática. Volumes locais e dumps manuais são cópias adicionais. Não foi aberto backup real. |

## O problema “Autorizo/Não autorizo”

**Constatação anterior:** frontend dizia que não era necessário autorizar para
salvar; Zod aceitava `true`, `false` e vazio. A API armazenava os dois booleanos
sem vinculá-los a operações. Rascunhos eram enviados antes da seção de autorização.
Criar, editar, consultar e calcular renda funcionavam com qualquer resposta.

**Constatação após esta revisão:** o contrato continua aceitando as três respostas,
e imagem/som permanece independente. O texto agora explicita que rascunhos e
salvamento tratam dados e que recusa/ausência de resposta não permitem usos
dependentes de consentimento. Há trilha das mudanças de resposta nas gravações
finais. **Não foi implementada uma regra de base legal nem um bloqueio de coleta**:
o projeto não informa quais finalidades dependem de consentimento, nem apresenta
uma hipótese alternativa aprovada.

O sistema não possui operação de publicação de imagem/som: registra uma resposta
que pode ser utilizada fora dele. É necessário definir finalidade, canais e
alcance dessa autorização separadamente; não se pode inferir autorização de
imagem a partir de `personalData=true`, ou o inverso. Tampouco `true` prova, por
si só, consentimento informado ou representação de todos os familiares.

### Matriz de decisão proposta — nenhuma hipótese abaixo está aprovada

| Operação observada | Candidatas a examinar, sem adoção automática | Efeito de recusa se depender de consentimento |
| --- | --- | --- |
| Matrícula/contato necessário com aluno e responsável | Art. 7º, V, se existir relação contratual pertinente; II, com norma concreta; IX, apenas para dados não sensíveis e avaliação R3 | Impedir a operação/campos dependentes; preservar possibilidade de atendimento compatível com dados estritamente necessários. |
| Levantamento identificável de famílias e cálculo de renda | Associação deve explicar por que necessita identificar cada pessoa e quais usos/encaminhamentos realiza; avaliar hipótese do art. 7º pertinente | Não coletar nem gerar rascunho desses dados sem autorização válida. Não presumir “pesquisa” ou “política pública”. |
| Saúde, raça e orientação sexual | Art. 11, I, ou hipótese específica de II que seja demonstrável e indispensável | Não coletar, salvar em rascunho ou utilizar os campos dependentes. Não aplicar legítimo interesse a esses dados (R3). |
| Dados de criança/adolescente em qualquer dos fluxos | Hipótese apropriada + avaliação do melhor interesse (R2); quando consentimento, definir quem representa e como comprovar | Não tornar autorização genérica condição indiscriminada de participação. |
| Contas, autenticação e auditoria mínima | Avaliar fundamento próprio de segurança/gestão da relação com a equipe; necessidade e retenção documentadas | Não são governadas pela resposta de uma família no levantamento. |
| Imagem/som e divulgação externa | Análise própria do uso e instrumento específico, incluindo direitos de imagem e representação | Se o uso depender de autorização, não captar/publicar; recusa independente do cadastro. |
| Compartilhamento, nuvem e backups | Registrar destinatários, localização, contratos e mecanismo internacional R8, além do fundamento da operação | Não usar o checkbox genérico para legitimar toda transferência. |

Essas candidatas são **interpretações para discussão**, não conclusões sobre a
associação. Não foram encontrados contrato, obrigação setorial, convênio de
política pública, qualificação de órgão de pesquisa ou prestação de serviço de
saúde que autorizem selecionar uma dessas hipóteses. Proteção da vida também não
justifica automaticamente um cadastro rotineiro completo.

Depois das decisões, a implementação precisa abranger POST/PUT, conclusão de
rascunho, autosave, cópias locais e usos externos. Bloquear apenas o botão final
ou apenas `personalData=false` deixa a coleta anterior intacta. Quando uma
finalidade depender de consentimento, verificar seu estado **antes** de coletar
os dados correspondentes. Recusa, silêncio e revogação não são autorização.
Outra hipótese legítima deve ser definida para a operação de forma prévia e
transparente, não escolhida automaticamente para contornar a recusa.

## Pendências e responsáveis a designar pela associação

| Prioridade | Decisão / evidência que falta | Critério para implementação posterior |
| --- | --- | --- |
| Crítica | Aprovar finalidade, necessidade e hipótese de cada grupo/operação com validação jurídica | Matriz assinada/versionada; destacar quais campos devem deixar de ser coletados. Para usos sem fundamento demonstrado, recomendar suspensão da coleta pela associação. |
| Crítica | Avaliar coleta de saúde/raça/orientação sexual e obrigatoriedade das seis classificações | Hoje há opção “Não informado”, mas todos esses seletores exigem resposta na conclusão. Validar necessidade, liberdade de resposta e minimização, sem inferir características. |
| Alta | Identificar controlador, dados institucionais e canal/encarregado aplicável (R5/R7) | Associação fornece identidade/contato reais e responsáveis; então publicar aviso público e entregar informação acessível antes da coleta. Não há aviso completo nem canal específico observado no produto. |
| Alta | Definir finalidades opcionais, termos e representação | Instrumento separado de imagem/som; versões de avisos; finalidade e titular abrangidos, representante e prova proporcional, data/origem e mecanismo de revogação. Auditoria nova de respostas não supre isso. |
| Alta | Estabelecer retenção por cadastro, rascunho, recibo, auditoria, log e backup | Prazo ou critério, marco inicial, exceção e responsável. Sem inventar período genérico. Depois: expiração/expurgo, revisão de legados e testes de restauração com reaplicação das eliminações. |
| Alta | Formalizar atendimento de direitos e revogação | Canal real, autenticação proporcional do requerente/representante, registro mínimo do pedido, fluxo de busca/correção/bloqueio/eliminação e comunicação a destinatários. Hoje não há fluxo específico nem DELETE de ficha concluída. Não criar exclusão irrestrita sem tratar exceções e backups. |
| Alta | Revisar acessos e fornecedores | Definir quem precisa ver cada seção; incluir equipe de infraestrutura, suporte e desenvolvedores. Confirmar região Heroku/banco/backups, contratos, suboperadores e mecanismo R8. Avaliar ViaCEP. |
| Alta | Preparar resposta a incidentes (R6) | Responsável, registro do conhecimento, contenção, avaliação de risco e procedimento de comunicação. Três dias úteis é prazo geral; não presumir prazo em dobro. R6 prevê registro de incidentes por pelo menos cinco anos; isso não fixa retenção de toda a auditoria. |
| Média | Avaliar riscos e necessidade de relatório de impacto | Considerar menores, vulnerabilidade, cruzamento familiar, discriminação e acesso amplo. Recomenda-se documentar avaliação; não afirmar obrigatoriedade universal de RIPD para toda associação. |
| Média | Reduzir exposição em navegação e autenticação | Retirar nome/CPF de URLs e revisar logs de infraestrutura; avaliar cookies HttpOnly com proteção CSRF, MFA e CSP compatível. Essas mudanças exigem desenho/testes próprios. |
| Média | Validar enquadramento de pequeno porte e ECA Digital | Confirmar escala, impacto, usuários reais e canais. Não presumir dispensa pelo caráter comunitário (R5), nem adicionar coleta de documento/biometria para aferir idade sem análise (R10). |

Para cada decisão, registrar: item, decisão, justificativa/evidência, responsável,
data e versão aprovada. Nenhum nome, CNPJ, canal, finalidade ou prazo institucional
foi preenchido por suposição nesta revisão.

## Alterações implementadas e limites

- Aviso antes do preenchimento sobre autosave nos dois formulários e texto das
  autorizações sem a afirmação de que seria dispensável autorizar em qualquer
  caso. Recusa e ausência de resposta exibem aviso próprio; imagem/som independente.
- Auditoria transacional de estados de autorização em criação e mudança de
  levantamento: `GRANTED`, `REFUSED`, `UNSPECIFIED`, ator, entidade e instante.
  Criação registra estado atual; alteração registra anterior/atual quando muda.
  Não copia nomes, documentos, saúde ou o formulário nos metadados. Não altera
  eventos históricos nem inventa evidência retroativa.
- Saída explícita revogada/confirmada remove cópias locais de rascunhos e edições,
  preserva tema e comunica limpeza às outras abas abertas na mesma origem. Marca
  de geração impede callbacks antigos de recriarem cópias, inclusive após novo
  login. Falhas de armazenamento e abas suspensas/fechadas limitam garantias do
  navegador; não se promete apagamento forense, de memória ou de todas as sessões
  de navegador. Requisições já recebidas pelo servidor podem terminar.
- Rascunhos conferem novamente a sessão após respostas de gravação, impedindo
  que uma continuação pendente conclua um cadastro com uma sessão aberta depois
  do logout ou com outra conta.
- `Referrer-Policy: no-referrer` nas respostas e consulta ViaCEP com credenciais e
  Referer omitidos. `no-store` já existente permanece. Não remove URL de busca.

Não foram aplicados deploy, migrations destrutivas, exclusão de cadastros,
expiração arbitrária, mudança da base legal ou preenchimento de aviso institucional.
As mudanças são revisáveis no código e não certificam conformidade.

## Validação

Os testes acrescentados exercitam independência e estados de autorização,
metadados mínimos e atomicidade diante de erro de validação; limpeza local no
logout, propagação entre abas, expiração involuntária e falha de rede; callbacks
tardios de rascunho/edição; cabeçalhos de privacidade e consulta de CEP.
Resultados em 11/11/2026:

- Backend: **71 testes, 14 suítes, zero falhas/erros/ignorados** (`mvn -q test`),
  Java 21 e PostgreSQL 16 via Testcontainers. Maven executado em container com
  cópia do código em `/tmp/rosalina-lgpd-backend`; nenhum banco da associação foi acessado.
- Frontend: **228 testes, 18 arquivos, todos aprovados** (`npm test -- --reporter=dot`),
  incluindo compilação TypeScript. `npm run build` e `npm run lint` aprovados.
  Eventos entre abas são simulados em jsdom; não substituem validação nos
  navegadores/dispositivos usados pela equipe.
- `git diff --check` sem problemas de whitespace. Sem validação em produção,
  inspeção de backups reais ou execução da suíte Playwright nesta revisão.
