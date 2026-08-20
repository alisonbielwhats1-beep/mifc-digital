import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/overview");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("organiza e recolhe os níveis Operar, Alimentar e Administrar", async ({ page }) => {
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(navigation.getByRole("link", { name: "Visão Geral" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  const mifc = navigation.getByRole("button", { name: "MIFC" });
  await mifc.click();
  await expect(navigation.getByRole("link", { name: "Layout" })).toHaveCount(0);
  await mifc.click();
  await expect(navigation.getByRole("link", { name: "Layout" })).toBeVisible();

  const cadastros = navigation.getByRole("button", { name: "Cadastros" });
  await cadastros.click();
  await expect(navigation.getByRole("link", { name: "Máquinas & Recursos" })).toBeVisible();

  const settings = navigation.getByRole("button", { name: "Configurações" });
  await settings.click();
  await expect(navigation.getByRole("link", { name: "Dados mestre" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Diagnóstico" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/overview$/);
});

test("prioriza indicadores de negócio na Visão Geral sem números demonstrativos", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible();
  await expect(page.getByText("Lead Time", { exact: true })).toBeVisible();
  await expect(page.getByText("VA", { exact: true })).toBeVisible();
  await expect(page.getByText("NVA", { exact: true })).toBeVisible();
  await expect(page.getByText("Produção × demanda", { exact: true })).toBeVisible();
  await expect(page.getByText(/17 entidades|132|62 medidas/)).toHaveCount(0);
  await expect(page.getByText(/Sem dado confiável|Aguardando dados/).first()).toBeVisible();
});

test("abre propriedades apenas com seleção e edita logística do cliente no Layout", async ({ page }) => {
  await page.goto("/mifc/layout");
  await expect(page.getByLabel("Propriedades do elemento selecionado")).toHaveCount(0);

  await page.getByRole("button", { name: "Editar parâmetros do cliente Volvo FH" }).click();
  const panel = page.getByRole("dialog", { name: "Rastreabilidade do valor" });
  await expect(panel.getByRole("spinbutton", { name: "Transporte (h)" })).toBeVisible();
  await expect(panel.getByRole("spinbutton", { name: "Beneficiador (dias)" })).toBeVisible();
  await panel.getByRole("spinbutton", { name: "Beneficiador (dias)" }).fill("2.5");
  await panel.getByRole("spinbutton", { name: "Beneficiador (dias)" }).press("Tab");
  await expect(page.getByTestId("layout-node-node-beneficiator")).toContainText("FH 2,5 d");

  await page.getByRole("button", { name: "Fechar rastreabilidade" }).click();
  await expect(page.getByLabel("Propriedades do elemento selecionado")).toHaveCount(0);
});

test("resume rotas e separa cadastro técnico, recurso físico e paridade", async ({ page }) => {
  await page.goto("/products");
  const productRow = page.getByRole("row").nth(1);
  await expect(productRow.getByRole("button", { name: /Ver rota/ })).toBeVisible();
  await expect(productRow.locator(".route-cell")).toContainText(/\d+ processos?/);

  await page.goto("/processes");
  await expect(page.getByText("Validado", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Divergente", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Pendente", { exact: true }).first()).toBeVisible();

  await page.goto("/resources");
  await expect(page.getByRole("heading", { name: "Máquinas & Recursos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar parâmetros em Capacidade" }).first()).toBeVisible();

  await page.goto("/integrations");
  await expect(page.getByRole("heading", { name: "Power BI / Semantic Model" })).toBeVisible();
  await expect(page.getByText("Sem conexão online com o Power BI", { exact: false })).toBeVisible();
});

test("mantém tabelas utilizáveis em largura menor", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto("/products");
  const table = page.locator(".table-scroll");
  await expect(table).toBeVisible();
  expect(await table.evaluate((element) => element.scrollWidth >= element.clientWidth)).toBe(true);
});
