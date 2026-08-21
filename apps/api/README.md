# API — Oracle somente leitura

Este módulo não abre conexão nem executa consultas automaticamente. A tela de Integrações permite testar credenciais quando a máquina estiver na rede da Metalsa; esse teste apenas abre e fecha a conexão.

## Fluxo planejado

```text
PBIP
  ↓
matriz de dependências
  ↓
query-catalog.json
  ↓
SQL explicitamente autorizado
  ↓
Oracle com usuário somente SELECT
```

As oito consultas com SQL embutido encontradas no PBIP estão confirmadas por fingerprint SHA-256. Os sete objetos que usam navegação M continuam desabilitados até que o SQL final seja materializado e revisado.

`read-only-client.ts` recebe somente o ID da consulta. O SQL é extraído do PBIP de referência, comparado com sua assinatura e submetido à política SELECT-only. A execução usa `SET TRANSACTION READ ONLY`, não faz commit, limita linhas/tempo e sempre solicita rollback.

## Uso local

1. Execute `npm run dev` na raiz. Isso inicia interface e API local.
2. Abra Integrações e informe usuário e senha apenas para testar a conexão.
3. Para leituras futuras, mantenha um usuário Oracle com permissão exclusiva de `SELECT` e só altere `ORACLE_LIVE_READS_ENABLED=true` após o teste e a revisão da equipe.

Os endpoints de execução não aceitam SQL vindo do navegador. Credenciais do formulário não são salvas nem registradas em logs.
