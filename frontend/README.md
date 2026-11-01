# Frontend — Rosalina Social

Interface em React, TypeScript e Vite para cadastro de alunos e levantamento
populacional. Configure `VITE_API_URL` conforme `.env.example` ou execute
`./start.sh` na raiz do projeto para iniciar o ambiente local completo.

```bash
npm install
npm run dev
```

## Tema da interface

O seletor **Tema**, no cabeçalho e na tela de login, permite escolher **Claro**,
**Escuro** ou **Automático**. O modo automático acompanha a preferência do
sistema e reage a mudanças enquanto a página está aberta. A escolha explícita
é preservada em `localStorage` (`rosalina.theme`) e sincronizada entre abas.
Se o armazenamento estiver indisponível, a troca continua funcionando na página.

A preferência é aplicada antes de iniciar o React para evitar um clarão do tema
claro ao abrir a página. Cores de fundos, textos, bordas, campos, tabelas,
mensagens e estados de interação usam a paleta central em `src/index.css`.
Os controles nativos também acompanham o tema através de `color-scheme`.

## Formulários (RF01 a RF18)

- RF01–RF05: identificação, familiares e situação socioeconômica do aluno.
- RF06–RF14: responsável familiar, endereço, moradia, trabalho, saúde,
  integrantes, resumo financeiro, autorizações, declaração e assinaturas digitadas.
- RF15: validação antes do envio, mensagens junto aos campos e aviso com acesso
  ao primeiro erro. Os erros da API também são associados aos respectivos campos.
- RF16: salvamento na API, confirmação de sucesso e preservação do preenchimento
  quando o envio falha. Durante o envio, campos e ações ficam bloqueados para
  impedir alterações e envios duplicados. O formulário só é reiniciado após sucesso.
- RF17: edição dos valores durante o preenchimento. Alterações nas respostas
  condicionais limpam somente os detalhes que deixam de ser aplicáveis.
- RF18: ações de limpar e cancelar, com confirmação quando há alterações não
  salvas. Cancelar retorna ao painel; limpar restaura os valores iniciais,
  remove integrantes e apaga mensagens e erros.

Os campos obrigatórios e as restrições seguem o contrato atual do backend.
Há salvamento automático de rascunhos nos dois formulários. A edição de cadastros
já concluídos está disponível pela ação **Editar cadastro** na ficha. A consulta dos registros
concluídos está disponível no menu e na visão geral.

## Consultar cadastros

**Alunos cadastrados** (`/app/alunos`) e **Levantamentos cadastrados**
(`/app/levantamentos`) exibem os registros da API com paginação de 20 por página.
As consultas aceitam nome e CPF completo; alunos também têm filtro de situação.
Os filtros ficam na URL e são preservados ao abrir uma ficha e voltar à lista.
O CPF dos alunos permanece mascarado na listagem, como retornado pela API.

Cada lista oferece **Ver ficha**, que abre a consulta completa em
`/app/alunos/:id` ou `/app/levantamentos/:id`. As fichas organizam os dados
por seção e distinguem campos não informados, respostas Não e valores zero.
O levantamento resolve os nomes das opções de catálogo, inclusive inativas.
Uma falha nessa consulta mantém os demais dados visíveis e permite tentar
novamente. As telas também tratam registros inexistentes e falhas da API.
As consultas usam a área autenticada existente. A ação **Editar cadastro** abre
`/app/alunos/:id/editar` ou `/app/levantamentos/:id/editar`, aproveitando as
validações e seções dos formulários. A gravação usa PUT no mesmo registro e
preserva os identificadores dos integrantes do levantamento. Depois de criar
um cadastro, o formulário também oferece **Ver ficha do cadastro salvo**.

Edições em andamento têm uma cópia temporária em `sessionStorage`, separada por
usuário, tipo e ID do registro, sem usar os rascunhos de cadastros novos. Ao
recarregar, a cópia é recuperada se o cadastro no servidor não mudou. Uma
verificação antes do PUT detecta alterações já feitas por outra sessão. O PUT
envia `If-Match` com a `revision` recebida na ficha; a API confere a revisão com
bloqueio transacional do cadastro, inclusive para alterações só nos integrantes.
Conflitos preservam a edição local. Se a resposta da gravação se perder, o pedido
enviado fica guardado na aba: **Conferir salvamento** verifica os dados persistidos
e **Tentar salvar novamente** repete o mesmo pedido e revisão, sem sobrescrever
uma versão posterior. A recuperação também funciona após recarregar a página e cobre respostas 5xx,
inclusive HTTP 500. Operações de uma edição encerrada não podem enviar novas
gravações, limpar a cópia local ou navegar sobre uma edição posterior.
Cancelar alterações pede confirmação. Salvar ou cancelar com sucesso remove a cópia.

Opções de catálogo desativadas já vinculadas ao registro continuam disponíveis
na edição, identificadas como inativas. CadÚnico e alfabetização distinguem
**Sim**, **Não** e **Não informado**, inclusive em registros antigos e cópias locais.
A sincronização do responsável preserva a CIN quando não há CPF separado.
Fontes vazias não apagam nascimento, idade ou documento existentes somente
no integrante; esses campos continuam editáveis na composição familiar.

## Família e saneamento

A família aparece na ordem **Mãe → Pai → Responsável**. Mãe começa aberta;
pai e responsável começam recolhidos. Cada seção pode ser aberta ou escondida
sem apagar os dados, e abre automaticamente quando contém erros. A mãe tem
prioridade como referência familiar; na ausência dela, o pai. Outro responsável
só é obrigatório quando nenhum dos dois foi informado. Se qualquer dado de uma
pessoa for preenchido, seu nome também precisa ser informado.

Água, esgoto e coleta de lixo usam opções **Sim/Não**, com **Não informado**
para deixar a resposta em branco. A API grava booleanos, sem buscar catálogos.
O levantamento também usa lista de parentesco e máscara monetária na renda dos
integrantes; a identificação do responsável é sincronizada com a linha familiar.
A migration V7 adiciona essas colunas preservando os registros anteriores.

## Documentos

Os dois formulários orientam a informar o número da CIN no campo CPF, pois são
iguais, e a deixar o RG antigo em branco. O RG é opcional e tem uma explicação
visível abaixo do campo, também disponível para leitores de tela. Os integrantes
do levantamento usam um único campo CPF, sem seleção entre CPF e CIN.

O contrato da API continua compatível: no levantamento, o RG antigo é enviado
como `documentType: RG` e `documentNumber`; o CPF dos integrantes usa
`documentType: CPF`. Ao recuperar rascunhos anteriores, a CIN passa ao CPF sem
apagar números divergentes: nesse caso, o campo anterior permanece visível para
conferência. Documentos incompletos são preservados e validados ao concluir.

## Valores monetários do aluno

Água, luz, telefone, aluguel/financiamento, alimentação e renda familiar usam
máscara `R$ 1.234,56`, com digitação dos centavos da direita para a esquerda.
Colar `R$ 1.234,56`, `1234,56` ou `1234.56` preserva o valor; um inteiro colado
como `1234` representa R$ 1.234,00. Vazio continua diferente de R$ 0,00.
O formulário mantém valores sem separador de milhar, formata rascunhos antigos
na exibição e envia números para a API. Valores negativos ou acima do limite
não são convertidos silenciosamente em outro valor.

## Preenchimento e CEP

NIS e Cartão Nacional de Saúde aceitam somente dígitos, inclusive ao colar.
A validação continua rejeitando letras em valores recuperados de rascunhos.
As mensagens são atualizadas ao corrigir campos e distinguem telefone vazio,
incompleto, DDD inválido e celular sem o 9 após o DDD.

Ao completar os oito dígitos do CEP, os formulários consultam o
[ViaCEP](https://viacep.com.br/) e preenchem rua/endereço, bairro, cidade e,
no levantamento, UF. Edições manuais, número e complemento são preservados.
Consultas de CEPs anteriores não sobrescrevem o preenchimento atual.
Se o endereço encontrado divergir do preenchido, a interface mostra uma prévia
e oferece **Usar endereço do CEP**. A substituição depende desse clique e
preserva número, complemento, ponto de referência e campos ausentes na resposta.
CEP inexistente impede a conclusão; indisponibilidade do serviço permite
preenchimento manual e oferece nova tentativa. A conclusão verifica novamente
o CEP, reaproveitando consultas recentes. A consulta externa envia somente
o CEP, sem os tokens de autenticação da aplicação.

O React Compiler está desativado porque sua memoização deixou registros e refs
do React Hook Form desatualizados. O Vitest compartilha a configuração do Vite
para exercitar a mesma transformação de componentes usada na aplicação.

## Sessão e falhas de conexão

O cliente renova automaticamente o token de acesso quando necessário, usando
`/api/v1/auth/refresh`. Pedidos simultâneos compartilham uma renovação; depois
dela, o pedido original conserva seu método e corpo. Se o refresh também
expirou, o usuário é direcionado ao login sem apagar a cópia pendente da aba.
Falhas de rede mantêm as credenciais para permitir nova tentativa. Um 403 com
token ainda válido é apresentado como falta de permissão, sem encerrar a sessão.
Menus e permissões visuais acompanham as atualizações da sessão. Pedidos da API
têm prazo de 20 segundos, incluindo a leitura da resposta. Um tempo esgotado
preserva os dados e não repete gravações automaticamente.

## Rascunhos

O frontend usa `/api/v1/form-drafts`; o backend precisa estar atualizado com a
migrations V6 e V7. Ao abrir um formulário, busca os rascunhos do usuário autenticado e
recupera automaticamente a cópia pendente da aba ou, na ausência dela, o
rascunho mais recente. Para recomeçar, use **Limpar formulário**; outros
rascunhos continuam disponíveis em **Outros rascunhos salvos**.

- Alterações são enviadas após uma pausa de um segundo na digitação, sem exigir
  que campos como CPF, data ou renda já estejam completos.
- O indicador informa quando há alterações pendentes, salvamento em andamento,
  sucesso ou falha. **Salvar rascunho agora** permite antecipar ou repetir o envio.
- **Continuar depois** aguarda a confirmação do salvamento e retorna ao painel.
- **Limpar formulário**, disponível no topo e no fim, e **Cancelar** pedem confirmação e descartam o rascunho
  correspondente no servidor. Uma falha mantém o preenchimento na tela.
- **Salvar cadastro/levantamento** sincroniza o rascunho e conclui por `/complete`,
  usando o payload normalizado e as validações completas. Não cria um registro
  por fora do fluxo de conclusão.

Para cobrir um reload imediato, o estado ainda não confirmado pelo servidor fica
temporariamente no `sessionStorage` da aba, separado por usuário e tipo de
formulário. Essa cópia inclui dados pessoais e é removida quando o servidor
confirma o salvamento. Não se usa `localStorage` para armazenar o preenchimento.
A cópia temporária não é compartilhada entre dispositivos e é perdida ao fechar
a aba; rascunhos já salvos no servidor continuam disponíveis após novo login.
O navegador exibe aviso ao recarregar/fechar com alterações pendentes. Se a
conexão voltar, o formulário tenta sincronizar novamente.

Quando existe uma cópia pendente da aba, ela é recuperada primeiro para evitar
substituí-la por outro rascunho. Em conflitos de versão (409), a interface mantém
o conteúdo local e oferece carregar a versão do servidor com confirmação ou
salvar uma cópia como outro rascunho. Nunca repete um PUT com uma versão mais nova
sem resolver o conflito. Os envios de uma sessão são serializados.

Se a resposta da conclusão se perder, o formulário bloqueia edição/descarte e
oferece **Verificar conclusão**. Repete a mesma conclusão no mesmo rascunho,
inclusive depois de reload, para obter o recibo sem duplicar o cadastro. Essa
conferência usa o pedido original, sem revalidar campos ou consultar CEP. Mudanças
no catálogo após a conclusão não impedem obter o recibo.

## Atividades

Administradores acessam **Atividades** pelo menu interno (`/app/atividades`).
A tela permite cadastrar, buscar, renomear, ativar e desativar atividades.
Desativar remove a opção dos novos cadastros sem excluir a atividade nem os
vínculos com alunos já cadastrados. Nomes duplicados também são verificados
entre as opções inativas, que podem ser reativadas.

No cadastro de aluno, **Gerenciar atividades** abre essa área em outra aba.
Após cadastrar ou alterar uma opção, use **Atualizar atividades** para recarregar
a lista preservando os demais campos. Somente atividades ativas são oferecidas;
se a seleção anterior foi desativada, será necessário selecionar outra atividade.

A interface usa o perfil do token para mostrar os acessos de administração.
As permissões das operações são verificadas pelo backend existente.

## Verificações

```bash
npm test
npm run lint
npm run build
```

Os testes usam Vitest, Testing Library e jsdom. Cobrem validação, preservação e
correção de dados após falha, associação dos erros do servidor, bloqueio durante
o envio, sucesso, campos condicionais e confirmação de limpeza/cancelamento
nos dois formulários. As chamadas da API são simuladas; os testes não gravam
cadastros reais. Use `npm run test:watch` durante o desenvolvimento.

## Meu perfil

A rota privada `/app/perfil`, acessível em **Minha conta → Meu perfil**, permite consultar a conta, editar o nome e alterar a senha. E-mail e tipo de acesso são somente leitura, para administradores e operadores.

O frontend está preparado para o contrato abaixo; **estas rotas ainda precisam ser implementadas no backend**:

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/api/v1/me` | — | `{ id, name, email, role }` |
| PATCH | `/api/v1/me` | `{ name }` | Perfil atualizado no mesmo formato |
| PUT | `/api/v1/me/password` | `{ currentPassword, newPassword }` | 204 sem corpo |

Todas devem identificar o usuário pelo token e permitir ADMIN e OPERADOR. O nome deve ter de 1 a 150 caracteres após remover espaços nas extremidades; a nova senha, de 8 a 100 caracteres, sem remover espaços. O backend deve validar a senha atual e retornar 400 com `fields.currentPassword` quando incorreta (401 fica reservado à sessão inválida). Erros de validação seguem `{ message, fields }`.

Enquanto a consulta não estiver disponível, a tela exibe somente o e-mail e a permissão presentes na sessão, com as alterações desabilitadas e opção de tentar novamente. Nenhum sucesso é simulado. As senhas e a confirmação não são armazenadas no navegador; a confirmação não é enviada à API.
