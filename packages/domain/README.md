# Domínio do MIFC Digital

O pacote `packages/domain` concentra os contratos que não pertencem à interface nem à integração Oracle.

Entidades cobertas:

- plantas, cenários e revisões;
- clientes, produtos e veículos;
- volume e parâmetros logísticos;
- buffers, pontos de estoque e calendário;
- processos e capacidade por revisão;
- nós e conexões MIFC;
- regras e resultados de cálculo;
- conexões, catálogo de consultas e fontes de dados;
- auditoria.

`FieldValue<T>` registra valor, origem, editabilidade, fallback, atualização e validação. Essa informação permite que a interface diferencie corretamente input, cálculo, importação e MES.
