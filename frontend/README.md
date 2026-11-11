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

O frontend usa as rotas de perfil já implementadas no backend:

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/api/v1/me` | — | `{ id, name, email, role }` |
| PATCH | `/api/v1/me` | `{ name }` | Perfil atualizado no mesmo formato |
| PUT | `/api/v1/me/password` | `{ currentPassword, newPassword }` | 204 sem corpo |

Todas devem identificar o usuário pelo token e permitir ADMIN e OPERADOR. O nome deve ter de 1 a 150 caracteres após remover espaços nas extremidades; a nova senha, de 8 a 100 caracteres, sem remover espaços. O backend deve validar a senha atual e retornar 400 com `fields.currentPassword` quando incorreta (401 fica reservado à sessão inválida). Erros de validação seguem `{ message, fields }`.

Se a consulta estiver indisponível, a tela exibe somente o e-mail e a permissão presentes na sessão, com as alterações desabilitadas e opção de tentar novamente. Nenhum sucesso é simulado. As senhas e a confirmação não são armazenadas no navegador; a confirmação não é enviada à API.

## Testes em navegador real

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia um servidor próprio na porta 4173 e executa Chromium em
computador e celular. Cobre renovação da sessão administrativa, tema persistente,
estabilidade do layout durante o autosave, restauração de rascunhos, máscaras,
sincronização do responsável e edição por PUT com preservação de integrantes.
Os testes usam respostas de API simuladas e não alteram o banco de desenvolvimento.
Traços de falhas ficam em `test-results/`. Os testes de integração com PostgreSQL
continuam no backend. No celular, o botão **Menu** abre a navegação vertical em um painel lateral.
O painel mantém o foco dentro dele, bloqueia a rolagem da página ao fundo e fecha
ao navegar, tocar fora, pressionar Escape ou usar **Fechar**, devolvendo o foco
ao botão. No computador, o menu lateral permanece visível durante a rolagem.


## Troca de conta, conflitos e repetição da criação

A área autenticada reinicia as telas quando muda o titular da sessão. A renovação
de token da mesma conta mantém o formulário. Cada titular recupera apenas sua
cópia local ao voltar a entrar.

Conflitos na edição oferecem **Comparar minha cópia com os dados atuais**, com
colunas de valores preservados e atuais e opção de mostrar todos os campos.
A comparação é somente leitura e permite selecionar texto para copiar antes
de descartar a edição local. Integrantes são associados pelos identificadores.

A primeira gravação do rascunho envia `requestId` (UUID), preservado na aba até a
criação ser confirmada. Falhas de rede e reload reutilizam esse identificador.
A API retorna o rascunho já existente sem sobrescrever suas atualizações. Se o
preenchimento mudou durante a falha, o frontend aplica os novos dados por PUT
com a versão confirmada. Esta correção precisa das versões atuais do frontend
e da API; usa a chave primária existente, sem migração adicional.

## Usuários e acessos

Administradores acessam `/app/usuarios` pelo menu **Usuários e acessos**. A tela
exibe a lista de contas, com busca por nome/e-mail, filtro de situação, edição de
nome/cargo e ativação ou desativação de acessos. O botão **Novo usuário** abre
`/app/usuarios/novo`, uma página exclusiva para nome, e-mail único, cargo e senha
inicial. Ao criar, retorna à lista atualizada com confirmação de sucesso. Cancelar
retorna à lista e pede confirmação se houver dados preenchidos. A ação **Editar**
abre `/app/usuarios/:id/editar`, com nome e cargo preenchidos, e-mail somente
leitura e sem campos de senha. A página também funciona por acesso direto ou
reload, trata falhas de consulta e contas inexistentes. Salvar retorna à lista
atualizada com confirmação; cancelar pede confirmação quando há alterações.
Contas inativas continuam reservando seu e-mail. O e-mail de uma conta existente
é somente leitura. O administrador não pode desativar nem rebaixar a própria
conta. Para alterar a própria senha, deve usar **Meu perfil**.

Os cargos existentes são **Administrador** (`ADMIN`) e **Operador** (`OPERADOR`).
Ambos trabalham com alunos e levantamentos; apenas administradores gerenciam
usuários e atividades. Alterações de cargo são verificadas pela API a cada
pedido; para atualizar também o menu da conta alterada, entre novamente.

**Redefinir senha** permite ao administrador definir uma nova senha de outra
conta, com confirmação. Essa operação encerra as sessões anteriores, incluindo
os tokens de renovação. Desativar e reativar também não restaura sessões antigas.
Senhas não são persistidas pela tela no armazenamento do navegador, e a
confirmação não é enviada à API. O administrador deve comunicar a senha à pessoa,
que pode alterá-la em **Meu perfil**. Não há envio de e-mail ou recuperação
pública por “Esqueci minha senha” neste fluxo.

A API precisa da migration V8 (`session_version`).


## Seleções opcionais

A orientação de um select vazio fica oculta na lista de opções e não pode ser
selecionada. Campos opcionais preenchidos mostram um ícone **×** dentro do campo, no lugar
da seta, com nome acessível
**Limpar seleção**, que restaura o valor vazio e mantém o foco no campo.
A limpeza segue o mesmo fluxo de alteração do formulário, incluindo rascunhos,
validação e detalhes condicionais. Nos filtros, limpar volta para **Todas**.
Campos obrigatórios (situação do aluno, atividade e cargo) não oferecem limpeza.
A escolha do tema mantém suas três opções reais, sem estado vazio.


## Encerramento e renovação de sessões

**Sair** aguarda a revogação de todas as sessões da conta no servidor antes de
limpar os tokens e voltar ao login. Se a rede falhar, a interface informa o erro
e permite tentar novamente. Alterar a própria senha volta ao login com uma
confirmação e exige a nova senha. Rascunhos pendentes da aba são preservados.
A renovação usa tokens de uso único e, em navegadores com Web Locks, compartilha
um bloqueio entre abas para serializar renovação e logout. Após falha que perca a
resposta da renovação, pode ser necessário entrar novamente; a API não aceita
reutilização do token anterior. O login apresenta a mensagem de excesso de
tentativas recebida com HTTP 429. A integração exige a API com a migration V9.
