# MIFC Digital — estrutura recomendada da aplicação

## Direção arquitetural

Recomenda-se começar com um monólito modular, com separação clara entre interface, API, domínio, cálculos e integrações. Isso reduz complexidade no MVP sem misturar regras de negócio nos componentes visuais.

```text
MIFC Digital
├── frontend
│   ├── Overview
│   ├── Volume
│   ├── Capacidade
│   ├── Layout
│   ├── Resultados
│   ├── Integrações
│   └── Administração
│
├── backend
│   ├── API
│   ├── autenticação
│   ├── permissões
│   └── auditoria
│
├── domain
│   ├── cenários
│   ├── revisões
│   ├── clientes
│   ├── produtos
│   ├── processos
│   └── MIFC
│
├── calculation-engine
│   ├── Volume
│   ├── Capacidade
│   ├── Takt
│   ├── WIP
│   └── Lead Time
│
├── integrations
│   └── oracle-readonly
│
├── database
│   └── banco separado da aplicação
│
└── tests
    ├── unitários
    ├── integração
    └── paridade Power BI × Aplicação
```

## Separação de dados

### Referência funcional e fonte de cálculo

O Excel MIPS 2026 é a referência do processo de preenchimento e do formato utilizado pela equipe. O Power BI/PBIP é a referência da lógica calculada e da visualização online. A aplicação deve preservar os dois papéis:

- campos e organização do Excel viram formulários e inputs editáveis;
- medidas, Power Query e resultados do PBIP viram linhagem e regras do Calculation Engine;
- dados atuais do Oracle entram por integração backend somente leitura;
- cenários, revisões, alterações de layout e dados preenchidos ficam no banco da aplicação.

O Excel não deve ser tratado como banco online e o Power BI não deve ser tratado como simples tela. São referências complementares para a migração.

### Oracle MES

Fonte corporativa somente leitura. Não recebe migrations, cadastros, alterações de layout ou fórmulas da aplicação.

### Banco da aplicação

Armazena:

- cenários e revisões;
- clientes e produtos;
- processos e parâmetros;
- volumes e capacidades;
- nós e conexões do Layout MIFC;
- fórmulas versionadas;
- resultados calculados;
- usuários, permissões e auditoria.

## Ordem de implementação

### Fase 1 — Descoberta

- inventário do PBIP;
- rastreabilidade das consultas;
- catálogo de símbolos;
- matriz de cálculos;
- requisitos visuais da Metalsa.

### Fase 2 — Integração segura

- adaptador Oracle somente leitura;
- allowlist de consultas;
- validação de rede;
- snapshots controlados para testes;
- nenhum comando de escrita.

### Fase 3 — Fundação do MVP

- autenticação e permissões;
- cenários/revisões;
- banco da aplicação;
- tokens do design system;
- navegação principal.

### Fase 4 — Primeiro valor de negócio

- Volume;
- Capacidade;
- processos editáveis;
- cálculo engine inicial;
- comparação com resultados do Power BI.

### Fase 5 — Layout MIFC

- canvas editável;
- símbolos oficiais;
- blocos e linhas;
- conexões Push/Pull/informação;
- salvamento de revisões;
- áreas de Information Flow, Material Flow e Lead Time.

## Regra de qualidade

Uma fórmula só será considerada migrada quando:

```text
mesma entrada
    → Power BI
    → Aplicação
    → resultados equivalentes
```

O layout pode ser desenvolvido em paralelo, mas não deve substituir a validação matemática.
