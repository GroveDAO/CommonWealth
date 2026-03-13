# CommonWealth

A unified protocol for programmable collective action — where communities fund, govern, and grow together onchain.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build smart contracts
cd packages/contracts && forge build

# Run contract tests
cd packages/contracts && forge test -vv

# Start development server
pnpm dev

# Build all packages
pnpm build
```

## Architecture

```
commonwealth/
├── packages/
│   ├── contracts/     # Foundry — Solidity 0.8.24
│   ├── subgraph/      # The Graph AssemblyScript
│   ├── sdk/           # TypeScript SDK (viem + wagmi)
│   └── app/           # Next.js 14 App Router
```

## Contracts

| Contract | Description |
|---|---|
| `ConvictionVoting` | Time-weighted governance with conviction mechanism |
| `ImpactAttestation` | EAS-compatible retroactive funding with attester quorum |
| `SavingsCircle` | Digital ROSCA — rotating savings & credit association |
| `DePINRegistry` | Oracle-verified data contributions with tier rewards |

## Sponsor Integrations

| Sponsor | Integration |
|---|---|
| **Filecoin** | CID-based metadata & proof storage for proposals, attestations, and data submissions |
| **NEAR** | Chain abstraction layer for cross-chain governance participation |
| **Starknet** | ZK voting module for private yet verifiable vote casting |
| **Lit Protocol** | Access gating for DePIN data streams via programmable conditions |

## Environment Setup

Copy `.env.example` files in each package:

```bash
cp packages/contracts/.env.example packages/contracts/.env
cp packages/app/.env.example packages/app/.env.local
```

## License

MIT
