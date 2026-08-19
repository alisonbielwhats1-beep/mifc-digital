# MIFC Digital — matriz de fontes de verdade

Data da auditoria: 2026-08-19  
Escopo: Prompt 1 — Discovery  
Regra: nenhum campo ou cálculo ausente foi presumido como validado.

## Legenda

| Código | Significado |
|---|---|
| `INPUT` | Valor preenchido ou mantido pela equipe na aplicação |
| `CALCULATED` | Valor produzido pelo Calculation Engine |
| `ORACLE` | Valor lido do MES sem alteração no banco |
| `IMPORT` | Valor vindo de planilha/arquivo externo |
| `MIXED` | Combina meta/input com realizado online ou cálculo |
| `PBIP ✓` | Estrutura, campo ou fórmula encontrada no PBIP |
| `UI ✓` | Campo ou comportamento confirmado nas imagens aprovadas |
| `EXCEL ✓` | Campo, valor ou fórmula encontrado no workbook recebido |
| `EXCEL ?` | Depende da cópia local do MIPS 2026 para conferência exata |
| `LINHAGEM ?` | Existe no PBIP, mas a cadeia completa será fechada no Prompt 4 |

Atualização: o workbook foi recebido e auditado. O detalhamento por célula está em [excel-manual-automatic-map.md](./excel-manual-automatic-map.md). Nesta matriz, `EXCEL ?` passa a significar que o conceito pertence à aplicação-alvo, mas não apareceu como um campo autônomo e inequívoco no workbook — não significa mais arquivo ausente.

## Contexto e revisão

| Campo | Fonte | Tipo | Unidade | Tela | Fórmula/origem | Status de validação |
|---|---|---|---|---|---|---|
| Planta | aplicação / referência visual | `INPUT` | cadastro | todas | contexto da revisão | `UI ✓`; catálogo real pendente |
| Ano | aplicação / calendário | `INPUT` | ano | todas | contexto da revisão e `Calendar[Ano]` | `PBIP ✓`, `UI ✓` |
| Cenário | aplicação | `INPUT` | cadastro | todas | Current/Target e variantes | `UI ✓`; modelo de persistência no Prompt 2 |
| Revisão | aplicação | `INPUT` | versão | todas | snapshot imutável/editável do cenário | `UI ✓`; não existe como entidade semântica no PBIP |
| Status da revisão | aplicação | `CALCULATED/INPUT` | estado | visão geral/layout | rascunho, publicada, arquivada | `UI ✓`; regra pendente |

## Volume

| Campo | Fonte | Tipo | Unidade | Tela | Fórmula/origem | Status de validação |
|---|---|---|---|---|---|---|
| Cliente | MIPS / `MP[Cliente]` / tabelas MES | `INPUT/MIXED` | cadastro | Volume | `Volume 2023!C8:C11`; cliente planejado associado aos códigos MES | `PBIP ✓`, `UI ✓`, `EXCEL ✓` |
| Veículo / modelo / produto | MIPS / MES (`ITEM`, `RAIL_TYPE`, `PRODUCT_CLASS`, `MODELO`) | `INPUT/MIXED` | cadastro | Volume | cadastro planejado com vínculo opcional ao MES | `PBIP ✓`, `UI ✓`, `EXCEL ?` |
| Veículos por dia | MIPS | `INPUT` | veículos/dia | Volume | `Volume 2023!D8:D11` | `UI ✓`, `EXCEL ✓` |
| Reforço | MIPS | `INPUT` | % | Volume | `Volume 2023!E8:E11` | `UI ✓`, `EXCEL ✓` |
| Pares por dia | MIPS + Calculation Engine | `CALCULATED` | pares/dia | Volume | `Volume 2023!F8:F11 = veículos/dia × (1 + reforço)` | `UI ✓`, `EXCEL ✓` |
| Dias trabalhados | MIPS / calendário | `INPUT/CALCULATED` | dias/ano | Volume | mostrado como calculado na UI; `Calendar[Dia_Min]` alimenta tempo disponível no PBIP | `PBIP ✓`, `UI ✓`, `EXCEL ?` |
| Turnos | MIPS / parâmetros de processo | `INPUT/CALCULATED` | turnos/dia | Volume/Capacidade | horários e paradas em `D3:H4`; minutos/horas em `I3:J4` | `UI ✓`, `EXCEL ✓` |
| Status do cliente/produto | aplicação | `INPUT` | estado | Volume | ativo/inativo no cenário | `UI ✓`; regra pendente |
| Clientes ativos | aplicação | `CALCULATED` | clientes | Volume/Overview | contagem de linhas ativas do cenário | `UI ✓`; implementação pendente |
| Volume anual | Calculation Engine | `CALCULATED` | pares/ano | Volume | o exemplo visual é consistente com pares/dia × dias, mas a regra ainda deve ser conferida | `UI ✓`, `EXCEL ?` |
| Demanda total | medidas PBIP (`D-P-*`, `P-T-D` e relacionadas) | `CALCULATED` | peças/pares | Capacidade/Layout | medidas de demanda por máquina/processo | `PBIP ✓`, `LINHAGEM ?` |

## Logística

| Campo | Fonte | Tipo | Unidade | Tela | Fórmula/origem | Status de validação |
|---|---|---|---|---|---|---|
| Flatbed | `Dados de embarque[Flatbed]` e campos derivados em SCANIA/FH/VM/DAF | `IMPORT/ORACLE` | identificador | Logística | programação de embarque e vínculo com material | `PBIP ✓`; origem atual inclui Excel de rede |
| Data de embarque | `Dados de embarque[Data]` / `SHIP_DATE` | `IMPORT/ORACLE` | data | Logística | programação importada e data MES | `PBIP ✓` |
| Horário de embarque | `Dados de embarque[Horário]` | `IMPORT/INPUT` | hora | Logística | planilha de programação de embarque | `PBIP ✓`, `EXCEL ?` |
| Data e horário combinados | `Dados de embarque[Data__horario]` | `CALCULATED/IMPORT` | data-hora | Logística | transformação da fonte de embarque | `PBIP ✓` |
| Cliente de embarque | `Dados de embarque[Cliente]` | `IMPORT` | cadastro | Logística | planilha de programação | `PBIP ✓` |
| Ship date MES | SCANIA/FH/VM/DAF/SHIPDATE `[SHIP_DATE]` | `ORACLE` | data | Logística | consultas Oracle do PBIP | `PBIP ✓` |
| Quantidade pedida | `DAF SLITTERS[QUANTITY_ORDERED]` | `ORACLE` | peças | Logística | consulta Oracle embutida | `PBIP ✓` |
| Quantidade finalizada | `DAF SLITTERS[QUANTITY_FINISHED]` | `ORACLE` | peças | Logística | consulta Oracle embutida | `PBIP ✓` |
| Pares Slitter | `DAF SLITTERS[Pares Slitter]` | `ORACLE` | pares | Logística | consulta Oracle embutida | `PBIP ✓` |
| Quantidade Ship Date | medida `Q-P-ShipDate` | `CALCULATED` | peças | Logística/Layout | conta chassi SCANIA/FH/VM no Slitter e soma pares DAF × 2 | `PBIP ✓` |
| Material / MP | `MP[MP]`, tabelas SCANIA/FH/VM/DAF/Lotes | `ORACLE/MIXED` | código | Logística/Layout | vínculo entre material, cliente e tipo | `PBIP ✓` |
| Item / componente | tabelas MES `[ITEM]`, `[COMPONENT]` | `ORACLE` | código | Logística | consultas atuais do PBIP | `PBIP ✓` |
| Localização | tabelas MES `[LOCATION]` / `[local]` | `ORACLE` | local | Logística/Layout | localização atual e agrupamento de operação | `PBIP ✓` |
| Comprimento final | `[FINISH_LENGTH]` / `[FINISH_LENGHT]` | `ORACLE` | unidade MES | Logística | consultas atuais; unidade exata precisa ser confirmada | `PBIP ✓`, `EXCEL ?` |
| Status Slitter | `Lotes[SLITTERSTATUS]` / medida `Status_Slitter` | `ORACLE/CALCULATED` | estado | Logística/Layout | lotes Oracle + regra DAX | `PBIP ✓`, `LINHAGEM ?` |
| Dias logísticos por cliente | `Q-D-SCA`, `Q-D-FH`, `Q-D-VM`, `Q-D-DAF` | `CALCULATED` | dias | Logística/Layout | demanda/estoque conforme medidas DAX específicas | `PBIP ✓` |
| Tempo de movimentação | medida `T-M` | `CALCULATED` | dias | Layout | constante atual `5/1440` | `PBIP ✓`; parametrização recomendada no Prompt 4 |
| Transporte, rotas e frequência | MIPS/metodologia | `INPUT/CALCULATED` | hora, frequência e lote | Logística | metodologia exige método, frequência e tamanho de embarque; Excel contém tempos/estoques logísticos, mas não um cadastro completo de rotas | `EXCEL ✓` parcial |

## Capacidade e operação

| Campo | Fonte | Tipo | Unidade | Tela | Fórmula/origem | Status de validação |
|---|---|---|---|---|---|---|
| Processo / operação | `dOperacao[OPERAÇÃO]`, `Operações[Dados ]`, MES `[DESCRIPTION]` | `INPUT/MIXED` | cadastro | Capacidade/Layout | dimensão operacional e descrições online | `PBIP ✓`, `UI ✓` |
| Código do processo | aplicação/MIPS | `INPUT` | código | Capacidade/Layout | identificador estável do processo | `UI ✓`, `EXCEL ?` |
| CT / tempo de ciclo | medidas `T-C-*` e input de cenário | `MIXED` | s/peça ou min/peça | Capacidade/Layout | exemplo RF3: tempo disponível líquido ÷ produção | `PBIP ✓`, `UI ✓`; unidade por processo pendente |
| Capacidade parametrizada | `dOperacao[Capacidade]` | `INPUT/IMPORT` | por minuto, conforme origem | Capacidade | coluna originalmente associada a golpes/minuto | `PBIP ✓`, `EXCEL ?` |
| Capacidade por hora | MIPS / `Emb Offset` / `Emb Reta` | `INPUT/CALCULATED` | peças/h | Capacidade | embalagem possui parâmetro explícito por cliente | `PBIP ✓`, `UI ✓`, `EXCEL ?` |
| Capacidade por dia | Calculation Engine | `CALCULATED` | peças/dia | Capacidade/Layout | depende de capacidade/h, tempo, turnos e eficiência | `UI ✓`, `EXCEL ?`, `LINHAGEM ?` |
| Tempo disponível em horas | `Máquinas[Tempo Disponivel (Hrs)]` | `IMPORT/INPUT` | h/dia ou período | Capacidade | Excel de parâmetros do PBIP; no workbook recebido, `Volume 2023!J3:J4` calcula horas dos turnos | `PBIP ✓`, `EXCEL ✓` parcial |
| Tempo disponível em minutos | `Máquinas[Tempo Disponível (Min)]`, `Calendar[Dia_Min]` | `IMPORT/CALCULATED` | min | Capacidade | medida `T-D` soma `Calendar[Dia_Min]` | `PBIP ✓` |
| Tempo de abastecimento | `dOperacao[Tempo Abastecimento]` | `INPUT/IMPORT` | a confirmar | Capacidade | dimensão embutida no PBIP | `PBIP ✓`, `EXCEL ?` |
| Tempo de processamento embalagem | `Emb Offset/Reta[Tempo de processamento (min)]` | `IMPORT/INPUT` | min | Capacidade | planilha de capacidade de embalagem | `PBIP ✓` |
| Produção realizada | `Produção[RAIL_ID]` e medidas `P-*` | `ORACLE/CALCULATED` | peças | Capacidade | exemplo `P-RF3`: contagem distinta de trilhos no processo | `PBIP ✓` |
| Paradas programadas | `Paradas` e medidas `P-P-*` | `ORACLE/CALCULATED` | min | Capacidade | diferença retorno-parada filtrada por código/operação | `PBIP ✓` |
| Tempo disponível líquido | medidas `T-D-L-*` | `CALCULATED` | min | Capacidade | calendário menos paradas e ajustes de fuso | `PBIP ✓`, `LINHAGEM ?` |
| Demanda restante | medidas `P-R-*` | `CALCULATED` | peças | Capacidade | demanda menos produção realizada | `PBIP ✓` |
| Takt do cliente | medidas `TKT-C-*` | `CALCULATED` | min/peça | Capacidade | tempo de produção ÷ demanda | `PBIP ✓` |
| Golpes médios | `BI_PUNCH_SCA` / medidas `M-G`, `Q-G-M-SCA` | `ORACLE/CALCULATED` | golpes | Capacidade | telemetria online usada no PBIP | `PBIP ✓`, `LINHAGEM ?` |
| OEE / eficiência | `BI_OEE_SCRAP` e MIPS | `MIXED` | % | Capacidade | campo aprovado na UI; regra exata não fechada | `PBIP ✓`, `UI ✓`, `EXCEL ?` |
| Utilização | Calculation Engine | `CALCULATED` | % | Capacidade/Overview | carga ÷ capacidade disponível | `UI ✓`, `EXCEL ?`, `LINHAGEM ?` |
| Gargalo | Calculation Engine | `CALCULATED` | processo | Capacidade/Overview | maior utilização/menor folga conforme regra validada | `UI ✓`, `EXCEL ?`, `LINHAGEM ?` |
| Status do processo | aplicação + Calculation Engine | `MIXED` | estado | Capacidade/Layout | ativo/inativo e condição de gargalo | `UI ✓`; regra pendente |

## Buffer, estoque, WIP e dias

| Campo | Fonte | Tipo | Unidade | Tela | Fórmula/origem | Status de validação |
|---|---|---|---|---|---|---|
| Ponto/localização de estoque | `BI_MIFC_LCT_POS_STOCK[LOCATION]` e demais `[LOCATION]` | `ORACLE/MIXED` | local | Buffer/Layout | localização MES vinculada ao nó do MIFC | `PBIP ✓` |
| A produzir | `BI_MIFC_LCT_POS_STOCK[TO_PRODUCE]` | `ORACLE` | peças | Buffer/Layout | objeto Oracle por navegação M | `PBIP ✓` |
| Não conforme | `BI_MIFC_LCT_POS_STOCK[NON_COMPLIANT]` | `ORACLE` | peças | Buffer/Layout | objeto Oracle por navegação M | `PBIP ✓` |
| Estoque total | `BI_MIFC_LCT_POS_STOCK[TOTAL]` e medidas `E-*` | `ORACLE/CALCULATED` | peças | Buffer/Layout/Overview | total online e medidas por cliente/posição | `PBIP ✓` |
| WIP atual | MES + medidas de estoque | `ORACLE/CALCULATED` | peças | Capacidade/Layout/Overview | realizado online | `PBIP ✓`, `UI ✓`, `LINHAGEM ?` |
| WIP meta/limite | MIPS / aplicação | `INPUT` | peças | Buffer/Capacidade/Layout | números de WIP aparecem embutidos nas fórmulas de `MIFC-2023`; devem virar parâmetros explícitos | `UI ✓`, `EXCEL ✓` |
| Tipo de buffer | MIPS / aplicação | `INPUT` | categoria | Buffer/Layout | armazenamento e estagnação são definidos na metodologia; a aplicação deve registrar o tipo do nó | `EXCEL ✓` metodológico |
| Estoque pré-inventário | medidas `E-PI-FH`, `E-PI-SCA`, `E-PI-DAF` | `CALCULATED` | peças | Buffer/Layout | medidas na pasta Buffer | `PBIP ✓`, `LINHAGEM ?` |
| Estoque pós-acabamento/rebarba | medidas `E-P.A-*`, `E-REB-*` | `CALCULATED` | peças | Buffer/Layout | medidas na pasta Buffer | `PBIP ✓`, `LINHAGEM ?` |
| Dias de estoque por ponto | medidas `D-E-*-B/CL/P.I/P.A/REB` | `CALCULATED` | dias | Buffer/Layout | estoque ÷ produção/demanda; exemplo `D-E-FH-B = E-B-FH ÷ (P-M-FH/2)` | `PBIP ✓` |
| Estoque pós-processo em dias | medidas `E-P-D-*-RF3/STJ/M3/EMB` | `CALCULATED` | dias | Layout | peças ÷ demanda; exemplo Scania RF3 usa `(Scania×2) ÷ P-M-SCA-REV 2` | `PBIP ✓` |
| Limite/capacidade do buffer | MIPS / aplicação | `INPUT` | peças | Buffer/Layout | necessário para alertas e status | `UI ✓`, `EXCEL ?` |
| Processo de entrada e saída | aplicação / Layout | `INPUT` | vínculo | Buffer/Layout | edges do grafo e associação ao processo | `UI ✓`; não é semântico no PBIP atual |

## Lead Time e resultados

| Campo | Fonte | Tipo | Unidade | Tela | Fórmula/origem | Status de validação |
|---|---|---|---|---|---|---|
| Tempo de ciclo por etapa | medidas `T-*` / processo | `CALCULATED/MIXED` | dias/min/s | Layout/Resultados | medidas por máquina e etapa | `PBIP ✓`, `LINHAGEM ?` |
| Tempo de espera | estoque/buffer + demanda | `CALCULATED` | dias | Layout/Resultados | medidas de dias de estoque | `PBIP ✓`, `LINHAGEM ?` |
| Tempo de processo | capacidade e CT | `CALCULATED` | dias | Layout/Resultados | agregação das etapas produtivas | `PBIP ✓`, `LINHAGEM ?` |
| Dados/informação | medidas e fluxos de informação | `CALCULATED/INPUT` | dias | Layout/Resultados | linha inferior do MIFC | `PBIP ✓`; semântica exata pendente |
| Lead Time total | Calculation Engine | `CALCULATED` | dias | Layout/Overview | Excel soma processo + espera por cliente em `CV25`, `CV28`, `CV31`, `CV34`; PBIP usa totais `T-T-*` | `UI ✓`, `PBIP ✓`, `EXCEL ✓` |
| VA total | Calculation Engine | `CALCULATED` | dias | Overview | tempo de valor agregado | `UI ✓`, `EXCEL ?`, `LINHAGEM ?` |
| WIP total | Calculation Engine | `CALCULATED` | peças | Overview | soma do WIP do cenário/realizado conforme filtro | `UI ✓`, `LINHAGEM ?` |
| Alertas | Calculation Engine | `CALCULATED` | evento | Overview | capacidade, WIP, atraso e ações | `UI ✓`; regras pendentes |

## Layout editável

| Campo/entidade | Fonte | Tipo | Unidade | Tela | Fórmula/origem | Status de validação |
|---|---|---|---|---|---|---|
| Posição e tamanho | `visual.json[position]` | `IMPORT/INPUT` | coordenada do canvas | Layout | x, y, largura, altura e z-index | `PBIP ✓` |
| Linha | 209 shapes `line` no PBIP | `IMPORT/INPUT` | geometria | Layout | desenho atual; não contém edge semântico | `PBIP ✓` |
| Bloco retangular | 30 shapes `rectangle` | `IMPORT/INPUT` | geometria | Layout | desenho atual | `PBIP ✓` |
| Bloco oval | 21 shapes `oval` | `IMPORT/INPUT` | geometria | Layout | desenho atual | `PBIP ✓` |
| Imagem/símbolo | 144 visuais de imagem | `IMPORT/INPUT` | recurso | Layout | recursos como Buffer, Estoque, Base de Dados, empilhadeira, clientes e setas | `PBIP ✓` |
| Cartão de valor | 132 cards | `CALCULATED` | conforme medida | Layout | 132/132 ligados a 62 medidas, com posição, filtro e dependências catalogados | `PBIP ✓`, linhagem local concluída |
| Texto | 16 textboxes | `IMPORT/INPUT` | texto | Layout | rótulos como clientes, áreas e “Dias” | `PBIP ✓` |
| Nó semântico | aplicação | `INPUT` | entidade | Layout | tipo, processo, propriedades e coordenadas | `UI ✓`; reconstrução pendente |
| Edge semântico | aplicação | `INPUT` | entidade | Layout | origem, destino, tipo de fluxo e pontos de conexão | `UI ✓`; reconstrução pendente |
| Tipo de fluxo | MIPS/metodologia | `INPUT` | categoria | Layout | material, informação e informação eletrônica | `UI ✓`, `EXCEL ?` |
| Tipo de símbolo | MIPS/metodologia | `INPUT` | categoria | Layout | processo, armazenamento, estagnação, base de dados, caminhão, kanban | `UI ✓`, `EXCEL ?` |
| Propriedades do processo | aplicação + Capacidade | `MIXED` | várias | Layout | código, CT, WIP, capacidade/dia, turnos, disponibilidade e observações | `UI ✓`; vínculo no Prompt 2/6 |
| Entradas e saídas | aplicação | `INPUT` | vínculo | Layout | edges conectados ao nó | `UI ✓`; ausente como semântica no PBIP |

## Resultado da matriz

A matriz cobre Volume, Logística, Capacidade, Buffer, Estoque, Dias, WIP, Lead Time e Layout com evidência verificável do PBIP, do workbook e das referências metodológicas. Os anexos estão disponíveis e foram analisados.

O Prompt 2 e os formulários do Prompt 3 podem começar usando esta classificação. O Prompt 4 deve implementar as regras e validar resultados contra os valores de referência; a confirmação dos dados atuais depende da futura conexão Oracle somente leitura.
