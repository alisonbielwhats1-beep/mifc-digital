# MIFC Digital — escopo Oracle somente leitura

Status: preparado; conexão ainda não executada.

## Validação realizada no ambiente atual

- Não foi encontrada a ferramenta `sqlplus` ou `tnsping` no `PATH`;
- não foi encontrado um cliente Oracle local disponível nos diretórios comuns;
- o teste TCP para `10.44.34.68:1522` não foi bem-sucedido neste ambiente;
- nenhuma autenticação foi tentada;
- nenhuma consulta SQL foi enviada ao Oracle.

Isso indica que o próximo bloqueio é de infraestrutura de acesso — rota de rede/VPN e cliente/driver —, não de definição das consultas no PBIP.

## Objetivo

Consultar exclusivamente os dados Oracle que alimentam atualmente o MIPS do Power BI, sem modificar qualquer tabela, view, schema, sessão de dados ou configuração do banco.

## Regra principal

Nenhuma consulta será executada antes de existir uma allowlist com:

| Campo | Descrição |
|---|---|
| ID | Identificador interno da consulta |
| Objeto Power BI | Tabela ou expressão que contém a origem |
| Tipo | SQL explícito ou navegação M |
| Origem | Arquivo TMDL e linha da definição |
| Objetos Oracle | Tabelas, views e funções referenciadas |
| Dependências | Medidas, páginas e visuais que usam o resultado |
| Autorizada | Sim/não |
| Resultado da validação | Pendente |

## Permitido

- Executar somente os `SELECT` já definidos no Power BI;
- Executar a navegação M somente para os objetos identificados nessas consultas;
- Ler metadados estritamente necessários para validar colunas e tipos, quando isso for indispensável;
- Registrar tempo, quantidade de linhas, colunas e erros da consulta;
- Usar uma conta Oracle com privilégio somente `SELECT`.

## Proibido

Não será executado nenhum comando que contenha ou invoque:

```text
INSERT
UPDATE
DELETE
MERGE
CREATE
ALTER
DROP
TRUNCATE
GRANT
REVOKE
EXECUTE
CALL
procedures com efeito colateral
```

Também não serão feitas varreduras exploratórias de todos os schemas, tabelas ou views do Oracle.

## Controles de segurança

Serão aplicados três níveis de proteção:

1. Conta Oracle sem permissão de escrita;
2. Allowlist de consultas derivada do PBIP;
3. Validação no backend rejeitando SQL fora do formato e da lista autorizada.

As credenciais devem permanecer em configuração local/secret do ambiente. Não devem ser enviadas no chat, incluídas no código, no Git ou em logs.

## Dados de conexão encontrados no PBIP

```text
Host: 10.44.34.68
Porta: 1522
Serviço: MESBR
```

Ainda são necessários:

- usuário somente leitura;
- senha configurada localmente;
- rota de rede/VPN até o Oracle;
- driver/cliente Oracle disponível no ambiente que executará o backend.

## Sequência segura

1. Rastrear o uso das 15 origens Oracle identificadas no PBIP;
2. Aprovar a allowlist final;
3. Configurar a credencial local de leitura;
4. Validar a rota de rede;
5. Executar as consultas autorizadas, sem reescrevê-las para buscar outras tabelas;
6. Comparar schema, volume e resultados com o cache/Power BI;
7. Registrar divergências antes de transformar qualquer regra em código.

## Fontes explicitamente fora deste escopo

- SQL Server `METBROSAWAPP03\DT_LOGGER`;
- arquivos Excel em compartilhamentos de rede;
- qualquer tabela ou view Oracle não referenciada pelas consultas ativas do MIPS.

## Critério de conclusão

A etapa só será considerada concluída quando:

- a lista de consultas ativas estiver documentada;
- nenhuma operação de escrita tiver sido enviada ao Oracle;
- cada consulta executada tiver registro de origem no PBIP;
- resultados essenciais tiverem sido preservados para testes de paridade.
