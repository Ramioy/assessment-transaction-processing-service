# Assessment Transaction Processing Service

A payment orchestration microservice built with [NestJS](https://nestjs.com/) and [Fastify](https://fastify.dev/), following **Hexagonal Architecture** (Ports & Adapters). It acts as the intermediary between the front-end SPA and an external payment provider, handling card tokenisation, transaction creation, status polling, integrity signature generation, and webhook event validation.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Docker](#docker)
- [Design Decisions](#design-decisions)
- [License](#license)
- [Author](#author)

---

## Architecture

The codebase is organised into four distinct layers with dependencies flowing strictly inward:

```
Presentation  -->  Application  -->  Domain
                       |
                Infrastructure
```

| Layer | Location | Responsibility |
|---|---|---|
| **Domain** | `src/domain/` | Pure business entities, Zod schemas, domain errors. Zero external dependencies. |
| **Application** | `src/application/` | Use cases that orchestrate domain logic. Defines driving (input) and driven (output) port interfaces. |
| **Infrastructure** | `src/infrastructure/` | HTTP adapters for the DB Domain Service and the payment provider. |
| **Presentation** | `src/presentation/` | HTTP controllers, Zod validation pipes, request/response mapping. |
| **Shared** | `src/shared/` | Cross-cutting concerns: `Result<T,E>` type, base entity, DI tokens, guards, filters, interceptors, crypto utilities. |

Persistence is **delegated over HTTP** to `assessment-db-domain-service` (see [Design Decisions](#design-decisions)).

---

## Tech Stack

| Concern | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS 10 with Fastify adapter |
| Language | TypeScript 5 (strict mode) |
| Validation | Zod 4 (request bodies) / Joi (environment variables) |
| API Docs | Swagger / OpenAPI via `@nestjs/swagger` |
| Security | Helmet, CORS, API key guard |
| Error handling | Railway Oriented Programming — `Result<T, E>` |
| Testing | Jest with `@swc/jest` for compilation |
| Containerisation | Docker (multi-stage build, Alpine) |

---

## Prerequisites

- Node.js >= 20
- npm >= 9
- A running instance of `assessment-db-domain-service`
- Valid payment provider API keys (sandbox or production)

---

## Getting Started

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment variables**

Copy the example file for your target environment:

```bash
# Development
cp environment/development/example.env environment/development/.env

# Production
cp environment/production/example.env environment/production/.env
```

Edit the copied file and fill in the required values (see [Environment Variables](#environment-variables)).

**3. Start the application**

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The server starts on the host and port defined by `HOST` and `PORT` (defaults to `0.0.0.0:3002`).

The global route prefix follows the pattern `{API_PREFIX}/{NODE_ENV}/{API_VERSION}`, e.g. `/api/development/v1`.

---

## Environment Variables

All variables are validated at startup via Joi. The application will fail to boot if required variables are missing.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `3002` | HTTP listen port |
| `HOST` | No | `0.0.0.0` | HTTP listen address |
| `LOG_LEVEL` | No | `debug` | `error`, `warn`, `info`, `debug`, `verbose`, `silly` |
| `CORS_ENABLED` | No | `true` | Enable CORS |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins |
| `API_PREFIX` | No | `/api` | Global route prefix |
| `API_VERSION` | No | `v1` | API version segment |
| `API_KEY_ENABLED` | No | `false` | Require `x-api-key` header on protected routes |
| `API_KEY` | No | *(dev default)* | Expected API key value |
| `ENABLE_SWAGGER` | No | `true` | Serve Swagger UI at `/docs` |
| `ENABLE_HEALTH_CHECK` | No | `true` | Enable `/health` endpoint |
| `APP_NAME` | No | `transaction-processing-service` | Swagger document title |
| `APP_DESCRIPTION` | No | `Payment transaction processing microservice` | Swagger document description |
| `DB_DOMAIN_SERVICE_URL` | **Yes** | -- | Base URL of the DB Domain Service |
| `DB_DOMAIN_SERVICE_API_KEY` | **Yes** | -- | API key for the DB Domain Service |
| `PAYMENT_PROVIDER_ENVIRONMENT` | No | `sandbox` | `sandbox` or `production` |
| `PAYMENT_PROVIDER_SANDBOX_URL` | No | `https://sandbox.wompi.co/v1` | Sandbox base URL |
| `PAYMENT_PROVIDER_PRODUCTION_URL` | No | `https://production.wompi.co/v1` | Production base URL |
| `PAYMENT_PROVIDER_PUBLIC_KEY` | **Yes** | -- | Provider public key |
| `PAYMENT_PROVIDER_PRIVATE_KEY` | **Yes** | -- | Provider private key |
| `PAYMENT_PROVIDER_EVENTS_KEY` | **Yes** | -- | Webhook checksum key |
| `PAYMENT_PROVIDER_INTEGRITY_KEY` | **Yes** | -- | Transaction integrity signature key |

---

## API Reference

All routes are prefixed with `{API_PREFIX}/{NODE_ENV}/{API_VERSION}` (e.g. `/api/development/v1`).

When Swagger is enabled, interactive documentation is available at `/docs`.

### Transactions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/transactions` | API key | Create a payment transaction |
| `GET` | `/transactions/:id` | API key | Get transaction status (refreshes from provider) |

### Tokenisation

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/tokenization/cards` | API key | Tokenise a credit/debit card |

### Merchant

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/merchant/config` | API key | Get merchant acceptance token and available payment methods |

### PSE

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/pse/financial-institutions` | Public | List available PSE financial institutions |

### Webhooks

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/webhooks/payment-provider` | Public (checksum) | Receive payment provider event notifications |

#### Create Transaction Request Body

```json
{
  "reference": "order-unique-ref-001",
  "amountInCents": 50000,
  "currency": "COP",
  "paymentMethod": "CARD",
  "paymentMethodDetails": {
    "type": "CARD",
    "token": "tok_stagtest_...",
    "installments": 1
  },
  "customerEmail": "customer@example.com",
  "customerIp": "192.168.1.1"
}
```

#### Error-to-HTTP Mapping

| Domain Error | HTTP Status |
|---|---|
| `TransactionNotFoundError` | 404 Not Found |
| `DuplicateReferenceError` | 409 Conflict |
| `InvalidAmountError` | 422 Unprocessable Entity |
| `InvalidPaymentMethodError` | 422 Unprocessable Entity |
| `TokenizationFailedError` | 502 Bad Gateway |
| `TransactionCreationFailedError` | 502 Bad Gateway |
| `WebhookValidationFailedError` | 401 Unauthorized |
| `InfrastructureError` | 500 Internal Server Error |

---

## Project Structure

```
src/
├── domain/
│   ├── payment-method/         # Payment method value object (Zod schemas)
│   └── transaction/
│       ├── errors/             # Typed domain errors
│       ├── transaction.entity.ts
│       └── transaction.repository.ts
├── application/
│   └── transaction/
│       ├── ports/              # PaymentProviderPort interface
│       └── use-cases/          # 6 use cases
│           ├── create-transaction.use-case.ts
│           ├── get-transaction-status.use-case.ts
│           ├── handle-webhook-event.use-case.ts
│           ├── get-merchant-config.use-case.ts
│           ├── list-pse-institutions.use-case.ts
│           └── tokenize-card.use-case.ts
├── infrastructure/
│   ├── config/                 # Joi env validation
│   ├── db-domain-service/      # HTTP adapter for persistence
│   └── payment-provider/       # HTTP adapter for payment provider
├── presentation/
│   ├── helpers/                # Result-to-HTTP response mapping
│   ├── merchant/
│   ├── pipes/                  # ZodValidationPipe
│   ├── pse/
│   ├── tokenization/
│   ├── transaction/
│   └── webhook/
├── shared/
│   ├── constants/
│   ├── crypto/                 # SHA-256 integrity signature + webhook checksum
│   ├── errors/
│   ├── filters/                # Global HTTP exception filter
│   ├── guards/                 # API key guard + @Public decorator
│   ├── interceptors/           # Request/response logging
│   ├── base.entity.ts
│   ├── di-tokens.ts
│   └── result.ts               # Result<T, E> + ROP combinators
└── modules/                    # NestJS module wiring
```

---

## Testing

Unit tests use Jest with `@swc/jest` (full TypeScript decorator support, no `ts-jest`).

```bash
# Run unit tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage report
npm run test:cov
```

Coverage thresholds (enforced by Jest):

| Metric | Threshold |
|---|---|
| Statements | 85% |
| Branches | 80% |
| Functions | 85% |
| Lines | 85% |

HTTP adapters (`db-domain-service` and `payment-provider`) are excluded from coverage since they require live external services.

---

## Docker

The Docker setup follows a two-stage build to keep the production image lean.

### Build and run (development)

```bash
cd environment/development
cp example.env .env
# Edit .env with your values
docker compose up --build
```

### Build and run (production)

```bash
cd environment/production
cp example.env .env
# Edit .env with your values
docker compose up --build -d
```

The `docker-entrypoint.sh` script starts the compiled application directly:

```sh
#!/bin/sh
set -e
exec node dist/main
```

### Image details

| Property | Value |
|---|---|
| Base image | `node:20-alpine` |
| Exposed port | `3002` |
| Runtime user | `appuser` (non-root) |
| Build stages | `builder` (compiles TS) + `production` (runtime only) |

---

## Design Decisions

**No direct database connection.**
This service does not own a database. All persistence operations are delegated over HTTP to `assessment-db-domain-service`. This enforces bounded context isolation: the transaction processing context owns the payment logic; the DB domain service owns the data model and persistence. The HTTP adapter (`DbDomainServiceAdapter`) implements the `TransactionRepository` port, keeping the application layer unaware of the transport mechanism.

**Railway Oriented Programming for error handling.**
All operations that can fail return `Result<T, E>` instead of throwing. Exceptions are reserved for truly unexpected faults. This makes error paths explicit, type-safe, and easy to trace through the call chain without `try/catch` blocks in domain or application layers.

**SHA-256 integrity signatures.**
Every transaction carries a server-generated integrity signature computed as `SHA-256(reference + amountInCents + currency + integrityKey)`. This prevents tampering with transaction parameters and is verified by the payment provider on submission.

**Webhook checksum validation.**
Incoming webhook events from the payment provider are validated by recomputing `SHA-256(propertyValues + timestamp + eventsKey)` and comparing it to the `x-event-checksum` header. Events that fail validation are rejected with 401 before any processing occurs.

**Zod as the single validation layer.**
All request body validation is handled by `ZodValidationPipe` using the same Zod schemas that define the domain DTOs. There is no `class-validator` or manual validation alongside an existing Zod schema.

**Fastify over Express** -- Fastify is used as the HTTP adapter for lower overhead and native async support.

**SWC for test compilation** -- Jest uses `@swc/jest` instead of `ts-jest` for significantly faster test execution.

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

---

## Author

**Yoimar Moreno Bertel**

- Email: Yoimar.mb@outlook.com
- LinkedIn: [linkedin.com/in/yoimar-mb](https://www.linkedin.com/in/yoimar-mb/)
