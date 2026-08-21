# MIFC Digital — plano de execução até sexta-feira

Data do plano: 2026-08-18  
Meta do MVP: 2026-08-21

## Decisão de modelo

### Modelo principal

Usar `GPT-5.6 Sol` (`gpt-5.6-sol`) como modelo principal.

- Descoberta do PBIP: `high`;
- arquitetura e regras de negócio: `high`;
- cálculos e revisão de paridade: `xhigh`;
- implementação de telas comuns: `medium`.

### Modelo econômico

Usar `GPT-5.6 Terra` (`gpt-5.6-terra`) para tarefas repetitivas, componentes simples e documentação.

Não usar Luna para decisões de arquitetura, segurança, Oracle ou migração de fórmulas.

O detalhamento por prompt está em [docs/MASTER-PROMPTS-MIFC.md](MASTER-PROMPTS-MIFC.md): Sol `high` para Discovery, Fundação, Formulários, Oracle e Layout; Sol `xhigh` para Calculation Engine e Validação; Terra `medium` para Overview/Resultados já apoiados por regras validadas.

## O que deve estar funcional na sexta-feira

### Obrigatório no MVP

- aplicação iniciando localmente;
- identidade visual Metalsa aplicada;
- menu e navegação principal;
- formulário de Volume;
- cadastro/editável de clientes e produtos;
- campos de veículos/dia, reforço, pares/dia e parâmetros identificados;
- formulário de Capacidade;
- cadastro/editável de processos;
- campos de CT, turnos, capacidade e parâmetros disponíveis;
- tela de Resultados com dados locais de referência;
- Layout MIFC inicial com blocos e linhas editáveis;
- salvar e recarregar a configuração local do MVP;
- tela de Integrações com configuração Oracle;
- proteção somente leitura já implementada;
- uso de dados mock/cache quando a máquina estiver fora da rede Metalsa.

### Não bloquear o MVP

- acesso live ao Oracle fora da rede Metalsa;
- migração das 309 medidas;
- reprodução imediata de todos os 552 visuais do Layout;
- todos os símbolos oficiais;
- Action Plan completo;
- permissões avançadas e publicação em produção.

Esses itens continuam no plano, mas não devem impedir a entrega funcional de sexta-feira.

## Referências visuais aprovadas

As imagens fornecidas pelo usuário foram incorporadas ao projeto em `assets/ui-references/` e estão descritas em `docs/ui-reference-spec.md`. Elas são o baseline visual do MVP para navegação, branding Metalsa, espaçamento, cartões, tabelas, canvas, painéis laterais e estados de tela.

Regras para a implementação:

- consultar `docs/ui-reference-spec.md` e `assets/ui-references/manifest.json` antes de construir as telas;
- reproduzir a interface como componentes funcionais, nunca como captura de tela ou background;
- preservar o wordmark, a paleta, a tipografia e a estrutura visual das referências;
- melhorar acessibilidade, responsividade, estados loading/empty/error e segurança sem descaracterizar o modelo;
- tratar os dados de conexão mostrados na imagem de Integrações como placeholders visuais; a configuração real continua sendo a descoberta no PBIP (`10.44.34.68:1522/MESBR`).

## Ordem de execução

Os prompts completos e canônicos estão em [docs/MASTER-PROMPTS-MIFC.md](MASTER-PROMPTS-MIFC.md). Use-os nesta ordem; os prompts abaixo são a versão resumida para execução rápida.

### Regra de origem do MVP

- usar o `MIFC Action Plan 2026 - Osasco Plant R01.xlsx` como padrão funcional das abas, campos e preenchimento de Volume, Logística e Capacidade;
- usar o PBIP como referência das fórmulas, transformações, dados online, visuais e resultados esperados;
- usar o Oracle MES somente como fonte corporativa de leitura;
- não declarar os formulários completos enquanto o Excel MIPS 2026 não tiver sido conferido campo a campo.

### Etapa 1 — Fundação e escopo

- manter o PBIP como referência somente leitura;
- concluir o inventário de consultas e medidas;
- criar aplicação shell;
- configurar tokens Metalsa;
- criar navegação e estados de carregamento/erro/vazio;
- preparar dados locais de demonstração.

### Etapa 2 — Formulário de Volume

- cenário e revisão;
- clientes editáveis;
- produtos/veículos editáveis;
- parâmetros de volume;
- distinção entre `INPUT` e `CALCULATED`;
- salvar e editar.

### Etapa 3 — Formulário de Capacidade

- processos editáveis;
- CT;
- turnos;
- capacidade;
- OEE/eficiência quando confirmado;
- ordenação e ativação/desativação.

### Etapa 4 — Visualização e Layout

- Overview simples;
- cards e tabelas de resultados;
- filtros por cenário/cliente/processo;
- canvas inicial;
- adicionar, mover, conectar e remover blocos;
- salvar a revisão do layout.

### Etapa 5 — Oracle somente leitura

- preencher usuário e senha apenas no `.env` local;
- testar conexão quando a máquina estiver na rede Metalsa;
- liberar somente consultas aprovadas na allowlist;
- não fazer descoberta ampla de schemas;
- não executar nenhuma operação de escrita.

### Etapa 6 — Validação final

- testar os formulários;
- testar persistência;
- testar layout;
- executar typecheck/build;
- validar responsividade;
- registrar pendências e diferenças do Power BI.

## Prompt 1 — iniciar a execução

```text
Trabalhe no projeto MIFC Digital usando o contexto da conversa “Migrar Power BI para aplicação”, o PBIP em C:\Users\Usuário\Downloads\MIFC e os documentos em docs/.

Objetivo imediato: entregar até sexta-feira um MVP funcional com navegação Metalsa, formulários de Volume e Capacidade, visualização de Resultados, Layout MIFC inicial editável e estrutura Oracle somente leitura.

Leia primeiro:
- docs/discovery-report.md;
- docs/application-structure.md;
- docs/oracle-readonly-scope.md;
- docs/ui-reference-spec.md;
- docs/EXECUTION-PLAN-UNTIL-FRIDAY.md.

Use também as referências visuais aprovadas em `assets/ui-references/`:
- `metalsa-mifc-overview.png` para a Visão geral;
- `metalsa-mifc-volume.png` para Volume;
- `metalsa-mifc-capacidade.png` para Capacidade;
- `metalsa-mifc-layout.png` para o canvas MIFC;
- `metalsa-mifc-integracoes.png` para Integrações.

Regras:
- não altere nenhum arquivo dentro de C:\Users\Usuário\Downloads\MIFC;
- não execute nada no Oracle sem credencial local e acesso à rede;
- não faça INSERT, UPDATE, DELETE, MERGE, DDL, procedures ou queries exploratórias;
- não invente fórmulas ausentes;
- use dados locais de demonstração enquanto o Oracle estiver inacessível;
- mantenha a separação entre frontend, API, domínio e Calculation Engine;
- não implemente as 309 medidas agora; prepare a arquitetura para migrá-las com testes de paridade.

Comece pela fundação da aplicação e pare ao concluir um checkpoint executável.
Entregue: arquivos alterados, comandos de execução, telas disponíveis, testes executados e pendências.
```

## Prompt 2 — Volume e Capacidade

```text
Implemente agora o MVP funcional de Volume e Capacidade do MIFC Digital.

Volume:
- cenários e revisões;
- clientes e produtos editáveis;
- veículos/dia;
- reforço;
- pares/dia;
- dias trabalhados e demais campos confirmados nos documentos;
- separar visualmente INPUT de CALCULATED;
- permitir adicionar, editar, desativar e salvar.

Capacidade:
- processos editáveis;
- CT;
- turnos;
- capacidade;
- eficiência/OEE apenas quando confirmado;
- ordenar, editar, ativar e desativar.

Use dados locais de demonstração e persistência local do MVP se o banco da aplicação ainda não estiver configurado.
Não conecte ao Oracle nesta etapa.
Não coloque fórmulas nos componentes visuais; use o Calculation Engine.
Execute typecheck e build antes de parar.
```

## Prompt 3 — Visualização e Layout

```text
Implemente a primeira versão funcional da visualização do MIFC Digital.

Requisitos:
- seguir a identidade Metalsa e o Digital Experience Guideline;
- usar `docs/ui-reference-spec.md` e as cinco imagens em `assets/ui-references/` como referência de aceitação visual;
- preservar o cabeçalho, a navegação lateral, os seletores de contexto, a área branca de trabalho e os painéis contextuais mostrados nas referências;
- manter Information Flow na parte superior;
- Material Flow no centro;
- Data/Lead Time na parte inferior;
- layout amplo, profissional e editável;
- adicionar, mover, conectar, desconectar, duplicar e remover blocos;
- salvar uma revisão local;
- exibir Overview e Resultados usando os dados do MVP;
- incluir estados loading, empty e error.
- respeitar a separação visual entre `INPUT (EDITÁVEL)` e `CALCULADO` em Volume e Capacidade;
- manter a tela de Integrações como configuração funcional, sem copiar os valores de exemplo exibidos na imagem.

Não transforme o layout em uma imagem estática.
Não tente reproduzir todos os 552 visuais nesta etapa.
Use os símbolos já confirmados e marque os demais como pendentes.
Execute testes visuais e build.
```

## Prompt 4 — Oracle no dia da rede

```text
Agora a máquina está na rede Metalsa.

Use a configuração local do .env para validar a conexão Oracle:
- host 10.44.34.68;
- porta 1522;
- serviço MESBR;
- usuário somente leitura.

Antes de executar qualquer consulta:
1. confirme ORACLE_READ_ONLY=true;
2. confirme que ORACLE_LIVE_READS_ENABLED foi ativado conscientemente;
3. leia o catálogo em apps/api/config/oracle-query-catalog.json;
4. execute somente consultas com status confirmado e enabled=true;
5. rejeite DML, DDL, procedures, múltiplas instruções e consultas fora da allowlist;
6. registre origem Power BI, tempo, colunas, quantidade de linhas e erros;
7. não grave nada no Oracle.

Não faça SELECT exploratório de schemas ou tabelas não presentes no catálogo.
Se a conexão falhar, registre o erro e mantenha o MVP funcionando com dados locais.
```

## Prompt 5 — validação final de sexta-feira

```text
Faça a validação final do MVP MIFC Digital.

Verifique:
- aplicação inicia;
- navegação funciona;
- Volume permite criar e editar registros;
- Capacidade permite criar e editar processos;
- Resultados carregam dados locais;
- Layout permite editar blocos e conexões;
- revisão pode ser salva e recarregada;
- tela Oracle mantém somente leitura;
- nenhuma credencial aparece no código ou logs;
- typecheck, testes e build passam;
- layout segue o padrão Metalsa.

Não declare paridade completa com o Power BI. Liste claramente:
- o que está funcional;
- o que usa dados locais;
- o que foi validado no Oracle;
- quais das 309 medidas ainda estão pendentes;
- quais partes do Layout serão concluídas na próxima fase.
```

## Regra de checkpoint

Cada etapa deve terminar com uma versão executável. Não avançar para o Layout antes de Volume e Capacidade estarem utilizáveis.
