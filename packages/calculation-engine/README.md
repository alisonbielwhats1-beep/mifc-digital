# Calculation Engine

Calculation Engine versionado do MIFC Digital.

Nenhuma fórmula é inventada ou aproximada. Cada regra registra origem, entradas, dependências, unidade, versão e status de validação.

O catálogo v1 contém 12 regras validadas e 5 regras mapeadas com execução bloqueada. A paridade automatizada usa referências do Excel e do PBIP para Volume, turnos, material, estoque, WIP, logística, processo e Lead Time.

Use `createMifcCalculationEngine()` para obter o engine com o catálogo canônico. Regras com status diferente de `validated` lançam `RuleNotValidatedError`.
