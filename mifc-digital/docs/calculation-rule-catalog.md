# MIFC Digital — catálogo do Calculation Engine

Data: 2026-08-19  
Versão do catálogo: 1

## Regras executáveis e validadas

| Código | Versão | Categoria | Unidade | Inputs principais | Fórmula/origem |
|---|---:|---|---|---|---|
| `volume.pairs_per_day` | 1 | Volume | pares/dia | veículos/dia, reforço | `Volume 2023!F8:F11` |
| `calendar.shift_available_minutes` | 1 | Calendário | minutos | início, fim, virada, refeição, reuniões | `Volume 2023!I3:I4` |
| `material.weight_per_piece_kg` | 1 | Material | kg/peça | comprimento, largura, espessura, densidade | `Volume 2023!G8:G11` |
| `material.stock_weight_kg` | 1 | Material | kg | bobinas, kg/bobina | `Volume 2023!J8:J11` |
| `material.stock_pieces` | 1 | Estoque | peças | estoque kg, kg/peça | `Volume 2023!K8:K11` |
| `material.stock_pairs` | 1 | Estoque | pares | estoque em peças | `Volume 2023!L8:L11` |
| `material.stock_days` | 1 | Estoque | dias | estoque em pares, pares/dia | `Volume 2023!M8:M11` |
| `wip.days` | 1 | WIP | dias | quantidade em peças, pares/dia | linhas de espera do `MIFC-2023`; família `D-E-*` do PBIP |
| `logistics.movement_days` | 1 | Logística | dias | minutos de movimentação | `MIFC-2023`; medida `T-M` |
| `logistics.transport_days` | 1 | Logística | dias | horas de transporte | `MIFC-2023`; medida `T-T` |
| `logistics.beneficiator_days` | 1 | Logística | dias | dias no beneficiador por cliente | `INPUT` manual; substitui a constante zero de `T-B` |
| `process.time_days` | 1 | Processo | dias | minutos disponíveis, demanda em peças | linhas de processo do `MIFC-2023`; família `T-*` do PBIP |
| `lead_time.total_days` | 1 | Lead Time | dias | componentes do fluxo | `MIFC-2023!CV23:CV34`; medidas `T-T-FH/VM/SCA/DAF` |
| `slitter.lot_length_m` | 1 | Estoque | m | peso, espessura, largura, densidade 7.850 kg/m³ | `Lotes[MP(m)]` no PBIP |
| `slitter.stock_pieces` | 1 | Estoque | peças | metros de lote por cliente, comprimento médio total do Slitter | `E-M-P-S` no PBIP; arredondamento para baixo |
| `slitter.stock_days` | 1 | Estoque | dias | peças de Slitter e `P-M-*` | medidas `Q-D-FH/VM/SCA/DAF` |
| `lead_time.functional_total_days` | 1 | Lead Time | dias | transporte, beneficiador, movimentações, estoques e tempos de máquina | regra local `LT-TOTAL-*`; não duplica subtotal de ENN |

## Regra funcional do total

`LT-TOTAL-*` não substitui nem renomeia `T-T-*` do Power BI. A regra local acrescenta o Beneficiador manual e os tempos de cada máquina participante, exatamente uma vez:

`transporte_h/24 + beneficiador_dias + movimento_min/1440 × N + Σ estoques/esperas da rota + Σ tempos T-* da rota`

`N = 7` para FH e `N = 8` para VM, Scania e DAF. CC, Furação, Pintura e SEE agrupam máquinas, portanto não geram parcelas adicionais.

## Regra exata do Slitter

1. `MP(m) = (PESO / 7850) / ((ESPESSURA / 1000) × (LARGURA / 1000))`.
2. `C-T-E = SUM(Lotes[MP(m)])` no grupo de cliente (`VDB`, `SCA` ou `DAF`).
3. `C-P-M-TOTAL = soma de FINISH_LENGTH das linhas Local=Slitter ÷ quantidade dessas linhas`, combinando DAF Slitters, FH, Scania e VM no contexto de data.
4. `E-M-P-S = ROUNDDOWN(C-T-E / C-P-M-TOTAL, 0)`.
5. `Q-D-cliente = E-M-P-S do grupo ÷ P-M-cliente`, sendo `P-M-cliente = (pares futuros × 2) ÷ quantidade distinta de SHIP_DATE >= TODAY()` conforme o modelo.

FH e VM compartilham os lotes terminados em `VDB`; as cadências `P-M-FH` e `P-M-VM` permanecem separadas. A tabela `Produção` não entra nesta sequência.

## Regras cadastradas, mas bloqueadas

| Código | Motivo do bloqueio |
|---|---|
| `calendar.working_days` | definição anual do calendário do cenário ainda não está fechada |
| `volume.annual_pairs` | regra visual consistente, mas sem referência autossuficiente validada |
| `capacity.per_day` | `dOperacao[Capacidade]` mistura unidade/origem por processo |
| `capacity.utilization_percent` | demanda e capacidade precisam de contexto operacional por processo |
| `capacity.bottleneck` | critério e desempate dependem da regra de utilização validada |

O engine lança `RuleNotValidatedError` quando qualquer uma dessas regras é solicitada. Um valor pendente nunca é apresentado como calculado.

## Paridade automatizada

Foram comparados 28 resultados de referência:

- 4 resultados de pares/dia;
- 2 turnos;
- 4 pesos de peça e 4 resultados de dias Slitter;
- 4 pontos de WIP em dias;
- 4 tempos de processo;
- movimento e transporte;
- 4 Lead Times totais por cliente.

As referências cobrem FH, VM, Scania e DAF. Os testes usam os valores armazenados no próprio workbook analisado e tolerância numérica explícita.

## Cobertura do PBIP

O catálogo do Layout contém 62 medidas únicas. O Prompt 4 não as converteu cegamente em 62 funções isoladas: as medidas equivalentes foram consolidadas em famílias parametrizadas, preservando o contexto de cliente, processo e fonte.

As medidas dependentes do Oracle continuam mapeadas, porém não podem ser validadas com dados atuais fora da rede. Os filtros de `Calendar`, `MP`, `Operações` e `Dados de embarque` precisam ser reproduzidos na integração antes da declaração de paridade completa.
