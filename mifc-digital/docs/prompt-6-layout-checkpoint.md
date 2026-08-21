# Prompt 6 — Layout MIFC editável

## Resultado corrigido

O Layout foi reconstruído para seguir a imagem de referência aprovada. O canvas bruto de 9999 × 2350 e seus 552 visuais independentes continuam catalogados como fonte de medidas, mas não são mais usados como interface inicial porque não reproduziam a composição visível desejada.

O baseline atual é um grafo semântico compacto, dimensionado para a tela da aplicação, com:

- fluxo de informação na parte superior;
- fornecedores, matéria-prima, processos, produto acabado, expedição e clientes no fluxo central;
- áreas de apoio abaixo dos processos;
- quatro faixas de Lead Time/Dados na parte inferior;
- biblioteca de símbolos à esquerda;
- propriedades à direita.

## Conteúdo inicial

- 29 blocos editáveis;
- 47 linhas editáveis;
- ERP/SAP, MRP, Planejamento, Qualidade, Manutenção, Logística, Compras e EDI;
- fornecedores USIMINAS, CSN e GERDAU;
- Corte, Estamparia, Solda 1, Solda 2, Solda 3, Montagem e Inspeção;
- armazenamento de matéria-prima e produto acabado;
- expedição e clientes Volvo, Scania, DAF e Renault;
- Ferramentaria, Manutenção, Laboratório e Controle de Qualidade.

## Edição

Blocos podem ser adicionados, selecionados, movidos, redimensionados, duplicados e removidos por revisão. As propriedades incluem código, CT, WIP, capacidade/dia, turnos, disponibilidade, observações, medida associada e vínculo com Capacidade.

Linhas podem ser:

- criadas entre quaisquer dois blocos;
- selecionadas diretamente no canvas;
- reconectadas pela origem ou destino;
- classificadas como material, material puxado, informação ou informação eletrônica;
- curvadas pelo ponto azul no canvas ou pelo controle do painel;
- excluídas sem remover os blocos.

## Persistência e segurança

- revisões e histórico são persistidos localmente na chave `mifc-digital:layout-reference-v2`;
- exclusão no Layout não apaga o processo cadastrado em Capacidade;
- nenhuma consulta Oracle foi executada;
- arquivos Excel/PBIP originais permanecem intactos.

## Validação

- 29 testes automatizados aprovados;
- typecheck aprovado;
- build de produção aprovado;
- servidor local respondendo em `http://127.0.0.1:5173/`.

A comparação automatizada por screenshot ficou indisponível por uma falha do conector de navegador com o caminho Unicode do perfil. A revisão visual final deve ser feita na tela local usando a imagem `assets/ui-references/metalsa-mifc-layout.png` lado a lado.
