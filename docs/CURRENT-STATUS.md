# MIFC Digital — estado atual e pendências

Atualizado em: 2026-08-20
Branch: `main`
Repositório: `https://github.com/alisonbielwhats1-beep/mifc-digital`
Último marco concluído: **Prompt 2 — reorganização funcional e experiência de uso**

## Onde paramos

### Prompt 2 — reorganização funcional e experiência de uso — 2026-08-20

- menu reorganizado em OPERAR, ALIMENTAR e ADMINISTRAR, com MIFC, Cadastros e Configurações recolhíveis;
- Visão Geral substituiu a duplicidade com Dashboard; `/dashboard` redireciona e Relatórios foi apenas ocultado enquanto continuar placeholder;
- Visão Geral agora usa o mesmo estado, linhagem e cálculo do Layout para Lead Time, VA, NVA, WIP, gargalo, produção × demanda, atrasos e conexão MES, falhando fechado quando a fonte não está pronta;
- contadores técnicos foram movidos para a nova tela Diagnóstico;
- painel do Layout inicia recolhido e abre por contexto; cliente permite editar Volume e Logística e recalcular imediatamente Beneficiador/Lead Time;
- biblioteca de símbolos preserva o estado recolhido/expandido;
- formulários passaram a ser isolados por revisão, e uma nova revisão clona explicitamente sua origem;
- Produtos resume a rota em `N processos` com diálogo; Processos distingue Validado/Divergente/Pendente; Máquinas & Recursos exibe observado e encaminha planejamento para Capacidade;
- Integrações recebeu diagnóstico Power BI / Semantic Model explicitamente offline, baseado no inventário documental;
- tabelas receberam rolagem controlada em larguras menores;
- nenhuma fórmula de Slitter, buffer, tempo de máquina ou `LT-TOTAL-*` foi alterada;
- relatório completo: `docs/prompt-2-ux-reorganization.md`;
- validação: typecheck, 88 testes unitários, build, 18 testes Chromium e auditoria de dependências aprovados.

### Beneficiador, Slitter e reconciliação do Lead Time — 2026-08-20

- Logística recebeu `Beneficiador (dias)` manual por cliente; snapshots locais schema 1/2 migram para schema 3 com valor inicial zero;
- o bloco `Beneficiador` foi incluído no começo do fluxo de materiais e exibe FH, VM, Scania e DAF no próprio card; layouts salvos migram para schema 6 sem apagar revisões;
- transporte e movimentação deixaram de ser constantes escondidas no total funcional e usam os valores manuais da linha do cliente;
- Slitter reproduz `Lotes[MP(m)] = (PESO/7850) / ((ESPESSURA/1000) × (LARGURA/1000))`, `C-P-M-TOTAL`, `ROUNDDOWN` e `Q-D-*`; `Produção[ITEM(m)]` não participa;
- FH e VM preservam o agrupamento de lotes `VDB` do modelo semântico, mas cada cliente divide o estoque em peças pela sua própria medida `P-M-*`;
- os tempos `T-*` aparecem nos cards das máquinas físicas e entram uma única vez no total; CC, Furação, Pintura e SEE permanecem ENNs, sem subtotal duplicado;
- estoques automáticos são agrupados em símbolos de buffer ancorados a Slitter, LCT, RF2, RF3, Mesa 3, Beattys, P.A/Cantilever, Pintura/Rebitagem e Stenhoj/Embalagem;
- o total ampliado se chama `LT-TOTAL-FH/VM/SCA/DAF`, pois é uma regra funcional da aplicação; as medidas originais `T-T-*` do PBIP continuam identificadas separadamente e não são renomeadas;
- se faltar parâmetro manual, estoque ou tempo de máquina, o total fica `—`; nenhuma soma parcial é publicada como total observado.

### Prompt 1.1 — validação de produção, ciclo e capacidade (2026-08-20)

- conexão OMES validada com transação somente leitura; catálogo de 15 consultas auditado como `SELECT-ONLY`;
- leituras live habilitadas apenas nos processos temporários de diagnóstico; `.env` permaneceu com live desativado;
- owner confirmou `LOCATION_DATE` como data/hora canônica de produção, reproduzindo o Power BI;
- defeito corrigido: o Digital usava `CREATION_DATE`; teste RED recebeu 1 contra 2 esperados e ficou GREEN após a correção;
- snapshot `OMES-2026-08-20T1137-BRT` fechou diferença zero em RF3, Beattys 1–4, P.A, CNC, Pintura e Stenhoj entre OMES agregado, DAX recalculado e MIFC corrigido;
- valor visual de um refresh Power BI coincidente, unidade física de `RAIL_ID`, CT nominal oficial, capacidade efetiva e OEE permanecem pendentes;
- `928` das Beattys foi identificado como `58 unid./h × 16 h`; não é produção OMES e não incorpora o input local de 82%;
- relatório detalhado: `docs/MIFC-PRODUCTION-VALIDATION-2026-08-20.md`;
- matriz tabular: `docs/mifc-machine-production-validation.csv`.

### Correção Funcional 01 — 2026-08-20

- Layout passou a funcionar como cockpit para cliente, processo/máquina, buffer, valores de etapa e tempo total;
- painel de rastreabilidade mostra fórmula, entradas, intermediários, origem, medida, filtros, data e referência;
- os quatro totais de cliente reproduzem os componentes e multiplicadores do TMDL e fecham como `—` se faltar qualquer parcela;
- medidas opcionais de estoque/segregação/LCT/RF2 não transformam ausência de fonte em zero;
- cinco buffers configurados são renderizados com o símbolo PBIP, WIP, tempo, origem e vínculos, acompanhando os processos;
- volume/reforço do cliente pode ser editado no Layout e recalcula imediatamente pares/dia e dias de buffer;
- Tempo de Ciclo sincroniza Layout ↔ Capacidade, e os campos receberam rótulos/unidades inequívocos;
- busca global, ajuda contextual, notificações reais e biblioteca recolhível/expansível foram ativadas;
- cadastros operacionais desativam/reativam sem apagar e mantêm identificação visual;
- relatório detalhado: `docs/functional-correction-01-checkpoint.md`;
- validação final: typecheck, 78 testes unitários, build, 10 testes Chromium e auditoria de dependências aprovados;
- paridade numérica Power BI × MIFC × MES permanece pendente até existir carga Oracle e refresh PBIP coincidentes no mesmo período/filtros.

O MVP local está executável e os Prompts 1 a 6.1 foram realizados. O projeto está em repositório público com código, documentação, referências visuais e recursos extraídos usados durante a análise.

O Layout possui 33 blocos, incluindo o Beneficiador, e linhas específicas para Volvo FH, Volvo VM, Scania e DAF. A tela de Integrações agora consegue carregar, sob ação explícita do usuário, somente as consultas SQL aprovadas e manter os resultados na memória da API local.

Uma leitura real da consulta `base1` foi validada pelo proprietário na rede autorizada: 3.888 linhas, transação somente leitura e resposta HTTP 200. Nenhuma operação de escrita foi executada.

### Atualização de paridade do Layout — 2026-08-19

- camada `layout-stock-measures.ts` adicionada para materializar estoque por cliente/local, pós-processo, segregação, RF2 e LCT;
- transformações derivadas do PBIP para FH, VM, Scania e DAF reproduzidas no cálculo, incluindo a combinação DAF Base2 + DAF SIMPLES/REFORÇADA;
- valores de estoque passaram a aparecer na linhagem/tooltip de cada etapa do Layout, mantendo a faixa visual somente numérica;
- `npm run typecheck`, `npm test` e `npm run build` aprovados no checkpoint anterior;
- a paridade continua parcial até comparar uma carga Oracle real com a mesma data/revisão do Power BI e receber `Máquinas`/`Parâmetros.xlsx`; `Programacao_embarque.xlsx` já foi validado e integrado.

### Integração da Programação de Embarque — 2026-08-19

- caminho principal configurado como `\\metbrosawfse01\Publico\PowerBI\Logística\Programacao_embarque.xlsx`, sempre em leitura;
- a API tenta carregar a programação automaticamente ao iniciar e limita a espera da rede a 12 segundos;
- a tela Integrações permite atualizar da rede ou selecionar manualmente um `.xlsx` quando o compartilhamento estiver indisponível;
- o importador valida a aba `Data Embarque` e os cabeçalhos `Flatbed`, `Data` e `Horário`, limita o arquivo a 10 MB e não executa fórmulas ou macros;
- as transformações da consulta M foram preservadas, incluindo remoção da última linha útil e recomposição de `Data__horario` quando vazia;
- o arquivo real foi lido diretamente da rede: 35 linhas válidas, 19 SCANIA, 12 VM e 4 DAF, entre 19/08/2026 e 27/08/2026;
- foram reproduzidas as chaves `FH Flatbed_2`, `VM.Flatbed_2`, `SCANIA.Flatbed_2`, `DAF.Flatbed` e `DAF SLITTERS.Data` para `Dados de embarque.Flatbed`;
- os cartões de embalagem respeitam `Calendar[Date]`, `Dados de embarque[Data] >= TODAY()` e os filtros visuais de `Operações[Dados ]`, incluindo `Ag. Emb1` + `Estoque FG` para o bloco SCANIA;
- sem programação válida em memória, as medidas de embalagem dependentes do arquivo permanecem ausentes (`—`) em vez de exibir zero como dado observado;
- testes adicionados para estrutura do Excel, datas seriais, geração das cinco chaves e contexto de filtro dos blocos.

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

### Ajuste de apresentação e edição do Layout

- canvas ampliado para `2260 × 1160`, mantendo pan, zoom, ajuste à tela e tela cheia;
- zoom inicial prioriza legibilidade; o mapa pode ultrapassar a janela e ser navegado com o botão central ou `Mover tela`;
- cards produtivos maiores, com quebra de linha, fonte responsiva ao tamanho do bloco e contenção de textos/medidas;
- Beattys deixam a grade 2×2 e passam à cascata física `Beatty 3 → Beatty 4 → Beatty 2 → Beatty 1`, como no Power BI de referência;
- faixas de clientes aumentadas para 330 px, com títulos, nomes de etapa, linhas, marcadores e valores maiores;
- os picos das faixas deixam de usar uma posição Beatty agregada: FH acompanha Beatty 4, VM acompanha Beatty 1, Scania acompanha Beatty 3 e DAF acompanha Beatty 2;
- toda etapa da faixa é posicionada a partir do respectivo bloco do Layout; ao mover uma máquina, somente seu pico acompanha a nova posição;
- `Ctrl/Shift + clique` adiciona/remove blocos da seleção; arraste normal move somente o bloco clicado e o arraste de grupo exige manter `Ctrl/Shift` ao iniciá-lo;
- exclusão com vários blocos selecionados remove também suas conexões, exige confirmação e pode ser desfeita;
- migração de Layout schema 6 preserva a composição legível e acrescenta o Beneficiador às revisões locais existentes sem apagar propriedades ou medidas.

### Auditoria de paridade Power BI

- as faixas de clientes exibem somente valores numéricos; nomes/chaves de medidas permanecem apenas na linhagem e no tooltip;
- uma medida ausente aparece como `—`, sem usar `T-RF3`, `T-B1` ou outra chave técnica como falso valor;
- a interface sinaliza `Paridade Power BI parcial` enquanto a matriz completa não estiver validada;
- a auditoria em `docs/power-bi-parity-audit.md` registra a cobertura atual e as lacunas de filtros, relacionamentos, parâmetros e medidas;
- o TMDL recebido contém 309 medidas e o Layout catalogado usa 62 medidas únicas; não há declaração de paridade integral nesta revisão.

### Gate 0.5 — contrato e validação documental (2026-08-20)

- os quatro anexos do gate foram localizados e inspecionados integralmente: manual de 20 páginas, treinamento de 75 slides e dois workbooks;
- o Semantic Model foi inventariado em 817 registros: 44 tabelas, 367 colunas, 309 medidas, 44 partições e 53 relacionamentos;
- `docs/MIFC-DATA-CONTRACT.md` fixa unidades, granularidades, calendário, timezone, produção×capacidade, Beattys, rotas, Lead Time e estados de ausência;
- `docs/MIFC-SOURCE-MATRIX.md` registra todas as fontes físicas/lógicas, objetos Oracle/SQL Server, arquivos Excel, 26 tabelas visíveis, workbooks, rotas e buffers;
- `docs/MIFC-VALIDATION-GATES.md` contém 30 gates: 7 `VALIDADO`, 10 `PARCIAL`, 6 `DIVERGENTE` e 7 `PENDENTE`, além de seis Golden Cases sem números inventados;
- `docs/MIFC-SYMBOL-MATRIX.md` confronta os 31 símbolos oficiais com a biblioteca atual;
- `docs/MIFC-OPEN-QUESTIONS.md` registra 30 decisões humanas, com owners sugeridos e impacto;
- nenhuma regra de negócio, fórmula DAX, workbook, UI ou consulta Oracle foi alterada para aproximar resultados;
- a separação estrutural das Beattys 1–4 foi validada; a paridade numérica MES↔Power BI↔Digital continua pendente;
- divergências principais: reunião do segundo turno ignorada pela fórmula, `E-B-SCA` sem ramo falso, conversões `×2/÷2` inconsistentes, zeros-placeholder e composição de Lead Time diferente da metodologia.

## Validação executada

- `npm run typecheck`: aprovado;
- `npm test`: 88 testes aprovados (20 arquivos);
- `npm run build`: aprovado;
- servidor local: respondeu em `http://127.0.0.1:5173/`;
- `npm run test:e2e`: 18 cenários aprovados no Chromium;
- `npm audit --audit-level=high`: 0 vulnerabilidades;
- branch local contém as alterações até este checkpoint e ainda não foi enviada ao `origin/main`.

## Parcial ou ainda não validado

- Visão Geral agora é funcional e falha fechada, mas seus valores observados ainda dependem do cache MES autorizado; Relatórios permanece oculto até existir exportação real;
- os formulários estão funcionais, mas a validação operacional final de todos os campos contra o Excel 2026 deve ser feita pelo usuário da área;
- 309 medidas existem no modelo Power BI; as 62 medidas usadas nos cartões do Layout foram catalogadas, e as famílias de demanda, operação, estoque e segregação agora têm cálculo local/Oracle para o Layout;
- os valores atuais ainda dependem das fontes Oracle online e da validação dos parâmetros de máquina; a programação de embarque já possui rede direta e fallback por anexo;
- as 47 conexões iniciais do novo Layout seguem a referência visual e ainda precisam de validação operacional da planta;
- a suíte visual do Playwright foi executada com Chromium; novas mudanças de UI devem continuar rodando `npm run test:e2e`;
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

Em seguida, responder primeiro `OQ01`–`OQ12` e `OQ30` de `docs/MIFC-OPEN-QUESTIONS.md`. Dentro da rede autorizada, escolher um snapshot fechado e executar `GC01`–`GC06` de `docs/MIFC-VALIDATION-GATES.md`, registrando para cada valor a fonte, unidade, filtros, timestamp e resultado bruto. Não ajustar fórmula para compensar divergência.

## Prompt para retomada

> Leia `PROJECT-HANDOFF.md` e `docs/CURRENT-STATUS.md`. Continue exatamente da primeira pendência não concluída. Preserve as referências visuais, mantenha o Oracle estritamente somente leitura, não altere os arquivos de origem e rode typecheck/testes antes de fazer novas mudanças.
