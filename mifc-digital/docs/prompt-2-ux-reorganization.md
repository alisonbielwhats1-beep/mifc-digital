# Prompt 2 — reorganização funcional e experiência de uso

Data do checkpoint: 2026-08-20

## Escopo preservado

A reorganização foi aplicada sobre a implementação existente. Não houve alteração nas fórmulas de Slitter, tempos de máquina, buffers ou `LT-TOTAL-FH/VM/SCA/DAF`; as regras permanecem nos módulos de domínio já validados. Oracle continua somente leitura, sem ampliação de allowlist ou habilitação de leituras ao vivo.

Uma compatibilização foi necessária: parâmetros de planejamento que apareciam novamente em Máquinas & Recursos deixaram de ser editáveis nessa tela. Eles continuam preservados e editáveis em Capacidade, que já era sua fonte de estado. A mudança remove ambiguidade sem migrar ou apagar valores.

## 1. Menu antes × depois

Antes:

- Início e Dashboard disputavam a mesma finalidade;
- MIFC era uma seção visual sempre aberta, sem controle funcional;
- Integrações, Produtos, Processos, Recursos, Ações, Dados mestre e Configurações apareciam no mesmo nível;
- Relatórios aparecia como se estivesse pronto, embora a rota ainda seja um placeholder.

Depois:

- **OPERAR:** Visão Geral e Layout;
- **ALIMENTAR:** MIFC recolhível com Volume, Logística, Buffer e Estoque, Capacidade e Análises;
- **ADMINISTRAR:** Cadastros recolhível com Produtos, Processos e Máquinas & Recursos; Integrações; Plano de Ações; Configurações recolhível com Dados mestre, Sistema e Diagnóstico.

Os três grupos recolhem e expandem de verdade. A navegação móvel fecha somente após escolher um destino, sem impedir o uso desses controles.

## 2. Páginas retiradas somente da navegação

- `/dashboard` foi retirado do menu e redireciona para `/overview`;
- `/mifc/reports` foi retirado do menu enquanto continuar sendo placeholder. A rota e a implementação foram preservadas para evolução futura.

Nenhuma página técnica ou dado foi excluído.

## 3. Páginas reorganizadas

- Visão Geral passou a ser o painel executivo único;
- Diagnóstico recebeu os contadores técnicos de Layout, modelo semântico, rotas e parâmetros;
- Produtos passou a resumir a rota como `N processos`, abrindo a sequência em diálogo;
- Processos passou a distinguir paridade `Validado`, `Divergente` e `Pendente`;
- Recursos foi renomeado para Máquinas & Recursos e passou a mostrar somente o contexto observado/operacional, com ligação explícita para Capacidade;
- Integrações recebeu um bloco separado de diagnóstico do Power BI / Semantic Model, identificado como inventário sem conexão online.

## 4. Componentes e estado modificados

- `SideNav.vue`: níveis de uso, grupos funcionais e itens não prontos ocultos;
- `TopBar.vue` e `stores/context.ts`: persistência do contexto Planta/Ano/Cenário e revisão real do Layout;
- `OverviewView.vue` e `domain/executive-overview.ts`: indicadores derivados do mesmo estado e das mesmas regras do Layout;
- `MifcLayoutView.vue`, `LayoutValueTracePanel.vue` e `MifcSymbolPalette.vue`: painel contextual, edição logística e estado persistido da biblioteca;
- `mifc-forms.ts`: snapshots de formulários isolados por revisão e clonagem explícita ao criar revisão;
- `OperationalRegistryView.vue`: rota resumida, paridade, origem operacional e separação de Capacidade;
- `IntegrationsView.vue`: diagnóstico transparente do modelo semântico;
- `DiagnosticsView.vue` e `router.ts`: nova área técnica e redirecionamento do Dashboard.

## 5. Controles que passaram a funcionar

- recolher/expandir MIFC, Cadastros e Configurações;
- filtros globais persistidos e seletor ligado às revisões existentes do Layout;
- indicação de alteração não salva para Layout ou parâmetros;
- nova revisão clonando explicitamente os parâmetros da revisão de origem;
- biblioteca de símbolos mantendo o estado durante o trabalho;
- painel de propriedades abrindo somente após seleção;
- edição no Layout de Transporte, Beneficiador e Movimentação do cliente, com recálculo imediato;
- `Ver rota` nos Produtos;
- ligação de Máquinas & Recursos para editar planejamento em Capacidade;
- atualização manual dos indicadores da Visão Geral.

Busca global, `Ctrl+K`, ajuda contextual, notificações, ações de cadastro, Plano de Ações, pan pelo botão central, `Mover tela`, renomeação rápida e cálculo clicável já eram funcionais e foram preservados pelos testes de regressão.

## 6. Controles ocultados ou restringidos

- Dashboard foi removido do menu por duplicar a Visão Geral;
- Relatórios foi ocultado porque ainda não executa exportação real;
- o comando de exibir propriedades fica indisponível quando não existe seleção;
- edição de planejamento foi retirada de Máquinas & Recursos e centralizada em Capacidade;
- nenhum status Power BI é apresentado como “online”.

## 7. Melhorias no Layout

- o painel lateral inicia recolhido e volta a recolher ao limpar a seleção;
- processo, máquina, linha, buffer, valor ou cliente abrem o painel correspondente;
- o clique no cliente reúne Volume e Logística no mesmo painel contextual;
- alterações de logística atualizam imediatamente o bloco Beneficiador e o Lead Time funcional;
- as linhas de cliente, seus valores e os totais continuam usando a mesma linhagem documentada, sem criar subtotal de ENN;
- a biblioteca de símbolos recolhe, expande e preserva a escolha local;
- revisões não compartilham silenciosamente os snapshots dos formulários.

## 8. Responsividade

- tabelas operacionais têm largura mínima e rolagem horizontal controlada;
- colunas Origem, Status e Ações não disputam mais espaço com a rota extensa;
- rota detalhada abre em diálogo próprio;
- blocos de paridade e métricas se reorganizam em larguras menores sem reduzir toda a tipografia;
- o cenário de 820 px foi coberto por teste no Chromium.

## 9. Testes executados

- `npm run typecheck`: aprovado;
- `npm test`: 20 arquivos, 88 testes aprovados;
- `npm run build`: aprovado;
- `npm run test:e2e`: 18 cenários aprovados no Chromium;
- `npm audit --audit-level=high`: 0 vulnerabilidades.

Os testes de navegador foram executados com a API local desligada. As chamadas retornaram conexão recusada, e a UI confirmou o comportamento de falha fechada: `—`, `Sem dado confiável` ou estado offline, sem transformar ausência em zero.

## 10. Erros encontrados e corrigidos

- Dashboard vazio e duplicado;
- agrupamentos do menu sem ação de recolher;
- navegação sem nome acessível no elemento `nav`;
- painel de propriedades aberto sem seleção;
- logística do cliente editável somente fora do cockpit;
- rota de produto ocupando uma célula extensa;
- paridade limitada a confirmado/pendente;
- Recursos misturando observação MES e planejamento;
- contadores técnicos em destaque na Visão Geral;
- ausência de diagnóstico explícito do modelo semântico;
- snapshots dos formulários sem isolamento entre revisões.

## 11. Pendências restantes

- o catálogo disponível contém somente Osasco / 2026 / MIFC Target; Planta, Ano e Cenário já usam o catálogo/persistência reais, mas novos contextos dependem de cadastro e persistência definitiva;
- Power BI continua sem conexão online; os números 309/62/247 são inventário documental, não telemetria;
- o total numérico depende das mesmas entradas manuais, cache MES e lacunas já registradas no gate de paridade;
- Relatórios permanece preservado, mas oculto até existir exportação real;
- persistência multiusuário, autenticação, perfis e publicação continuam fora deste checkpoint;
- paridade integral Power BI × MES × MIFC ainda exige um snapshot coincidente e os Golden Cases documentados.
