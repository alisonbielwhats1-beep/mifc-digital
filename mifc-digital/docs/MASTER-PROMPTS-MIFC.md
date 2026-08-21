# MIFC Digital — prompts canônicos de execução

Este documento define a ordem oficial de trabalho. Cada prompt deve terminar com um checkpoint executável e uma lista objetiva do que ficou pronto, do que usa dados locais e do que está pendente.

## Modelo e esforço recomendados

| Prompt | Modelo recomendado | Esforço | Motivo |
|---|---|---|---|
| 1 — Discovery | `gpt-5.6-sol` / GPT-5.6 Sol | `high` | Cruzar Excel, PBIP, medidas, consultas, Layout e fontes sem perder dependências |
| 2 — Fundação | `gpt-5.6-sol` / GPT-5.6 Sol | `high` | Decisões de arquitetura, domínio, persistência e separação de responsabilidades |
| 3 — Formulários | `gpt-5.6-sol` / GPT-5.6 Sol | `high` | Mapear corretamente os campos do MIPS e separar INPUT, CALCULATED e ORACLE |
| 4 — Calculation Engine | `gpt-5.6-sol` / GPT-5.6 Sol | `xhigh` | Fórmulas, dependências e testes de paridade exigem máxima revisão nesta fase |
| 5 — Oracle | `gpt-5.6-sol` / GPT-5.6 Sol | `high` | Segurança, allowlist, somente leitura e diagnóstico de conexão |
| 6 — Layout | `gpt-5.6-sol` / GPT-5.6 Sol | `high` | Editor gráfico, nodes/edges, importação do layout e comportamento visual |
| 7 — Overview/Resultados | `gpt-5.6-terra` / GPT-5.6 Terra | `medium` | Construção de telas sobre cálculos e APIs já validados |
| 8 — Validação final | `gpt-5.6-sol` / GPT-5.6 Sol | `xhigh` | Revisão integrada de paridade, segurança, persistência, UX e regressões |

Use `max` somente se o Prompt 4 ou 8 encontrar uma divergência difícil que permaneça sem causa após a execução em `xhigh`. Use Luna apenas para tarefas repetitivas e isoladas, como ajustes de textos, documentação ou estilos já definidos; não para arquitetura, fórmulas, Oracle ou Layout.

Se o custo precisar ser reduzido, a alternativa segura é usar Terra `medium` para refinamentos de componentes após os Prompts 2, 3 e 6, mantendo Sol nos prompts de descoberta, cálculo, Oracle e validação.

## Regra central do projeto

- `MIFC Action Plan 2026 - Osasco Plant R01.xlsx`: padrão operacional de preenchimento e exemplo concluído;
- `MIFC.pbip`: referência atual de Power Query, medidas, cálculos, visuais e Layout;
- Oracle MES: fonte online corporativa, somente leitura;
- aplicação: combinação de inputs editáveis, dados online, Calculation Engine e Layout MIFC editável.

Campos que eram manuais no Excel devem permanecer inputs quando essa for a regra do processo. Quando o PBIP/Oracle fornecer uma forma confiável de automatizá-los, o campo deve passar a ser `CALCULATED` ou `ORACLE`, com origem visível e sem perder rastreabilidade.

## Ordem resumida

```text
1. Discovery e matriz de fontes
2. Fundação da aplicação e modelo de dados
3. Formulários MIPS: Volume, Logística, Buffer/Dias e Capacidade
4. Calculation Engine e paridade com Power BI/Excel
5. Oracle somente leitura e mapeamento
6. Layout MIFC inicial igual ao atual, porém editável
7. Overview e Resultados
8. Validação e checkpoint de sexta-feira
```

## Prompt 1 — Discovery e matriz de fontes

```text
Trabalhe no projeto MIFC Digital usando o contexto da conversa “Migrar Power BI para aplicação”.

Antes de implementar telas, consolide as fontes de verdade:
- MIFC Action Plan 2026 - Osasco Plant R01.xlsx: modelo de preenchimento concluído;
- MIFC-F1-V1-POR.xlsx: referência MIFC disponível no projeto;
- MIFC-H-V1-POR.docx e MIFC-UG-V1-POR.pptx: metodologia e orientação;
- Digital Experience Guideline(5).pdf: identidade visual;
- MIFC.pbip em C:\Users\Usuário\Downloads\MIFC: modelo Power BI atual;
- Oracle MES: fonte online, somente leitura.

Não altere nenhum arquivo de referência.
Não invente campos, fórmulas, símbolos ou nomenclaturas.

Produza uma matriz de rastreabilidade com:
1. abas e campos do Excel MIPS 2026;
2. campos manuais, calculados e provenientes do MES;
3. tabelas, colunas, consultas e medidas do PBIP relacionadas a cada campo;
4. dependências de Volume, Logística, Capacidade, Buffer, Estoque, Dias, WIP e Lead Time;
5. estrutura atual do Layout, processos, blocos, linhas e propriedades;
6. lacunas que dependem de um arquivo ainda não disponível localmente.

Para cada campo, registre:
campo | fonte | tipo | unidade | tela | fórmula/origem | status de validação.

Não construa a aplicação inteira nesta etapa. Entregue o relatório, a matriz e um checkpoint.
```

## Prompt 2 — Fundação e modelo de dados

```text
Implemente a fundação do MIFC Digital em Vue 3 + TypeScript, mantendo separação entre frontend, API, domínio, banco da aplicação, Calculation Engine e integrações.

Crie o shell Metalsa com:
- cabeçalho e wordmark;
- Planta, Ano, Cenário e Revisão;
- navegação lateral;
- MIFC expandido;
- estados loading, empty, error e sucesso ao salvar.

Crie o modelo de dados para:
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

Os dados preenchidos pela aplicação devem ficar no banco da aplicação, nunca no Oracle MES.
Não coloque fórmulas nos componentes visuais.
Use dados locais de demonstração quando uma fonte externa não estiver disponível.
Execute typecheck, testes e build ao concluir.
```

## Prompt 3 — Formulários derivados do MIPS 2026

```text
Implemente os formulários funcionais seguindo campo a campo o MIFC Action Plan 2026 - Osasco Plant R01.xlsx.

Crie as áreas:

1. Volume:
- clientes;
- produtos/veículos;
- veículos/dia;
- reforço;
- pares/dia;
- turnos;
- dias trabalhados;
- volume anual e demais campos do Excel.

2. Logística:
- programação e datas;
- cliente/veículo/flatbed quando aplicável;
- horários;
- transporte;
- estoques e pontos logísticos;
- demais campos existentes no Excel.

3. Buffer e Estoque:
- ponto/localização;
- tipo de buffer;
- WIP/quantidade;
- limite ou capacidade quando existir;
- dias de estoque;
- processo de entrada e saída.

4. Capacidade:
- processo;
- CT;
- capacidade/hora;
- capacidade/dia;
- turnos;
- tempo disponível;
- OEE/eficiência;
- WIP;
- status e demais parâmetros do Excel.

Classifique cada campo como INPUT, CALCULATED ou ORACLE/MES.
Campos automáticos devem ser somente leitura e mostrar sua origem.
Campos manuais devem continuar editáveis.
Permita adicionar, editar, duplicar, ativar/desativar e salvar.
Não invente um cálculo apenas para preencher uma célula sem fórmula validada.
```

## Prompt 4 — Calculation Engine e paridade

```text
Implemente o Calculation Engine separado da interface.

Use o PBIP como referência das medidas, Power Query, colunas, dependências e resultados.
Use o MIPS 2026 como referência dos inputs e dos valores do exemplo concluído.

Priorize:
- pares/dia;
- capacidade;
- tempo disponível;
- WIP;
- buffer;
- estoque em dias;
- dias trabalhados;
- logística/transporte;
- Lead Time por etapa;
- Lead Time total;
- gargalo e utilização.

Para cada regra, registre:
nome, código, versão, inputs, unidade, fórmula, origem, dependências e status.

Crie testes de paridade usando a mesma entrada no Excel/PBIP e na aplicação.
Não declare uma regra migrada se o resultado ainda não tiver sido comparado.
Não migre as centenas de medidas cegamente nem espalhe DAX pelos componentes.
```

## Prompt 5 — Oracle MES somente leitura

```text
Agora a máquina está na rede Metalsa.

Configure a conexão Oracle apenas no backend e somente com credencial local:
- host 10.44.34.68;
- porta 1522;
- serviço MESBR.

Antes de qualquer leitura:
1. confirme ORACLE_READ_ONLY=true;
2. habilite ORACLE_LIVE_READS_ENABLED conscientemente;
3. leia apps/api/config/oracle-query-catalog.json;
4. execute apenas consultas confirmadas e enabled=true;
5. permita somente SELECT ou WITH ... SELECT;
6. bloqueie INSERT, UPDATE, DELETE, MERGE, DDL, procedures, múltiplas instruções e queries fora da allowlist;
7. registre origem, duração, colunas, linhas e erro sem registrar senha;
8. não altere nada no Oracle.

Mapeie somente os campos necessários para Volume, Logística, Capacidade, Buffer, Dias, WIP e resultados.
Se falhar, registre o erro e mantenha o MVP com snapshot/mock local.
```

## Prompt 6 — Layout MIFC igual ao atual, porém editável

```text
Implemente o Layout MIFC usando o layout atual do PBIP e as imagens aprovadas como referência visual.

Preserve a distribuição:
- Information Flow na parte superior;
- Material Flow no centro;
- Data/Lead Time na parte inferior;
- navegação lateral e painéis contextuais no padrão Metalsa;
- espaçamento amplo e leitura semelhante ao modelo atual.

O estado inicial deve representar o fluxo atual com os mesmos processos, blocos, conexões e principais propriedades sempre que estiverem disponíveis no PBIP/referências.

O Layout não pode ser uma imagem estática.
Modele nodes e edges como dados da revisão e permita:
- adicionar bloco/símbolo;
- remover bloco da revisão sem apagar o cadastro do processo;
- mover e redimensionar;
- conectar e desconectar;
- duplicar;
- editar código, CT, WIP, capacidade, turnos, disponibilidade e observações;
- selecionar entradas e saídas;
- desfazer/refazer;
- zoom, pan e fit view;
- salvar uma nova revisão.

O painel de propriedades deve seguir a referência enviada.
Os processos do Layout devem apontar para os processos do módulo Capacidade quando possível.
Não tente reproduzir os 552 visuais como visuais individuais nesta primeira entrega; reproduza a estrutura funcional do MIFC.
```

## Prompt 7 — Overview e Resultados

```text
Implemente Overview e Resultados usando dados do Calculation Engine.

Exiba:
- Lead Time total;
- VA total;
- gargalo;
- WIP total;
- ações pendentes;
- comparação Current State x Target State;
- contribuição por tipo de processo;
- miniatura do MIFC;
- revisões e atividade;
- alertas de capacidade, WIP e atraso.

Não fixe números no componente.
Mostre se o valor veio de INPUT, ORACLE/MES ou CALCULATED.
Inclua filtros por planta, ano, cenário, revisão, cliente e processo.
```

## Prompt 8 — Validação final

```text
Faça a validação final do MVP MIFC Digital.

Verifique:
- Volume, Logística, Buffer/Dias e Capacidade permitem preencher e salvar;
- campos automáticos usam o Calculation Engine;
- origem INPUT/CALCULATED/ORACLE está visível;
- resultados carregam dados locais ou Oracle validado;
- Layout inicial se parece com o modelo atual;
- Layout permite adicionar, remover, mover e conectar blocos;
- revisão salva e recarrega corretamente;
- nenhuma exclusão do Layout apaga o cadastro mestre por engano;
- Oracle permanece somente leitura;
- nenhuma senha aparece no código ou log;
- typecheck, testes e build passam.

Entregue três listas:
1. funcional até sexta-feira;
2. validado com Excel/PBIP/Oracle;
3. pendente para a próxima fase.

Não declare paridade completa com o Power BI sem testes de comparação.
```

## Regra de uso

Enviar um prompt por vez, na ordem. Não pular o Prompt 1. Se o arquivo Excel MIPS 2026 ainda não estiver acessível, o agente deve registrar a lacuna e usar dados locais, sem declarar os formulários completos.
