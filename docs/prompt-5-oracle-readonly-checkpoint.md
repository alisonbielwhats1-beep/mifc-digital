# Prompt 5 — Integração Oracle somente leitura

## Resultado

A estrutura de integração está pronta para o teste na rede da Metalsa. Nenhuma conexão Oracle foi aberta e nenhuma consulta foi executada durante a implementação.

## Proteções implementadas

- API local separada da interface.
- Teste de usuário e senha sem persistência; a senha é apagada do formulário após a tentativa.
- Nenhum endpoint aceita SQL arbitrário.
- Execução somente por ID de consulta presente na allowlist.
- SQL extraído do PBIP original e validado por fingerprint SHA-256.
- Bloqueio de DML, DDL, PL/SQL, packages sensíveis, `FOR UPDATE` e múltiplas instruções.
- Transação Oracle `READ ONLY`, `autoCommit: false`, rollback obrigatório, limite de linhas e timeout.
- Leituras online mantidas desativadas por padrão.

## Catálogo

- 8 consultas com SQL embutido: confirmadas no PBIP e assinadas.
- 7 objetos com navegação M: bloqueados até a materialização e revisão do SQL final.
- Mesmo as consultas confirmadas não executam enquanto `ORACLE_LIVE_READS_ENABLED=false`.

## Teste na rede da Metalsa

1. Executar `npm run dev`.
2. Abrir a página **Integrações**.
3. Confirmar host, porta e serviço exibidos.
4. Informar um usuário Oracle com permissão somente `SELECT` e a senha.
5. Clicar em **Testar conexão sem consultar dados**.
6. O teste deve retornar sucesso sem buscar tabelas e sem salvar a senha.

Somente após esse teste e a confirmação das permissões do usuário deve-se planejar a primeira leitura controlada. As consultas de navegação M permanecem pendentes nessa etapa.
