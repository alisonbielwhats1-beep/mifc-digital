# MIFC Digital

Fundação inicial para migrar o MIPS/Power BI da Metalsa para uma aplicação web.

## Estado atual

A fundação executável inclui:

- frontend Vue 3 + TypeScript com shell Metalsa responsivo;
- contexto de Planta, Ano, Cenário e Revisão;
- navegação principal e MIFC expandido;
- prévias locais de Visão geral, Volume, Capacidade e Integrações;
- Layout MIFC reconstruído como grafo editável a partir da referência aprovada, com 29 blocos, 47 linhas e quatro faixas de Lead Time/Dados;
- indicação visual de `INPUT`, `CALCULATED`, `ORACLE/MES`, `IMPORT` e `MIXED`;
- modelo de domínio para cenários, volumes, logística, capacidade, buffers, Layout, cálculos, integrações e auditoria;
- contrato separado do Calculation Engine;
- persistência local de demonstração para o checkpoint;
- configuração Oracle somente leitura, com consultas ainda desabilitadas.

O projeto Power BI em `C:\Users\Usuário\Downloads\MIFC` é referência somente leitura. Nenhum arquivo dessa pasta é alterado por esta estrutura.

## Configuração para amanhã

1. Copiar `.env.example` para `.env`.
2. Preencher `ORACLE_USER` e `ORACLE_PASSWORD` somente no arquivo local.
3. Confirmar que a máquina está na rede/VPN da Metalsa.
4. Executar `npm run oracle:preflight`.

O preflight não consulta o Oracle. Ele verifica se a configuração obrigatória está completa e se a proteção de somente leitura permanece ativa.

As consultas reais só serão liberadas depois que a allowlist em `apps/api/config/oracle-query-catalog.json` for confirmada pela matriz de dependências do PBIP.

## Proteção contra escrita

O acesso da aplicação ao Oracle será somente leitura em três camadas:

1. conta Oracle sem privilégios de escrita;
2. catálogo de consultas autorizadas;
3. bloqueio no código para DML, DDL, procedures e múltiplas instruções.

Não colocar senha em código, Git, documentação ou logs.

## Executar a aplicação

```text
npm install
npm run dev
```

Acesse `http://127.0.0.1:5173/`.

No Layout, blocos e linhas podem ser selecionados. As linhas permitem alterar origem, destino, tipo de fluxo e curvatura; o ponto azul da conexão selecionada ajusta a curva diretamente no canvas.

## Usar em outro computador

1. Clonar o repositório privado informado na entrega.
2. Executar `npm install`.
3. Copiar `.env.example` para `.env` e preencher os dados Oracle apenas localmente.
4. Executar `npm run dev`.
5. Consultar `PROJECT-HANDOFF.md` para retomar o contexto e a ordem dos próximos prompts.

Validação completa:

```text
npm run typecheck
npm test
npm run build
```
