# Correção Funcional 01 — checkpoint de execução

Data: 2026-08-20
Escopo: confiabilidade, rastreabilidade, cockpit do Layout, paridade estrutural Power BI e comportamento sem fonte MES/Oracle.

## Fontes inspecionadas

- `PROJECT-HANDOFF.md`, `docs/CURRENT-STATUS.md` e os checkpoints anteriores;
- `MIFC.SemanticModel/definition/tables/1-Measure.tmdl`, com as fórmulas DAX dos totais e das medidas de processo/estoque;
- `docs/layout-measure-catalog.csv`, `docs/layout-card-lineage.csv`, `docs/layout-measure-lineage.md` e `docs/client-process-matrix.csv`;
- recursos extraídos do PBIP em `apps/web/public/pbip-layout-resources`, inclusive o símbolo original de Buffer;
- contrato existente de leitura Oracle/MES, sempre somente leitura e sem ampliar a allowlist.

O modelo recebido contém 309 medidas. O Layout catalogado usa 62 medidas únicas em 132 cartões. Esta correção não declara paridade integral desse universo.

## Funcionalidades corrigidas

### Layout como cockpit

- valores de etapa, total do cliente, Tempo de Ciclo, capacidade, produção/demanda e buffers abrem painel de rastreabilidade;
- o painel mostra valor, unidade, fórmula, explicação simples, entradas, resultados intermediários, origem, medida, filtros, cliente, processo, data, atualização e referência;
- cliente é clicável e editável no próprio Layout; `veículos/dia`, reforço, dias úteis e turnos ficam disponíveis sem trocar de tela;
- alteração de volume/reforço recalcula o ritmo dos buffers do cliente pela regra `pares/dia = veículos/dia × (1 + reforço% ÷ 100)`;
- parâmetros de processo aplicados no Layout atualizam o mesmo registro da tela Capacidade;
- alterações de Tempo de Ciclo na tela Capacidade aparecem no Layout ao concluir a edição;
- `Salvar layout` persiste grafo e parâmetros relacionados;
- o Escape encerra tela cheia mesmo quando o foco está em um campo;
- renomeação rápida permanece ao vivo, desfazível e persistida.

### Controles funcionais

- busca global por cliente, máquina, processo, produto, símbolo, regra, medida, código e bloco, com `Ctrl+K`, navegação, centralização e destaque do bloco;
- ajuda contextual para Layout, Capacidade e Buffer;
- sino de notificações ligado ao estado real da API/Oracle, atualização, formulários pendentes, cálculos sem fonte e ações atrasadas;
- biblioteca de símbolos recolhível/expansível, organizada por fluxos e elementos;
- duplicação continua criando ID e objeto independentes;
- Produtos, Processos, Recursos e Dados mestre agora desativam/reativam sem apagar o registro e identificam linhas inativas;
- controles já funcionais de detalhes, edição, ações, inclusão e navegação foram preservados.

### Campos de capacidade

- `CT (s)` foi substituído por `Tempo de Ciclo — CT (s/peça)`;
- capacidade nominal, unidade, turnos, tempo disponível, eficiência/OEE-meta, WIP-meta e capacidade de referência receberam rótulos inequívocos;
- a interface distingue parâmetro manual/importado, referência importada, valor observado MES e valor calculado;
- `capacity.per_day` não recebeu fórmula genérica: onde a regra específica não está comprovada, o resultado continua pendente.

## Medidas e regras mapeadas

As constantes reproduzidas do TMDL são:

- `T-T = 4 ÷ 24` dia;
- `T-M = 5 ÷ 1.440` dia.

Os totais foram reproduzidos sem soma aproximada:

| Total | Movimentações | Parcelas adicionais reproduzidas |
|---|---:|---|
| `T-T-FH` | 7 | `E-D-P-LCT`, `Q-D-FH`, `E-D-P-RF2`, `E-P-D-FH-RF3`, `E-P-D-FH-M3`, `D-E-FH-B`, `D-E-FH-CL`, `D-E-FH-P.I`, `D-E-FH-P.A`, `E-P-D-FH-STJ`, `E-P-D-FH-EMB` |
| `T-T-VM` | 8 | `Q-D-VM`, `E-P-D-VM-RF3`, `D-E-VM-B`, `D-E-VM-CL`, `D-E-VM-P.I`, `E-P-D-VM-EMB` |
| `T-T-SCA` | 8 | `Q-D-SCA`, `E-P-D-SCA-RF3`, `E-P-D-SCA-M3`, `D-E-SCA-B`, `D-E-SCA-P.A`, `D-E-SCA-CL`, `D-E-SCA-P.I`, `D-E-SCA-REB`, `E-P-D-SCA-STJ`, `E-P-D-SCA-EMB` |
| `T-T-DAF` | 8 | `Q-D-DAF`, `E-P-D-DAF-RF3`, `E-P-D-DAF-M3`, `D-E-DAF-B`, `D-E-DAF-CL`, `D-E-DAF-P.I`, `D-E-DAF-REB`, `E-P-D-DAF-STJ`, `E-P-D-DAF-EMB` |

Se qualquer parcela obrigatória estiver ausente, o total é `—`; a aplicação não publica total parcial como total completo.

Também foi corrigido o fechamento por ausência das medidas opcionais de estoque/segregação/LCT/RF2. Elas só são publicadas quando a fonte e o denominador necessários existem. A ausência não vira zero observado.

## Buffers implementados no Layout

Cinco configurações operacionais existentes passaram a ser renderizadas como símbolos:

| ID | Cliente | Ponto | Relação |
|---|---|---|---|
| `buf-fh-lct-in` | Volvo FH | LCT entrada | Slitter → RF2 |
| `buf-fh-lct-out` | Volvo FH | LCT saída | LCT → RF2 |
| `buf-vm-rf2` | Volvo VM | RF2 entrada | LCT → RF2 |
| `buf-sca-rf3` | Scania | RF3 entrada | RF2 → RF3 |
| `buf-daf-paint` | DAF | Pintura Pós-Rebitagem | Montagem → Pintura |

Cada símbolo mostra identificação, WIP em peças e tempo; o painel mostra capacidade, pares/dia, origem e processos anterior/posterior. O tempo segue `WIP em peças ÷ 2 ÷ pares/dia`. A posição é calculada entre os processos relacionados e acompanha o movimento dos blocos.

O PBIP contém mais instâncias visuais de buffer do que as cinco configurações operacionais já identificadas. As restantes não foram inventadas: dependem do mapeamento operacional de ponto, cliente, entrada, saída e fonte.

## Símbolos e fluxos

A biblioteca expõe, com nome, tooltip e finalidade:

- Processo/máquina;
- Buffer com o recurso original do PBIP;
- Estoque;
- Estagnação;
- Cliente/fornecedor;
- Transporte;
- Kanban;
- Base de dados;
- Informação;
- Texto/anotação;
- Fluxo de material, material puxado, informação e informação eletrônica.

## Comparação Power BI × MIFC × MES

| Verificação | Power BI | MIFC Digital | MES/Oracle | Resultado |
|---|---|---|---|---|
| Fórmula dos quatro totais | TMDL local | componentes e multiplicadores idênticos | entradas ausentes no teste offline | paridade estrutural aprovada |
| Filtro de data | `Calendar[Date]` | data explícita no Layout | cache por data quando autorizado | contrato alinhado; comparação numérica pendente |
| Cliente/processo | filtros e matriz PBIP | matriz de linhagem por cliente/etapa | cache filtrado por fonte | estrutura aprovada; amostra real coincidente pendente |
| Ausência de fonte | sem valor observado | `—` e lista de entradas ausentes | API offline no E2E | aprovado, sem zero silencioso |
| Volume → buffer | parâmetro MIFC | recálculo imediato de pares/dia e dias de WIP | não aplicável | aprovado no navegador |
| CT Layout ↔ Capacidade | parâmetro de máquina | sincronização bidirecional | não aplicável | aprovado no navegador |

Não foi possível executar uma comparação numérica válida no mesmo período e antes do arredondamento porque o teste final ocorreu com a API local/Oracle offline e não havia, nesta execução, um refresh PBIP coincidente com a mesma carga e os mesmos parâmetros. Declarar paridade numérica completa nessas condições seria incorreto.

## Testes executados

- `npm run typecheck`: aprovado;
- `npm test`: 78 testes aprovados em 18 arquivos;
- `npm run build`: aprovado, 1.910 módulos transformados;
- `npm run test:e2e`: 10 cenários Chromium aprovados;
- repetição do cenário Layout ↔ Capacidade: 2/2 aprovada em paralelo;
- `npm audit --omit=dev`: 0 vulnerabilidades encontradas.

Os cenários de navegador cobrem renomeação/persistência, pan com botão central, tela cheia, quatro linhas de clientes, rastreabilidade, buffers, biblioteca de símbolos, busca, ajuda, sincronização de CT, edição de cliente com recálculo de buffer e desativação/reativação.

## Arquivos modificados

- API: `apps/api/src/oracle/layout-stock-measures.ts`;
- domínio: `global-search.ts`, `layout-buffers.ts`, `layout-value-lineage.ts` e seus testes;
- shell: `TopBar.vue`;
- Layout: `MifcLayoutView.vue`, `MifcNodeCard.vue`, `MifcPropertiesPanel.vue`, `MifcSymbolPalette.vue`, `LayoutBufferCard.vue`, `LayoutValueTracePanel.vue` e `mifc-layout.ts`;
- parâmetros/cadastros: `CapacityPreviewView.vue`, `OperationalRegistryView.vue`;
- automação: `apps/web/playwright.config.ts`, `apps/web/e2e/layout.spec.ts`, `apps/web/e2e/registries.spec.ts`;
- documentação: este checkpoint e `docs/CURRENT-STATUS.md`.

## Bugs encontrados e corrigidos

- medidas dependentes de fonte ausente publicavam zero em caminhos opcionais;
- o total do cliente não tinha rastreabilidade completa nem fechamento por parcela ausente;
- buffers configurados não apareciam como símbolos vinculados aos processos;
- busca, notificações, ajuda e recolhimento da biblioteca eram ausentes ou incompletos;
- rótulos de capacidade eram ambíguos;
- Layout e Capacidade mantinham cópias divergentes do Tempo de Ciclo;
- registros operacionais podiam ser excluídos pela UI em vez de desativados;
- cliente não podia ser editado no cockpit;
- Escape não encerrava tela cheia quando um campo tinha foco;
- o preparador E2E apagava a persistência que pretendia testar;
- o teste de transição de rota podia editar o campo da tela anterior.

## Divergências e dependências ainda existentes

- paridade numérica Power BI × MIFC × MES exige execução na rede autorizada, mesma data, mesmos filtros, mesma revisão PBIP e mesmos parâmetros de máquina;
- cobertura integral das 309 medidas e dos 132 cartões não foi afirmada; o recorte auditado do Layout continua sendo 62 medidas únicas;
- as instâncias de buffer ainda sem configuração operacional permanecem pendentes;
- participação Volvo VM × Mesa 3 continua `pending`, conforme a linhagem existente;
- a regra genérica `capacity.per_day` continua pendente; referências importadas permanecem identificadas e não são recalculadas arbitrariamente;
- utilização e gargalo dependem da regra específica validada por máquina e da carga observada correspondente;
- persistência é local ao navegador; autenticação, perfis e banco próprio continuam fora deste checkpoint;
- Oracle permanece somente leitura, com leituras ao vivo desabilitadas por padrão e sem alteração de credenciais/allowlist.
