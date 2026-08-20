# MIFC Digital — contrato oficial de dados

Data do gate: 2026-08-20

Gate: Prompt 0.5 — documentação e validação

Estado: contrato normativo; a paridade numérica com o MES permanece condicionada aos gates em [MIFC-VALIDATION-GATES.md](./MIFC-VALIDATION-GATES.md)

## 1. Objetivo e limites

Este contrato define como o MIFC Digital deve identificar, calcular, comparar e apresentar informações planejadas, revisionadas e operacionais. Ele não altera fórmulas do Power BI, do Excel ou do aplicativo. Divergências são registradas, nunca mascaradas por ajustes destinados apenas a aproximar números.

Os anexos metodológicos determinam a semântica do MIFC; o Semantic Model determina a implementação corrente do Power BI; o MES fornece fatos operacionais; os workbooks fornecem parâmetros, cenários e referências históricas. Nenhuma dessas fontes, isoladamente, prevalece em todos os contextos.

## 2. Hierarquia contextual da verdade

| Contexto | Fonte primária | Fonte de confronto | Regra de conflito |
|---|---|---|---|
| Significado de símbolos, fluxos e Lead Time | `MIFC-H-V1-POR.docx`, `MIFC-UG-V1-POR.pptx`, `MIFC-F1-V1-POR.xlsx` | Semantic Model e aplicativo | a metodologia define o significado; a implementação divergente é marcada |
| Fórmula e filtro vigentes no Power BI | `MIFC.SemanticModel/definition` | PBIP, Excel e testes locais | o DAX/M é reproduzido como evidência, não presumido correto |
| Realizado de produção, parada, lote, estoque e segregação | MES/DT_LOGGER, somente leitura | Power BI no mesmo recorte | só é realizado quando fonte, período, filtros, unidade e atualização estão identificados |
| Plano, capacidade de referência e parâmetros | workbooks e cadastro revisionado do aplicativo | Semantic Model | nunca sobrescrever com realizado; comparar somente em contexto equivalente |
| Cenário e revisão | revisão persistida e identificada | plano-base aprovado | toda mudança precisa de versão, autor/origem e data efetiva |
| Desenho do Layout | linhagem PBIP + revisão do editor | matriz cliente/processo | uma linha elevada indica participação; rota ausente fica `Pendente` |

Ordem operacional para resolver um valor:

1. identificar entidade, cenário/revisão, período e unidade;
2. identificar fonte física e horário de atualização;
3. aplicar filtros e conversões versionados;
4. preservar `null/BLANK` quando a fonte não comprova zero;
5. comparar com a referência somente no mesmo snapshot;
6. classificar o resultado como `VALIDADO`, `PARCIAL`, `DIVERGENTE` ou `PENDENTE`.

## 3. Metadados obrigatórios de cada valor

Todo valor calculado ou observado deve ser rastreável por, no mínimo:

| Campo | Conteúdo obrigatório |
|---|---|
| `metricKey` | chave estável da medida/regra, por exemplo `P-RF3` ou `wip.days` |
| `entityKey` | cliente, processo, máquina, buffer, item ou rota |
| `scenarioId` / `revisionId` | cenário e revisão que forneceram os parâmetros |
| `periodStart` / `periodEnd` | intervalo fechado usado no cálculo |
| `plantTimezone` | timezone da planta; alvo atual `America/Sao_Paulo` |
| `sourceSystem` / `sourceObject` | sistema e tabela/view/arquivo de origem |
| `sourceUpdatedAt` | instante conhecido da extração/atualização; ausente se não conhecido |
| `filters` | filtros materiais: data, cliente, item, MP, operação, localização e status |
| `rawUnit` / `displayUnit` | unidade na origem e unidade apresentada |
| `conversionRule` | regra versionada de conversão, quando houver |
| `valueStatus` | observado, planejado, calculado, sem dado, desatualizado ou pendente |
| `validationStatus` | gate aplicável e evidência do confronto |

Um número sem essa proveniência pode ser exibido apenas como parâmetro de demonstração/planejamento claramente rotulado; não pode ser apresentado como realizado.

## 4. Vocabulário e granularidades canônicas

| Conceito | Unidade canônica | Granularidade mínima | Observação |
|---|---|---|---|
| Veículo/chassi | veículos | cliente + data + chassi | não converter automaticamente em peças |
| Par | pares | cliente/família + data | normalmente duas peças, somente quando a família comprovar essa composição |
| Peça/longarina | peças após validação física | `RAIL_ID` ou contador validado + data + processo | `DISTINCTCOUNT(RAIL_ID)` é a unidade técnica atual; ainda é diferente de somar ciclos PLC e não prova sozinho uma peça boa |
| Conjunto | conjuntos | família + composição + período | aparece em famílias/consultas; composição por cliente ainda precisa de contrato |
| Ciclo/batida | ciclos | tag + timestamp + máquina | `_VALUE` de LCT/RF2; fator ciclo→peça pendente |
| Contêiner/pallet | contêineres/pallets | identificação logística + instante | nenhuma unidade/campo oficial foi comprovado no recorte; usar `Pendente` |
| Produção | peças ou pares | processo/máquina + período + filtros | a unidade precisa acompanhar a medida |
| Demanda | peças ou pares | cliente + período + revisão | demanda de máquina pode converter pares para peças |
| Capacidade | peças/h, peças/dia ou minutos disponíveis | máquina + revisão + calendário | não é produção observada |
| Estoque/WIP | peças, pares ou kg | localização + cliente/item + instante | ausência de linha não prova estoque zero |
| Lead Time | dias na camada semântica; duração formatada na interface | cliente/rota + período + revisão | manter componentes separáveis |
| Tempo de ciclo/takt | min/peça ou s/peça, conforme regra | máquina + período/revisão | não rotular antes de confirmar numerador e denominador |
| Parada | minutos | operação + código + intervalo | intervalos precisam de timezone e regra de sobreposição |
| Taxa | peças/h, pares/h ou ciclos/h | máquina/família + janela | numerador e denominador precisam ser declarados; não intercambiar taxas |

## 5. Conversões oficiais atualmente comprovadas

| Código | Regra | Unidade de saída | Limite de aplicação | Estado |
|---|---|---|---|---|
| `volume.pairs_per_day` | `veículos/dia × (1 + reforço_decimal)` | pares/dia | FH, VM, Scania e DAF conforme `Volume 2023` | VALIDADO por fórmula e fixtures |
| `material.weight_per_piece_kg` | `comprimento_mm × largura_mm × espessura_mm × densidade_kg/dm³ ÷ 1.000.000` | kg/peça | geometria retangular e densidade informadas | VALIDADO por fórmula e fixtures |
| `material.stock_weight_kg` | `bobinas × kg/bobina` | kg | workbook usa 7.000 kg/bobina nas amostras; não tornar constante global | VALIDADO no recorte |
| `material.stock_pieces` | `estoque_kg ÷ kg/peça` | peças | peso por peça maior que zero | VALIDADO por fórmula e fixtures |
| `material.stock_pairs` | `peças ÷ 2` | pares | apenas famílias comprovadamente formadas por duas peças | VALIDADO no recorte |
| `material.stock_days` | `pares_em_estoque ÷ pares/dia` | dias | demanda maior que zero e mesma família/período | VALIDADO por fórmula e fixtures |
| `wip.days` | `WIP_peças ÷ 2 ÷ pares/dia` | dias | mesma restrição de duas peças por par | VALIDADO por fórmula e fixtures |
| `time.minutes_to_days` | `minutos ÷ 1.440` | dias | duração, nunca timestamp | VALIDADO dimensionalmente |
| `time.hours_to_days` | `horas ÷ 24` | dias | duração, nunca timestamp | VALIDADO dimensionalmente |
| `time.seconds_to_days` | `segundos ÷ 86.400` | dias | duração, nunca timestamp | VALIDADO dimensionalmente |

Conversões `×2` e `÷2` encontradas no DAX não são generalizadas. Cada medida precisa declarar se seu numerador está em peças, pares, conjuntos ou chassis. As exceções atuais estão bloqueadas em [MIFC-VALIDATION-GATES.md](./MIFC-VALIDATION-GATES.md).

## 6. Calendário, turnos e timezone

### 6.1 Referência Excel

| Turno | Intervalo/ajuste | Refeição | Reunião | Resultado da fórmula atual | Estado |
|---|---|---:|---:|---:|---|
| 1º | 06:00–15:36 | 60 min | 5 min | 511 min | VALIDADO contra a célula `I3` |
| 2º | 15:36–23:59 + 48 min de virada | 60 min | campo com 5 min | 491 min | DIVERGENTE: a célula `I4` não subtrai os 5 min informados |

O total atual do workbook é 1.002 min/dia (16,7 h). Isso é uma referência do arquivo, não uma regra universal aprovada para feriados, fins de semana, horas extras ou turnos futuros.

### 6.2 Referência Power BI e aplicativo

- `Calendar` é calculada de `TODAY()-7` até `TODAY()+10`.
- `Dia_Min` vale minutos decorridos de `NOW()` no dia corrente e 1.440 nos demais dias; não há calendário fabril, feriados ou turnos nessa tabela.
- `F-H` subtrai 180 minutos de medidas de tempo líquido. O nome sugere fuso horário, mas o efeito é um deslocamento numérico; seu significado operacional precisa de confirmação.
- o backend e a planta usam `America/Sao_Paulo`; o timezone dos timestamps Oracle, do gateway e da execução Power BI não está documentado.
- datas formatadas no navegador sem opção explícita de `timeZone` herdam o timezone do sistema operacional/usuário; isso pode divergir da planta e deve ser eliminado nos recortes operacionais.

Contrato: timestamps devem ser armazenados com offset/UTC e convertidos para `America/Sao_Paulo` somente na fronteira de calendário da planta. Nenhum deslocamento fixo pode substituir essa conversão sem decisão formal.

## 7. Produção, demanda e capacidade

| Classe | Exemplo | O que representa | O que não pode representar |
|---|---|---|---|
| Produção observada Oracle | `P-RF3 = DISTINCTCOUNT(Produção[RAIL_ID])` com `DESCRIPTION="Roll Former 3"` | `RAIL_ID` distintos que satisfazem saída e `LOCATION_DATE` | capacidade, plano, ciclos PLC ou peça física até validação do processo |
| Produção observada por Beatty | `P-B1`…`P-B4`, cada qual com sua descrição de saída | `RAIL_ID` distintos por máquina/localização e `LOCATION_DATE` | uma Beatty genérica ou soma indiscriminada |
| Contador industrial | `Produção LCT[_VALUE]`, `Produção RF2[_VALUE]` | ciclos/valor do tag no período | peças até validar a razão ciclo→peça |
| Demanda | `D-P-RF3 = P-T-D × 2`; Beattys por cliente | necessidade calculada | produção realizada |
| Tempo disponível planejado | `Máquinas[Tempo Disponível (Min)]` | parâmetro de máquina | tempo observado do MES |
| Capacidade de referência | formulários, workbook, `dOperacao[Capacidade]` | limite/meta revisionada | produção automática |
| Disponibilidade planejada | `capacityRows.availabilityPercent` e parâmetros locais | percentual de cenário | disponibilidade/OEE observado |
| OEE | nenhuma medida explícita localizada entre as 309 medidas | conceito solicitado, ainda sem contrato de fonte/fórmula | inferir OEE a partir de `BI_OEE_SCRAP` ou do nome da tabela |

Comparações de utilização exigem unidade comum, mesma janela, mesmo cliente/processo e capacidade efetiva do calendário aplicável. Até isso estar comprovado, a interface deve separar “realizado”, “planejado” e “capacidade de referência”.

Contrato temporal aprovado em 2026-08-20: produção Oracle usa `Date(LOCATION_DATE)` no dia e `Time.StartOfHour(LOCATION_DATE)` na hora, reproduzindo `Data_Processada` e `Início da Hora` do Power BI. `CREATION_DATE` permanece metadado de origem e não é fallback para o período de produção.

### 7.1 Máquinas, processos e recursos materializados

| Grupo | Entidades | Cobertura atual |
|---|---|---|
| conformação/corte | LCT, RF2, Roll Former 3 | RF3 tem produção Oracle; LCT/RF2 usam contadores industriais com conversão pendente |
| Beattys | Beatty 1, 2, 3 e 4 | IDs, capacidade, produção, demanda e posição independentes |
| acabamento | P.A e CNC Plasma | processos separados por rota, parâmetros parcialmente locais |
| pintura/montagem | Pintura e Rebitagem | Pintura tem recurso/capacidade; Rebitagem participa de Scania/DAF |
| finalização | Stenhoj e Embalagem | Stenhoj tem recurso; embalagem varia por família e tabela de parâmetros |
| logística | estoques, staging pendente, Expedição e cliente final | programação e fontes Oracle/Excel ainda parciais |

Mesa 3 existe como processo do Layout, mas `T-M3` é placeholder. RF2 existe como processo e fonte industrial, porém não possui a mesma identidade de recurso/capacidade completa dos recursos RF3/Beattys no cadastro atual.

## 8. Identidade independente das Beattys

As quatro Beattys são entidades independentes e não aliases de uma única máquina:

| Máquina | Cliente/demanda no modelo | Produção | Parâmetro | Parada programada | Identidade no aplicativo |
|---|---|---|---|---|---|
| Beatty 1 | Volvo VM, `D-P-B1 = P-VM-F × 2` | `P-B1` | filtro `Máquinas[Máquina]="Beatty 1"` | `BEATTY01` | `beatty1`, `cap-beatty`, `res-b1` |
| Beatty 2 | DAF, `D-P-B2 = P-DAF-S × 2` | `P-B2` | `Beatty 2` | `BEATTY02` | `beatty2`, `cap-beatty-2`, `res-b2` |
| Beatty 3 | Scania, `D-P-B3 = P-SCA-F × 2` | `P-B3` | `Beatty 3` | `BEATTY03` | `beatty3`, `cap-beatty-3`, `res-b3` |
| Beatty 4 | Volvo FH, `D-P-B4 = P-FH-F × 2` | `P-B4` | `Beatty 4` | `BEATTY04` | `beatty4`, `cap-beatty-4`, `res-b4` |

Editar, duplicar ou medir uma Beatty não pode alterar as outras. A separação estrutural está validada; valores operacionais continuam sujeitos a paridade MES/Power BI.

## 9. Rotas por família de cliente

Estas rotas reproduzem a linhagem PBIP e a matriz cliente/processo. Elas são rotas agregadas por família, não rotas completas por SKU.

| Cliente/produto | Processos e máquinas | Buffers conhecidos | Logística → cliente final | Limites |
|---|---|---|---|---|
| Volvo FH / família FH | LCT → RF2 → RF3 → Mesa 3 → Beatty 4 → P.A → Pintura → Stenhoj → Embalagem | LCT entrada/saída + estoques DAX por RF2/RF3/M3/Beatty/CL/Pintura/Stenhoj/Embalagem | Expedição → Volvo | variações por MP/SKU pendentes |
| Volvo VM / família VM | RF3 → Beatty 1 → CNC → Pintura → Embalagem | RF2 local questionado + estoques DAX por RF3/Beatty/CL/Pintura/Embalagem | Expedição → Volvo | Mesa 3 marcada não participante/pendente; LCT/RF2 sem medida da família |
| Scania / simples ou reforçada | RF3 → Mesa 3 → Beatty 3 → P.A → Pintura → Rebitagem → Stenhoj → Embalagem | RF3 entrada + estoques DAX por RF3/M3/Beatty/CL/Pintura/Rebitagem/Stenhoj/Embalagem | Expedição → Scania | diferenças simples/reforçada pendentes |
| DAF / família DAF | RF3 → Mesa 3 → Beatty 2 → CNC → Pintura → Rebitagem → Stenhoj → Embalagem | Pintura pós-rebitagem + estoques DAX por RF3/M3/Beatty/CL/Pintura/Rebitagem/Stenhoj/Embalagem | Expedição → DAF | origem Slitter e variações de item pendentes |
| Renault | Pendente | nenhum buffer validado | nó de cliente existe no Layout | não há rota/medida oficial comprovada no recorte |
| B8, B13 e P2566 | Pendente | nenhum buffer validado | classificações aparecem em consultas, sem rota final validada | não inferir participação a partir do código da consulta |

Regra: linha elevada significa participação; linha plana significa ausência de participação mapeada. Nunca inferir uma conexão que não conste da linhagem; usar `Pendente`.

## 10. Lead Time

A metodologia oficial define:

- Lead Time de produção = material no sistema × takt + estagnação de informação;
- Lead Time de transporte = material no transporte × takt + estagnação de informação;
- Lead Time total = processamento + estagnações/esperas de material e informação, mantendo produção e transporte identificáveis.

O Power BI armazena durações em dias e compõe `T-T-FH`, `T-T-VM`, `T-T-SCA` e `T-T-DAF` principalmente com estoques/logística, movimentos e transporte. As fórmulas totais não somam explicitamente todas as medidas de tempo de processo exibidas na faixa superior do Layout. Essa diferença semântica é `DIVERGENTE` até decisão do dono do processo.

Componentes devem permanecer separados:

| Componente | Unidade | Origem atual | Regra de apresentação |
|---|---|---|---|
| Transporte | dias (`T-T = 4/24`) | constante Power BI | parâmetro, não realizado |
| Movimento | dias (`T-M = 5/1440`) | constante Power BI | parametrizar por conexão/rota após validação |
| Beneficiador | dias (`T-B = 0`) | placeholder | mostrar `Pendente`, não zero observado |
| Mesa 3 | dias (`T-M3 = 0`) | placeholder | mostrar `Pendente`, não zero observado |
| Estoque/WIP por ponto | dias | MES + demanda e/ou input | exibir origem, recorte e conversão |
| Tempo de processo | dias/min/s | parâmetros + demanda/produção | não misturar com estoque/logística |
| Total | dias | regra versionada por família | deve ser decomponível e reconciliável |

### 10.1 VA, NVA e tempos de informação

| Classe | Contrato | Estado |
|---|---|---|
| Lead Time de produção | processamento + esperas/estagnações associadas ao fluxo produtivo | conceito validado; composição numérica divergente |
| Lead Time de transporte | material em transporte × takt + estagnação de informação | conceito validado; valor atual usa constante de 4 h |
| Lead Time de informação | espera/estagnação da informação e programação | conceitualmente exigido; medidas digitais específicas pendentes |
| VA | somente tempo de transformação que o owner classificar como valor agregado | classificação por etapa pendente; não igualar automaticamente a todo tempo de processo |
| NVA | espera, estoque, transporte e demais tempos classificados pelo owner | componentes existem, classificação final pendente |

### 10.2 Taxonomia de buffers e estoques

| Tipo | Definição contratual | Implementação atual | Estado |
|---|---|---|---|
| WIP | material em processo entre operações | `bufferRows.quantityPieces` / pontos DAX | PARCIAL |
| Armazenamento controlado | ponto com variedade, espaço por part number e controle FIFO/Kanban/min/max | tipo `storage` genérico | DIVERGENTE até classificar os pontos |
| Estagnação | material parado sem os controles de armazenamento | tipo `stagnation` | PARCIAL; pontos precisam de validação |
| Estoque de matéria-prima/produto acabado | material antes/depois do fluxo produtivo | opções de formulário e nós `storage` | PARCIAL |
| Fluctuation buffer | proteção contra flutuação, separada no timeline metodológico | sem tipo/campo próprio | PENDENTE |
| Safety/emergency stock | estoque de segurança/emergência com regra e meta próprias | sem tipo/campo próprio | PENDENTE |
| Estoque por diferença de turnos | cobertura causada por jornadas diferentes | sem tipo/campo próprio | PENDENTE |
| Staging de embarque | material preparado antes da coleta | sem tipo próprio; `storage` poderia mascará-lo | PENDENTE |

## 11. Zero, ausência e validade temporal

| Estado apresentado | Significado | Representação de dados |
|---|---|---|
| `0` | a consulta executou, o universo foi definido e o resultado comprovado é zero | número `0` + proveniência |
| `—` | conceito não se aplica ou etapa não existe na rota validada | `null` + `not_applicable` |
| `Sem dado` | a fonte não respondeu, não cobriu o período ou não trouxe evidência suficiente | `null` + `no_data` |
| `Desatualizado` | existe último valor válido, mas sua idade excede o SLA aprovado | valor anterior + `stale` + timestamp |
| `Pendente` | regra, unidade, filtro ou vínculo ainda não foi validado | `null` ou parâmetro rotulado + `pending` |

O padrão DAX `IF(BLANK(),0,valor)` não autoriza o aplicativo a converter toda ausência em zero. A camada Digital deve preservar o estado original e aplicar esta tabela.

O limiar técnico atual de 10 minutos é apenas implementação; não é SLA de negócio aprovado.

## 12. Cenário, revisão e operacional

- `Planejado`: parâmetros aprovados para uma revisão e vigência; editável com trilha.
- `Cenário`: cópia isolada para simulação; não altera plano-base nem realizado.
- `Revisão`: snapshot imutável após aprovação, com data efetiva e origem.
- `Operacional`: leitura somente do MES/DT_LOGGER; nunca é editada nem sobrescrita pelo plano.
- `Comparação`: permitida apenas com mesmo processo, unidade, calendário, período, cliente/item e timezone.
- `Fallback`: pode usar último valor/entrada manual somente com rótulo, justificativa e timestamp; nunca assumir origem MES.

Os workbooks `MIFC-2023`, `MIFC-2024` e o bloco “2025” não são automaticamente revisões independentes confiáveis: há duplicação de fórmulas, referências vazias e vínculos cruzados documentados na matriz de fontes.

## 13. Tratamento de conflitos

1. não editar a origem para aproximar resultados;
2. registrar fórmula, unidade, filtro, período e valor de ambos os lados;
3. classificar o conflito no gate;
4. indicar hipótese de causa sem declará-la fato;
5. solicitar decisão humana quando a evidência não resolver a semântica;
6. após decisão, versionar o contrato e criar Golden Case reproduzível.

O inventário completo que sustenta este contrato está em [mifc-semantic-model-inventory.csv](./mifc-semantic-model-inventory.csv), e o mapa das fontes está em [MIFC-SOURCE-MATRIX.md](./MIFC-SOURCE-MATRIX.md).
