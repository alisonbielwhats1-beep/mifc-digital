# MIFC Digital — matriz de símbolos

Data: 2026-08-20

Fonte normativa: `MIFC-F1-V1-POR.xlsx`, confrontada com manual, treinamento e `MifcSymbolPalette.vue`

## 1. Estados da matriz

| Estado | Significado |
|---|---|
| `Implementado` | existe representação própria coerente com a finalidade oficial |
| `Implementado incorretamente` | existe algo visualmente próximo, mas tipos oficiais foram fundidos ou a semântica se perde |
| `Ausente` | não existe tipo/ação equivalente na biblioteca atual |
| `Necessita validação` | há representação genérica possível, mas falta provar equivalência |
| `Não aplicável` | o owner decidiu que o símbolo não pertence ao escopo; nenhum caso foi classificado assim neste gate |

## 2. Matriz completa

| # | Símbolo oficial | Semântica oficial resumida | Representação atual | Estado | Lacuna/ação |
|---:|---|---|---|---|---|
| 1 | Fluxo de Material (Pull) | etapa seguinte puxa conforme necessidade | edge `material_pull` | Implementado | manter direção e distinção visual |
| 2 | Fluxo de Material Push | material avança sem considerar necessidade seguinte | edge `material_push` | Implementado | manter direção e distinção visual |
| 3 | Sequência / ordem de transporte | sequência preservada na movimentação | nenhuma | Ausente | criar fluxo/tipo próprio se aplicável |
| 4 | Carros de transporte | meio específico de movimentação | somente nó genérico `truck` | Ausente | não chamar todo transporte de caminhão |
| 5 | Empilhadeira | meio específico de movimentação | somente nó genérico `truck` | Ausente | tipo/ícone e propriedades próprios |
| 6 | Comboio | meio específico de movimentação | somente nó genérico `truck` | Ausente | tipo/ícone e capacidade próprios |
| 7 | Trem | meio específico de movimentação | somente nó genérico `truck` | Ausente | diferenciar de comboio/caminhão |
| 8 | Caminhão | transporte externo/expedição | nó `truck`, rótulo Transporte | Implementado | validar atributos de rota/lotação |
| 9 | Armazenamento de Material | acúmulo controlado, com variedade/espaço e quantidade predeterminada | `storage`, usado tanto por Buffer quanto Estoque | Implementado incorretamente | separar tipo e exigir critérios FIFO/Kanban/min/max |
| 10 | Estagnação de material | material parado sem condições de armazenamento controlado | nó `stagnation` | Implementado | validar classificação de cada ponto |
| 11 | Fluxo de Informação | fluxo dentro do sistema produtivo | edge `information` | Implementado | manter origem/destino auditáveis |
| 12 | Informação Visual | lista/quadro visual ou papel | nó/edge genérico `information` | Necessita validação | tipo visual/papel não é preservado |
| 13 | Informação Eletrônica | comunicação transmitida por sistema | edge `electronic_information` | Implementado | identificar sistema/protocolo quando conhecido |
| 14 | Base de dados | computador/base no fluxo de informação | nó `database` | Implementado | registrar sistema e fonte |
| 15 | Quadro Heijunka | nivelamento de volume e mix ao longo do tempo | nenhuma | Ausente | decidir aplicabilidade e campos |
| 16 | Ordem de Produção Sequencial | instrução de produção sequenciada, papel ou eletrônica | nó genérico `information` | Necessita validação | preservar modalidade e regra de sequência |
| 17 | Painel/Quadro Formador de Lotes | forma lotes de tamanho determinado | nenhuma | Ausente | tipo com tamanho/regra de lote |
| 18 | Placa padrão / Pattern Board | padrão visual de formação/execução | nó genérico `information` | Necessita validação | sem tipo ou comportamento próprio |
| 19 | Bloco de processo | representa processo; pode conter múltiplas linhas | nó `process` | Implementado | separar blocos quando o material deixa de estar conectado |
| 20 | Cliente ou Fornecedor | fonte/destino externo de peça/material | nó `customer_supplier` | Implementado | classificar papel e família |
| 21 | Posto Kanban | local de guarda para recolhimento de cartões | nó genérico `kanban` | Implementado incorretamente | falta subtipo e localização |
| 22 | Rampa/Chute do Kanban | coleta ordenada de cartões | nó genérico `kanban` | Implementado incorretamente | falta subtipo e ordenação |
| 23 | Kanban de Instrução de Produção | solicita reposição/produção | nó genérico `kanban` | Implementado incorretamente | não distingue instrução de retirada |
| 24 | Kanban de Coleta de Material | solicita retirada/reposição de material | nó genérico `kanban` | Implementado incorretamente | falta subtipo e item/quantidade |
| 25 | Sinal do Kanban | indica ponto de reposição e lote necessário | nó genérico `kanban` | Implementado incorretamente | falta ponto de reposição/lote |
| 26 | Tablet | autorização física circulante para liberar próximo produto | nenhuma | Ausente | decidir aplicabilidade; não confundir com dispositivo eletrônico |
| 27 | Quadro de Embarque | informa material e momento de coleta | nenhuma | Ausente | pode ligar programação e staging após validação |
| 28 | Ponto de Staging nos Embarques | área de preparação antes da coleta | somente `storage` genérico | Necessita validação | criar subtipo/localização se fizer parte da rota |
| 29 | Nuvem “Nervosa” / oportunidade Kaizen | destaca problema/oportunidade | nenhuma | Ausente | tipo de anotação Kaizen, não alerta operacional automático |
| 30 | Características dos Resultados | registra estado/resultado depois do Kaizen | texto genérico | Necessita validação | falta estrutura antes/depois e evidência |
| 31 | Símbolos de rota | conjunto para caracterizar rotas de abastecimento | edges e nó `truck` genéricos | Necessita validação | catálogo original não detalha aqui os subtipos; decisão humana necessária |

## 3. Elementos extras do aplicativo

| Elemento | Papel | Relação com o formulário oficial |
|---|---|---|
| nó `storage` com rótulo “Buffer” | WIP entre processos | útil, mas não é um subtipo oficial comprovado; precisa ser classificado como armazenamento ou estagnação |
| nó `information` | documento/regra/instrução | representação genérica para vários símbolos oficiais |
| nó `text` e ferramentas de linha/anotação | edição do mapa | recurso do editor; não substitui símbolos semânticos |
| ferramenta `Mover tela` e pan pelo botão do meio | navegação no canvas | comportamento de editor, não símbolo MIFC |

## 4. Regra obrigatória: armazenamento versus estagnação

Um ponto só pode ser `Armazenamento de Material` quando houver evidência de:

1. todos os part numbers aplicáveis identificados;
2. espaço atribuído por part number;
3. controle FIFO, Kanban, mínimo/máximo ou quantidade predeterminada;
4. quantidade/unidade e localização registradas.

Sem esses critérios, classificar como `Estagnação de material` ou `Pendente`. O rótulo “Buffer” não resolve a classificação.

## 5. Gate para ampliar a biblioteca

Antes de implementar um símbolo ausente:

1. confirmar que ele é usado na planta/rota atual;
2. definir propriedades mínimas e regras de conexão;
3. preservar a representação do arquivo oficial;
4. criar fixture visual e teste de persistência;
5. atualizar esta matriz para `Implementado` somente após validação do owner.

Nenhuma alteração visual foi feita neste gate; a matriz documenta o estado existente.
