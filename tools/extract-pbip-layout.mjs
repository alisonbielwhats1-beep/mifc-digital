import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const pbipRoot = process.env.MIFC_PBIP_PATH ?? "C:\\Users\\Usuário\\Downloads\\MIFC";
const reportRoot = path.join(pbipRoot, "MIFC.Report", "MIFC.Report");
const layoutPage = path.join(reportRoot, "definition", "pages", "ReportSection");
const visualsRoot = path.join(layoutPage, "visuals");
const resourcesRoot = path.join(reportRoot, "StaticResources", "RegisteredResources");
const targetResources = path.join(projectRoot, "apps", "web", "public", "pbip-layout-resources");
const targetJson = path.join(projectRoot, "apps", "web", "src", "data", "pbip-layout.json");

function walk(value, visitor) {
  visitor(value);
  if (Array.isArray(value)) for (const item of value) walk(item, visitor);
  else if (value && typeof value === "object") for (const item of Object.values(value)) walk(item, visitor);
}

function literal(value, fallback = "") {
  if (value == null) return fallback;
  const text = String(value);
  return text.replace(/^'/, "").replace(/'$/, "").replace(/[DL]$/, "");
}

function deepFind(root, key) {
  let found;
  walk(root, (value) => { if (found === undefined && value && typeof value === "object" && key in value) found = value[key]; });
  return found;
}

function getMeasure(visual) {
  let result = "";
  walk(visual?.query, (value) => {
    if (!result && value?.Measure?.Property) result = String(value.Measure.Property);
  });
  return result;
}

function getText(visual) {
  const values = [];
  walk(visual?.objects, (value) => {
    if (value && typeof value === "object" && Array.isArray(value.textRuns)) {
      for (const run of value.textRuns) {
        const text = String(run?.value ?? "").trim();
        if (text && !/^#[0-9a-f]{6}$/i.test(text)) values.push(text);
      }
    }
  });
  return [...new Set(values)].join(" ");
}

function laneFor(y, measure) {
  if (measure.startsWith("Q-D-S-")) return "Segregação";
  if (y >= 2100) return "Rodapé sobreposto";
  if (y < 1635) return "Volvo FH — tempo de processo";
  if (y < 1700) return "Volvo FH — estoque/logística";
  if (y < 1750) return "Volvo VM — tempo de processo";
  if (y < 1810) return "Volvo VM — estoque/logística";
  if (y < 1870) return "Scania — tempo de processo";
  if (y < 1940) return "Scania — estoque/logística";
  if (y < 2000) return "DAF — tempo de processo";
  return "DAF — estoque/logística";
}

function staleValue(measure) {
  const constants = { "T-M": "0,003", "T-T": "0,167", "T-B": "0,000", "T-B1": "0,000", "T-M3": "0,000" };
  return constants[measure] ?? "0,000";
}

function shapeDetails(visual) {
  const shape = literal(deepFind(visual?.objects?.shape, "Value"), "rectangle").toLowerCase();
  const angle = Number(literal(deepFind(visual?.objects?.rotation, "Value"), "0")) || 0;
  const weight = Number(literal(deepFind(visual?.objects?.outline, "Value"), "3")) || 3;
  return { shape, angle, weight };
}

async function main() {
  const page = JSON.parse(await readFile(path.join(layoutPage, "page.json"), "utf8"));
  const folders = await readdir(visualsRoot, { withFileTypes: true });
  const visuals = [];
  const usedAssets = new Set();

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const document = JSON.parse(await readFile(path.join(visualsRoot, folder.name, "visual.json"), "utf8"));
    const visual = document.visual ?? {};
    const position = document.position ?? {};
    const type = visual.visualType;
    const item = {
      id: document.name ?? folder.name,
      type,
      x: Number(position.x ?? 0), y: Number(position.y ?? 0), width: Number(position.width ?? 0), height: Number(position.height ?? 0), z: Number(position.z ?? 0),
    };
    if (type === "shape") Object.assign(item, shapeDetails(visual));
    if (type === "image") {
      const resource = deepFind(visual?.objects, "ItemName");
      if (resource) { item.asset = String(resource); usedAssets.add(String(resource)); }
    }
    if (type === "textbox") {
      item.text = getText(visual);
      const style = deepFind(visual?.objects, "textStyle") ?? {};
      item.fontSize = Number.parseFloat(String(style.fontSize ?? "12")) || 12;
      item.fontWeight = style.fontWeight === "bold" ? 700 : 500;
      item.color = style.color ?? "#252423";
      item.align = deepFind(visual?.objects, "horizontalTextAlignment") ?? "center";
    }
    if (type === "card") {
      item.measure = getMeasure(visual);
      item.value = staleValue(item.measure);
      item.lane = laneFor(item.y, item.measure);
      item.stale = true;
    }
    visuals.push(item);
  }

  visuals.sort((a, b) => a.z - b.z);
  await mkdir(path.dirname(targetJson), { recursive: true });
  await mkdir(targetResources, { recursive: true });
  for (const asset of usedAssets) await copyFile(path.join(resourcesRoot, asset), path.join(targetResources, asset));
  const snapshot = {
    schemaVersion: 1,
    source: "MIFC.pbip / página Layout",
    extractedAt: new Date().toISOString(),
    width: Number(page.width ?? 9999),
    height: Number(page.height ?? 2350),
    counts: Object.fromEntries(["shape", "image", "card", "textbox"].map((type) => [type, visuals.filter((item) => item.type === type).length])),
    visuals,
  };
  await writeFile(targetJson, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ targetJson, copiedAssets: usedAssets.size, counts: snapshot.counts, width: snapshot.width, height: snapshot.height }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
