import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/mifc/layout");
  await expect(page.getByTestId("client-lead-time-board")).toBeVisible();
});

test("renomeia o card imediatamente e mantém o nome após salvar/recarregar", async ({ page }) => {
  const card = page.getByTestId("layout-node-node-stamp");
  await card.click();

  const input = page.getByTestId("node-name-input");
  await expect(input).toBeFocused();
  await input.fill("RF3 Principal");
  await expect(card).toContainText("RF3 Principal");
  await input.press("Enter");

  await page.getByRole("button", { name: /Salvar layout/ }).click();
  await page.reload();
  await expect(page.getByTestId("layout-node-node-stamp")).toContainText("RF3 Principal");
});

test("arrasta a tela com o botão central mesmo começando sobre um bloco", async ({ page }) => {
  const world = page.locator(".canvas-world");
  const card = page.getByTestId("layout-node-node-stamp");
  const beforeTransform = await world.evaluate((element) => (element as HTMLElement).style.transform);
  const beforePosition = await card.evaluate((element) => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top }));
  const box = await card.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(box!.x + box!.width / 2 + 130, box!.y + box!.height / 2 + 75, { steps: 5 });
  await page.mouse.up({ button: "middle" });

  await expect.poll(() => world.evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(beforeTransform);
  await expect.poll(() => card.evaluate((element) => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top }))).toEqual(beforePosition);
});

test("entra e sai da tela cheia restaurando o enquadramento", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Fluxo validado no Chromium");
  const world = page.locator(".canvas-world");
  const originalTransform = await world.evaluate((element) => (element as HTMLElement).style.transform);

  await page.getByTestId("fullscreen-toggle").click();
  await expect(page.getByTestId("fullscreen-toggle")).toContainText("Sair da tela cheia");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("fullscreen-toggle")).toContainText("Tela cheia");
  await expect.poll(() => world.evaluate((element) => (element as HTMLElement).style.transform)).toBe(originalTransform);
});

test("renderiza as quatro linhas de clientes e gera evidência visual", async ({ page }, testInfo) => {
  const lanes = page.locator(".client-lane");
  await expect(lanes).toHaveCount(4);
  await expect(page.getByTestId("client-lane-FH")).toContainText("T-T-FH");
  await expect(page.getByTestId("client-lane-VM")).toContainText("T-T-VM");
  await expect(page.getByTestId("client-lane-SCA")).toContainText("T-T-SCA");
  await expect(page.getByTestId("client-lane-DAF")).toContainText("T-T-DAF");
  await expect(page.locator(".client-stage-marker")).toHaveCount(28);

  const screenshot = await page.getByTestId("client-lead-time-board").screenshot({ animations: "disabled" });
  expect(screenshot.byteLength).toBeGreaterThan(20_000);
  await testInfo.attach("linhas-cliente-processo.png", { body: screenshot, contentType: "image/png" });
});
