# MIFC Digital — checkpoint do Prompt 3

Data: 2026-08-19  
Status: formulários MIPS funcionais com persistência local  
Oracle: desconectado; nenhuma consulta executada

## Entrega

Foram implementados quatro módulos editáveis derivados do `MIFC Action Plan 2026 - Osasco Plant R01.xlsx` e da matriz de fontes do Prompt 1:

- Volume;
- Logística;
- Buffer e Estoque;
- Capacidade.

Todos permitem adicionar, editar, duplicar, ativar/desativar e salvar uma revisão local. A revisão é recarregada do `localStorage` quando a aplicação inicia.

## Volume

- clientes e veículos/modelos;
- veículos/dia, reforço, dias trabalhados e turnos;
- pares/dia somente leitura;
- horários, virada de turno, refeição, reuniões, minutos e horas disponíveis;
- comprimento, largura, espessura, densidade, quantidade e peso de bobina;
- peso por peça, estoque em kg/peças/pares e dias de estoque.

As fórmulas executadas nesta etapa foram confirmadas no Excel: pares/dia, tempo líquido de turno, peso de material e cadeia de estoque Slitter.

## Logística

- cliente, veículo, flatbed, data e horário programados;
- transporte, movimentação, frequência e lote;
- ship date, material, item, localização, quantidade pedida e finalizada como colunas MES somente leitura.

Fora da rede, os campos MES mostram `Aguardando MES`; não existe fallback silencioso para valores online.

## Buffer e Estoque

- cliente, ponto/localização, direção e tipo;
- WIP, limite/capacidade e pares/dia;
- processo de entrada e saída;
- origem INPUT ou ORACLE/MES;
- dias de estoque somente leitura;
- sinalização quando o WIP excede a capacidade.

A conversão de WIP para dias segue a fórmula confirmada no `MIFC-2023`: peças ÷ 2 ÷ pares/dia.

## Capacidade

- sequência, código e processo;
- CT, capacidade nominal/h e unidade;
- turnos, horas disponíveis, eficiência-meta e WIP-meta;
- capacidade/dia de referência importada e bloqueada;
- busca, ordenação por sequência e status.

A aplicação não recalcula capacidade/dia, utilização ou gargalo nesta etapa, pois a unidade de `dOperacao[Capacidade]` e a fórmula por processo ainda dependem da validação do Prompt 4.

## Classificação e segurança

- `INPUT`: editável e armazenado apenas no banco local do MVP (`localStorage` neste checkpoint);
- `CALCULATED`: somente leitura e gerado por fórmula confirmada;
- `ORACLE/MES`: somente leitura, sem consulta enquanto a conexão não estiver habilitada;
- `IMPORT`: referência trazida do modelo atual, sem se apresentar como regra validada.

Nenhum arquivo de referência foi alterado. Nenhum acesso Oracle foi realizado.

## Próximo passo

Executar o Prompt 4 — Calculation Engine e testes de paridade — para validar capacidade/dia, utilização, gargalo, regras de calendário, transporte e demais dependências antes de apresentá-las como cálculos definitivos.
