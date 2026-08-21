# MIFC Digital — relatório inicial de descoberta

Data: 2026-08-18  
Status: Prompt 1 concluído com lacunas documentadas; nenhuma consulta foi executada no Oracle.

Entregáveis consolidados:

- [checkpoint do Prompt 1](./prompt-1-discovery-checkpoint.md);
- [matriz de fontes de verdade](./source-of-truth-matrix.md);
- [inventário do Layout](./layout-inventory.md);
- [especificação visual aprovada](./ui-reference-spec.md).

## Fonte analisada

O projeto Power BI analisado está em:

`C:\Users\Usuário\Downloads\MIFC\MIFC.pbip`

Foram lidos somente os arquivos de definição do projeto. A pasta original em `Downloads` permanece sem alterações.

## Papel das fontes no projeto

O contexto original do projeto contém duas camadas de referência que não devem ser confundidas:

1. `MIFC Action Plan 2026 - Osasco Plant R01.xlsx` é o modelo operacional de referência utilizado pela equipe. Ele representa um MIPS/MIFC concluído e serve como padrão para preenchimento, abas, parâmetros e organização de Volume, Logística e Capacidade.
2. `MIFC.pbix`, aqui analisado na forma de projeto `MIFC.pbip`, é a evolução desse modelo para dados online. Ele contém as consultas, transformações Power Query, medidas DAX, relacionamentos, visualizações e o Layout MIFC atual.

A aplicação não deve escolher entre Excel e Power BI. Ela deve combinar os papéis:

```text
MIPS 2026 Excel
    → padrão de preenchimento, campos e exemplo concluído

Power BI / PBIP
    → cálculos atuais, transformações, visualizações e paridade

Oracle MES
    → dados corporativos online, somente leitura

Aplicação MIFC Digital
    → inputs editáveis + dados online + Calculation Engine + Layout editável
```

Os anexos originais do Excel, Word, PowerPoint e guideline foram registrados na conversa de origem, mas não estão presentes no espelho local desta tarefa. Por isso, a auditoria atual confirma a estrutura e a lógica expostas no PBIP, mas ainda precisa da cópia do Excel MIPS 2026 para fechar a conferência campo a campo das abas de preenchimento.

Estrutura relevante:

- `MIFC.Report\MIFC.Report\definition`: páginas e visuais do relatório;
- `MIFC.SemanticModel\MIFC.SemanticModel\definition`: modelo semântico em TMDL;
- `MIFC.SemanticModel\MIFC.SemanticModel\.pbi\cache.abf`: cache local do modelo, presente no pacote.

## Inventário do relatório

| Página | Visuais |
|---|---:|
| Layout | 552 |
| RF3 | 22 |
| Geral | 13 |
| Scania | 8 |
| Page 1 | 8 |
| Embalagem | 7 |
| Logística | 6 |
| FH | 3 |
| Page 2 | 3 |
| tooltiplog | 1 |
| tooltip | 1 |
| **Total** | **624** |

## Inventário do modelo

- 44 arquivos de tabela TMDL;
- 53 relacionamentos;
- 309 medidas, concentradas em `1-Measure.tmdl`;
- cultura do modelo: `pt-BR`;
- consultas e medidas relacionadas a produção, paradas, embarque, estoque, capacidade, MIFC e lead time.

## Uso direto identificado no relatório

Uma leitura inicial dos arquivos `visual.json` encontrou referências diretas a:

- `1-Measure`: 552 ocorrências, principalmente na página `Layout`;
- `Calendar`: 115 ocorrências;
- `MP`: 61 ocorrências;
- `Dados de embarque`: 29 ocorrências;
- `Operações`: 28 ocorrências;
- `BI_PUNCH_SCA`: 9 ocorrências;
- `SCANIA`: 9 ocorrências;
- `Base_Desc_Hora`: 8 ocorrências;
- `dOperacao`: 5 ocorrências;
- `FH`: 4 ocorrências;
- `Lotes`: 3 ocorrências;
- `BI_PUNCH_VDB`: 1 ocorrência.

Foram identificadas 204 medidas referenciadas diretamente pelos visuais. Esse número é uma evidência inicial de uso, não a allowlist final: medidas podem depender de outras medidas e de tabelas que não aparecem diretamente no `visual.json`.

## Interpretação para a próxima etapa

O caminho de dependência precisa ser aprofundado em dois níveis:

```text
visual.json
    → medidas diretamente usadas
    → medidas dependentes
    → colunas/tabelas usadas no DAX
    → consultas Power Query
    → fontes Oracle, SQL Server ou Excel
```

Somente o resultado final desse rastreamento poderá determinar quais consultas Oracle estão realmente em uso no MIPS.

## Dependências Oracle observadas nas medidas

A análise estática das 309 medidas encontrou referências diretas aos seguintes objetos/tabelas do modelo. A contagem representa medidas que mencionam a tabela; não representa quantidade de linhas nem quantidade de consultas executadas.

| Tabela do modelo | Origem Power Query | Medidas que referenciam diretamente |
|---|---|---:|
| `SCANIA` | Oracle — SQL explícito | 23 |
| `FH` | derivada de `Base1` — Oracle | 22 |
| `VM` | derivada de `Base1` — Oracle | 20 |
| `Segregacao` | Oracle — SQL explícito | 15 |
| `DAF` | derivada de `Base2` — Oracle | 14 |
| `Paradas` | Oracle — navegação M | 14 |
| `Produção` | Oracle — navegação M | 11 |
| `DAF SLITTERS` | Oracle — SQL explícito | 11 |
| `Lotes` | Oracle — navegação M | 7 |
| `BI_MIFC_LCT_POS_STOCK` | Oracle — navegação M | 1 |
| `SHIPDATE` | Oracle — SQL explícito | 1 |
| `Relatorio_Item RF2` | Oracle — SQL explícito | 1 |

Esse quadro já reduz significativamente o universo inicial. Ainda será necessário incluir dependências de visuais que usam tabelas diretamente, como `BI_PUNCH_SCA` e `BI_PUNCH_VDB`, e verificar medidas encadeadas antes de liberar a execução.

## Fontes de dados encontradas

### Oracle MES

Conexão declarada no modelo:

```text
10.44.34.68:1522/MESBR
```

Objetos Power Query que contêm `Oracle.Database`:

#### Consultas com SQL explícito

- `Base1`;
- `Base2`;
- `DAF SLITTERS`;
- `SCANIA`;
- `SHIPDATE`;
- `Relatorio_bases`;
- `Relatorio_Item RF2`;
- `Segregacao`.

#### Consultas por navegação M

- `BI_PUNCH_SCA`;
- `BI_PUNCH_VDB`;
- `BI_OEE_SCRAP`;
- `Lotes`;
- `Produção`;
- `Paradas`;
- `BI_MIFC_LCT_POS_STOCK`.

Essa lista é um inventário de objetos que apontam para Oracle. Ela ainda não é a lista final de consultas autorizadas: a próxima etapa é rastrear quais objetos alimentam efetivamente as medidas e páginas utilizadas no MIPS.

### Outras fontes — fora do primeiro escopo Oracle

O modelo também referencia:

- SQL Server `METBROSAWAPP03`, banco `DT_LOGGER`, em `Produção LCT` e `Produção RF2`;
- arquivos Excel em compartilhamentos de rede, incluindo parâmetros de embalagem, programação de embarque, máquinas e processos/ENNs.

Essas fontes não serão consultadas nesta etapa, pois o escopo autorizado é o Oracle usado pelo MIPS.

## Observações importantes

1. O PBIP já expõe as fórmulas, consultas Power Query, tabelas, relacionamentos e metadados de visuais necessários para iniciar a análise.
2. O cache local está presente, mas não substitui a validação com dados atuais do Oracle.
3. Algumas consultas são fontes-base ou consultas intermediárias; a existência no modelo não prova que estejam sendo usadas por uma página ativa.
4. Nenhuma conexão ao Oracle foi realizada nesta etapa.

## Próxima etapa

Construir a matriz de dependências:

```text
Página/visual
    → medida
    → tabela/coluna
    → consulta Power Query
    → objeto Oracle
```

O rastreamento inicial e a matriz de fontes já foram registrados nos entregáveis acima. O próximo passo de implementação é o Prompt 2 — Fundação e modelo de dados. A allowlist Oracle permanece desabilitada até a validação na rede Metalsa, e a paridade completa dos formulários permanece condicionada ao Excel MIPS 2026.
