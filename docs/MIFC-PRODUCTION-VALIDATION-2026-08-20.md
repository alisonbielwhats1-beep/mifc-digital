# MIFC Digital — validação de produção, ciclo e capacidade por máquina

Data da validação: 2026-08-20

Snapshot canônico: `OMES-2026-08-20T1137-BRT`

Janela da captura: 11:36:43–11:36:55, `America/Sao_Paulo`

Decisão do owner: produção diária e horária deve usar `LOCATION_DATE`, como o Power BI.

## 1. Resultado executivo

1. O filtro temporal do Digital estava divergente: usava `CREATION_DATE`; o Power BI cria `Data_Processada = DateTime.Date(LOCATION_DATE)` e `Início da Hora = Time.StartOfHour(LOCATION_DATE)`. A regra local foi corrigida e protegida por teste.
2. No snapshot canônico, as nove medidas Oracle reproduzidas fecharam com diferença zero entre OMES bruto agregado, DAX recalculado e MIFC corrigido.
3. Não foi obtido um valor renderizado de um refresh identificado do Power BI. A coluna “Power BI visual” permanece `—`; o que foi validado é a regra DAX recalculada sobre o mesmo snapshot OMES.
4. A unidade técnica comprovada é `DISTINCTCOUNT(RAIL_ID)`. O Semantic Model chama o resultado de “Produção Peças”, mas ainda falta confirmação do processo de que um `RAIL_ID` distinto equivale sempre a uma peça física válida.
5. Os valores de ciclo e capacidade do cadastro são parâmetros locais/demo, não leitura OMES. Até a origem nominal e o fator ciclo→saída serem aprovados, devem ser tratados como `s/ciclo`, `ciclos/h` e `unid./dia`, não como produção observada.
6. O indicador DAX `T-C-*` não é o mesmo conceito do CT nominal cadastrado. Ele divide minutos líquidos do período por `RAIL_ID` produzido, resultando em `min/RAIL_ID` no período.
7. Nenhuma medida oficial de OEE foi localizada. `efficiencyPercent`/“OEE-meta” é um input local de cenário e não foi aplicado aos valores de referência exibidos.

## 2. Fonte, filtros e unidade da produção

Fonte física autorizada: `BOMES.BI_MFIC_PROD`, consulta catalogada `producao`, `SELECT` somente leitura, fingerprint validada.

Regra comum das medidas Oracle:

```text
DISTINCTCOUNT(RAIL_ID)
filtrado por DESCRIPTION da saída da máquina
filtrado por Date(LOCATION_DATE) para o dia
agrupado por Time.StartOfHour(LOCATION_DATE) para a hora
```

O snapshot continha 2.528 linhas de produção e não atingiu o limite de 20.000. Nenhum registro individual, chassi ou credencial foi persistido neste relatório.

## 3. Snapshot máquina por máquina

`PBI recalculado` significa aplicação da expressão DAX catalogada sobre as mesmas linhas OMES. `PBI visual` exige um refresh identificado do dataset e não foi obtido.

| Máquina | Filtro `DESCRIPTION` | Clientes no recorte | Medida produção | OMES | PBI recalculado | MIFC corrigido | Dif. | Demanda | Restante | PBI visual | Status |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---|
| RF3 | `Roll Former 3` | DAF 20; SCA 119; VDB 43; sem cliente 11 | `P-RF3` | 193 | 193 | 193 | 0 | 350 | 157 | — | PARCIAL |
| Beatty 1 | `Beatty Alma Output 1` | VDB 70 | `P-B1` | 70 | 70 | 70 | 0 | 128 | 58 | — | PARCIAL |
| Beatty 2 | `Beatty Alma Output 2` | VDB 58 | `P-B2` | 58 | 58 | 58 | 0 | 0 | -58 | — | PARCIAL |
| Beatty 3 | `Beatty Alma Output 3` | SCA 72 | `P-B3` | 72 | 72 | 72 | 0 | 0 | -72 | — | PARCIAL |
| Beatty 4 | `Beatty Alma Output 4` | VDB 60 | `P-B4` | 60 | 60 | 60 | 0 | 222 | 162 | — | PARCIAL |
| P.A | `Beatty ABA Output` | SCA 53; VDB 70 | `P-P.A` | 123 | 123 | 123 | 0 | 222 | 99 | — | PARCIAL |
| CNC | `Plasma CNC 02 Auto` | VDB 66 | `P-CNC` | 66 | 66 | 66 | 0 | 0 | -66 | — | PARCIAL |
| Pintura | `Pintura Output 2` | SCA 95; VDB 77 | `P-LPP2` | 172 | 172 | 172 | 0 | 350 | 178 | — | PARCIAL |
| Stenhoj | `Stenhoj` | DAF 27; SCA 58; VDB 46 | `P-STJ` | 131 | 131 | 131 | 0 | 222 | 91 | — | PARCIAL |

Unidade técnica das colunas OMES/PBI/MIFC: `RAIL_ID` distintos. “Demanda” segue as medidas `D-P-*`; ela não é capacidade. Valores negativos em “Restante” significam produção no recorte com demanda calculada zero e não podem ser convertidos em eficiência ou sobrecapacidade sem conciliar pedido, cliente e período.

### Produção por hora no mesmo snapshot

| Máquina | Contagem técnica por hora de `LOCATION_DATE` |
|---|---|
| RF3 | 00h 11; 06h 19; 07h 47; 08h 34; 09h 38; 10h 30; 11h 14 |
| Beatty 1 | 00h 6; 06h 6; 07h 20; 08h 18; 09h 12; 10h 8 |
| Beatty 2 | 00h 8; 07h 12; 08h 12; 09h 14; 10h 12 |
| Beatty 3 | 00h 10; 06h 10; 07h 10; 08h 12; 09h 16; 10h 14 |
| Beatty 4 | 00h 6; 06h 8; 07h 10; 08h 12; 09h 8; 10h 10; 11h 6 |
| P.A | 00h 13; 06h 13; 07h 15; 08h 23; 09h 22; 10h 25; 11h 12 |
| CNC | 00h 8; 06h 6; 07h 12; 08h 8; 09h 13; 10h 12; 11h 7 |
| Pintura | 00h 16; 06h 1; 07h 1; 08h 38; 09h 45; 10h 45; 11h 27 |
| Stenhoj | 00h 20; 06h 12; 07h 26; 08h 22; 09h 26; 10h 25 |

O bucket `00h` deve ser confirmado com o owner de timezone/turno antes de qualquer ajuste; ele foi mantido exatamente como `LOCATION_DATE` chegou do OMES.

As linhas horárias usam `DISTINCTCOUNT` dentro de cada hora e não são necessariamente aditivas: o mesmo `RAIL_ID` pode aparecer em mais de um bucket. No snapshot, isso ocorreu em Pintura, cuja soma dos buckets é 173 enquanto o total diário distinto é 172.

## 4. Ciclo e capacidade cadastrados

| Máquina | CT local | Cap. teórica matemática | Taxa local | Referência/dia | Derivação encontrada | Horas cadastradas | Eficiência input | Situação |
|---|---:|---:|---:|---:|---|---:|---:|---|
| RF3 | 48 s/ciclo | 75 ciclos/h | 75 unid./h | 1.200 unid./dia | `75 × 16`; não usa as 16,7 h da própria linha | 16,7 | 85% | DIVERGENTE |
| Beatty 1 | 62 s/ciclo | 58,0645 ciclos/h | 58 unid./h | 928 unid./dia | `58 × 16`; arredonda/trunca antes de multiplicar | 16 | 82% | PARCIAL |
| Beatty 2 | 62 s/ciclo | 58,0645 ciclos/h | 58 unid./h | 928 unid./dia | `58 × 16`; arredonda/trunca antes de multiplicar | 16 | 82% | PARCIAL |
| Beatty 3 | 62 s/ciclo | 58,0645 ciclos/h | 58 unid./h | 928 unid./dia | `58 × 16`; arredonda/trunca antes de multiplicar | 16 | 82% | PARCIAL |
| Beatty 4 | 62 s/ciclo | 58,0645 ciclos/h | 58 unid./h | 928 unid./dia | `58 × 16`; arredonda/trunca antes de multiplicar | 16 | 82% | PARCIAL |
| LCT | — | — | — | — | valor local `0` não é tratado como CT observado | 16 | 90% | PENDENTE |
| P.A | — | — | — | — | valor local `0` não é tratado como CT observado | 16 | 90% | PENDENTE |
| CNC | — | — | — | — | valor local `0` não é tratado como CT observado | 16 | 90% | PENDENTE |
| Pintura | 110 s/ciclo | 32,7273 ciclos/h | 33 unid./h | 528 unid./dia | `33 × 16` | 16 | 60% | PARCIAL |
| Stenhoj | 60 s/ciclo | 60 ciclos/h | 60 unid./h | 960 unid./dia | `60 × 16` | 16 | 90% | PARCIAL |

`Cap. teórica matemática = 3.600 ÷ CT`. Isso só vira peças/h quando forem comprovados o significado do ciclo e quantas peças saem por ciclo. A eficiência local não foi aplicada à referência diária; por isso a coluna “capacidade efetiva” continua `— / Sem dado` em vez de usar um OEE não validado.

### Caso Beatty: origem de `62 s` e `928`

```text
CT cadastrado:                     62 s/ciclo
Taxa matemática:                  3.600 / 62 = 58,064516 ciclos/h
Taxa armazenada no Digital:       58 unid./h
Referência armazenada por dia:    58 × 16 = 928 unid./dia
Eficiência local de 82% aplicada: não
Produção OMES no snapshot:        70 RAIL_ID distintos (Beatty 1)
```

Conclusão: `928` é uma referência local planejada derivada da taxa arredondada/truncada e de 16 horas. Não é produção do OMES e não há prova suficiente para chamá-la de `pç/dia`.

## 5. Por que `T-C-*` do Power BI não valida o CT nominal

As medidas DAX seguem esta família:

```text
T-D-L-* = SUM(Calendar[Dia_Min]) - paradas programadas - F-H
T-C-*   = T-D-L-* / P-*
F-H     = 180 minutos
```

Para um dia histórico sem parada programada, o numerador é `1.440 - 180 = 1.260 min`; o resultado ainda depende da produção filtrada por `LOCATION_DATE`. Isso não é comparável ao parâmetro nominal de `62 s/ciclo`: um mede throughput médio de uma janela; o outro pretende representar ciclo nominal de equipamento.

## 6. Máquinas/processos sem produção comparável nesta fonte

| Máquina/processo | Medida/fonte existente | Resultado neste gate | Status |
|---|---|---|---|
| LCT | `P-LCT = SUM(Produção LCT[_VALUE])`, SQL Server DT_LOGGER | —; fator ciclo→peça e resets não validados | PENDENTE |
| RF2 | `P-RF2 = SUM(Produção RF2[_VALUE])`, SQL Server DT_LOGGER | —; unidade do tag não validada | PENDENTE |
| Mesa 3 | `T-M3 = 0` | —; zero é placeholder, não produção nem CT | PENDENTE |
| Rebitagem Scania | demanda/tempo reutilizam parâmetros; sem `P-*` próprio | — | PENDENTE |
| Rebitagem DAF | demanda/tempo reutilizam parâmetros; sem `P-*` próprio | — | PENDENTE |
| Embalagem VM | `T-EMB-VM = 1/P-M-VM`; sem produção real própria | — | PENDENTE |
| Expedição | sem CT/capacidade/produção de máquina no mapa atual | — | NÃO APLICÁVEL/PENDENTE |

## 7. Alteração funcional aplicada

- antes: produção local filtrada por `CREATION_DATE`;
- depois: produção local filtrada por `LOCATION_DATE` ou sua coluna materializada `Data_Processada`;
- `CREATION_DATE` não é mais fallback para a data de produção;
- teste RED registrou `1` contra `2` esperados; após a correção, os dois testes do módulo ficaram verdes;
- nenhuma alteração de UX foi feita;
- `.env` permaneceu com `ORACLE_READ_ONLY=true` e `ORACLE_LIVE_READS_ENABLED=false`; as leituras foram habilitadas apenas no processo temporário de diagnóstico.

## 8. Pendências para fechar a validação

1. capturar o ID/horário do refresh Power BI e seus valores visuais no mesmo snapshot;
2. confirmar oficialmente se `RAIL_ID` distinto equivale a uma peça boa em cada saída;
3. aprovar fonte e revisão do CT nominal, multiplicador peças/ciclo e horas efetivas por máquina;
4. definir OEE oficial, incluindo disponibilidade, performance e qualidade;
5. conciliar produção e demanda pelo mesmo cliente/pedido: Beatty 2, Beatty 3 e CNC tiveram produção com demanda diária zero; Beatty 2 e Beatty 4 produziram VDB no snapshot apesar das demandas DAX associadas a DAF e FH;
6. validar o bucket `00h`, fronteira do dia produtivo e timezone de `LOCATION_DATE`;
7. executar LCT/RF2 contra DT_LOGGER com regra aprovada de ciclo→peça.

Até essas pendências serem resolvidas, o status global continua **PARCIAL**: a paridade da contagem Oracle foi validada no snapshot, mas unidade física, capacidade efetiva, OEE e valor visual do Power BI ainda não foram fechados.
