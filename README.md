# CommonWealth

CommonWealth is a production-grade collective coordination protocol running on Sepolia. The stack combines live treasury governance, Zama-backed private voting, Storacha-backed evidence and dataset persistence, Lit-protected access control for DePIN assets, a deployable API, a typed SDK, and an indexable subgraph aligned to the live contracts.

This repository is structured as a pnpm and Turbo monorepo and is intended to ship as a full hackathon submission rather than a demo. The frontend talks to deployed contracts, the API reads live onchain state, and the reference surfaces for the SDK and subgraph are deployable as static sites.

## Track Alignment

### Crypto track

- Live Sepolia treasury governance with conviction voting
- Impact attestations tied to treasury-backed rewards
- Savings circles with rotating recipients and contribution enforcement
- DePIN registry with reward distribution in `CWT`
- Production API exposing protocol metrics and live snapshots

### Zama track

- `PrivateConvictionVoting` is deployed on Sepolia
- Ballot direction and voting weight are encrypted before submission
- The frontend supports encrypted voting and tally publication workflows
- The app retains live-contract behavior while surfacing operational fallbacks when FHE tooling or RPC calls degrade

### Storacha track

- Impact evidence can be pushed to Storacha before its reference is committed onchain
- DePIN submissions can upload datasets to Storacha and persist the resulting CID in protocol metadata
- Stored evidence is portable across the frontend, API, and subgraph metadata paths

### Lit Protocol track

- DePIN dataset access can be wrapped in Lit-managed encrypted payloads
- Access is token-gated against `CWT` balances
- The decrypt flow is wallet-authorized in the frontend rather than exposed as a public link

## Live Deployment

The protocol is already deployed on Sepolia. Deployment metadata lives in `packages/contracts/deployments/sepolia.json`.

| Contract | Address | Explorer |
| --- | --- | --- |
| `CommonWealthToken` | `0x9a2088b06225d986EAFBeBC6b724e4e298E423ce` | https://sepolia.etherscan.io/address/0x9a2088b06225d986EAFBeBC6b724e4e298E423ce#code |
| `ConvictionVoting` | `0xCe7b7301b29CC8D00a508a2900dc5D5B900176Af` | https://sepolia.etherscan.io/address/0xCe7b7301b29CC8D00a508a2900dc5D5B900176Af#code |
| `ImpactAttestation` | `0x4344e79d2f5d660cbBC8bdDC497B86eD3951d828` | https://sepolia.etherscan.io/address/0x4344e79d2f5d660cbBC8bdDC497B86eD3951d828#code |
| `SavingsCircle` | `0x172229A5599683ff52e685A751BF87998FA6c11a` | https://sepolia.etherscan.io/address/0x172229A5599683ff52e685A751BF87998FA6c11a#code |
| `DePINRegistry` | `0x4127C5192aAf3a33813eF2FC981711659a48A028` | https://sepolia.etherscan.io/address/0x4127C5192aAf3a33813eF2FC981711659a48A028#code |
| `PrivateConvictionVoting` | `0xA1D135E125e1C1B5713478266E18d85d66273a48` | https://sepolia.etherscan.io/address/0xA1D135E125e1C1B5713478266E18d85d66273a48#code |

Current seeded state includes live public proposals, private proposals, impact attestations, savings circles, and DePIN submissions suitable for judge walkthroughs and API verification.

## Product Surfaces

### Frontend

The Next.js app in `packages/app` exposes the protocol through focused routes instead of a single landing-page demo.

| Route | Purpose |
| --- | --- |
| `/` | Protocol overview and route hub |
| `/dashboard` | Treasury balances, counts, and protocol summary |
| `/governance` | Public conviction voting and proposal execution |
| `/private-voting` | Zama-backed private voting |
| `/impact` | Evidence submission, attestation review, and reward claims |
| `/savings` | Circle creation, membership, and contributions |
| `/depin` | Dataset submission, verification, claim flows, and protected access |

The app is built with `Next.js 15`, `React 18`, `wagmi`, `viem`, `RainbowKit`, `@tanstack/react-query`, `@lit-protocol/*`, and `@zama-fhe/relayer-sdk`.

### API

The Fastify API in `packages/api` reads live Sepolia state and is intended for Render deployment.

Endpoints:

- `GET /health`
- `GET /v1/config`
- `GET /v1/tracks`
- `GET /v1/protocol/metrics`
- `GET /v1/protocol/snapshot?limit=10`

The API falls back to `https://ethereum-sepolia-rpc.publicnode.com` when no dedicated RPC URL is configured, and it returns warning arrays when individual contract reads fail instead of hard-crashing the whole snapshot.

### SDK

The TypeScript SDK in `packages/sdk` exposes:

- typed ABIs
- contract client wrappers
- shared protocol types
- buildable static reference docs via `docs:build`

### Subgraph

The subgraph in `packages/subgraph` is aligned to the current Sepolia deployment and current contract events. It supports code generation, builds cleanly against the rewritten manifest and mappings, and can export a static reference site for deployment.

## Repository Layout

```text
commonwealth/
├── packages/
│   ├── api/        # Fastify live protocol API
│   ├── app/        # Next.js 15 frontend
│   ├── contracts/  # Solidity, Hardhat, deploy, verify, seed
│   ├── sdk/        # Typed SDK + static docs export
│   └── subgraph/   # The Graph manifest, mappings, static site export
├── render.yaml     # Render blueprint for API + static sites
├── turbo.json
└── package.json
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the frontend:

```bash
pnpm --filter @commonwealth/app dev
```

Run the API locally:

```bash
pnpm --filter @commonwealth/api dev
```

Build the workspace:

```bash
pnpm build
```

Targeted builds:

```bash
pnpm --filter @commonwealth/app build
pnpm --filter @commonwealth/api build
pnpm --filter @commonwealth/sdk build
pnpm --filter @commonwealth/subgraph codegen
pnpm --filter @commonwealth/subgraph build
```

## Environment Variables

### Frontend

Copy `packages/app/.env.example` to `packages/app/.env.local` or `packages/app/.env`.

Required values:

- `NEXT_PUBLIC_WALLETCONNECT_ID`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`
- `NEXT_PUBLIC_COMMONWEALTH_TOKEN_ADDRESS`
- `NEXT_PUBLIC_CONVICTION_VOTING_ADDRESS`
- `NEXT_PUBLIC_IMPACT_ATTESTATION_ADDRESS`
- `NEXT_PUBLIC_SAVINGS_CIRCLE_ADDRESS`
- `NEXT_PUBLIC_DEPIN_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_PRIVATE_CONVICTION_VOTING_ADDRESS`

Optional values:

- `NEXT_PUBLIC_STORACHA_EMAIL`

### API

Copy `packages/api/.env.example` to `packages/api/.env`.

Supported values:

- `PORT`
- `COMMONWEALTH_SEPOLIA_RPC_URL`
- `CORS_ORIGIN`

### Contracts

For fresh deployments or reseeding, configure the contracts workspace with:

- `PRIVATE_KEY`
- `SEPOLIA_RPC_URL`
- `ETHERSCAN_API_KEY`

## Production Readiness Notes

- The frontend validates contract configuration at runtime instead of assuming local demo defaults.
- Shared error normalization and action handling are used across governance, impact, savings, and DePIN flows.
- Protocol reads degrade with warnings and safe fallbacks when an RPC or index surface is partial.
- Metadata is treated as live onchain data URIs or protocol storage references, not hardcoded fixtures.
- The app tree no longer carries simulation components or placeholder-only routes.

## Deployments

### Render blueprint

`render.yaml` defines three deployable services:

- `commonwealth-api` as a Node web service
- `commonwealth-sdk-reference` as a static site
- `commonwealth-subgraph-reference` as a static site

Validate the blueprint locally:

```bash
render blueprints validate
```

The current Render CLI can validate blueprints and manage existing services, but blueprint creation itself still depends on Render project setup. Once the services exist in Render, the CLI can be used to trigger subsequent deploys.

Expected service build commands are already encoded in `render.yaml`.

### Vercel frontend

The frontend is configured for monorepo deployment through `packages/app/vercel.json`.

Typical production deployment flow:

```bash
cd packages/app
vercel deploy --prod --yes
```

The config installs dependencies from the repository root and runs `pnpm --filter @commonwealth/app build`.

## Contract Operations

Useful commands:

```bash
pnpm --filter @commonwealth/contracts run build
pnpm --filter @commonwealth/contracts run test
pnpm --filter @commonwealth/contracts run deploy
pnpm --filter @commonwealth/contracts run verify
pnpm --filter @commonwealth/contracts run seed
pnpm --filter @commonwealth/contracts run deploy:all
```

After any fresh deployment, update the frontend environment and any downstream consumers from `packages/contracts/deployments/sepolia.json`.

## Verification

Key checks completed during the hardening pass:

- frontend runtime and transaction flow hardening
- subgraph manifest and mappings rewritten to match live contracts
- subgraph build passing
- API build passing
- SDK docs export packaging completed
- subgraph static export packaging completed

## License

MIT
