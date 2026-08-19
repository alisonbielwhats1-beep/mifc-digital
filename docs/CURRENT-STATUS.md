# MIFC Digital — estado atual e pendências

Atualizado em: 2026-08-19  
Branch: `main`  
Repositório: `https://github.com/alisonbielwhats1-beep/mifc-digital`  
Último marco concluído: **Prompt 6 — Layout MIFC editável**

## Onde paramos

O MVP local está executável e os Prompts 1 a 6 foram realizados. O projeto foi publicado em repositório privado com código, documentação, referências visuais e recursos extraídos usados durante a análise.

O último trabalho realizado foi a correção do Layout: o canvas bruto ultralargo importado do PBIP foi retirado da interface principal e substituído por um grafo semântico compacto baseado na imagem aprovada. O Layout atual possui 29 blocos, 47 linhas editáveis e quatro faixas inferiores de Lead Time/Dados.

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

## Validação executada

- `npm run typecheck`: aprovado;
- `npm test`: 29 testes aprovados;
- `npm run build`: aprovado;
- servidor local: respondeu em `http://127.0.0.1:5173/`;
- branch local e `origin/main`: sincronizados no momento deste checkpoint.

## Parcial ou ainda não validado

- Overview e Resultados funcionam como prévias com dados locais, não com dados atuais do Oracle;
- os formulários estão funcionais, mas a validação operacional final de todos os campos contra o Excel 2026 deve ser feita pelo usuário da área;
- 309 medidas existem no modelo Power BI; nem todas foram migradas para o Calculation Engine;
- as 62 medidas usadas nos cartões do Layout foram catalogadas, mas seus valores atuais dependem das fontes online;
- as 47 conexões iniciais do novo Layout seguem a referência visual e ainda precisam de validação operacional da planta;
- a comparação automatizada por screenshot do último Layout falhou por um problema do conector de navegador com o caminho Unicode do perfil; build e testes passaram, mas a conferência visual lado a lado ainda é necessária;
- persistência atual é local no navegador; banco próprio da aplicação, autenticação e perfis ainda não foram implementados;
- o código está no GitHub privado, mas a aplicação ainda não foi hospedada como site online.

## Pendências em ordem recomendada

### 1. Conferência visual e funcional do Layout

- abrir `/mifc/layout`;
- comparar lado a lado com `assets/ui-references/metalsa-mifc-layout.png`;
- validar nomes, posições, clientes, fornecedores e áreas de apoio;
- selecionar algumas linhas e testar origem, destino, tipo e curvatura;
- confirmar as conexões reais com a equipe da planta.

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
npm run typecheck
npm test
npm run dev
```

Em seguida, abrir o Layout e fazer a conferência visual da pendência 1. Se a máquina estiver na rede Metalsa, preparar o `.env` e executar somente o preflight; não ativar consultas ao vivo antes de revisar a allowlist.

## Prompt para retomada

> Leia `PROJECT-HANDOFF.md` e `docs/CURRENT-STATUS.md`. Continue exatamente da primeira pendência não concluída. Preserve as referências visuais, mantenha o Oracle estritamente somente leitura, não altere os arquivos de origem e rode typecheck/testes antes de fazer novas mudanças.
