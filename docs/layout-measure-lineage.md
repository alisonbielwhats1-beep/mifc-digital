# MIFC Digital — linhagem dos blocos numéricos do Layout

Data: 2026-08-19  
Fonte: página `ReportSection` do PBIP local  
Regra: leitura estática dos arquivos PBIP; nenhuma consulta de banco foi realizada.

## Cobertura

- 132 cartões numéricos encontrados no Layout;
- 132 cartões ligados a uma medida existente;
- 62 medidas DAX únicas;
- 43 medidas únicas dependem de dados do banco;
- 15 medidas únicas misturam banco e parâmetros;
- 4 medidas únicas são constantes/derivadas sem tabela, reutilizadas em 47 cartões.

Arquivos detalhados:

- [layout-card-lineage.csv](./layout-card-lineage.csv): uma linha para cada cartão, com posição, faixa, cliente, medida, filtros e origem;
- [layout-measure-catalog.csv](./layout-measure-catalog.csv): fórmula DAX completa, dependências, tabelas diretas e indiretas, formato e constantes numéricas de cada uma das 62 medidas.

## Estrutura real das linhas

O PBIP usa duas faixas por cliente: uma para tempo de processo e outra para estoque/logística. A classificação foi reconstruída pela posição vertical e confirmada pelos nomes das medidas.

| Faixa | Cartões | Conteúdo |
|---|---:|---|
| Volvo FH — tempo de processo | 10 | LCT/RF2, RF3, Mesa 3, Beatty, pintura, Stenhoj |
| Volvo FH — estoque/logística | 21 | transporte, beneficiador, movimento, estoque por ponto e total |
| Volvo VM — tempo de processo | 7 | RF3, Mesa 3, Beatty, CNC, pintura e embalagem |
| Volvo VM — estoque/logística | 14 | transporte, movimento, estoques e total |
| Scania — tempo de processo | 9 | RF3, Mesa 3, Beatty, P.A, rebitagem, pintura e Stenhoj |
| Scania — estoque/logística | 22 | transporte, movimento, estoques e total |
| DAF — tempo de processo | 9 | RF3, Mesa 3, Beatty, CNC, rebitagem, pintura e Stenhoj |
| DAF — estoque/logística | 19 | transporte, movimento, estoques e total |
| Segregação | 6 | RF2, RF3, pintura, Stenhoj, embalagem e total |
| Rodapé sobreposto | 15 | repetição de cartões DAF; requer validação |

## Como cada tipo de bloco é calculado

| Família de medidas | Exemplo | Regra | Origem final |
|---|---|---|---|
| Tempo do processo | `T-RF3` | tempo disponível planejado ÷ demanda ÷ 1.440 | parâmetro `Máquinas` + demanda MES |
| Estoque do ponto em dias | `D-E-FH-B` | estoque Beatty FH ÷ produção média em pares | tabelas FH/produção do MES |
| Estoque pós-processo em dias | `E-P-D-SCA-RF3` | peças no ponto ÷ demanda diária | MES + calendário |
| Estoque logístico do cliente | `Q-D-FH` | estoque/material em processo ÷ peças médias diárias | MES; filtro de cliente/material |
| Segregação em dias | `Q-D-S-RF3` | peças segregadas do processo ÷ demanda aplicável | tabela `Segregacao` + demanda MES |
| Movimento | `T-M` | `5/1440` | constante atual de 5 minutos |
| Transporte | `T-T` | `4/24` | constante atual de 4 horas |
| Beneficiador | `T-B` | `0` | placeholder atual |
| Mesa 3 | `T-M3` | `0` | placeholder atual |
| Total do cliente | `T-T-FH`, `T-T-VM`, `T-T-SCA`, `T-T-DAF` | soma de transporte, movimentos, processos e estoques filtrados | cálculo misto completo |

Os filtros visuais também fazem parte da regra. Foram encontrados contextos por `Calendar[Date]`, `MP[Cliente]`, `MP[MP]`, `Operações[Dados ]` e `Dados de embarque[Data]`. A migração não pode copiar somente o DAX sem reproduzir esses filtros.

## Relação com os campos manuais

Os números mostrados no desenho não são novos campos independentes. Eles devem apontar para entidades e regras da aplicação:

- o bloco de processo lê disponibilidade, velocidade/capacidade nominal, turnos e demanda;
- o bloco de armazenamento/buffer lê estoque realizado, limite/meta e demanda;
- o bloco de logística lê estoque por localização, ship date, transporte e movimentação;
- o bloco de total soma somente os cartões pertencentes à linha/revisão ativa;
- o usuário edita os parâmetros e o vínculo do bloco; o resultado calculado permanece somente leitura.

Para cada nó do editor, a aplicação deverá guardar `measureKey`/`calculationKey`, cliente, processo, unidade, origem, data de atualização e regra de fallback. Remover visualmente um nó não deve apagar o cadastro ou o histórico de parâmetros.

## Inconsistências encontradas

1. `E-B-SCA` usa `IF(condição, 0)` sem o terceiro argumento. Quando há estoque, a medida pode retornar `BLANK` em vez do valor; deve ser validada antes de migrar.
2. O comentário de `D-E-FH-P.A` diz “Dias de Estoque VM P.A”, embora a medida e as dependências sejam de FH.
3. Há 15 cartões DAF repetidos no rodapé, sobrepostos à faixa de segregação/total. O catálogo os preserva e os marca para decisão; eles não serão duplicados automaticamente na nova aplicação.
4. `T-M` aparece 35 vezes com 5 minutos fixos. Deve virar parâmetro de movimentação por conexão/rota, não uma constante global invisível.
5. `T-T` usa 4 horas fixas; `T-B` e `T-M3` são zero. São placeholders/parâmetros pendentes, não dados automáticos.
6. As linhas do PBIP são geometria, não conexões semânticas. A fórmula do cartão foi mapeada, mas os `edges` do editor ainda precisam ser reconstruídos e validados.

## Regra de implementação

Cada cartão migrado deve passar por este contrato:

1. identificar cliente, processo e posição do nó;
2. resolver parâmetros planejados da revisão;
3. ler apenas as fontes MES autorizadas;
4. executar a regra de cálculo versionada;
5. exibir valor, unidade, origem e horário da atualização;
6. sinalizar indisponibilidade do MES em vez de apresentar zero como se fosse realizado;
7. permitir fallback/override somente com justificativa e trilha de auditoria.
