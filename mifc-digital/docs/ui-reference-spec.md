# MIFC Digital — especificação de referência visual

Status: referência aprovada para o MVP

As cinco imagens fornecidas pelo usuário são a referência visual oficial da primeira implementação do MIFC Digital. Elas devem orientar a composição, a densidade de informação, a navegação, os componentes e o comportamento das telas. Não devem ser usadas como imagens estáticas no produto: a aplicação precisa reproduzir a interface como UI funcional.

## Arquivos de referência

| Tela | Arquivo | Uso |
|---|---|---|
| Layout MIFC | `assets/ui-references/metalsa-mifc-layout.png` | Canvas editável, símbolos, conexões e propriedades |
| Visão geral | `assets/ui-references/metalsa-mifc-overview.png` | KPIs, comparação Current/Target, alertas e atividade |
| Volume | `assets/ui-references/metalsa-mifc-volume.png` | Formulário/tabela de entradas e valores calculados |
| Capacidade | `assets/ui-references/metalsa-mifc-capacidade.png` | Formulário/tabela de processos, capacidade e gargalo |
| Integrações | `assets/ui-references/metalsa-mifc-integracoes.png` | Configuração Oracle, explorer, consulta e resultados |

## Direção visual

- Usar o wordmark Metalsa no canto superior esquerdo e preservar sua proporção, área de respiro e legibilidade.
- Aplicar a identidade já definida para o projeto: azul primário `#2C6EFF`, azul-marinho `#10223E`, cinza `#9DA9B4`, laranja `#FE953D`, lilás `#CDCDFF`, verde-claro `#CAE57C`, fundos `#EEF0F4` e `#FFFFFF`.
- Usar Bai Jamjuree como tipografia principal, com hierarquia clara entre títulos, labels, valores e textos de apoio.
- Manter a linguagem de produto corporativo: fundo claro, cartões brancos, bordas discretas, cantos levemente arredondados, sombras suaves e bastante área de respiro.
- Azul identifica ações primárias e seleção; verde indica estado saudável/ativo; laranja indica atenção; vermelho indica gargalo, erro ou capacidade excedida; lilás apoia métricas de estoque/WIP.
- Evitar gradientes fortes, excesso de sombras, excesso de cores ou componentes que pareçam um dashboard genérico.

## Estrutura comum das telas

1. Cabeçalho superior com marca Metalsa, seletores de Planta/Ano/Cenário/Revisão, busca, ajuda, notificações e perfil.
2. Navegação lateral com Início, Dashboard, MIFC expandido (Layout, Dados, Análises, Relatórios), Produtos, Processos, Recursos, Dados mestre e Configurações.
3. Área principal com título/breadcrumb, ações no canto superior e conteúdo em cartões, tabelas ou canvas.
4. Painel lateral contextual quando houver propriedades, ajuda, definições ou conexões.
5. Estados obrigatórios: carregando, vazio, erro, sem permissão e sucesso após salvar.

## Requisitos por tela

### Visão geral

- KPIs para Lead Time Total, VA Total, Gargalo, WIP Total e Ações em aberto.
- Comparação Current State x Target State com variação explícita.
- Contribuição por tipo de processo em gráfico e tabela de apoio.
- Miniatura do MIFC, histórico de revisões/atividade e alertas.
- Os números devem vir do domínio/Calculation Engine ou de dados mock identificados, nunca de texto fixo no componente.

### Layout MIFC

- Barra de ferramentas com Selecionar, Conectar, Texto, Linha, desfazer/refazer, Excluir, Camadas e Exibir.
- Biblioteca de símbolos MIFC à esquerda: fluxo de material, fluxo de informação, informação eletrônica, processo, armazenamento, estagnação, base de dados, caminhão e kanban.
- Canvas central amplo, com Information Flow na parte superior, Material Flow no centro e Data/Lead Time na parte inferior.
- Painel de propriedades à direita para código, CT, WIP, capacidade/dia, turnos, disponibilidade, observações, entradas, saídas e exclusão.
- Permitir selecionar, mover, adicionar, conectar, desconectar, duplicar e remover elementos; salvar uma revisão local.
- Exibir estados visuais dos processos sem esconder a informação da conexão.

### Volume

- KPIs de clientes ativos, veículos/dia, pares/dia e volume anual.
- Ações para adicionar cliente, adicionar veículo e importar dados.
- Tabela com Cliente, Veículo/Modelo, Veículos/dia, Reforço %, Pares/dia, Dias trabalhados, Turnos e Status.
- Diferenciar visualmente campos `INPUT (EDITÁVEL)` de campos `CALCULADO`.
- Painel de ajuda com a legenda INPUT/CALCULADO e definições dos campos.
- Validar entradas, indicar alterações não salvas e permitir salvar/recarregar.

### Capacidade

- KPIs de processos ativos, capacidade total/dia, gargalo e utilização média.
- Ações para adicionar, duplicar, importar parâmetros e exportar.
- Tabela com Processo, CT, capacidade/h, capacidade/dia, turnos, tempo disponível, OEE/eficiência, WIP e status.
- Evidenciar o gargalo com sinalização de risco e manter um painel de utilização por processo.
- Exibir insight contextual, mas baseá-lo em cálculo/estado real do domínio.

### Integrações

- Card de Oracle MES com status, teste de conexão e edição.
- Abas Conexão, Explorer, SQL Query, Consultas salvas e Data Sources.
- Formulário para nome, host/IP, porta, service/SID, schema, usuário e senha.
- Explorer, editor SQL e grade de resultados somente quando o fluxo de segurança estiver habilitado.
- A tela deve deixar claro que a conexão é somente leitura e que as consultas são allowlisted.
- Os valores exibidos na imagem são placeholders visuais. Não copiar `10.20.15.45`, `1521` ou `MESDB` para a configuração real. O PBIP analisado aponta para `10.44.34.68:1522/MESBR`.

## Melhorias permitidas sem descaracterizar a referência

- Acessibilidade: foco visível, contraste suficiente, labels associados, navegação por teclado e mensagens de erro claras.
- Responsividade: recolher a barra lateral e transformar painéis laterais em drawers em telas menores.
- Operação segura: confirmação antes de excluir, indicação de salvamento e proteção contra perda de edição.
- Observabilidade: loading, empty, error e sucesso com mensagens consistentes.
- Produtividade: atalhos de teclado coerentes com a barra de ferramentas, busca e filtros preservando o contexto.

Qualquer melhoria deve preservar a hierarquia visual, a distribuição da tela, os nomes dos módulos e a sensação de produto corporativo mostradas nas referências.

## Regra de implementação

As referências visuais são baseline de design e aceitação visual do MVP. A reprodução deve ser feita com componentes, dados, estados e interações reais. Não transformar uma captura em background, não codificar métricas como texto fixo e não substituir o canvas por uma imagem.
