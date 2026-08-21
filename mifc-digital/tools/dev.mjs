import { spawn } from "node:child_process";

const npmExecutable = process.env.npm_execpath;
if (!npmExecutable) throw new Error("Não foi possível localizar o npm para iniciar o ambiente local.");
const runNpm = (args) => spawn(process.execPath, [npmExecutable, ...args], { stdio: "inherit" });
const children = [
  runNpm(["run", "dev:api"]),
  runNpm(["run", "dev:web", "--", "--host", "127.0.0.1"]),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code && code !== 0) stop(code);
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
