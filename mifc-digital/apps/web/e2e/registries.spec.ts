import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/overview");
  await page.evaluate(() => localStorage.clear());
});

test("salva os dias manuais de Beneficiador na Logística", async ({ page }) => {
  await page.goto("/mifc/logistics");
  const beneficiator = page.getByRole("spinbutton", { name: "Dias no beneficiador" }).first();
  await beneficiator.fill("1.5");
  await page.getByRole("button", { name: "Salvar revisão" }).click();
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Dias no beneficiador" }).first()).toHaveValue("1.5");
});

test("desativa e reativa um processo sem apagar o cadastro", async ({ page }) => {
  await page.goto("/processes");
  const row = page.getByRole("row").filter({ hasText: "RF3 · Roll Former 3" });
  await expect(row).toContainText("Ativo");
  await row.getByRole("button", { name: "Desativar Roll Former 3" }).click();
  await expect(row).toContainText("Inativo");
  await row.getByRole("button", { name: "Reativar Roll Former 3" }).click();
  await expect(row).toContainText("Ativo");
});
