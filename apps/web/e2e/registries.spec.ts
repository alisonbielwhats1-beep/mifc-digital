import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
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
