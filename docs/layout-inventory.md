# MIFC Digital — inventário do Layout atual

Data: 2026-08-19  
Fonte: definição PBIP em modo somente leitura.

## Dimensões e composição

- página: `Layout`;
- dimensões: `9999 × 2350`;
- modo: `ActualSize`;
- visuais: `552` de um total de `624` no relatório;
- a página possui filtro em `Lotes[SLITTERSTATUS]`.

| Tipo de visual | Quantidade | Interpretação inicial |
|---|---:|---|
| Shape | 260 | linhas e formas usadas para desenhar o fluxo |
| Image | 144 | símbolos, setas, equipamentos, estoques, clientes e logos |
| Card | 132 | valores calculados por medidas DAX |
| Textbox | 16 | rótulos fixos e unidades |
| **Total** | **552** |  |

### Formas

| Forma | Quantidade |
|---|---:|
| Linha | 209 |
| Retângulo | 30 |
| Oval | 21 |

Entre os recursos de imagem mais recorrentes estão Buffer, Estoque, Base de Dados, empilhadeira, talha, caminhão, setas e marcas de clientes. Os textos fixos incluem `SCANIA`, `DAF`, `SHIPPING`, `ORACLE`, `DATA KIT`, `OMES`, `FERROLENE`, `SOLUÇÕES USIMINAS`, `CAMPO LARGO` e `Dias`.

## Dados usados no Layout

As referências de entidades encontradas nos arquivos visuais do Layout foram:

| Entidade | Ocorrências nos metadados |
|---|---:|
| `1-Measure` | 306 |
| `Calendar` | 80 |
| `Operações` | 28 |
| `MP` | 18 |
| `Dados de embarque` | 10 |

Foram encontrados 62 nomes distintos em `nativeQueryRef` na página. Entre os mais recorrentes estão `T-M`, `T-STJ`, `T-RF3`, `T-B`, `T-B1`, `T-M3`, `T-T`, `T-LPP2`, medidas de dias de estoque `D-E-*` e medidas pós-processo `E-P-D-*`.

Os 132 cards foram resolvidos individualmente para essas 62 medidas, sem referência quebrada. A posição, faixa/cliente, filtros, DAX e tabelas de origem estão em [layout-measure-lineage.md](./layout-measure-lineage.md).

Também existem contextos visuais explícitos para clientes `Scania`, `FH`, `VM` e `DAF`, materiais específicos e operações como `Ag. Emb1`, `Ag. Stenhøj`, `Estoque FG` e `Roll Former 3`.

## O que pode ser importado diretamente

O PBIP fornece com boa precisão:

- posição, tamanho, ordem e rotação de cada visual;
- formas e recursos de imagem;
- textos fixos;
- medida associada a cada card;
- parte dos filtros de cliente, material e operação;
- aparência e distribuição espacial do estado atual.

## O que não existe como grafo semântico

O Layout do Power BI é um desenho composto por visuais independentes. As 209 linhas não armazenam, de forma confiável, um identificador de nó de origem e destino. Os símbolos também não possuem necessariamente um tipo de domínio, um processo vinculado ou uma lista formal de entradas e saídas.

Por isso, uma conversão automática de `552 visuais → nodes/edges` não pode ser declarada correta apenas pela proximidade geométrica. A aplicação deve:

1. preservar o PBIP como baseline visual;
2. criar nós e conexões semânticos próprios;
3. reconstruir o fluxo inicial usando posição, símbolos, medidas e contexto;
4. validar conexões ambíguas com o MIPS 2026 ou com o responsável do processo;
5. manter um registro de origem para cada elemento migrado.

## Modelo mínimo recomendado para o Prompt 6

```text
MifcNode
  id, revisionId, type, processId?, label, x, y, width, height,
  layer, properties, sourceVisualIds[], validationStatus

MifcEdge
  id, revisionId, sourceNodeId, targetNodeId, flowType,
  sourceHandle?, targetHandle?, waypoints[], validationStatus
```

Os tipos de nó e fluxo devem seguir o MIPS/metodologia. O catálogo `MIFC-F1-V1-POR.xlsx` confirmou processo, cliente/fornecedor, armazenamento, estagnação, base de dados, caminhão, empilhadeira, kanban, heijunka, fluxo de material, fluxo de informação e informação eletrônica.

## Critério de aceitação

O inventário dos 552 visuais preserva a rastreabilidade das medidas e da geometria do PBIP. A interface funcional, porém, usa a imagem aprovada como referência e reconstrói o desenho como grafo semântico compacto: blocos e linhas são entidades editáveis, mantendo os valores importantes sem expor o canvas bruto ultralargo como tela inicial.
