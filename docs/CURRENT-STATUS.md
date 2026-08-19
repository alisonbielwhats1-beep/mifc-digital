# MIFC Digital — estado atual e pendências

Atualizado em: 2026-08-19  
Branch: `main`  
Repositório: `https://github.com/alisonbielwhats1-beep/mifc-digital`  
Último marco concluído: **Prompt 6.1 — navegação, edição rápida e linhas por cliente**

## Onde paramos

O MVP local está executável e os Prompts 1 a 6.1 foram realizados. O projeto está em repositório público com código, documentação, referências visuais e recursos extraídos usados durante a análise.

O último trabalho realizado corrigiu a interação do Layout e substituiu as faixas inferiores genéricas por quatro linhas de clientes reconstruídas a partir da linhagem PBIP. O Layout atual possui 29 blocos, 47 linhas editáveis e linhas específicas para Volvo FH, Volvo VM, Scania e DAF.

A aplicação ainda usa dados locais em vários módulos. Nenhuma leitura real do Oracle foi executada e nenhuma operação de escrita foi feita.

## Entregue

### Prompt 1 — descoberta e rastreabilidade

- arquivos Excel, Word, PowerPoint, PDF e PBIP inventariados;
- páginas, consultas, tabelas, medidas e relacionamentos do PBIP analisados;
- separação entre `INPUT`, `CALCULATED`, `ORACLE`, `IMPORT` e `MIXED` documentada;
- 132 cartões do Layout ligados a 62 medidas;
- matriz de fontes e catálogo de medidas criados;
- arquivos de origem mantidos somente leitura.

### Prompt 2 — fundação da aplicação

- Vue 3, TypeScript, Vite e Pinia configurados;
- shell visual Metalsa, cabeçalho, navegação lateral e seletores de contexto;
- rotas, estados de tela, notificações e persistência local do MVP;
- separação entre frontend, API, domínio e Calculation Engine.

### Prompt 3 — formulários

- Volume editável;
- Logística editável;
- Buffer e Estoque editáveis;
- Capacidade editável;
- inclusão, alteração, ativação/desativação e salvamento local;
- distinção visual entre campos manuais e calculados.

### Prompt 4 — Calculation Engine

- regras de cálculo retiradas dos componentes visuais;
- famílias de fórmulas implementadas;
- fixtures locais e testes de paridade;
- catálogo com rastreabilidade para Excel/PBIP.

### Prompt 5 — Oracle somente leitura

- configuração por `.env`;
- credenciais excluídas do Git;
- preflight sem consulta;
- catálogo/allowlist de consultas;
- bloqueio de INSERT, UPDATE, DELETE, MERGE, DDL, procedures e múltiplas instruções;
- leituras ao vivo desabilitadas por padrão.

### Prompt 6 — Layout MIFC

- referência principal: `assets/ui-references/metalsa-mifc-layout.png`;
- 29 blocos semânticos iniciais;
- 47 linhas semânticas iniciais;
- adicionar, mover, redimensionar, duplicar e remover blocos;
- criar, selecionar, reconectar, curvar, classificar e remover linhas;
- tipos de fluxo de material, material puxado, informação e informação eletrônica;
- propriedades de processo, vínculos com Capacidade, entradas e saídas;
- quatro faixas inferiores de Lead Time/Dados vinculadas aos blocos;
- revisões, desfazer/refazer, zoom, pan e camadas.

### Prompt 6.1 — navegação e linhas cliente × processo

- arraste do canvas com o botão central do mouse a partir do fundo, bloco, linha ou faixa;
- botão `Mover tela` preservado para navegação explícita;
- clique em bloco abre Propriedades e foca/seleciona o nome;
- nome do card atualizado durante a digitação, com Enter/blur para confirmar e Esc para cancelar;
- renomeação integrada ao histórico e à persistência local;
- modo de tela cheia com restauração do zoom/pan ao sair;
- nomes das etapas alinhados ao PBIP: LCT/RF2, Roll Former 3, Mesa 3, Beattys, P.A/CNC, Pintura/Rebitagem e Stenhoj/Embalagem;
- quatro linhas por cliente com subida somente nas etapas participantes;
- Roll Former 3 ativo para todos os clientes;
- Mesa 3 de Volvo VM mantida reta e marcada como `pending`, pois `T-M3` aparece como cartão mas não compõe `T-T-VM`;
- matriz auditável em `docs/client-process-matrix.csv`;
- testes unitários da matriz e da renomeação;
- suíte Playwright para renomeação, pan com botão central, tela cheia e evidência visual.

## Validação executada

- `npm run typecheck`: aprovado;
- `npm test`: 36 testes aprovados;
- `npm run build`: aprovado;
- servidor local: respondeu em `http://127.0.0.1:5173/`;
- `npm run test:e2e`: suíte criada; execução pendente porque o ambiente de trabalho não permitiu baixar o navegador Chromium do Playwright;
- branch local contém as alterações do Prompt 6.1 e ainda não foi enviada ao `origin/main`.

## Parcial ou ainda não validado

- Overview e Resultados funcionam como prévias com dados locais, não com dados atuais do Oracle;
- os formulários estão funcionais, mas a validação operacional final de todos os campos contra o Excel 2026 deve ser feita pelo usuário da área;
- 309 medidas existem no modelo Power BI; nem todas foram migradas para o Calculation Engine;
- as 62 medidas usadas nos cartões do Layout foram catalogadas, mas seus valores atuais dependem das fontes online;
- as 47 conexões iniciais do novo Layout seguem a referência visual e ainda precisam de validação operacional da planta;
- a suíte visual do Playwright está pronta, mas precisa da primeira execução em uma máquina com Chromium instalado (`npx playwright install chromium`);
- a participação de Volvo VM na Mesa 3 requer confirmação operacional; até lá a linha permanece reta e sinalizada como pendente;
- persistência atual é local no navegador; banco próprio da aplicação, autenticação e perfis ainda não foram implementados;
- o código está no GitHub privado, mas a aplicação ainda não foi hospedada como site online.

## Pendências em ordem recomendada

### 1. Conferência visual e funcional do Layout 6.1

- abrir `/mifc/layout`;
- comparar lado a lado com `assets/ui-references/metalsa-mifc-layout.png`;
- validar nomes, posições, clientes, fornecedores e áreas de apoio;
- selecionar algumas linhas e testar origem, destino, tipo e curvatura;
- confirmar as conexões reais com a equipe da planta.
- confirmar especificamente se Volvo VM realmente não passa pela Mesa 3;
- executar `npm run test:e2e` e revisar a imagem anexada ao relatório Playwright.

### 2. Teste Oracle dentro da rede Metalsa

- criar `.env` local a partir de `.env.example`;
- preencher host, serviço, usuário e senha somente na máquina autorizada;
- conectar à rede/VPN;
- manter `ORACLE_READ_ONLY=true`;
- manter leituras ao vivo desabilitadas inicialmente;
- executar `npm run oracle:preflight`;
- revisar o catálogo antes de qualquer consulta;
- liberar e comparar uma consulta de cada vez;
- nunca executar escrita ou exploração ampla do banco.

### 3. Substituição gradual dos mocks

- Volume: ligar somente as fontes Oracle confirmadas;
- Logística: validar materiais, localizações, lotes e status;
- Buffer/Estoque: validar WIP, estoque e dias por cliente/processo;
- Capacidade: confirmar quais parâmetros continuam manuais;
- manter fallback local quando o Oracle estiver indisponível.

### 4. Paridade funcional

- comparar resultados da aplicação com Excel 2026 e Power BI para o mesmo cenário;
- ampliar os testes do Calculation Engine;
- registrar divergências por medida, unidade e contexto de filtro;
- não declarar paridade completa antes dessa comparação.

### 5. Fechamento do MVP

- concluir Overview e Resultados com dados validados;
- testar responsividade e fluxo ponta a ponta;
- decidir persistência definitiva e autenticação;
- preparar hospedagem da aplicação;
- executar validação final de segurança e aceite do usuário.

## Próxima ação exata

Ao abrir o projeto em outro computador, executar:

```text
npm install
npx playwright install chromium
npm run typecheck
npm test
npm run test:e2e
npm run dev
```

Em seguida, abrir o Layout e fazer a conferência visual da pendência 1. Se a máquina estiver na rede Metalsa, preparar o `.env` e executar somente o preflight; não ativar consultas ao vivo antes de revisar a allowlist.

## Prompt para retomada

> Leia `PROJECT-HANDOFF.md` e `docs/CURRENT-STATUS.md`. Continue exatamente da primeira pendência não concluída. Preserve as referências visuais, mantenha o Oracle estritamente somente leitura, não altere os arquivos de origem e rode typecheck/testes antes de fazer novas mudanças.
