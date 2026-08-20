# MIFC Digital — decisões e perguntas em aberto

Data: 2026-08-20

Uso: fila de decisões humanas do Gate 0.5. Uma pergunta só é encerrada com resposta, owner, data e evidência.

## 1. Críticas — bloqueiam paridade ou significado do valor

| ID | Owner sugerido | Pergunta/decisão | Por que bloqueia | Evidência já disponível |
|---|---|---|---|---|
| `OQ01` | MES/Infra + BI | Em qual timezone estão `CREATION_DATE`, `LOCATION_DATE`, paradas, DT_LOGGER e o gateway Power BI? | sem isso, dia/hora e intervalos podem cair no recorte errado | Digital usa `America/Sao_Paulo`; origem não documentada |
| `OQ02` | BI + Processo | O que `F-H=180` representa e em quais datas/medidas deve ser aplicado? | deslocamento fixo de 180 min não equivale necessariamente a timezone | medida é subtraída de tempos líquidos |
| `OQ03` | Produção/RH | O 2º turno deve descontar os 5 min de reunião registrados no workbook? | fórmula atual ignora o campo e muda disponibilidade em 5 min/dia | `Volume 2023!H4` versus `I4` |
| `OQ04` | PCP/Produção | Qual é o calendário fabril oficial: fronteira do dia produtivo, fins de semana, feriados, extras e vigência dos turnos? | `Calendar` usa dias civis e 1.440 min | workbook e Power BI não trazem calendário fabril completo |
| `OQ05` | Automação/Produção | Um `_VALUE` de `GOLPES_LCT/RF2` corresponde a quantas peças? Como tratar reset, duplicidade e `_QUALITY`? | não é seguro apresentar ciclos como produção | tags e somas foram inventariadas |
| `OQ06` | Engenharia de Processo | Qual é a unidade de `dOperacao[Capacidade]` por operação e como ela se relaciona com golpes/min e abastecimento? | utilização/capacidade não tem unidade única confirmada | tabela M embutida identificada |
| `OQ07` | BI + Processo | `D-E-FH-P.I` e `D-E-SCA-CL` devem usar produção `×2`, enquanto outras medidas usam `÷2`? Qual a unidade de cada estoque? | uma troca pode mudar dias de estoque por fator 4 | DAX completo preservado no inventário |
| `OQ08` | BI | Qual deve ser o ramo falso de `E-B-SCA` quando o estoque existe? | a medida atual retorna `BLANK` | provável bug DAX de alta confiança |
| `OQ09` | Dono MIFC | O Lead Time oficial deve incluir explicitamente toda faixa de tempos de processo, ou manter a composição atual dos totais DAX? | manual e totais Power BI têm composições diferentes | `T-T-*` e metodologia documentados |
| `OQ10` | Dono MIFC | `T-B` e `T-M3` são etapas não aplicáveis, parâmetros ainda não preenchidos ou tempos reais zero? | cada resposta exige estado visual diferente | ambas as medidas são constantes zero |
| `OQ11` | BI + MES | Qual refresh ID/horário do dataset deve ser usado para cada Golden Case e como obter o mesmo snapshot pela API? | números podem divergir apenas por atualização | agendamento não consta do TMDL |
| `OQ12` | Segurança/DBA | Quais objetos Oracle estão aprovados na allowlist efetiva do Digital, dentre os objetos inventariados? | inventário não é autorização de acesso | contrato somente leitura já existente |
| `OQ30` | Produção/BI | Existe OEE oficial por máquina? Qual fonte, fórmula, período e componentes de qualidade/performance/disponibilidade? | nenhuma medida OEE explícita foi localizada; o nome `BI_OEE_SCRAP` não prova OEE | inventário das 309 medidas e partições |

## 2. Altas — bloqueiam rotas, buffers e comparação operacional

| ID | Owner sugerido | Pergunta/decisão | Consequência |
|---|---|---|---|
| `OQ13` | Engenharia/Logística | Qual é a lista completa de buffers, localizações MES, direção, família, item, capacidade e unidade? | somente cinco linhas locais existem; o workbook lista muitos outros pontos |
| `OQ14` | Volvo VM owner | O buffer `buf-vm-rf2` e o fluxo LCT→RF2 fazem parte da rota VM? | a matriz PBIP não mostra participação VM em LCT/RF2 |
| `OQ15` | Logística/Lean | Quais pontos atendem formalmente aos critérios de armazenamento; quais são estagnação? | `storage` hoje reúne “Buffer” e “Estoque” |
| `OQ16` | Engenharia de Produto | Quais variantes por SKU/MP alteram as rotas FH, VM, Scania e DAF? | as rotas atuais são agregadas por família |
| `OQ17` | Scania owner | Como simples versus reforçada altera peças por par, locais e rota? | várias conversões usam `/2` ou `×2` sem contrato por variante |
| `OQ18` | DAF owner | Como `Pares Slitter`, longarina/conjunto e operações DAF devem ser consolidados? | `P-DAF-S` combina contagem e soma de pares |
| `OQ19` | Processo | Movimento de 5 min e transporte de 4 h são globais ou variam por conexão, cliente, turno e rota? | constantes aparecem repetidamente nos totais |
| `OQ20` | Qualidade/BI | Por que `Segregacao` exclui literalmente `RAIL_ID 1896038`? A exceção continua vigente? | exceção invisível altera o realizado |
| `OQ21` | Logística | Qual agregação da `BI_MIFC_LCT_POS_STOCK` representa o buffer real do `GC04`? | tabela está disponível, mas unidade/colunas e filtro não foram aprovados |
| `OQ22` | PCP | Qual período fechado e registro assinado devem compor o `GC06` de produção real conhecida? | Golden Case não pode usar um número inventado |

## 3. Médias — governança de revisão e legado

| ID | Owner sugerido | Pergunta/decisão | Consequência |
|---|---|---|---|
| `OQ23` | Dono do workbook | `MIFC-2024` é uma revisão própria ou uma cópia intencional de `MIFC-2023`/`Volume 2023`? | não deve virar cenário anual independente sem resposta |
| `OQ24` | Dono do workbook | Quais células/fontes corretas substituem as referências inexistentes do bloco “2025” em `Resumo 2025_2026 `? | resultados atuais podem cair em branco/zero |
| `OQ25` | DAF/Workbook owner | A referência DAF 2022 a `MIFC-2023` é intencional? | vínculo cruza anos enquanto outras famílias usam 2022 |
| `OQ26` | PMO/Lean | As ações datadas de 2024 na aba `Action Plan 2025_2026` continuam vigentes em 2026? | título da revisão não comprova vigência das ações |
| `OQ27` | Produto/Qualidade | Quem aprova revisão, qual data efetiva, e quando o snapshot se torna imutável? | persistência local ainda não é governança corporativa |
| `OQ28` | Operações/BI | Qual SLA define `Desatualizado` para produção, estoque, paradas, logística e parâmetros? | o limiar técnico de 10 min não é decisão de negócio |
| `OQ29` | Lean/UX | Quais símbolos ausentes são realmente aplicáveis à planta e em que prioridade? | implementar toda a biblioteca sem uso validado pode criar semântica falsa |

## 4. Formato de resposta esperado

Para encerrar uma questão, registrar:

```text
ID:
Decisão:
Owner:
Data efetiva:
Fonte/evidência:
Unidade e filtros afetados:
Golden Case atualizado:
```

## 5. O que pode avançar sem essas respostas

- manutenção do inventário completo do Semantic Model;
- documentação de fórmulas, filtros, fontes e divergências;
- uso das regras locais já validadas com dados de fixture;
- edição de cenários e parâmetros claramente marcados como planejados/input;
- preservação das quatro Beattys como entidades independentes;
- melhoria de testes sem alterar regra de negócio.

O que não pode ser declarado concluído: paridade numérica MES↔Power BI↔Digital, calendário fabril, unidade dos contadores LCT/RF2, Lead Time oficial completo, rotas por SKU e mapa total de buffers.
