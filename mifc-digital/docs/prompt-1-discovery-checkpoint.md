# MIFC Digital — checkpoint do Prompt 1

Data: 2026-08-19  
Status: concluído com os anexos locais auditados; validação Oracle pendente  
Oracle: nenhuma conexão, autenticação ou consulta executada

## Resultado

O Discovery confirmou informação suficiente para iniciar a fundação e os formulários sem inventar o domínio. O PBIP contém o modelo atual de dados e cálculo; as imagens aprovadas definem a experiência visual; e os cinco anexos foram auditados para separar preenchimentos, cálculos, dados online e regras metodológicas.

## Fontes e disponibilidade

| Fonte | Papel | Disponível localmente | Resultado |
|---|---|---:|---|
| `MIFC Action Plan 2026 - Osasco Plant R01.xlsx` | padrão de Volume, MIFC, WIP, resumo e plano de ação | sim | campos, fórmulas e números embutidos auditados |
| `MIFC-F1-V1-POR.xlsx` | catálogo oficial de símbolos MIFC | sim | símbolos e significados catalogados |
| `MIFC-H-V1-POR.docx` | orientação/metodologia | sim | regras de demanda, WIP, estoque, processo e Lead Time extraídas |
| `MIFC-UG-V1-POR.pptx` | orientação e exemplo visual | sim | 75 slides inventariados; campos metodológicos confirmados |
| `Digital Experience Guideline.pdf` | identidade visual oficial | sim | cores, tipografia e padrões de componentes confirmados |
| `MIFC.pbip` | Power Query, DAX, relações, páginas e Layout atuais | sim | auditado sem alterações |
| cinco imagens aprovadas | baseline visual das telas | sim | incorporadas à especificação de UI |
| Oracle MES | dados online atuais | não acessado | estrutura preparada para leitura futura |

Os anexos e o PBIP foram lidos em `Downloads` e permaneceram inalterados. A análise de planilhas foi feita sem recalcular ou salvar o workbook.

## Inventário PBIP confirmado

- 44 tabelas TMDL;
- 309 medidas em `1-Measure.tmdl`;
- 53 relacionamentos;
- 11 páginas;
- 624 visuais;
- 552 visuais somente no Layout;
- cultura `pt-BR`;
- fontes Oracle, SQL Server, Excel de rede, tabelas embutidas e consultas derivadas.

### Páginas

| Página | Dimensão | Visuais |
|---|---:|---:|
| Layout | 9999 × 2350 | 552 |
| RF3 | 1200 × 800 | 22 |
| Geral | 4000 × 1500 | 13 |
| Scania | 1600 × 720 | 8 |
| Page 1 | 2500 × 1100 | 8 |
| Embalagem | 1280 × 720 | 7 |
| Logística | 1500 × 600 | 6 |
| FH | 1600 × 720 | 3 |
| Page 2 | 1280 × 720 | 3 |
| tooltips | — | 2 |

## Fontes de dados confirmadas

### Oracle MES

O PBIP aponta para `10.44.34.68:1522/MESBR`.

Consultas com SQL explícito:

- `Base1`;
- `Base2`;
- `DAF SLITTERS`;
- `SCANIA`;
- `SHIPDATE`;
- `Relatorio_bases`;
- `Relatorio_Item RF2`;
- `Segregacao`.

Objetos por navegação M:

- `BI_PUNCH_SCA`;
- `BI_PUNCH_VDB`;
- `BI_OEE_SCRAP`;
- `Lotes`;
- `Produção`;
- `Paradas`;
- `BI_MIFC_LCT_POS_STOCK`.

Todos continuam desabilitados no catálogo local. Nenhum SQL foi enviado ao banco.

### Excel e parâmetros externos usados pelo PBIP

- programação de embarque: Flatbed, data, horário, data/hora e cliente;
- máquinas: tempo disponível em horas/minutos e máquina;
- capacidade de embalagem reta/offset: cliente, capacidade/hora e tempo de processamento;
- processos/ENNs: planilha de rede marcada como obsoleta no caminho atual.

### SQL Server fora do primeiro escopo

- servidor `METBROSAWAPP03`;
- banco `DT_LOGGER`;
- tabelas do modelo `Produção LCT` e `Produção RF2`.

## Cálculos e dependências confirmados

As 309 medidas estão distribuídas principalmente entre MIFC, máquinas, logística, estoque, buffer, tempo, demanda, qualidade e capacidade online. Foram encontradas, entre outras:

- 127 medidas sob `ALL\0.0.MIFC`;
- 127 sob `ALL\Máquinas`;
- 18 em `ALL\0.0.MIFC\Logística`;
- 12 em `ALL\0.0.MIFC\ALL\Tempo`;
- 43 medidas de estoque específicas de SCANIA, DAF, FH e VM;
- 7 medidas de Buffer específicas de clientes;
- 2 medidas em `ALL\Capacidade-Online`.

Exemplos validados diretamente no DAX:

| Medida | Regra encontrada | Unidade interpretada |
|---|---|---|
| `T-D` | soma `Calendar[Dia_Min]` | minutos |
| `T-M` | `5/1440` | dias |
| `P-RF3` | contagem distinta de `Produção[RAIL_ID]` para Roll Former 3 | peças |
| `T-C-RF3` | tempo disponível líquido ÷ produção | min/peça, a confirmar |
| `P-P-RF3` | duração das paradas programadas filtradas por código e operação | minutos |
| `Q-P-ShipDate` | contagem SCANIA/FH/VM no Slitter + pares DAF × 2 | peças |
| `D-E-FH-B` | estoque Beattys ÷ produção em pares | dias |
| `E-P-D-SCA-RF3` | peças pós-RF3 ÷ demanda Scania | dias |

Esses exemplos comprovam que capacidade, logística, estoque, buffer e dias estão presentes no modelo. Além deles, os 132 cartões do Layout foram ligados a 62 medidas DAX, incluindo fórmula, dependências, filtros e tabelas de origem.

## Layout confirmado

O Layout é um canvas Power BI muito largo, composto por 260 shapes, 144 imagens, 132 cards e 16 textos. Das shapes, 209 são linhas, 30 retângulos e 21 ovais. Todos os 132 cards foram resolvidos para medidas existentes.

O PBIP preserva posição e aparência, mas não armazena as linhas como conexões semânticas entre processos. A migração deve reconstruir `nodes` e `edges`, mantendo o desenho atual como referência e marcando conexões ambíguas para validação.

Detalhes: [layout-inventory.md](./layout-inventory.md) e [layout-measure-lineage.md](./layout-measure-lineage.md)

## Entregáveis do Prompt 1

- relatório consolidado deste checkpoint;
- matriz campo/fonte/tipo/unidade/tela/origem/status;
- inventário específico do Layout;
- script de auditoria reexecutável e somente leitura;
- registro explícito das fontes ausentes;
- separação entre `INPUT`, `CALCULATED`, `ORACLE`, `IMPORT` e `MIXED`.
- mapa célula a célula dos principais inputs/fórmulas do Excel;
- catálogo individual dos 132 cartões e das 62 medidas do Layout.

Matriz: [source-of-truth-matrix.md](./source-of-truth-matrix.md)

Preenchimento: [excel-manual-automatic-map.md](./excel-manual-automatic-map.md)

## Decisão para a sequência

| Próximo trabalho | Pode começar? | Condição |
|---|---:|---|
| Prompt 2 — fundação, shell e modelo de dados | sim | usar campos provisórios com origem/status |
| Prompt 3 — formulários funcionais básicos | sim | implementar inputs identificados e resultados somente leitura |
| Prompt 4 — migração de fórmulas prioritárias | sim | usar PBIP + Excel; validação online depende da rede |
| Prompt 5 — Oracle ao entrar na rede | sim, depois | credencial local somente leitura + allowlist aprovada |
| Prompt 6 — editor de Layout | sim | reconstruir grafo semântico e validar ambiguidades |

## Lacunas que permanecem

1. confirmação online do schema e dos resultados Oracle;
2. unidade exata de capacidade/velocidade para cada processo;
3. decisão sobre os pontos de WIP sem cobertura do MES;
4. substituição dos números embutidos no Excel por parâmetros ou dados online;
5. correção/decisão das inconsistências DAX e dos cartões DAF repetidos;
6. validação humana das conexões do Layout que o PBIP guarda apenas como linhas geométricas.

## Critério de conclusão

O Prompt 1 está concluído porque todas as fontes locais foram inventariadas, os preenchimentos e cálculos do Excel foram separados, os cartões do Layout foram rastreados até suas medidas e as lacunas foram registradas sem invenção. A paridade estrutural local está mapeada; a paridade de valores atuais depende da conexão Oracle somente leitura e da validação funcional dos pontos sinalizados.
