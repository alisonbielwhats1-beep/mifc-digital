import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/mifc/layout");
  await expect(page.getByTestId("client-lead-time-board")).toBeVisible();
});

test("renomeia o card imediatamente e mantém o nome após salvar/recarregar", async ({ page }) => {
  const card = page.getByTestId("layout-node-node-stamp");
  await card.getByText("Roll Former 3", { exact: true }).click();

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
  await expect(page.getByTestId("client-lane-FH").locator(".client-lane-label strong")).toHaveText("Volvo FH");
  await expect(page.getByTestId("client-lane-VM").locator(".client-lane-label strong")).toHaveText("Volvo VM");
  await expect(page.getByTestId("client-lane-SCA").locator(".client-lane-label strong")).toHaveText("Scania");
  await expect(page.getByTestId("client-lane-DAF").locator(".client-lane-label strong")).toHaveText("DAF");
  await expect(page.locator(".client-measure-keys")).not.toContainText(/T-(RF|B|M|P|C|L|S|EMB)/);
  await expect(page.locator(".client-stage-marker")).toHaveCount(40);

  const screenshot = await page.getByTestId("client-lead-time-board").screenshot({ animations: "disabled" });
  expect(screenshot.byteLength).toBeGreaterThan(20_000);
  await testInfo.attach("linhas-cliente-processo.png", { body: screenshot, contentType: "image/png" });
});

test("abre a rastreabilidade do total e exibe os buffers documentados", async ({ page }) => {
  await expect(page.getByTestId("layout-buffer-buf-fh-lct-in")).toBeVisible();
  await page.getByTestId("client-total-FH").click();
  const trace = page.getByRole("dialog", { name: "Rastreabilidade do valor" });
  await expect(trace).toBeVisible();
  await expect(trace).toContainText("T-T-FH");
  await expect(trace).toContainText("MIFC.SemanticModel");
});

test("recolhe e expande a biblioteca de símbolos", async ({ page }) => {
  const palette = page.getByLabel("Biblioteca de símbolos MIFC");
  await page.getByRole("button", { name: "Recolher biblioteca de símbolos" }).click();
  await expect(palette.getByRole("button", { name: /Adicionar processo/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Expandir biblioteca de símbolos" }).click();
  await expect(palette.getByRole("button", { name: /Adicionar processo/ })).toBeVisible();
});

test("busca um bloco, navega e abre a ajuda contextual", async ({ page }) => {
  await page.keyboard.press("Control+K");
  const search = page.getByRole("searchbox", { name: "Buscar no MIFC" });
  await expect(search).toBeFocused();
  await search.fill("Roll Former 3");
  await page.getByRole("option", { name: /Roll Former 3/ }).first().click();
  await expect(page.getByTestId("layout-node-node-stamp")).toHaveClass(/selected/);

  await page.getByRole("button", { name: "Ajuda" }).click();
  await expect(page.getByRole("dialog", { name: "Ajuda desta tela" })).toContainText("Mover tela");
});

test("sincroniza Tempo de Ciclo entre Layout e Capacidade nos dois sentidos", async ({ page }) => {
  await page.getByTestId("layout-node-node-stamp").getByText("Roll Former 3", { exact: true }).click();
  await page.getByLabel("Tempo de Ciclo — CT (s/peça)").fill("51");
  await page.getByRole("button", { name: "Aplicar propriedades" }).click();
  await page.getByRole("link", { name: "Capacidade" }).click();
  const capacityCt = page.getByRole("spinbutton", { name: "Tempo de Ciclo — CT (s/peça)" }).first();
  await expect(capacityCt).toHaveValue("51");

  await capacityCt.fill("52");
  await expect(capacityCt).toHaveValue("52");
  await capacityCt.press("Tab");
  await expect(capacityCt).toHaveAttribute("data-model-value", "52");
  await page.getByRole("link", { name: "Layout" }).click();
  await expect(page.getByTestId("layout-node-node-stamp")).toContainText("52 s/peça");
});

test("edita o volume do cliente no cockpit e recalcula o buffer dependente", async ({ page }) => {
  await page.getByRole("button", { name: "Editar parâmetros do cliente Volvo FH" }).click();
  const trace = page.getByRole("dialog", { name: "Rastreabilidade do valor" });
  const vehiclesPerDay = trace.getByRole("spinbutton", { name: "Veículos por dia" });

  await expect(trace).toContainText("127,5");
  await vehiclesPerDay.fill("90");
  await vehiclesPerDay.press("Tab");

  await expect(trace).toContainText("135");
  await expect(page.getByTestId("layout-buffer-buf-fh-lct-in")).toContainText("0,252 dia");
});
