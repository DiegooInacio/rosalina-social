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
Não há salvamento de rascunhos nem edição de cadastros já concluídos nesta interface.
A confirmação de descarte se aplica aos botões Limpar formulário e Cancelar.

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
