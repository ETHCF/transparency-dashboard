# Transparency Dashboard Frontend

React + TypeScript frontend for the Transparency Dashboard. Built with Vite, TanStack Router/Query, Radix UI, and Wagmi. The app renders a public transparency dashboard plus authenticated admin tools backed by the API defined in `openapi.yaml`.

## Getting Started

```bash
yarn install
yarn dev
```

Environment variables (see `.env.sample`) configure the API base URL, wallet connectors, and feature flags.

Key scripts:

- `yarn dev` – start Vite dev server
- `yarn build` – production build with type-checking
- `yarn lint` – run ESLint
- `yarn test` – run Vitest unit tests

## Runtime Configuration

The frontend reads runtime configuration from either `import.meta.env` variables (`VITE_API_BASE_URL`, `VITE_CHAIN_IDS`, etc.) or a `window.__APP_CONFIG__` object injected at deploy time. Configuration determines API base URLs, supported EVM chains, and feature flags (receipts, audit log export).

## Project Structure

```
src/
├── components/      Reusable UI building blocks (layout, tables, forms, dialogs)
├── routes/          TanStack Router file-based routes for public + admin views
├── services/        API clients, query hooks, and mappers
├── stores/          Zustand client state (auth, UI)
├── types/           API DTOs and domain models
├── utils/           Formatting helpers and shared utilities
└── providers/       Application-level providers (config, Wagmi, Query)
```

## Testing

Unit tests live alongside source modules (see `src/utils/format.test.ts`). Run `yarn test` for the suite. Extend coverage with component tests using Testing Library as additional features are implemented.

## Authentication

Admin routes are guarded in the router and require a successful SIWE + JWT exchange:

1. Wallet connects via Wagmi connectors
2. Client fetches challenge from `/auth/challenge/{address}`
3. Wallet signs challenge, JWT returned via `/auth/login`
4. JWT stored in the auth store and attached to subsequent API requests

## Feature Flags

The API can disable receipts or other features. Frontend reads `config.features` to hide upload UIs while keeping read views operational.
