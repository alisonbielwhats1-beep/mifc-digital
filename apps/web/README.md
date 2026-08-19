# Frontend — MIFC Digital

Implementação em Vue 3 + TypeScript disponível em `apps/web/src`.

O frontend deve usar `docs/ui-reference-spec.md` e as referências em `assets/ui-references/` como baseline visual aprovada. As imagens definem a linguagem, a distribuição e os componentes esperados; a implementação deve ser funcional e responsiva.

Referências por tela:

- `metalsa-mifc-overview.png`: Visão geral;
- `metalsa-mifc-volume.png`: Volume;
- `metalsa-mifc-capacidade.png`: Capacidade;
- `metalsa-mifc-layout.png`: Layout MIFC;
- `metalsa-mifc-integracoes.png`: Integrações.

O shell comum deve preservar o cabeçalho Metalsa, os seletores Planta/Ano/Cenário/Revisão, a navegação lateral e os painéis contextuais. Melhorias de acessibilidade, responsividade e estados de operação são esperadas desde o MVP.

Módulos previstos:

- Overview;
- MIFC / Volume;
- MIFC / Capacidade;
- MIFC / Layout;
- MIFC / Resultados;
- Integrações;
- Action Plan;
- Administração.

As regras de negócio não devem ser implementadas diretamente nos componentes visuais. Elas ficarão no domínio e no Calculation Engine.

## Rotas disponíveis

- `/overview` — checkpoint visual e contrato de dados;
- `/mifc/volume` — prévia dos campos do Excel classificados por origem;
- `/mifc/capacity` — prévia dos parâmetros e resultados de capacidade;
- `/integrations` — estado seguro da integração Oracle;
- demais rotas — estados vazios orientados para os próximos prompts.

O botão de salvar usa somente `localStorage` neste checkpoint. Ele não grava no Oracle e será substituído pelo repositório do banco da aplicação.
