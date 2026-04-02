import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const buildManifest = readFileSync(path.join(rootDir, "build", "subgraph.yaml"), "utf8");
const deployment = JSON.parse(
  readFileSync(path.join(rootDir, "..", "contracts", "deployments", "sepolia.json"), "utf8"),
);

const outputDir = path.join(rootDir, "site");
mkdirSync(outputDir, { recursive: true });

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CommonWealth Subgraph Bundle</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #eef5ef;
        --card: rgba(255, 255, 255, 0.86);
        --ink: #162017;
        --muted: #4f5d51;
        --line: rgba(22, 32, 23, 0.12);
        --accent: #147d64;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(20, 125, 100, 0.18), transparent 32%),
          linear-gradient(180deg, #f5f9f6 0%, var(--bg) 100%);
      }
      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero, .card {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
      }
      .hero { padding: 32px; margin-bottom: 24px; }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0 0 12px;
      }
      h1, h2 { font-family: "Iowan Old Style", "Palatino Linotype", serif; }
      h1 { margin: 0 0 12px; font-size: clamp(2.2rem, 5vw, 4rem); line-height: 1; }
      h2 { margin: 0 0 14px; font-size: 1.4rem; }
      p, li { color: var(--muted); line-height: 1.6; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .card { padding: 24px; }
      code, pre { font-family: "IBM Plex Mono", monospace; }
      pre {
        overflow-x: auto;
        background: rgba(22, 32, 23, 0.05);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">Live Sepolia bundle</p>
        <h1>CommonWealth Subgraph</h1>
        <p>This artifact tracks the live Sepolia deployment, indexes public governance, impact attestations, savings circles, and DePIN submissions, and is ready for Graph Studio deployment or external hosting workflows.</p>
      </section>

      <section class="grid">
        <article class="card">
          <h2>Contracts</h2>
          <ul>
            <li>ConvictionVoting: ${deployment.convictionVoting.address}</li>
            <li>ImpactAttestation: ${deployment.impactAttestation.address}</li>
            <li>SavingsCircle: ${deployment.savingsCircle.address}</li>
            <li>DePINRegistry: ${deployment.depinRegistry.address}</li>
          </ul>
        </article>
        <article class="card">
          <h2>CLI</h2>
          <pre><code>pnpm --filter @commonwealth/subgraph codegen
pnpm --filter @commonwealth/subgraph build
graph deploy ...</code></pre>
        </article>
      </section>

      <section class="card" style="margin-top: 24px;">
        <h2>Compiled Manifest</h2>
        <pre><code>${escapeHtml(buildManifest)}</code></pre>
      </section>
    </main>
  </body>
</html>`;

writeFileSync(path.join(outputDir, "index.html"), html);