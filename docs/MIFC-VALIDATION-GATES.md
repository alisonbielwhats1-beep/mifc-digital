# MIFC Digital — gates de validação

Data: 2026-08-20

Decisão atual: **NÃO LIBERADO para declarar paridade numérica completa com MES/Power BI**

Escopo liberado: contrato, inventário, linhagem e paridade local de fórmulas explicitamente validadas

## 1. Critério de status

| Status | Critério |
|---|---|
| `VALIDADO` | fonte, fórmula/semântica, unidade, filtros e resultado aplicável foram confirmados no escopo declarado |
| `PARCIAL` | parte do contrato está comprovada, mas falta ao menos uma dimensão necessária para uso operacional |
| `DIVERGENTE` | duas evidências válidas não concordam ou existe defeito provável na implementação/fonte |
| `PENDENTE` | não há evidência suficiente ou depende de decisão/acesso humano |

“Teste automatizado passou” valida o comportamento local da regra, não prova que o valor atual do MES é igual ao Power BI.

## 2. Registro canônico dos gates

O registro tem 30 regras: **7 validadas, 10 parciais, 6 divergentes e 7 pendentes**.

### 2.1 Validadas — 7

| ID | Regra | Evidência e escopo |
|---|---|---|
| `V01` | hierarquia contextual das fontes | papéis reconciliados entre manual, treinamento, formulário, workbook, Semantic Model e aplicativo |
| `V02` | pares/dia | fórmula `veículos × (1 + reforço)` e quatro fixtures do workbook |
| `V03` | disponibilidade do 1º turno | 06:00–15:36 menos 60 e 5 min = 511 min, reproduzido localmente |
| `V04` | peso e estoque de material | peso kg/peça, estoque kg, peças, pares e dias reproduzidos nas quatro famílias |
| `V05` | WIP em dias | `peças ÷ 2 ÷ pares/dia`, com restrição explícita de duas peças por par |
| `V06` | semântica de armazenamento/estagnação e fluxos push/pull | definições concordantes no manual, treinamento e formulário de símbolos |
| `V07` | independência estrutural das Beattys 1–4 | filtros de produção, demanda, máquina, parada e IDs separados no modelo e aplicativo |

### 2.2 Parciais — 10

| ID | Regra | Confirmado | Falta confirmar |
|---|---|---|---|
| `P01` | calendário e turnos fabris | horários e dois cálculos do workbook inventariados | feriados, fins de semana, extra, vigência e fronteira do dia produtivo |
| `P02` | timezone | aplicativo/planta usam `America/Sao_Paulo`; `F-H=180` identificado | timezone Oracle, gateway/Power BI e significado aprovado de `F-H` |
| `P03` | produção Oracle | `DISTINCTCOUNT(RAIL_ID)` e filtros de RF3/Beattys identificados | snapshot e valores reais |
| `P04` | produção LCT/RF2 | tags e soma de `_VALUE` identificados | conversão ciclo→peça e tratamento de resets/qualidade |
| `P05` | ciclo e takt | numeradores/denominadores DAX identificados | unidade oficial por medida e comportamento com zero/ausência |
| `P06` | capacidade | parâmetros de máquina e formulário separados de produção | unidade de `dOperacao`, calendário efetivo e aprovação dos valores-base |
| `P07` | rotas FH/VM/Scania/DAF | matriz por família reconstruída do PBIP | variantes por item, MP, simples/reforçada e exceções operacionais |
| `P08` | buffers | cinco registros e fórmula local mapeados | lista completa, locais MES, capacidade e valores observados |
| `P09` | biblioteca de símbolos | 9 tipos de nó e 4 fluxos genéricos existem | símbolos oficiais especializados e regra estoque×estagnação |
| `P10` | cenário/revisão/operacional | stores mantêm revisão local e origem INPUT/MES | aprovação, autor, vigência, imutabilidade e persistência corporativa |

### 2.3 Divergentes — 6

| ID | Divergência | Evidência | Impacto |
|---|---|---|---|
| `D01` | reunião do 2º turno não entra na fórmula | campo contém 5 min, mas `I4` subtrai somente refeição | 5 min/dia de diferença potencial |
| `D02` | `E-B-SCA` perde valor quando há estoque | `IF(CALCULATE(...)=BLANK(),0)` não tem ramo falso | estoque Scania pode virar `BLANK` |
| `D03` | família `D-E-*` alterna `×2` e `÷2` | `D-E-FH-P.I` e `D-E-SCA-CL` usam `produção ×2`; outras usam `÷2` | unidade de dias de estoque pode variar por fator 4 |
| `D04` | placeholders numéricos parecem fatos | `T-B=0` e `T-M3=0` | zero pode ser interpretado como tempo observado |
| `D05` | composição do Lead Time | manual inclui processamento + estagnações; totais DAX somam principalmente estoque/logística e não todas as medidas de processo exibidas | totais podem ter semânticas diferentes |
| `D06` | revisão histórica 2025/2026 quebrada | referências a linhas inexistentes, `#REF!`, duplicação 2024/2023 e vínculo DAF cruzado | resumo histórico não é fonte confiável automática |

### 2.4 Pendentes — 7

| ID | Gate | Condição de saída |
|---|---|---|
| `Q01` | paridade Oracle por medida | executar leitura autorizada, registrar snapshot e comparar bruto, Power BI e Digital |
| `Q02` | sincronismo MES↔Power BI | obter refresh ID/horário do dataset e mesma janela da API |
| `Q03` | seis Golden Cases numéricos | preencher período, filtros, resultado esperado e evidência de aprovação |
| `Q04` | inventário completo de buffers | aprovar todos os pontos/locais e sua distinção estoque×estagnação |
| `Q05` | rotas por SKU/MP | owner de processo aprovar variantes e não participantes |
| `Q06` | SLA e calendário operacional | aprovar tolerância temporal, feriados, turnos e política de desatualização |
| `Q07` | OEE por máquina | definir fonte, fórmula, componentes, unidade, período e Golden Case; nenhuma medida explícita foi localizada |

## 3. Golden Cases obrigatórios

Nenhum resultado numérico foi inventado. Campos `A DEFINIR` precisam ser preenchidos com um período fechado e um snapshot conhecido.

| Caso | Recorte obrigatório | Referência Power BI/origem | Regra Digital a confrontar | Resultado esperado | Tolerância | Status |
|---|---|---|---|---|---|---|
| `GC01 — Volvo FH` | data fechada, FH, mesmos MP/localizações e refresh | `T-I-FH` e `P-FH-F = T-I-FH/2` sobre `FH` | contagem de itens FH e conversão explícita para pares | A DEFINIR pelo snapshot | contagem inteira exata; par exato | PENDENTE |
| `GC02 — RF3` | data fechada, `DESCRIPTION="Roll Former 3"` | `P-RF3 = DISTINCTCOUNT(Produção[RAIL_ID])` | produção Oracle RF3 no mesmo período | A DEFINIR | `RAIL_ID` distinto exato | PENDENTE |
| `GC03 — Beatty 3` | data fechada, `DESCRIPTION="Beatty Alma Output 3"` | `P-B3 = DISTINCTCOUNT(Produção[RAIL_ID])` | produção da entidade Beatty 3 | A DEFINIR; B1/B2/B4 invariantes | contagem exata; zero interferência nas demais Beattys | PENDENTE |
| `GC04 — buffer real` | local/colunas aprovados de `BI_MIFC_LCT_POS_STOCK`, instante conhecido | tabela `BI_MIFC_LCT_POS_STOCK` e medida aplicável | `buf-fh-lct-in` ou novo buffer MES com `quantityPieces` não nulo | A DEFINIR após aprovar agregação | peças exatas; dias dentro de 1 segundo no valor bruto | PENDENTE |
| `GC05 — Lead Time FH completo` | mesma data/revisão/filtros de Calendar, MP, Operações e embarque | `T-T-FH` e todos os 13 grupos de componentes DAX | soma versionada e decomponível dos mesmos componentes | A DEFINIR por componente e total | duração bruta ≤ 1 s; arredondamento só na apresentação | PENDENTE/DIVERGENTE por `D03` e `D05` |
| `GC06 — produção real conhecida` | período fechado assinado pelo processo, tag LCT ou RF2, resets e qualidade documentados | `Produção LCT/RF2[_VALUE]` + registro de chão de fábrica | conversão ciclo→peça aprovada | A DEFINIR pelo registro conhecido | peças inteiras exatas após conversão | PENDENTE |

### 3.1 Componentes mínimos do `GC05`

O confronto deve registrar separadamente:

`T-T`, `7 × T-M`, `E-D-P-LCT`, `Q-D-FH` com `MP[Cliente]="FH"`, `E-D-P-RF2` com os dois MPs e data corrente do recorte, `E-P-D-FH-RF3`, `E-P-D-FH-M3`, `D-E-FH-B`, `D-E-FH-CL`, `D-E-FH-P.I`, `D-E-FH-P.A`, `E-P-D-FH-STJ` e `E-P-D-FH-EMB` com seus filtros.

Se o resultado total coincidir, mas algum componente divergir, o caso falha: compensação entre erros não é paridade.

## 4. Tolerâncias

| Tipo | Tolerância de gate | Observação |
|---|---|---|
| contagem de `RAIL_ID`, chassi, item, lote | exata | comparar conjunto de chaves quando possível, não só total |
| peças/pares inteiros | exata | fração só se a regra de pares permitir explicitamente |
| duração bruta | até 1 segundo (`1/86.400` dia) | arredondamento visual não altera o valor de referência |
| peso | até 0,001 kg, salvo precisão maior da fonte | conservar entradas geométricas completas |
| percentual | até 0,01 ponto percentual | numerador e denominador também precisam bater |
| timestamp | mesmo instante após conversão de timezone | offset fixo não é tolerância |

Essas tolerâncias são técnicas para os Golden Cases; o owner pode torná-las mais restritivas. Afrouxá-las exige decisão registrada.

## 5. Bugs prováveis e inconsistências a confirmar

### 5.1 Matriz de conflitos entre fontes

| Conflito | Documentação | Excel | Power BI/Semantic Model | MES | Digital atual | Status |
|---|---|---|---|---|---|---|
| disponibilidade do 2º turno | exige considerar tempo disponível/esperas, sem valor Osasco | campo de reunião=5 min; fórmula resulta 491 min sem subtraí-lo | parâmetros diários vêm de `Máquinas`, sem turno explícito | não consultado | fixture reproduz a fórmula de 491 min | `D01 — DECISÃO NECESSÁRIA` |
| estoque Beatty Scania | estoque deve ter quantidade/unidade e origem | não traz valor operacional equivalente | `E-B-SCA` retorna 0 quando vazio e `BLANK` quando existe valor | fonte Oracle existe, valor não consultado | ausência é apresentada como não disponível | `D02 — PROVÁVEL BUG` |
| dias de estoque | material×takt/demanda requer unidade coerente | WIP usa peças÷2÷pares/dia | algumas `D-E-*` usam produção×2, outras ÷2 | unidades por localização não confirmadas | regra genérica usa peças÷2÷pares/dia | `D03 — DECISÃO NECESSÁRIA` |
| Lead Time total | processamento + estagnação; produção/transporte/informação separáveis | timeline soma linhas de processo e estoque | `T-T-*` soma sobretudo estoque/logística e constantes | fornece componentes, não total oficial | engine possui total por componentes/fixtures | `D05 — DECISÃO NECESSÁRIA` |
| revisão 2025/2026 | não define ano da planta | referências vazias, `#REF!` e vínculo cruzado | sem revisão anual equivalente comprovada | não aplicável | revisão local não importa esse bloco automaticamente | `D06 — NÃO USAR AUTOMATICAMENTE` |

| Item | Confiança | Classificação | Ação permitida neste gate |
|---|---|---|---|
| ramo falso ausente em `E-B-SCA` | alta | provável bug DAX | documentar e criar caso; não corrigir |
| `×2` em `D-E-FH-P.I` e `D-E-SCA-CL` versus `÷2` na família | média/alta | possível bug de unidade ou exceção não documentada | obter unidade de numerador e denominador |
| comentário “VM” em `D-E-FH-P.A` | alta | erro de documentação | corrigir somente após autorização do modelo |
| `I4` ignora reunião de 5 min | alta | provável erro/requisito não aplicado | decisão de turno antes de mudar fórmula |
| `T-B` e `T-M3` iguais a zero | alta | placeholder confirmado pelo DAX | apresentar como pendente, não observado |
| referências 2025/2026 a linhas inexistentes | alta | workbook quebrado/incompleto | não importar automaticamente |
| DAF 2022 aponta para `MIFC-2023` em uma célula | alta | vínculo cruzado provável | owner precisa indicar ano correto |
| 15 cartões DAF repetidos no rodapé do Layout | alta | sobreposição visual | preservar evidência; não duplicar sem decisão |
| `Segregacao` exclui literalmente `RAIL_ID 1896038` | média | exceção operacional não documentada | justificar ou retirar em mudança separada |

### 5.2 Dossiê de provável bug

#### `PB-01 — E-B-SCA`

- código atual: `IF(CALCULATE([Scania], SCANIA[local]="Beatty Output") = BLANK(), 0)`;
- resultado atual: retorna `0` quando a expressão está vazia e `BLANK` quando existe estoque, pois não há terceiro argumento;
- fonte oficial: contrato metodológico exige quantidade de estoque identificável; a tabela Oracle/medida precisa fornecer o valor observado;
- resultado esperado: **decisão necessária**; comportamento provável é devolver o estoque calculado no ramo falso, mas nenhum valor foi inventado;
- impacto: dias de estoque e Lead Time Scania podem ficar vazios;
- ação deste gate: documentado, não corrigido.

#### `PB-02 — conversões D-E`

- código atual: `D-E-FH-P.I` e `D-E-SCA-CL` dividem o estoque por `produção × 2`; medidas vizinhas dividem por `produção ÷ 2`;
- resultado atual: para o mesmo valor-base, os denominadores diferem por fator 4;
- fonte oficial: workbook usa `WIP peças ÷ 2 ÷ pares/dia`; o DAX pode ter granularidades diferentes que ainda não foram comprovadas;
- resultado esperado: **não definido** até confirmar se cada numerador está em peças, pares ou conjuntos;
- impacto: dias de estoque e total de Lead Time;
- ação deste gate: documentado, não normalizado.

#### `PB-03 — turno 2`

- fórmula atual: `((fim-início)+virada-refeição)×1.440`, sem o campo reunião;
- resultado atual: 491 min; se a reunião de 5 min for aplicável, seriam 486 min;
- fonte oficial: o próprio workbook informa 5 min no campo de reunião, mas não esclarece se deve ser descontado;
- resultado esperado: **decisão do owner de Produção/RH**;
- impacto: tempo disponível, capacidade/dia, takt e utilização;
- ação deste gate: ambos os resultados documentados, fórmula preservada.

#### `PB-04 — bloco 2025/2026`

- código/fonte atual: fórmulas do resumo apontam para linhas inexistentes de `MIFC-2023`/`Volume 2023` e nomes definidos contêm `#REF!`;
- resultado atual: células podem produzir branco/zero e falsa aparência de dado 2025;
- fonte oficial esperada: revisão anual aprovada ainda não fornecida;
- resultado esperado: **não definido**;
- impacto: comparação histórica e cenário anual;
- ação deste gate: fonte bloqueada para importação automática.

## 6. Condições para liberar a próxima implementação numérica

1. resolver `D01`–`D05` ou aprovar explicitamente seu comportamento;
2. responder as decisões críticas de [MIFC-OPEN-QUESTIONS.md](./MIFC-OPEN-QUESTIONS.md);
3. executar os seis Golden Cases no mesmo snapshot;
4. anexar resultados brutos, filtros, unidades e timestamps;
5. manter Oracle somente leitura e dentro da allowlist aprovada;
6. atualizar este registro sem apagar divergências históricas.

Até essas condições serem atendidas, o aplicativo pode usar regras locais validadas e parâmetros revisionados, mas não deve declarar que reproduz integralmente os números operacionais do Power BI/MES.
