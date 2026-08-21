# MIFC Digital — mapa de preenchimento manual, cálculo e MES

Data da auditoria: 2026-08-19  
Fonte principal: `MIFC Action Plan 2026 - Osasco Plant R01.xlsx`  
Comparação: PBIP em `C:\Users\Usuário\Downloads\MIFC`  
Segurança: leitura local somente; nenhum arquivo-fonte foi alterado e nenhuma consulta ao banco foi executada.

## Conclusão objetiva

O domínio necessário está coberto, mas o Excel não pode ser migrado copiando apenas as células visivelmente amarelas. Ele mistura quatro situações:

1. parâmetros realmente manuais;
2. fórmulas legítimas que devem virar campos somente leitura;
3. números operacionais inseridos dentro das fórmulas, que precisam virar inputs identificados ou leitura do MES;
4. valores que o Power BI já automatizou com medidas DAX e consultas de banco.

Na aplicação, a precedência recomendada é: **realizado do MES → parâmetro do cenário → cálculo rastreável → override manual auditado**. Um valor automático nunca deve ser sobrescrito silenciosamente.

## Aba `Volume 2023`

### Turnos e tempo disponível

| Campo | Células | Situação no Excel | Classificação na aplicação | Regra |
|---|---|---|---|---|
| Início do turno | `D3:D4` | constante | `INPUT` | horário planejado |
| Fim do turno | `E3:E4` | constante | `INPUT` | horário planejado |
| Ajuste de virada do dia | `F4` | constante | `INPUT` | ajuste do segundo turno |
| Refeição | `G3:G4` | constante | `INPUT` | parada planejada |
| Reuniões | `H3:H4` | constante | `INPUT` | parada planejada |
| Tempo disponível | `I3:I4` | fórmula | `CALCULATED` | diferença de horários menos refeição/reunião |
| Horas disponíveis | `J3:J4` | fórmula | `CALCULATED` | minutos disponíveis ÷ 60 |

Os tempos planejados continuam manuais por cenário. Produção e paradas reais podem vir do MES, mas não substituem o calendário planejado.

### Demanda, geometria e estoque de Slitter

| Campo | Células | Situação no Excel | Classificação na aplicação | Correspondência PBIP |
|---|---|---|---|---|
| Cliente | `C8:C11` | constante | `INPUT/MASTER DATA` | `MP[Cliente]`, tabelas FH/VM/SCANIA/DAF |
| Veículos/dia | `D8:D11` | amarelo, constante | `INPUT` | a demanda realizada é derivada das tabelas MES; a meta deve permanecer no cenário |
| Reforço | `E8:E11` | amarelo, constante | `INPUT` | influencia pares/dia |
| Pares/dia | `F8:F11` | fórmula | `CALCULATED` | `veículos/dia × (1 + reforço)` |
| Comprimento médio | `I8:I11` | amarelo, constante | `INPUT/MASTER DATA` | parâmetro do produto |
| Peso médio por peça | `G8:G11` | fórmula com constantes embutidas | `CALCULATED`, com parâmetros explícitos | comprimento × largura × espessura × densidade |
| Peso de bobinas | `J8:J11` | fórmula | `CALCULATED/MIXED` | quantidade de bobinas × 7.000 kg |
| Estoque Slitter em peças | `K8:K11` | fórmula | `CALCULATED` | peso de bobinas ÷ peso médio por peça |
| Estoque Slitter em pares | `L8:L11` | fórmula | `CALCULATED` | peças ÷ 2 |
| Dias de estoque | `M8:M11` | fórmula | `CALCULATED/MIXED` | pares em estoque ÷ pares/dia |

Constantes escondidas que devem virar parâmetros nomeados:

- larguras/espessuras `449`, `369`, `9,5`, `412`, `430`, `8` e `7` usadas em `G8:G11`;
- densidade `7,85`;
- peso padrão da bobina `7.000 kg` usado em `J8:J11`.

Os blocos `O9:P15`, `R9:S15`, `U9:V15` e `X9:Y15` contêm identificação de material e quantidade de bobinas por cliente. Hoje são constantes manuais; na aplicação devem ser cadastro/estoque do MES quando houver cobertura e possuir fallback manual auditado. Os totais `P16`, `S16`, `V16` e `Y16` são calculados.

### Estoque logístico externo

| Campo | Células | Situação | Decisão |
|---|---|---|---|
| Toneladas FH | `J20 = 7 + 11,4` | números dentro da fórmula | dois inputs identificados ou leitura do estoque |
| Toneladas VM | `J21 = 35,8 + 6,2` | números dentro da fórmula | dois inputs identificados ou leitura do estoque |
| Peças equivalentes | `K20:K23` | fórmula | somente leitura |
| Pares equivalentes | `L20:L23` | fórmula | somente leitura |
| Dias logísticos | `M20:M23` | fórmula | somente leitura; alimenta o MIFC |

## Aba `MIFC-2023`

Esta aba é o modelo de cálculo do desenho. As linhas se alternam entre tempo de processo e estoque/espera por cliente:

| Cliente | Tempo de processo | Estoque/espera | Total |
|---|---|---|---|
| Volvo FH | linha 23 | linha 24 | `CV25` |
| Volvo VM | linha 26 | linha 27 | `CV28` |
| Scania | linha 29 | linha 30 | `CV31` |
| DAF | linha 32 | linha 33 | `CV34` |

### O que é calculado

- tempos de processo nas linhas 23, 26, 29 e 32;
- conversão de estoque/WIP para dias nas linhas 24, 27, 30 e 33;
- movimento de 5 minutos convertido por `5/(24×60)`;
- transporte de 4 horas convertido por `4/24`;
- totais de processo, espera e lead time em `CV:CX`.

### O que está manual, embora pareça fórmula

As quantidades de WIP estão embutidas como literais, por exemplo `15`, `68`, `132`, `291`, `180`, `336`, `345`, `364` e `334`, antes de serem divididas por dois e pela demanda diária. Esses números devem ser expostos como:

- `MES` quando a localização/processo já estiver nas consultas online;
- `INPUT` quando forem limite, meta, rack, buffer ou ponto sem cobertura;
- `OVERRIDE` quando o usuário precisar corrigir excepcionalmente um realizado, sempre com justificativa e histórico.

Existe ainda um vínculo externo residual em `MIFC-2023!BQ27` para `'[8]CAPACIDADE 2022'!H5`. Ele não deve ser migrado como dependência externa; o valor deve ser substituído por um parâmetro nomeado de movimentação/tempo.

## Aba `WIP`

A aba é um formulário de levantamento manual por cliente, direção (`entrada`/`saída`) e ponto do fluxo: LCT, RF2, RF3, mesas, Beattys, gravação, plasma, CNC, pintura, Stenhoj e embalagens. Apenas `D5 = 68` está preenchido no arquivo analisado.

Decisão: preservar toda a grade como fallback de preenchimento, mas preencher automaticamente os pontos cobertos pelo MES. A interface deve mostrar origem, data de atualização e permitir override controlado.

## Capacidade e velocidade de máquina

O arquivo recebido não contém uma aba ativa e autossuficiente de capacidade. A antiga `CAPACIDADE 2022` permanece apenas como referência externa histórica. No Power BI, a capacidade está distribuída em:

| Origem PBIP | Papel | Tipo na aplicação |
|---|---|---|
| `Máquinas[Máquina]` | cadastro da máquina | `INPUT/MASTER DATA` |
| `Máquinas[Tempo Disponível (Min)]` e `[Tempo Disponivel (Hrs)]` | disponibilidade planejada | `INPUT` por cenário |
| `dOperacao[Capacidade]` | velocidade/capacidade nominal, originalmente golpes por minuto | `INPUT` |
| `dOperacao[Tempo Abastecimento]` | parâmetro de abastecimento | `INPUT` |
| `Emb Offset` / `Emb Reta` | capacidade/h e processamento por cliente | `INPUT` |
| `Produção`, `Paradas`, `BI_PUNCH_SCA`, `BI_OEE_SCRAP` | produção, paradas, golpes e eficiência reais | `MES` |
| medidas `T-P-M-*`, `D-P-*`, `T-*`, `TKT-*` | tempo, demanda, takt e capacidade calculada | `CALCULATED/MIXED` |

Portanto, **velocidade nominal, turnos, disponibilidade planejada, OEE-meta e capacidade de rack/buffer são preenchimentos**. Produção, paradas, estoque e golpes realizados são automáticos quando o MES estiver disponível. Capacidade/dia, utilização, gargalo, dias de estoque e lead time são cálculos.

## Aba `Resumo 2025_2026 `

Ela não é uma fonte limpa de 2026. Há blocos de 2022, 2023 e 2025; o bloco mais recente ainda referencia `Volume 2023` e `MIFC-2023`, e vários resultados estão zerados. A aba serve para conferir a estrutura do resumo, não como cadastro mestre.

Campos manuais do resumo: dias de transporte/usina, volume por cliente e eventuais metas. Campos calculados: pares/dia, componentes de WIP, dias por etapa, WIP geral e total.

Na aplicação atual, `Transporte (h)`, `Beneficiador (dias)` e `Movimentação (min)` são entradas manuais explícitas por cliente. O total funcional usa esses valores salvos; não usa mais `4 h`, `0 dia` e `5 min` como constantes invisíveis.

## Aba `Action Plan 2025_2026`

Os campos de ação são manuais: ID, cor, prioridade, ideia, responsável, ENN, pilar, ganho potencial, status, datas, impacto, facilidade, custo, tempo, progresso e justificativa. A coluna de ordenação/ranking é calculada por concatenação dos quatro critérios. O título menciona 2026, mas as linhas existentes ainda carregam ações históricas de 2024; a migração deve separar ano/revisão dos dados.

## O que o Power BI já automatizou

- estoque por cliente e localização;
- dias de estoque e WIP por demanda;
- produção média diária;
- demanda e quantidade até ship date;
- tempo de processo por máquina usando disponibilidade planejada e demanda;
- paradas, produção, segregação e parte da capacidade online;
- totais de tempo por FH, VM, Scania e DAF.

### Correção aplicada ao Slitter

O Slitter automático da aplicação segue a cadeia do modelo semântico, não a antiga estimativa manual por bobinas do Excel:

- metros de lote: `(PESO/7850) ÷ ((ESPESSURA/1000) × (LARGURA/1000))`;
- comprimento médio: média ponderada por contagem de `FINISH_LENGTH`/`FINISH_LENGHT` nas linhas `Local = Slitter` de DAF Slitters, FH, Scania e VM;
- peças: arredondamento para baixo de metros de lote ÷ comprimento médio;
- dias: peças ÷ cadência diária `P-M-*` do cliente;
- FH e VM usam o mesmo grupo de lotes `VDB`, como em `Lotes[Cliente]`, mas mantêm cadências distintas;
- `Produção[ITEM(m)]` não participa do cálculo.

Os símbolos de buffer do Layout mostram estes dias no ponto físico correspondente. O card da máquina mantém separadamente o tempo `T-*`; ENNs não criam outra soma.

O catálogo completo dos cartões está em [layout-card-lineage.csv](./layout-card-lineage.csv), e o DAX das 62 medidas usadas no Layout está em [layout-measure-catalog.csv](./layout-measure-catalog.csv).

## Pendências que exigem validação funcional

1. confirmar a unidade de `dOperacao[Capacidade]` por processo;
2. decidir quais pontos de WIP não existem no MES e permanecerão manuais;
3. transformar constantes de material, bobina, transporte e movimentação em parâmetros nomeados;
4. confirmar a regra de calendário/dias efetivos do cenário;
5. eliminar o vínculo externo `BQ27`;
6. validar os alertas de inconsistência encontrados no DAX/Layout antes da migração definitiva.
