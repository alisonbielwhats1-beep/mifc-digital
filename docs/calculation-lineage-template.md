# MIFC Digital — matriz de rastreabilidade de cálculos

O modelo possui 309 medidas em `1-Measure.tmdl`. O Prompt 1 confirmou a estrutura, as categorias e amostras prioritárias. Para o Layout, a linhagem local foi fechada para os 132 cartões e 62 medidas efetivamente consumidas. Consulte [layout-measure-lineage.md](./layout-measure-lineage.md), [layout-card-lineage.csv](./layout-card-lineage.csv) e [layout-measure-catalog.csv](./layout-measure-catalog.csv). O Prompt 4 implementará essas regras e executará os testes de paridade.

## Registros confirmados no Prompt 1

| Nome Power BI | Categoria | Expressão resumida | Origem principal | Unidade | Status |
|---|---|---|---|---|---|
| `T-D` | Tempo disponível | soma `Calendar[Dia_Min]` | calendário | minutos | fórmula PBIP confirmada |
| `T-M` | Logística | `5/1440` | constante DAX | dias | fórmula PBIP confirmada; parametrização pendente |
| `P-RF3` | Produção | contagem distinta de trilhos em Roll Former 3 | Oracle `Produção` | peças | fórmula PBIP confirmada |
| `T-C-RF3` | Capacidade | tempo disponível líquido ÷ produção | medidas encadeadas | a confirmar | linhagem parcial |
| `Q-P-ShipDate` | Logística | SCANIA + FH + VM + DAF no Slitter | consultas Oracle | peças | fórmula PBIP confirmada |
| `D-E-FH-B` | Estoque | estoque Beattys ÷ produção em pares | medidas encadeadas | dias | fórmula PBIP confirmada |
| `E-P-D-SCA-RF3` | Estoque | peças pós-RF3 ÷ demanda | medidas encadeadas | dias | fórmula PBIP confirmada |

## Campos obrigatórios

| Campo | Conteúdo |
|---|---|
| Código | Nome estável da regra |
| Nome Power BI | Nome original da medida/coluna |
| Categoria | Volume, capacidade, WIP, Lead Time etc. |
| Expressão | DAX/M original |
| Inputs | Campos necessários |
| Dependências | Outras medidas ou regras |
| Origem | Tabela/consulta/objeto Oracle |
| Unidade | segundos, horas, dias, pares etc. |
| Visual | Página e visual consumidor |
| Resultado de referência | Valor capturado do Power BI/Excel |
| Regra migrada | Nome no Calculation Engine |
| Status | Pendente, em análise, migrada, validada |
| Observações | Divergências ou limitações |

## Modelo de registro

```text
Código: <a definir>
Nome Power BI: <nome original>
Categoria: <categoria>
Expressão: <DAX/M original>
Inputs: <colunas e medidas>
Dependências: <regras relacionadas>
Origem: <tabela/consulta/Oracle>
Unidade: <unidade>
Visual: <página/visual>
Resultado de referência: <valor>
Regra migrada: <nome no engine>
Status: Pendente
Observações: <notas>
```

## Regra de paridade

Não substituir a fórmula por uma interpretação aproximada. Quando a origem, unidade ou dependência não estiver clara, o registro permanece pendente até a confirmação no PBIP, Excel ou Oracle.
