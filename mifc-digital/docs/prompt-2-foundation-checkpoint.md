# MIFC Digital — checkpoint do Prompt 2

Data: 2026-08-19  
Status: fundação executável concluída  
Oracle: desconectado; nenhuma consulta executada

## Entrega

Foi criada a fundação do MIFC Digital em Vue 3 + TypeScript, preservando as responsabilidades separadas entre:

- frontend;
- API;
- domínio;
- persistência da aplicação;
- Calculation Engine;
- integração Oracle somente leitura.

## Interface disponível

O shell comum contém:

- wordmark Metalsa;
- seletores de Planta, Ano, Cenário e Revisão;
- busca, ajuda, notificações e perfil;
- navegação lateral recolhível;
- MIFC expandido;
- layout responsivo para desktop e telas menores;
- foco visível, navegação por teclado e redução de movimento;
- estados loading, empty, error e sucesso ao salvar.

Rotas executáveis:

| Rota | Conteúdo |
|---|---|
| `/overview` | indicadores locais identificados, contrato de fontes e checkpoint |
| `/mifc/volume` | prévia dos campos confirmados no Excel |
| `/mifc/capacity` | prévia de processos, capacidade, eficiência e WIP |
| `/integrations` | estado seguro da integração Oracle |
| demais rotas | empty states orientados para a próxima implementação |

## Modelo de domínio

O pacote `packages/domain` inclui contratos para todas as entidades solicitadas:

- plants, scenarios e revisions;
- customers, products e vehicles;
- volume inputs;
- logistics parameters;
- buffers e stock points;
- calendar/working days;
- processes e process capacity;
- MIFC nodes e edges;
- calculation rules e calculation results;
- Oracle connections, query catalog e data sources;
- audit log.

O tipo `FieldValue<T>` preserva origem, editabilidade, fallback, horário da fonte e status de validação.

## Segurança e persistência

- O botão Salvar usa apenas `localStorage` neste checkpoint.
- Nenhum dado é enviado ao Oracle.
- As consultas do catálogo Oracle permanecem desabilitadas.
- O cliente Oracle continua bloqueando escrita e só aceita consultas autorizadas.
- A persistência local será trocada pelo banco próprio da aplicação, sem alterar os contratos de domínio.

## Design

A UI usa os tokens oficiais confirmados no Digital Experience Guideline:

- azul `#2C6EFF`;
- azul-marinho `#10223E`;
- cinza `#9DA9B4`;
- laranja `#FE953D`;
- lilás `#CDCDFF`;
- verde-claro `#CAE57C`;
- superfícies `#EEF0F4` e `#FFFFFF`;
- Bai Jamjuree com fallback de sistema.

A principal assinatura funcional é a origem visível de cada dado: `INPUT`, `CALCULATED`, `MES`, `IMPORT` ou `MIXED`.

## Validação executada

| Verificação | Resultado |
|---|---|
| TypeScript API/domínio | aprovado |
| Vue TypeScript | aprovado |
| testes unitários | 2 aprovados |
| build de produção | aprovado |
| auditoria npm | 0 vulnerabilidades conhecidas |
| servidor local | HTTP 200 em `127.0.0.1:5173` |

O navegador interno não conseguiu iniciar a captura automatizada porque o mecanismo de confiança do plugin não resolveu corretamente o caminho com acento em `C:\Users\Usuário`. O servidor e o build não foram afetados; a inspeção visual automatizada deverá ser repetida quando o plugin aceitar esse caminho.

## Próximo passo

Executar o Prompt 3 e transformar as prévias de Volume e Capacidade em formulários completos:

- edição, adição, duplicação e ativação;
- validação por campo;
- alterações não salvas;
- inputs de turnos, geometria, capacidade nominal, eficiência-meta e WIP manual;
- campos calculados somente leitura;
- origem e fallback explícitos;
- persistência local versionada até o banco da aplicação ser configurado.
