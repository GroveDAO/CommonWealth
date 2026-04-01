# CommonWealth

CommonWealth is a platform for programmable collective action. It combines:

- Public conviction voting for treasury allocation
- Zama-powered private conviction voting over encrypted ballots
- Impact attestations with treasury-backed rewards
- Rotating savings circles
- DePIN data submissions with token rewards
- A Next.js web app wired directly to the deployed contracts

## What Is Live

The current deployment is already live on Sepolia and verified on Etherscan.

| Contract | Address | Explorer |
| --- | --- | --- |
| `CommonWealthToken` | `0x9a2088b06225d986EAFBeBC6b724e4e298E423ce` | https://sepolia.etherscan.io/address/0x9a2088b06225d986EAFBeBC6b724e4e298E423ce#code |
| `ConvictionVoting` | `0xCe7b7301b29CC8D00a508a2900dc5D5B900176Af` | https://sepolia.etherscan.io/address/0xCe7b7301b29CC8D00a508a2900dc5D5B900176Af#code |
| `ImpactAttestation` | `0x4344e79d2f5d660cbBC8bdDC497B86eD3951d828` | https://sepolia.etherscan.io/address/0x4344e79d2f5d660cbBC8bdDC497B86eD3951d828#code |
| `SavingsCircle` | `0x172229A5599683ff52e685A751BF87998FA6c11a` | https://sepolia.etherscan.io/address/0x172229A5599683ff52e685A751BF87998FA6c11a#code |
| `DePINRegistry` | `0x4127C5192aAf3a33813eF2FC981711659a48A028` | https://sepolia.etherscan.io/address/0x4127C5192aAf3a33813eF2FC981711659a48A028#code |
| `PrivateConvictionVoting` | `0xA1D135E125e1C1B5713478266E18d85d66273a48` | https://sepolia.etherscan.io/address/0xA1D135E125e1C1B5713478266E18d85d66273a48#code |

The deployment metadata and seeded IDs are recorded in `packages/contracts/deployments/sepolia.json`.

## Live Seed State

The current seeded Sepolia state includes:

- `3` public treasury proposals
- `3` private FHE voting proposals
- `2` impact attestation requests
- `2` savings circles
- `3` DePIN submissions

Deterministic actor wallets used for seeded activity:

- `Ade`: `0xf8eaBEED4FDD3f5E2670c3A4993198168B954393`
- `Bira`: `0xa7561FaeC008A184652E7122ef615EE279DbBE0B`
- `Chima`: `0xEBb441e85f0dD5ff2B532F3d9509FbCa2FF2289F`

## Monorepo Structure

```text
commonwealth/
├── packages/
│   ├── app/         # Next.js 15 web application
│   ├── contracts/   # Hardhat + Solidity contracts and deployment scripts
│   ├── sdk/         # TypeScript SDK and contract ABIs
│   └── subgraph/    # Existing subgraph workspace
├── package.json     # Turbo workspace orchestration
└── README.md
```

## Core Features

### 1. Treasury Governance

`ConvictionVoting` supports:

- Proposal creation with onchain data-URI metadata
- Token staking against proposals
- Time-weighted conviction accumulation
- Treasury execution when thresholds are met

### 2. Private Conviction Voting

`PrivateConvictionVoting` adds:

- Zama FHE encrypted ballot weights
- Encrypted support or opposition direction
- Public tally publication with proof-backed decryptions
- User-side ballot decryption support in the web app

### 3. Impact Attestations

`ImpactAttestation` supports:

- Evidence-backed work submissions
- Configurable review thresholds
- Treasury-funded reward claims
- Explicit attester management

### 4. Savings Circles

`SavingsCircle` supports:

- Circle creation and membership
- Fixed contribution schedules
- Rotating recipients
- Onchain state for current cycle and recipient

### 5. DePIN Marketplace

`DePINRegistry` supports:

- Metadata-backed dataset submissions
- Oracle verification
- Quality-scored rewards
- Reward claims in `CWT`

## Web App Structure

The web app is now organized as separate pages instead of a single long landing page.

| Route | Purpose |
| --- | --- |
| `/` | Overview and route hub |
| `/dashboard` | Live treasury and protocol-wide balance dashboard |
| `/governance` | Public treasury proposals and conviction staking |
| `/private-voting` | Zama-powered private conviction voting |
| `/impact` | Impact attestations and reward review |
| `/savings` | Savings circles and contribution flows |
| `/depin` | DePIN submissions and claims |

The app uses:

- `Next.js 15`
- `React 18`
- `wagmi`
- `viem`
- `RainbowKit v2`
- `@tanstack/react-query`
- `@zama-fhe/relayer-sdk`

## Branding

The web app includes a custom SVG brand mark and favicon:

- `packages/app/src/app/icon.svg`
- `packages/app/src/components/layout/IconMark.tsx`

The header now uses the logo instead of the old `CW` badge.

## Contracts Package

The contracts workspace uses Hardhat.

### Scripts

```bash
pnpm --filter @commonwealth/contracts run build
pnpm --filter @commonwealth/contracts run test
pnpm --filter @commonwealth/contracts run deploy
pnpm --filter @commonwealth/contracts run verify
pnpm --filter @commonwealth/contracts run seed
pnpm --filter @commonwealth/contracts run deploy:all
```

### Main Contracts

- `packages/contracts/src/CommonWealthToken.sol`
- `packages/contracts/src/ConvictionVoting.sol`
- `packages/contracts/src/PrivateConvictionVoting.sol`
- `packages/contracts/src/ImpactAttestation.sol`
- `packages/contracts/src/SavingsCircle.sol`
- `packages/contracts/src/DePINRegistry.sol`

### Deployment Scripts

- `packages/contracts/scripts/deploy.js`
- `packages/contracts/scripts/verify.js`
- `packages/contracts/scripts/seed.js`
- `packages/contracts/scripts/deploy-and-seed.js`

## SDK Package

The SDK exposes:

- Typed ABIs
- Client wrappers for each live contract
- Shared protocol types
- Support for the private voting contract and token contract

Build it with:

```bash
pnpm --filter @commonwealth/sdk run build
```

## Environment Setup

Copy the example files and fill in your own values if you want to redeploy or run against another environment.

```bash
cp packages/contracts/.env.example packages/contracts/.env
cp packages/app/.env.example packages/app/.env
```

### `packages/contracts/.env`

Required variables:

- `PRIVATE_KEY`
- `SEPOLIA_RPC_URL`
- `ETHERSCAN_API_KEY`

### `packages/app/.env`

Required variables:

- `NEXT_PUBLIC_WALLETCONNECT_ID`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`
- `NEXT_PUBLIC_COMMONWEALTH_TOKEN_ADDRESS`
- `NEXT_PUBLIC_CONVICTION_VOTING_ADDRESS`
- `NEXT_PUBLIC_IMPACT_ATTESTATION_ADDRESS`
- `NEXT_PUBLIC_SAVINGS_CIRCLE_ADDRESS`
- `NEXT_PUBLIC_DEPIN_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_PRIVATE_CONVICTION_VOTING_ADDRESS`

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the web app:

```bash
pnpm --filter @commonwealth/app run dev
```

Build the whole workspace:

```bash
pnpm build
```

Build only the app:

```bash
pnpm --filter @commonwealth/app run build
```

Start the production app build:

```bash
pnpm --filter @commonwealth/app run start
```

## Deploying Fresh Contracts

To deploy a fresh Sepolia stack with your own credentials:

```bash
pnpm --filter @commonwealth/contracts run deploy
pnpm --filter @commonwealth/contracts run verify
pnpm --filter @commonwealth/contracts run seed
```

Or run the combined flow:

```bash
pnpm --filter @commonwealth/contracts run deploy:all
```

After deployment:

1. Copy the new addresses from `packages/contracts/deployments/sepolia.json`
2. Update `packages/app/.env`
3. Rebuild or restart the app

## Zama / FHE Notes

Private conviction voting is implemented with Zama FHE tooling.

Current setup:

- Solidity FHE support via `@fhevm/solidity`
- Hardhat integration via `@fhevm/hardhat-plugin`
- Relayer client usage via `@zama-fhe/relayer-sdk`
- Private ballot flow exposed in the web app under `/private-voting`

The current implementation is designed for Sepolia and uses proof-backed encrypted inputs and public tally publishing.

## Verification Status

The following local checks have been run successfully against the current codebase:

- `pnpm --filter @commonwealth/contracts run build`
- `pnpm --filter @commonwealth/contracts run test`
- `pnpm --filter @commonwealth/sdk run build`
- `pnpm --filter @commonwealth/app run build`

## Notes

- The web app is wired to real live Sepolia contracts, not placeholders.
- Seed values were tuned for realistic Sepolia testnet balances.
- The app build currently succeeds with a couple of non-blocking Next.js chunk warnings during bundling.

## License

MIT
