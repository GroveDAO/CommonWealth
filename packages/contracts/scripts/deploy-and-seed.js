const { spawnSync } = require("node:child_process");

function run(scriptName) {
  const commandName = scriptName.replace(".js", "");
  const result = spawnSync("pnpm", ["--filter", "@commonwealth/contracts", "run", commandName], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("deploy.js");
run("seed.js");
