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
| `process.time_days` | 1 | Processo | dias | minutos disponíveis, demanda em peças | linhas de processo do `MIFC-2023`; família `T-*` do PBIP |
| `lead_time.total_days` | 1 | Lead Time | dias | componentes do fluxo | `MIFC-2023!CV23:CV34`; medidas `T-T-FH/VM/SCA/DAF` |

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
