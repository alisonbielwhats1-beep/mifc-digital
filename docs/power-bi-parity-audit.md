# Auditoria de paridade — Power BI × MIFC Digital

Data: 2026-08-19

## Conclusão atual

A aplicação **ainda não possui paridade numérica integral** com o modelo semântico do Power BI e não deve afirmar o contrário.

- o arquivo `1-Measure.tmdl` recebido contém 309 medidas;
- o Layout catalogado usa 62 medidas únicas em 132 cartões;
- o MIFC Digital reproduz as demandas principais, medidas operacionais observadas, 14 tempos de processo e a camada de estoque/logística usada pelo Layout;
- a camada de estoque agora materializa `D-E-*`, `E-P-D-*`, `E-D-P-LCT`, `E-D-P-RF2`, `Q-D-S-*` e os filtros de cliente/local, incluindo as transformações derivadas de FH, VM, Scania e DAF;
- os parâmetros de `Máquinas[Tempo Disponível (Min)]` ainda vêm do cadastro local de Capacidade;
- as pastas completas `MIFC.Report` e `MIFC.SemanticModel` estão disponíveis como referência;
- `Programacao_embarque.xlsx` foi recebido, validado na rede e integrado com fallback por anexo; continuam ausentes `Parâmetros.xlsx`/`Máquinas` e uma carga Oracle comparável.

Por segurança, a faixa de clientes exibe somente números. Quando uma medida necessária não está calculada, o resultado visual é `—`; a chave DAX não é usada como substituto do valor.

## Cobertura já reproduzida

- contexto de data enviado como `Calendar[Date]` para Base1, Base2 e DAF Slitters;
- filtros de cliente de FH, VM, Scania e DAF usados nas demandas principais;
- `P-SCA-F`, `P-DAF-S`, `P-FH-F`, `P-VM-F` e `P-T-D`;
- demandas RF3, Beattys 1–4, RF2, P.A, CNC, Pintura, Stenhoj e Rebitagens;
- tempos `T-RF3`, `T-B1`, `T-B2`, `T-B3`, `T-B4`, `T-LCT/RF2`, `T-P.A`, `T-CNC`, `T-LPP2`, `T-STJ`, `T-SCA-REB`, `T-DAF-REB`, `T-EMB-VM` e o placeholder explícito `T-M3`;
- produção, produção restante e paradas das fontes Oracle aprovadas já materializadas.
- programação de embarque lida da aba `Data Embarque`, com datas/horários normalizados e a mesma remoção de última linha da consulta M;
- relacionamentos de FH, VM, SCANIA, DAF e DAF Slitters com `Dados de embarque[Flatbed]` reconstruídos no cálculo local;
- blocos `E-P-D-*-EMB` filtrados por relacionamento, `Dados de embarque[Data] >= TODAY()`, contexto diário e operação visual; o cartão SCANIA preserva `Ag. Emb1,Estoque FG`.

Essas fórmulas foram reproduzidas do TMDL, mas a igualdade com a atualização corrente do Power BI ainda depende da paridade dos parâmetros importados e de uma comparação de resultados com a mesma data/contexto.

## Lacunas que afetam as linhas dos clientes

- `T-T-FH`, `T-T-VM`, `T-T-SCA` e `T-T-DAF`;
- validação numérica da camada de estoque com uma carga real do Oracle e a mesma revisão/data do Power BI;
- transformações M que geram `local`, famílias e classificações intermediárias;
- os relacionamentos e filtros de `Dados de embarque` usados nos blocos de embalagem foram reproduzidos; os demais contextos de `Operações`, `MP` e `Calendar` ainda exigem validação medida a medida antes de declarar cobertura integral;
- valores importados da tabela `Máquinas`.

## Critério obrigatório para declarar 100%

1. inventariar a revisão corrente completa do SemanticModel e do Report;
2. reproduzir cada transformação M, relacionamento, DAX e filtro visual usado;
3. usar os mesmos parâmetros de máquina da atualização comparada;
4. executar uma matriz de comparação por data e cliente;
5. aceitar somente resultados dentro da tolerância definida para cada formato;
6. manter como `—` toda medida sem fonte, parâmetro ou validação completa.

Os artefatos que ainda faltam para fechar a auditoria são a fonte atual da tabela `Máquinas`/`Parâmetros.xlsx` e uma carga Oracle controlada para comparação por data e cliente. A programação de embarque já está disponível pela rede e por anexo.
