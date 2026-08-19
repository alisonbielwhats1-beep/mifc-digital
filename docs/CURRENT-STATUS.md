# MIFC Digital — estado atual e pendências

Atualizado em: 2026-08-19  
Branch: `main`  
Repositório: `https://github.com/alisonbielwhats1-beep/mifc-digital`  
Último marco concluído: **Prompt 7 — Produtos, Processos, Recursos e Plano de Ações**

## Onde paramos

O MVP local está executável e os Prompts 1 a 6.1 foram realizados. O projeto está em repositório público com código, documentação, referências visuais e recursos extraídos usados durante a análise.

O Layout possui 32 blocos, 56 linhas editáveis e linhas específicas para Volvo FH, Volvo VM, Scania e DAF. A tela de Integrações agora consegue carregar, sob ação explícita do usuário, somente as consultas SQL aprovadas e manter os resultados na memória da API local.

Uma leitura real da consulta `base1` foi validada pelo proprietário na rede autorizada: 3.888 linhas, transação somente leitura e resposta HTTP 200. Nenhuma operação de escrita foi executada.

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
- 32 blocos semânticos iniciais, incluindo Beatty 1, 2, 3 e 4 separadas;
- 56 linhas semânticas iniciais;
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

### Prompt 6.2 — tabelas aprovadas e T-RF3

- botão único `Conectar tabelas aprovadas` na tela de Integrações;
- usuário e senha efêmeros, apagados do formulário ao terminar;
- execução sequencial apenas de SQL com fingerprint aprovada e uso já mapeado;
- transação `READ ONLY`, sem commit, rollback e fechamento obrigatório;
- linhas brutas mantidas somente na memória da API local e não enviadas ao navegador;
- resumo de tabelas, linhas, colunas e duração exibido em Integrações;
- filtros de FH, VM, Scania e DAF reproduzidos a partir dos TMDLs recebidos;
- `P-SCA-F`, `P-DAF-S`, `P-FH-F`, `P-VM-F`, `P-T-D` e `D-P-RF3` calculados fora do Power BI;
- `T-RF3` calculado com a regra PBIP `minutos disponíveis ÷ demanda em peças ÷ 1.440`;
- valor de `T-RF3` exibido nas quatro faixas de cliente quando as tabelas estão conectadas;
- parâmetro atual da RF3 vem do cadastro local de Capacidade (16,7 h / 1.002 min), com identificação explícita de fonte mista.

### Prompt 6.3 — atualização automática escalonada

- atualização iniciada somente depois da primeira carga autorizada das tabelas;
- apenas uma consulta Oracle executada por vez, sem concorrência entre tabelas;
- frequências por peso da fonte: 1 minuto para DAF Slitters e Segregação, 2 minutos para Shipdate e 5 minutos para Base1, Base2 e Scania;
- intervalo mínimo protegido em 60 segundos e ciclo do agendador em 15 segundos;
- comparação local por conjunto de linhas, com contagem de inclusões, remoções e linhas inalteradas;
- painel de Integrações atualizado a cada 15 segundos, exibindo próxima leitura, delta, duração e eventual limite atingido;
- Layout consulta as medidas em memória a cada 30 segundos, sem abrir nova conexão Oracle pelo navegador;
- limites de Base1, Base2, DAF Slitters e Scania ampliados para 20.000 linhas, com alerta visual ao atingir o teto;
- falha em uma atualização preserva o último conjunto válido em memória;
- consultas permanecem com fingerprint aprovada, transação `READ ONLY`, rollback e fechamento obrigatório.

Este modo é **quase em tempo real e incremental na memória local**. As consultas aprovadas atuais não possuem uma coluna confiável de última alteração; por isso cada tabela vencida ainda é relida integralmente no Oracle. Incremental real no banco (filtro por timestamp, SCN/CDC ou materialized view) depende de validação do DBA e de nova assinatura da consulta antes de ser habilitado.

### Prompt 6.4 — medidas adicionais no Layout

- demandas `D-P-B1`, `D-P-B3`, `D-P-B4`, `D-P-LPP2`, `D-P-STJ`, `D-P-SCA-REB` e `D-P-DAF-REB` reproduzidas conforme o DAX recebido;
- tempos `T-B1`, `T-B3`, `T-B4`, `T-LPP2`, `T-STJ`, `T-SCA-REB` e `T-DAF-REB` calculados com demanda Oracle e minutos disponíveis do cadastro local de Capacidade;
- `T-M3` publicado como zero porque a medida correspondente no PBIP é explicitamente constante `0`;
- valores exibidos automaticamente nas etapas e clientes definidos pela matriz de linhagem;
- `T-CNC`, `T-P.A`, `T-LCT/RF2` e `T-EMB-VM` permanecem sem número enquanto faltarem parâmetros ou fontes aprovadas suficientes;
- origem mista identificada no Layout como `Oracle automático + Capacidade local`;
- testes específicos adicionados para demandas e tempos de processo, sem apresentar ausência de dado como valor observado.

### Prompt 6.5 — paridade diária, filtros e máquinas separadas

- cálculos do Layout passam a usar uma data explícita equivalente a `Calendar[Date]`, iniciando no dia local atual;
- Base1, Base2 e DAF Slitters são filtradas em memória por `SHIP_DATE`, sem alterar o SQL aprovado e sem nova consulta Oracle;
- diagnóstico informa data do filtro e quantidade de linhas usadas em relação ao cache;
- Beatty 1, 2, 3 e 4 têm blocos, parâmetros e medidas separados;
- rotas confirmadas pelo TMDL: VM → `T-B1`, DAF → `T-B2`, Scania → `T-B3`, Volvo FH → `T-B4`;
- `T-LCT/RF2`, `T-P.A`, `T-CNC` e `T-EMB-VM` foram reproduzidas com as fórmulas do modelo semântico recebido;
- LCT/RF2 respeita os dois códigos de MP definidos no DAX e embalagem VM respeita a contagem de datas de embarque a partir de `TODAY()` no fuso de São Paulo;
- valores continuam em dias e usam três casas quando o arredondamento é representável (`0,001`); valores reais menores que `0,0005` ganham cinco casas para não aparecer como zero;
- layout e cadastro de Capacidade possuem migração local, preservando revisões e parâmetros existentes;
- Oracle permanece estritamente somente leitura; o filtro diário ocorre sobre o cache já autorizado.

### Prompt 6.6 — tabelas operacionais e medidas observadas

- as sete fontes antes marcadas como navegação M pendente foram materializadas como `SELECT *` somente nos objetos e no schema explicitamente aprovados pelo catálogo;
- o destino `Schema/Name` é relido do TMDL, comparado à allowlist e assinado antes de qualquer conexão Oracle;
- divergência de schema, objeto ou fingerprint bloqueia a consulta;
- `BI_PUNCH_SCA`, `BI_PUNCH_VDB`, `BI_OEE_SCRAP`, `Lotes`, `Paradas`, `Produção` e `BI_MIFC_LCT_POS_STOCK` entram na carga sequencial e na atualização escalonada;
- `Relatorio_bases` e `Relatorio_Item RF2`, já assinadas anteriormente, também receberam uso mapeado e passam a integrar a mesma carga; o conjunto inicial totaliza 15 fontes aprovadas;
- produção distinta por `RAIL_ID` foi ligada às medidas `P-RF3`, `P-B1`, `P-B2`, `P-B3`, `P-B4`, `P-P.A`, `P-CNC`, `P-LPP2`, `P-STJ` e `P-T`;
- produção restante, paradas programadas, paradas totais e downtime da RF3 seguem as expressões DAX catalogadas;
- estoque em metros, quantidade de slitters, peso, golpes Scania/Volvo e estoque pós-LCT foram ligados às fontes materializadas;
- os cards de processo mostram `Produzido / Demanda` quando a tabela `Produção` está realmente carregada; ausência de cache não aparece como zero observado;
- os objetos físicos confirmados no PBIP são `BOMES.BI_HEATMAP_SCRAP`, `BOMES.BI_MFIC_LOTES`, `BOMES.BI_MFIC_PARADAS` e `BOMES.BI_MFIC_PROD`; a allowlist e os fingerprints usam exatamente esses destinos;
- uma carga parcial válida inicia a atualização automática e preserva as tabelas que responderam, permitindo que uma fonte com falha seja tentada novamente sem derrubar as demais;
- nenhuma operação DML/DDL, procedure, múltipla instrução ou consulta enviada pelo navegador foi liberada.

### Prompt 7 — cadastros operacionais e Plano de Ações

- rotas Produtos, Processos, Recursos, Dados mestre e Configurações deixaram de usar placeholders;
- nova entrada Ações adicionada ao menu lateral com visualizações Tabela e Kanban;
- Produtos possui pesquisa, filtro, inclusão, edição, duplicação, ativação/inativação, detalhes e rota de processos;
- endpoint `GET /api/master-data/products` publica somente um catálogo sanitizado, derivado do cache das consultas já aprovadas; linhas brutas e SQL não são enviados ao navegador;
- atualização Oracle de produto preserva `overrides` locais em camada separada e nunca escreve no MES;
- Processos possui os 15 processos solicitados, vínculos com produtos, recursos, nós e medidas; participação dos clientes deriva de `docs/client-process-matrix.csv`;
- VM × Mesa 3 permanece pendente e ausente da rota até confirmação operacional;
- Recursos reutiliza horas, turnos, ciclo, capacidade e disponibilidade da tela Capacidade;
- produção, demanda, restante, paradas e downtime aparecem somente quando a respectiva medida está disponível no cache aprovado; ausência aparece como `—`;
- Plano de Ações inclui CRUD, duplicação, conclusão, reabertura, exclusão confirmada, progresso, evidência e cálculo automático de atraso;
- ações podem ser ligadas a produto, processo, recurso e nó; o painel do Layout abre processos, cria ações relacionadas e mostra contagem aberta/atrasada;
- Dados mestre administra parâmetros, unidades, origem e status; Configurações administra preferências e restauração controlada dos dados locais;
- filtros, preferências e cadastros são persistidos em `localStorage` sob uma chave versionada, preparados para migração a banco próprio;
- testes cobrem CRUD, status/atraso, vínculos, separação Oracle/override e persistência após nova instância do store.

## Validação executada

- `npm run typecheck`: aprovado;
- `npm test`: 57 testes aprovados (12 arquivos);
- `npm run build`: aprovado;
- servidor local: respondeu em `http://127.0.0.1:5173/`;
- `npm run test:e2e`: não executado neste checkpoint porque o binário do Playwright/Chromium não está disponível no ambiente de trabalho;
- branch local contém as alterações até o Prompt 6.6 e ainda não foi enviada ao `origin/main`.

## Parcial ou ainda não validado

- Overview e Resultados ainda funcionam como prévias com dados locais; o Layout já recebe RF3, quatro Beattys, LCT/RF2, P.A, CNC, Pintura, Stenhoj, embalagem VM e Rebitagens por fonte mista;
- os formulários estão funcionais, mas a validação operacional final de todos os campos contra o Excel 2026 deve ser feita pelo usuário da área;
- 309 medidas existem no modelo Power BI; nem todas foram migradas para o Calculation Engine;
- as 62 medidas usadas nos cartões do Layout foram catalogadas, mas seus valores atuais dependem das fontes online;
- as 47 conexões iniciais do novo Layout seguem a referência visual e ainda precisam de validação operacional da planta;
- a suíte visual do Playwright está pronta, mas precisa da primeira execução em uma máquina com Chromium instalado (`npx playwright install chromium`);
- a participação de Volvo VM na Mesa 3 requer confirmação operacional; até lá a linha permanece reta e sinalizada como pendente;
- persistência atual é local no navegador; banco próprio da aplicação, autenticação e perfis ainda não foram implementados;
- o código está no GitHub público, mas a aplicação ainda não foi hospedada como site online.
- os parâmetros de tempo disponível por máquina ainda usam o cadastro local de Capacidade; para igualdade numérica completa com o Power BI, os minutos de RF3, Beattys 1–4, LCT, P.A, CNC, Pintura e Stenhoj precisam ter os mesmos valores da planilha `Máquinas` usada na atualização comparada.
- o modo automático reduz picos por escalonamento, mas ainda não faz incremental no Oracle; falta uma chave de alteração confiável ou mecanismo CDC aprovado pelo DBA.

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

Em seguida, abrir o Layout, selecionar a mesma data exibida/filtrada no Power BI e comparar `T-RF3`, `T-B1`, `T-B2`, `T-B3`, `T-B4`, `T-LCT/RF2`, `T-P.A` e `T-CNC`. Se houver divergência numérica, conferir na tela Capacidade se os minutos disponíveis das máquinas são iguais aos da planilha de parâmetros usada pelo Power BI.

## Prompt para retomada

> Leia `PROJECT-HANDOFF.md` e `docs/CURRENT-STATUS.md`. Continue exatamente da primeira pendência não concluída. Preserve as referências visuais, mantenha o Oracle estritamente somente leitura, não altere os arquivos de origem e rode typecheck/testes antes de fazer novas mudanças.
