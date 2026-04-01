const fs = require("node:fs");
const path = require("node:path");

const DEPLOYMENTS_DIR = path.join(__dirname, "..", "deployments");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getDeploymentsPath(networkName) {
  ensureDir(DEPLOYMENTS_DIR);
  return path.join(DEPLOYMENTS_DIR, `${networkName}.json`);
}

function readDeployment(networkName) {
  const filePath = getDeploymentsPath(networkName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing deployment file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeDeployment(networkName, payload) {
  const filePath = getDeploymentsPath(networkName);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return filePath;
}

function toDataUriJson(value) {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(value)).toString("base64")}`;
}

function stringifyBigInts(value) {
  return JSON.parse(
    JSON.stringify(value, (_, current) => (typeof current === "bigint" ? current.toString() : current)),
  );
}

async function waitForReceipt(txPromise) {
  const tx = await txPromise;
  return tx.wait();
}

module.exports = {
  DEPLOYMENTS_DIR,
  getDeploymentsPath,
  readDeployment,
  stringifyBigInts,
  toDataUriJson,
  waitForReceipt,
  writeDeployment,
};
