# MIFC Digital — matriz oficial de fontes

Data do inventário: 2026-08-20

Escopo: anexos do Prompt 0.5, PBIP/Semantic Model local e implementação MIFC Digital

Regra: todas as inspeções de banco foram estáticas; nenhuma consulta Oracle ou SQL Server foi executada.

## 1. Fontes recebidas e papel oficial

| Fonte | Tipo | Papel | Revisão/data observada | Estado |
|---|---|---|---|---|
| `MIFC-H-V1-POR.docx` | manual metodológico | definição do mapa, fluxo, estoque/estagnação e Lead Time | rev. 2.2, 2013; 20 páginas | DISPONÍVEL E INSPECIONADO |
| `MIFC-UG-V1-POR.pptx` | treinamento metodológico | exemplos de cálculo e sequência de construção | copyright 2016; 75 slides | DISPONÍVEL E INSPECIONADO |
| `MIFC-F1-V1-POR.xlsx` | formulário/símbolos | catálogo visual e descrição dos símbolos | 2 planilhas | DISPONÍVEL E INSPECIONADO |
| `MIFC Action Plan 2026 - Osasco Plant R01.xlsx` | plano/referência histórica | volumes, mapas anuais, WIP, resumos e ações | R01; 17 planilhas | DISPONÍVEL, COM DIVERGÊNCIAS |
| `MIFC.SemanticModel/definition` | modelo Power BI | DAX, Power Query, tabelas, relações e fontes correntes | conteúdo local do modelo | DISPONÍVEL E INVENTARIADO |
| PBIP/relatório local | camada visual | cartões, filtros, posições e linhagem do Layout | 624 visuais; 552 no Layout | DISPONÍVEL E INVENTARIADO |
| MIFC Digital | aplicação | cenários, revisões, editor, cálculo e integração somente leitura | estado local atual | DISPONÍVEL; PARIDADE OPERACIONAL PENDENTE |

Nenhum anexo solicitado ficou indisponível.

## 2. Cobertura do Semantic Model

O inventário completo está em [mifc-semantic-model-inventory.csv](./mifc-semantic-model-inventory.csv) e pode ser regenerado por [generate-mifc-semantic-inventory.mjs](../scripts/generate-mifc-semantic-inventory.mjs).

| Item | Quantidade |
|---|---:|
| Tabelas | 44 |
| Tabelas visíveis | 26 |
| Tabelas ocultas de data automática | 18 |
| Colunas | 367 |
| Medidas | 309 |
| Partições | 44 |
| Relacionamentos | 53 |
| Relacionamentos ativos | 51 |
| Relacionamentos inativos | 2 |

Relações inativas identificadas: uma relação de `Lotes.Data` com `Calendar.Date` e uma relação envolvendo `MP.Cliente` e `Emb Offset.Cliente`. Relação inativa não participa do contexto sem ativação explícita na medida.

## 3. Mapa das 26 tabelas visíveis

Todas as partições estão em modo `import`. O agendamento e a última atualização pertencem ao serviço/gateway e não constam do TMDL; portanto, “atualização” abaixo descreve a janela da consulta, não um SLA.

| Tabela | Fonte física/lógica | Granularidade dominante | Unidades/fatos | Filtros/janela relevantes | Atualização/status |
|---|---|---|---|---|---|
| `1-Measure` | tabela DAX calculada de uma linha | contêiner de medidas | 309 medidas | contexto herdado das relações/visuais | INVENTARIADA; resultado por gate |
| `Base_Desc_Hora` | tabela M embutida | faixa horária | hora, sequência | estática | VALIDADA estruturalmente |
| `BI_MIFC_LCT_POS_STOCK` | Oracle `BOMES.BI_MIFC_LCT_POS_STOCK` | posição/estoque LCT | peças/posições a confirmar por coluna | sem filtro M adicional | PARCIAL; Golden Case de buffer pendente |
| `BI_OEE_SCRAP` | Oracle `BOMES.BI_HEATMAP_SCRAP` | evento de sucata | ocorrências | `DESCRIPTION="Metalsa"`; exclui defeitos de teste/obsoleto | PARCIAL; unidade e snapshot pendentes |
| `Calendar` | DAX `TODAY()-7` a `TODAY()+10` | dia | minutos/dia | hoje usa minutos de `NOW()`; demais 1.440 | DIVERGENTE de calendário fabril |
| `Dados de embarque` | `Programacao_embarque.xlsx` em rede | flatbed + data/hora | programação | remove vazios e última linha | PARCIAL; refresh/SLA externo |
| `DAF SLITTERS` | SQL nativo Oracle | ordem/JOB DAF aberta | quantidade e `Pares Slitter` | DAF, operação 9, `SYSDATE-2` a `+30`, status 2 | PARCIAL; paridade pendente |
| `DAF` | derivada de `Base2` + consultas DAF | item/chassi/localização | estoque/itens | exclui Beatty 2, Slitter e RF3 Input em etapas | PARCIAL; filtros inventariados |
| `dOperacao` | tabela M embutida | operação | capacidade e abastecimento | estática | PENDENTE: unidade operacional não fechada |
| `Emb Offset` | `Capacidade Embalagem.xlsx`, tabela `Emb.Offset` | cliente | peças/h e min | tabela de parâmetros | PARCIAL; revisão/refresh pendentes |
| `Emb Reta` | `Capacidade Embalagem.xlsx`, tabela `Emb.Reta4` | cliente | peças/h e min | tabela de parâmetros | PARCIAL; revisão/refresh pendentes |
| `FH` | derivada de `Base1` | componente/chassi/localização FH | peças/estoque | cliente FH; substituições de localização; divisão RF2/RF3 por MP | PARCIAL; rota agregada |
| `Lotes` | Oracle `BOMES.BI_MFIC_LOTES` | lote | lote/data | data derivada de `CREATION_DATE` | PARCIAL; unidade/snapshot pendentes |
| `MP` | tabela M embutida | MP + tipo + cliente | classificação | estática | VALIDADA como parâmetro do modelo |
| `Máquinas` | `Parâmetros.xlsx`, tabela `Máquinas` | máquina | horas/minutos disponíveis | parâmetro planejado | PARCIAL; vigência/revisão pendentes |
| `Operações` | tabela M embutida | operação | ranking | estática | VALIDADA como dimensão auxiliar |
| `Paradas` | Oracle `BOMES.BI_MFIC_PARADAS` | intervalo de parada | timestamps/minutos derivados | data da parada; códigos/operação nas medidas | PARCIAL; timezone pendente |
| `Produção LCT` | SQL Server `DT_LOGGER.dbo.GOLPES_LCT` | tag + timestamp | `_VALUE` de ciclos/hora | tag `LCT.PLC_1215C.PRODUÇÃO.CICLOS_POR_HORA` | PENDENTE: ciclo→peça |
| `Produção RF2` | SQL Server `DT_LOGGER.dbo.GOLPES_RF2` | tag + timestamp | `_VALUE` | datas desde 2024-05-03 | PENDENTE: ciclo→peça |
| `Produção` | Oracle `BOMES.BI_MFIC_PROD` | `RAIL_ID` + localização/data | `RAIL_ID` distintos; peça física pendente | descrição de processo; dia/hora por `LOCATION_DATE` | PARCIAL; snapshot OMES validado, refresh visual PBI e unidade pendentes |
| `Relatorio_bases` | SQL nativo Oracle | `RAIL_ID`/item/lote | peças/base | últimos 365 dias, item BB, status OK | PARCIAL; snapshot pendente |
| `Relatorio_Item RF2` | SQL nativo Oracle | `RAIL_ID`/item/lote | comprimento e item | MP allowlist, localização 185, status 6/7, 180 dias | PARCIAL; conversão/resultado pendentes |
| `SCANIA` | SQL nativo Oracle + consultas derivadas | item/chassi/localização | conjuntos/itens | SCA, item `1-F*`, estoque FG e simples/reforçada | PARCIAL; granularidade por família pendente |
| `Segregacao` | SQL nativo Oracle + lookup `Processos e ENNs` | peça não conforme | quantidade=1 | status 8/9, 60 dias, NC aberto; exclui `RAIL_ID 1896038` | DIVERGENTE: dependência Excel obsoleta e exclusão literal |
| `SHIPDATE` | SQL nativo Oracle | componente/chassi/flatbed/localização | itens/peças | operações 4–7, `SYSDATE` a `+1`, status 2 | PARCIAL; janela dinâmica |
| `VM` | derivada de `Base1` | componente/chassi/localização VM | peças/estoque | exclui outras famílias; remapeia localizações | PARCIAL; rota agregada |

### 3.1 Tabelas desconectadas e parâmetros

As tabelas visíveis sem relacionamento físico são: `1-Measure`, `BI_MIFC_LCT_POS_STOCK`, `Dados de embarque`, `DAF SLITTERS`, `Emb Offset`, `Emb Reta`, `Máquinas`, `Produção LCT`, `Produção RF2` e `Relatorio_Item RF2`. Elas só afetam resultados quando uma medida as referencia diretamente ou aplica filtros virtuais; não herdam automaticamente o contexto de cliente/data.

Não foi encontrado um objeto What-if Parameter dedicado. Os parâmetros correntes estão principalmente em `Máquinas`, `dOperacao`, `MP`, `Operações`, `Emb Offset`, `Emb Reta` e constantes DAX. Essa desconexão faz parte da regra e precisa ser reproduzida explicitamente.

### 3.2 Mapa oficial das informações críticas

| Elemento | Campo/medida | Fonte | Unidade | Granularidade | Filtros | Atualização | Status |
|---|---|---|---|---|---|---|---|
| Produção RF3 | `P-RF3` | Oracle `BI_MFIC_PROD` | `RAIL_ID` distintos | máquina + período + `RAIL_ID` | `DESCRIPTION="Roll Former 3"`; dia/hora de `LOCATION_DATE` | refresh import | PARCIAL; 193 no snapshot canônico |
| Produção Beatty 1 | `P-B1` | Oracle `BI_MFIC_PROD` | `RAIL_ID` distintos | máquina + período + `RAIL_ID` | `Beatty Alma Output 1`; dia/hora de `LOCATION_DATE` | refresh import | PARCIAL; 70 no snapshot canônico |
| Produção Beatty 2 | `P-B2` | Oracle `BI_MFIC_PROD` | `RAIL_ID` distintos | máquina + período + `RAIL_ID` | `Beatty Alma Output 2`; dia/hora de `LOCATION_DATE` | refresh import | PARCIAL; 58 no snapshot canônico |
| Produção Beatty 3 | `P-B3` | Oracle `BI_MFIC_PROD` | `RAIL_ID` distintos | máquina + período + `RAIL_ID` | `Beatty Alma Output 3`; dia/hora de `LOCATION_DATE` | refresh import | PARCIAL; 72 no snapshot canônico |
| Produção Beatty 4 | `P-B4` | Oracle `BI_MFIC_PROD` | `RAIL_ID` distintos | máquina + período + `RAIL_ID` | `Beatty Alma Output 4`; dia/hora de `LOCATION_DATE` | refresh import | PARCIAL; 60 no snapshot canônico |
| Produção LCT | `P-LCT` / `_VALUE` | SQL Server `GOLPES_LCT` | ciclos; peças não comprovadas | tag + timestamp/hora | nome exato do tag, período | refresh import | PENDENTE |
| Produção RF2 | família `P-RF2` / `_VALUE` | SQL Server `GOLPES_RF2` | ciclos; peças não comprovadas | tag + timestamp/hora | desde 2024-05-03, período | refresh import | PENDENTE |
| Pares FH | `P-FH-F = T-I-FH/2` | tabela `FH` derivada do Oracle | pares | família + chassi/item + período | FH, MP/local/data do visual | refresh import | PARCIAL |
| Pares VM | `P-VM-F` | tabela `VM` derivada do Oracle | pares | família + chassi/item + período | VM, local/data | refresh import | PARCIAL |
| Pares Scania | `P-SCA-F` | tabela `SCANIA` | pares | família + componente + período | SCA, simples/reforçada, local | refresh import | PARCIAL |
| Pares DAF | `P-DAF-S` | `DAF` + `DAF SLITTERS` | pares | família + item/JOB + período | DAF, local/status/janela | refresh import | PARCIAL |
| Demanda total | `P-T-D` | soma das famílias | pares | período + filtros de família | contexto do visual | derivado no refresh/consulta | PARCIAL |
| Demanda RF3 | `D-P-RF3 = P-T-D×2` | DAX | peças | RF3 + período | contexto de demanda | derivado | PARCIAL |
| Demanda Beattys | `D-P-B1..B4` | DAX + família correspondente | peças | Beatty + período | B1=VM, B2=DAF, B3=SCA, B4=FH | derivado | PARCIAL |
| Tempo planejado de máquina | `T-P-M-*` | Excel `Máquinas` | minutos | máquina + revisão | nome exato da máquina | refresh de parâmetro | PARCIAL |
| Tempo líquido | `T-D-L-*` | Calendar + Paradas + `F-H` | minutos | máquina + período | operação, códigos de parada, data | derivado | PARCIAL/DIVERGENTE |
| Ciclo observado calculado | `T-C-* = T-D-L-*/P-*` | DAX | min/`RAIL_ID` no período | máquina + período | mesmos filtros de tempo e produção | derivado | PARCIAL; não comparável diretamente ao CT nominal em s/ciclo |
| Takt planejado | `TKT-C-* = T-P-M-*/D-P-*` | DAX + parâmetros | min/peça | máquina + revisão/período | máquina e demanda | derivado | PARCIAL |
| Parada programada | `P-P-*` | Oracle `BI_MFIC_PARADAS` | minutos | máquina/operação + intervalo | códigos `L9/O3/M6/O2`, operação | refresh import | PARCIAL |
| Capacidade de referência | `capacityRows` / `dOperacao` | Digital + tabela M/Excel | unidade/h ou unidade/dia pendente | máquina + revisão | processo ativo | cenário | PARCIAL; não é produção OMES |
| Capacidade nominal/h | `nominalCapacityPerHour` | Digital/parâmetro de máquina | ciclos/h ou unidade/h pendente | máquina + revisão | recurso ativo | cenário | PARCIAL; fator ciclo→saída não aprovado |
| Capacidade de referência/dia | `referenceCapacityPerDay` | Digital/parâmetro de máquina | unidade/dia pendente | máquina + revisão + turnos | recurso ativo | cenário | PARCIAL; Beatty `928=58×16` |
| Capacidade efetiva | regra ainda bloqueada | calendário + disponibilidade + capacidade | peças/período | máquina + período/revisão | turnos/calendário/OEE | derivado | PENDENTE |
| Produção da hora/dia | medidas `P-*` sob filtro temporal | Oracle/SQL Server | `RAIL_ID` distintos ou ciclos, conforme fonte | máquina + hora/dia | Oracle por `LOCATION_DATE`; SQL Server por timestamp do tag | refresh import | PARCIAL |
| Disponibilidade | parâmetro `availabilityPercent` | Digital/input | % planejado | máquina + revisão | recurso ativo | cenário | PARCIAL; não observado |
| OEE | nenhuma medida explícita identificada | fonte não definida | % | máquina + período | A DEFINIR | A DEFINIR | PENDENTE |
| Estoque por ponto | famílias `E-*` | FH/VM/SCANIA/DAF/SHIPDATE | peças/conjuntos a declarar | cliente + localização + período | cliente, local, item, ship date | refresh import | PARCIAL |
| Dias de estoque | famílias `D-E-*`, `E-P-D-*`, `Q-D-*` | DAX | dias | cliente + ponto + período | localização, MP, operação, data | derivado | DIVERGENTE/PARCIAL |
| Buffer Digital | `bufferRows.quantityPieces` | INPUT ou Oracle aprovado | peças | buffer + cliente + revisão/instante | status ativo, ponto/local | cenário ou leitura | PARCIAL |
| Movimento | `T-M = 5/1440` | constante DAX | dias | ocorrência na rota | repetição definida na fórmula total | derivado | PARCIAL como parâmetro |
| Transporte | `T-T = 4/24` | constante DAX | dias | rota/cliente | incluído uma vez nos totais | derivado | PARCIAL como parâmetro |
| Beneficiador | `T-B = 0` | constante DAX | dias | cliente/rota | nenhum | derivado | DIVERGENTE: placeholder |
| Mesa 3 | `T-M3 = 0` | constante DAX | dias | processo/rota | nenhum | derivado | DIVERGENTE: placeholder |
| Lead Time por família | `T-T-FH/VM/SCA/DAF` | DAX | dias | cliente + período + contexto de filtro | Calendar, MP, Operações, embarque e locais | derivado | DIVERGENTE/PARCIAL |
| Segregação | `Q-D-S-*` | `Segregacao` + demanda | peças e dias | processo/local + período | status NC, 60 dias, exceções | refresh/derivado | PARCIAL |
| Embarque | `Q-P-ShipDate` e programação | Oracle `SHIPDATE` + Excel | peças/itens; unidade final pendente | cliente + flatbed + data | ship date, família, local | janela dinâmica/import | PARCIAL |
| Gargalo | regra Digital de utilização | capacidade + demanda/produção | percentual/ranking | recurso + período/revisão | somente regras validadas | derivado | PENDENTE |

## 4. Sistemas e objetos físicos

### 4.1 Oracle MESBR — somente leitura

Endpoint declarado no modelo: `10.44.34.68:1522/MESBR`. Este documento não autoriza conexão, ampliação de allowlist nem exposição de credenciais.

Views navegadas diretamente:

- `BOMES.BI_HEATMAP_SCRAP`;
- `BOMES.BI_MFIC_LOTES`;
- `BOMES.BI_MFIC_PARADAS`;
- `BOMES.BI_MFIC_PROD`;
- `BOMES.BI_MIFC_LCT_POS_STOCK`;
- `BOMES.BI_PUNCH_SCA`;
- `BOMES.BI_PUNCH_VDB`.

Objetos referenciados por SQL nativo, consolidados sem aliases: `DEFECTS`, `HT_SHIP_FLATBED`, `ITEM`, `LOCATIONS`, `LOT`, `M_USERS`, `NON_COMPLIANT`, `NON_COMPLIANT_DETAIL`, `OCHASSIS`, `OPERATIONS`, `ORAIL`, `RAIL`, `RAIL_PROCESS_ATTRIBUTES`, `RAIL_STATUS`, `RAIL_TYPE`, `RESOURCES`, `ROLL_FORMER_SETUP`, `SCRAP`, `WIP_REQUIREMENT_OPERATIONS`, `WORK_ORDER` e `WORK_ORDER_BASE`.

Há 15 chamadas Oracle no conjunto de partições: 7 navegações e 8 consultas nativas. A lista é inventário, não allowlist aprovada para o aplicativo; o escopo efetivo permanece em [oracle-readonly-scope.md](./oracle-readonly-scope.md).

### 4.2 SQL Server industrial

| Servidor/banco | Objeto | Uso | Risco aberto |
|---|---|---|---|
| `METBROSAWAPP03 / DT_LOGGER` | `dbo.GOLPES_LCT` | contador de ciclo LCT | `_VALUE` ainda não comprovado como peças |
| `METBROSAWAPP03 / DT_LOGGER` | `dbo.GOLPES_RF2` | contador de ciclo RF2 | `_VALUE` ainda não comprovado como peças |

### 4.3 Excel em rede

| Arquivo | Tabela/aba | Papel | Estado |
|---|---|---|---|
| `Programacao_embarque.xlsx` | `Data Embarque` | flatbed, data e hora | PARCIAL; refresh externo |
| `Parâmetros.xlsx` | `Máquinas` | tempo disponível planejado | PARCIAL; vigência/revisão pendentes |
| `Capacidade Embalagem.xlsx` | `Emb.Offset`, `Emb.Reta4` | capacidade e tempo de embalagem | PARCIAL; revisão pendente |
| `Processos e ENNs.xlsx` | lookup usado por Segregação | ENN por descrição | DIVERGENTE/obsoleto no modelo |

## 5. Workbooks do gate

### 5.1 `MIFC-F1-V1-POR.xlsx`

- `Símbolos`: 33 células preenchidas, com a biblioteca visual.
- `Descrição dos Símbolos`: 43 células preenchidas, com definições metodológicas.
- regra crítica: “armazenamento” exige todos os part numbers, espaço atribuído e controle FIFO/Kanban/mínimo/máximo; sem isso, o ponto é “estagnação”.

O confronto completo com a UI está em [MIFC-SYMBOL-MATRIX.md](./MIFC-SYMBOL-MATRIX.md).

### 5.2 `MIFC Action Plan 2026 - Osasco Plant R01.xlsx`

| Área | Evidência | Estado |
|---|---|---|
| `Volume 2023` | quatro famílias, pares/dia, turnos, materiais e estoques | fórmulas reproduzidas; turno 2 divergente |
| `MIFC-2023` | linhas alternadas de processo e estoque, movimento 5 min, transporte 4 h | referência histórica parcial |
| `MIFC-2024` | fórmulas equivalentes às de 2023 e referências a `Volume 2023` | não comprova revisão independente |
| `WIP` | pontos LCT, RF2, RF3, Mesa 3, B1–B4, gravação, plasma, CNC, pintura, Stenhoj e embalagens | somente `FH/LCT/entrada = 68` preenchido |
| `Resumo 2025_2026 ` | blocos 2022, 2023 e “2025” | bloco “2025” aponta para linhas inexistentes; DAF 2022 tem vínculo cruzado |
| `Action Plan 2025_2026` | ações sobre Beattys, OMES/e-Kanban, setups e flexibilidade | datas predominantemente de 2024; vigência precisa de confirmação |
| Nomes definidos | grande volume de `#REF!` e referências externas herdadas | DIVERGENTE; não usar como fonte automática sem saneamento aprovado |

## 6. Rotas e buffers materializados no aplicativo

As rotas oficiais por família estão no contrato e em [client-process-matrix.csv](./client-process-matrix.csv). Elas vêm da linhagem PBIP; qualquer variação por SKU continua `Pendente`.

Buffers atuais:

| ID | Cliente/produto e ponto | Símbolo/tipo atual | Anterior → seguinte | Quantidade/unidade | Meta/máximo atual | Regra/tempo | Origem | Estado |
|---|---|---|---|---|---:|---|---|---|
| `buf-fh-lct-in` | Volvo FH — LCT entrada | `storage` / processo | Slitter → RF2 | 68 peças | 120 peças | `68÷2÷127,5 = 0,267 d` | `INPUT` | valor coincide com WIP; paridade MES pendente |
| `buf-fh-lct-out` | Volvo FH — LCT saída | `storage` / processo | LCT → RF2 | 0 peças de input | 120 peças | `peças÷2÷127,5`; zero não comprovado | `INPUT` | PENDENTE |
| `buf-vm-rf2` | Volvo VM — RF2 entrada | `storage` / processo | LCT → RF2 | 0 peças de input | 100 peças | `peças÷2÷57`; rota questionada | `INPUT` | DIVERGENTE/PENDENTE |
| `buf-sca-rf3` | Scania — RF3 entrada | `storage` / processo | RF2 → RF3 | 0 peças de input | 160 peças | `peças÷2÷162`; upstream questionado | `INPUT` | PENDENTE |
| `buf-daf-paint` | DAF — Pintura pós-rebitagem | `stagnation` | Montagem → Pintura | 0 peças de input | 150 peças | `peças÷2÷76`; zero não comprovado | `INPUT` | PENDENTE |

Fórmula implementada: `dias = quantidade_peças ÷ 2 ÷ pares/dia`. Se quantidade é `null` ou pares/dia não é positivo, o Layout não calcula dias. Nos formulários legados, os zeros iniciais devem permanecer rotulados como input até confirmação da fonte.

## 7. Linhagem visual e medidas usadas

- relatório inteiro: 624 visuais;
- página Layout: 552 visuais;
- cartões numéricos do Layout: 132;
- medidas únicas nesses cartões: 62;
- medidas diretamente referenciadas por todos os visuais do relatório: 204.

Os 132 cartões e as 62 medidas estão em [layout-card-lineage.csv](./layout-card-lineage.csv) e [layout-measure-catalog.csv](./layout-measure-catalog.csv). O inventário de 309 medidas evita confundir “medida existente no modelo” com “medida usada no Layout”.

## 8. Regra de atualização

Para toda leitura operacional, registrar `sourceUpdatedAt`, janela consultada, timezone, identificador do refresh/snapshot e filtros. Se o horário não estiver disponível, o dado não pode receber estado “atual”. O SLA de desatualização e o calendário fabril dependem de decisão listada em [MIFC-OPEN-QUESTIONS.md](./MIFC-OPEN-QUESTIONS.md).
