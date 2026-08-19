# MIFC Digital — continuidade do projeto

Este documento permite retomar o projeto em outro computador sem depender da memória da conversa original. A tarefa do Codex está fixada com o título **MIFC Digital — Projeto e Implementação** e deve aparecer no mesmo login.

O checkpoint canônico e mais recente está em [`docs/CURRENT-STATUS.md`](docs/CURRENT-STATUS.md). Ele registra exatamente o que foi concluído, o que está parcial, o que não foi validado e a próxima ação.

## Objetivo

Migrar o modelo MIFC/MIPS usado em Excel e Power BI para uma aplicação web da Metalsa. A aplicação combina:

- campos manuais de cenário;
- cálculos reproduzidos e testados fora do Power BI;
- dados Oracle/MES somente leitura;
- formulários de Volume, Logística, Buffer/Estoque e Capacidade;
- visualizações e Layout MIFC editável;
- revisões locais no MVP e persistência definitiva em etapa posterior.

## Referências de verdade

- Excel MIFC Action Plan 2026: exemplo operacional e campos manuais;
- PBIP MIFC: consultas Power Query, modelo, medidas DAX e Layout atual;
- imagens em `assets/ui-references`: direção visual aprovada;
- documentação metodológica em `docs`;
- código da aplicação: implementação atual.

Os arquivos de origem externos não devem ser alterados. O PBIP e os anexos originais permanecem como referências somente leitura.

## Situação atual

- shell Metalsa e navegação implementados;
- formulários de Volume, Logística, Buffer/Estoque e Capacidade implementados;
- Calculation Engine local com testes de paridade;
- tela de Integrações e estrutura Oracle preparada;
- Oracle bloqueado para escrita e leituras ao vivo desabilitadas por padrão;
- Layout baseado na imagem aprovada, não no canvas bruto ultralargo do Power BI;
- Layout inicial com 32 blocos e 56 linhas semânticas, incluindo as quatro Beattys separadas;
- blocos podem ser adicionados, movidos, redimensionados, duplicados e excluídos por revisão;
- linhas podem ser criadas, selecionadas, reconectadas, curvadas, ter o tipo alterado e ser excluídas;
- quatro faixas inferiores de Lead Time/Dados são derivadas dos blocos do Layout;
- revisões, desfazer/refazer, zoom, pan e camadas estão funcionais.
- Produtos, Processos, Recursos, Dados mestre, Configurações e Plano de Ações são módulos funcionais com persistência local;
- Produtos conciliam um catálogo sanitizado derivado do cache Oracle, mantendo overrides locais separados;
- Processos seguem `docs/client-process-matrix.csv`, incluindo a participação VM × Mesa 3 como pendente;
- Recursos reutilizam os parâmetros de Capacidade e exibem medidas observadas somente quando disponíveis no cache aprovado;
- ações podem ser ligadas a produto, processo, recurso e nó do Layout; cards do Layout exibem ações abertas/atrasadas.
- Layout ampliado para apresentação, com textos responsivos, linhas de cliente legíveis e Beattys 3–4–2–1 em cascata conforme o arranjo físico do Power BI;
- cada pico das faixas de cliente acompanha horizontalmente a máquina física correspondente; FH usa Beatty 4, VM Beatty 1, Scania Beatty 3 e DAF Beatty 2;
- arraste normal move apenas o bloco clicado; seleção e arraste em grupo exigem `Ctrl/Shift`, e a exclusão conjunta preserva um único passo de desfazer.

## Segurança Oracle

Nunca colocar usuário ou senha no Git. As credenciais ficam apenas no arquivo `.env`, que está ignorado.

As proteções obrigatórias são:

- `ORACLE_READ_ONLY=true`;
- `ORACLE_LIVE_READS_ENABLED=false` até validação dentro da rede/VPN;
- catálogo de consultas autorizado em `apps/api/config/oracle-query-catalog.json`;
- bloqueio de DML, DDL, procedures e múltiplas instruções.

O primeiro teste na rede deve ser `npm run oracle:preflight`. Ele valida a configuração sem consultar o banco.

## Como executar

```text
npm install
npm run dev
```

Aplicação: `http://127.0.0.1:5173/`

Validação:

```text
npm run typecheck
npm test
npm run build
```

## Ordem recomendada para continuar

1. Abrir o Layout e comparar visualmente posições/linhas com `assets/ui-references/metalsa-mifc-layout.png`.
2. Ajustar nomes e conexões que dependem de validação operacional da planta.
3. Na rede Metalsa, preencher `.env` e executar apenas o preflight Oracle.
4. Validar a allowlist das consultas realmente usadas pelo PBIP.
5. Liberar uma consulta por vez, somente leitura, e comparar resultados.
6. Validar os novos cadastros do Prompt 7 com os responsáveis da planta.
7. Concluir Overview/Resultados com os valores validados.
8. Executar validação ponta a ponta e preparar publicação do aplicativo.

Para a ordem atualizada e detalhada, seguir `docs/CURRENT-STATUS.md`; em caso de divergência entre documentos antigos e esse checkpoint, o checkpoint mais recente prevalece.

## Prompt sugerido no outro computador

> Continue o projeto MIFC Digital a partir de `PROJECT-HANDOFF.md`. Preserve o visual das imagens em `assets/ui-references`, mantenha o Oracle estritamente somente leitura e não altere os arquivos de origem. Antes de implementar, confira o estado atual, rode os testes e informe exatamente o próximo item pendente.

## Documentos úteis

- `docs/MASTER-PROMPTS-MIFC.md`
- `docs/CURRENT-STATUS.md`
- `docs/EXECUTION-PLAN-UNTIL-FRIDAY.md`
- `docs/source-of-truth-matrix.md`
- `docs/excel-manual-automatic-map.md`
- `docs/calculation-rule-catalog.md`
- `docs/layout-measure-lineage.md`
- `docs/prompt-6-layout-checkpoint.md`
