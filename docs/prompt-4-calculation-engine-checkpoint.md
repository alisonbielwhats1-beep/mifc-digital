# MIFC Digital — checkpoint do Prompt 4

Data: 2026-08-19  
Status: Calculation Engine v1 funcional e testado  
Oracle: desconectado; nenhuma consulta executada

## Entrega

- engine versionado com registro e substituição controlada por versão;
- catálogo com código, nome, versão, categoria, unidade, inputs, expressão, fonte e status;
- resultados rastreáveis por revisão, regra, versão e entidade;
- origem `CALCULATED`, data de cálculo, data mais recente da fonte e indicação de fallback;
- erro explícito para campo ausente, resultado inválido ou regra não validada;
- 12 regras executáveis;
- 5 regras cadastradas e bloqueadas;
- 28 comparações numéricas de referência;
- tela `/mifc/analysis` com catálogo, filtros e situação da paridade.

## Validado

- pares/dia;
- tempo disponível por turno;
- peso médio por peça;
- estoque Slitter em kg, peças, pares e dias;
- WIP/estoque em dias;
- movimentação em dias;
- transporte em dias;
- tempo de processo em dias;
- soma de Lead Time por cliente.

## Não declarado como validado

- capacidade/dia;
- utilização;
- gargalo;
- dias trabalhados anuais;
- volume anual;
- medidas dependentes dos dados Oracle atuais;
- filtros temporais e de cliente do PBIP sem execução online.

## Segurança

Nenhum arquivo Excel/PBIP foi alterado. Nenhuma consulta Oracle foi executada. O engine só opera sobre valores fornecidos no contexto e não possui qualquer caminho de escrita no MES.

## Próximo passo

Executar o Prompt 5 na rede Metalsa para validar as consultas Oracle allowlisted e fornecer os dados necessários às regras mistas. Capacidade e gargalo devem permanecer bloqueados até a unidade e a fórmula por processo serem confirmadas.
