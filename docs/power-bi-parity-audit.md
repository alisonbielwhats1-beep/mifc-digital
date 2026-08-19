# Auditoria de paridade — Power BI × MIFC Digital

Data: 2026-08-19

## Conclusão atual

A aplicação **ainda não possui paridade numérica integral** com o modelo semântico do Power BI e não deve afirmar o contrário.

- o arquivo `1-Measure.tmdl` recebido contém 309 medidas;
- o Layout catalogado usa 62 medidas únicas em 132 cartões;
- o MIFC Digital reproduz atualmente as demandas principais, medidas operacionais observadas e 14 tempos de processo;
- as famílias completas de estoque/logística, segregação e totais por cliente ainda não foram materializadas;
- os parâmetros de `Máquinas[Tempo Disponível (Min)]` ainda vêm do cadastro local de Capacidade;
- a planilha importada pelo PBIP, os relacionamentos completos e todos os filtros visuais da revisão corrente não estão disponíveis no repositório.

Por segurança, a faixa de clientes exibe somente números. Quando uma medida necessária não está calculada, o resultado visual é `—`; a chave DAX não é usada como substituto do valor.

## Cobertura já reproduzida

- contexto de data enviado como `Calendar[Date]` para Base1, Base2 e DAF Slitters;
- filtros de cliente de FH, VM, Scania e DAF usados nas demandas principais;
- `P-SCA-F`, `P-DAF-S`, `P-FH-F`, `P-VM-F` e `P-T-D`;
- demandas RF3, Beattys 1–4, RF2, P.A, CNC, Pintura, Stenhoj e Rebitagens;
- tempos `T-RF3`, `T-B1`, `T-B2`, `T-B3`, `T-B4`, `T-LCT/RF2`, `T-P.A`, `T-CNC`, `T-LPP2`, `T-STJ`, `T-SCA-REB`, `T-DAF-REB`, `T-EMB-VM` e o placeholder explícito `T-M3`;
- produção, produção restante e paradas das fontes Oracle aprovadas já materializadas.

Essas fórmulas foram reproduzidas do TMDL, mas a igualdade com a atualização corrente do Power BI ainda depende da paridade dos parâmetros importados e de uma comparação de resultados com a mesma data/contexto.

## Lacunas que afetam as linhas dos clientes

- medidas `D-E-*` de estoque por ponto;
- medidas `E-P-D-*` de estoque pós-processo;
- `E-D-P-LCT`, `E-D-P-RF2` e logística em dias;
- medidas de segregação por processo;
- `T-T-FH`, `T-T-VM`, `T-T-SCA` e `T-T-DAF`;
- transformações M que geram `local`, famílias e classificações intermediárias;
- relacionamentos/filtros de `Operações`, `MP`, `Dados de embarque` e `Calendar` não presentes nos anexos selecionados;
- valores importados da tabela `Máquinas`.

## Critério obrigatório para declarar 100%

1. inventariar a revisão corrente completa do SemanticModel e do Report;
2. reproduzir cada transformação M, relacionamento, DAX e filtro visual usado;
3. usar os mesmos parâmetros de máquina da atualização comparada;
4. executar uma matriz de comparação por data e cliente;
5. aceitar somente resultados dentro da tolerância definida para cada formato;
6. manter como `—` toda medida sem fonte, parâmetro ou validação completa.

Os artefatos necessários para fechar a auditoria são a pasta completa `MIFC.SemanticModel`, a pasta completa `MIFC.Report` e a fonte atual da tabela `Máquinas`/`Parâmetros.xlsx`, ou acesso controlado à mesma fonte no computador Windows.
