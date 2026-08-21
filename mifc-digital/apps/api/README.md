# API — Oracle somente leitura

Este módulo mantém um pool local de conexões exclusivamente de leitura quando as credenciais locais estão configuradas. Ao iniciar a API, as tabelas aprovadas são carregadas novamente e a atualização escalonada é reativada sem exigir novo preenchimento no formulário.

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
2. Abra Integrações, informe usuário e senha uma vez e marque **Lembrar neste computador**.
3. Use **Conectar e carregar tabelas**. Nas próximas aberturas, a API reaproveita a credencial local, inicia o pool de leitura e carrega novamente as consultas aprovadas.
4. A seção de tabelas conectadas permite visualizar as linhas do cache local com paginação e filtro, sem aceitar SQL do navegador.

O arquivo local de credenciais fica em `apps/api/.data/oracle-credentials.json`, é ignorado pelo Git e nunca é retornado pela API. Para remover o acesso salvo, use **Esquecer credencial salva** em Integrações.

Os endpoints de execução não aceitam SQL vindo do navegador. Credenciais do formulário não são salvas nem registradas em logs.
