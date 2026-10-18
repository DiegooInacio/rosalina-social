# Frontend — Rosalina Social

Interface em React, TypeScript e Vite para cadastro de alunos e levantamento
populacional. Configure `VITE_API_URL` conforme `.env.example` ou execute
`./start.sh` na raiz do projeto para iniciar o ambiente local completo.

```bash
npm install
npm run dev
```

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
já concluídos ainda não está disponível nesta interface.

## Rascunhos

O frontend usa `/api/v1/form-drafts`; o backend precisa estar atualizado com a
migration V6. Ao abrir um formulário, busca os rascunhos do usuário autenticado e
oferece recuperar um deles ou começar outro, preservando os anteriores.

- Alterações são enviadas após uma pausa de um segundo na digitação, sem exigir
  que campos como CPF, data ou renda já estejam completos.
- O indicador informa quando há alterações pendentes, salvamento em andamento,
  sucesso ou falha. **Salvar rascunho agora** permite antecipar ou repetir o envio.
- **Continuar depois** aguarda a confirmação do salvamento e retorna ao painel.
- **Limpar formulário** e **Cancelar** pedem confirmação e descartam o rascunho
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
inclusive depois de reload, para obter o recibo sem duplicar o cadastro.

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
