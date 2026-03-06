# Hexagonal Architecture Documentation

Complete architectural guide for the Transaction Processing Service project.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Layer Breakdown](#layer-breakdown)
4. [Boilerplate Templates](#boilerplate-templates)
5. [Real-World Examples](#real-world-examples)
6. [Testing Strategy](#testing-strategy)
7. [Best Practices](#best-practices)

---

## Overview

This project implements **Hexagonal Architecture** (also known as **Ports & Adapters** or **Clean Architecture**) using NestJS with Fastify.

Unlike the DB Domain Service, this service **does not own a database**. All persistence is delegated over HTTP to `assessment-db-domain-service`. The payment provider is accessed through a second driven adapter.

### Core Principles

- **Independence of Framework**: Business logic is independent of NestJS
- **Testability**: Domain and application layers can be tested without the framework
- **Flexibility**: Easy to swap implementations (HTTP persistence client, payment provider)
- **Maintainability**: Clear separation of concerns
- **Scalability**: Well-defined boundaries for new features

---

## Architecture Diagram

```plaintext
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                     │
│         (HTTP Controllers, Pipes, Guards, Filters)          │
│  - TransactionController     - TokenizationController       │
│  - MerchantController        - PseController                │
│  - WebhookController         - HealthController             │
│  - ZodValidationPipe                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ (depends on)
┌──────────────────────▼──────────────────────────────────────┐
│                      APPLICATION LAYER                      │
│            (Use Cases, Orchestration, Workflows)            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CreateTransactionUseCase   GetTransactionStatusUC    │  │
│  │  HandleWebhookEventUseCase  TokenizeCardUseCase       │  │
│  │  GetMerchantConfigUseCase   ListPseInstitutionsUC     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   PORTS (Interfaces)                  │  │
│  │  ┌──────────────────────┐  ┌───────────────────────┐  │  │
│  │  │ Driven Ports         │  │ Driven Ports          │  │  │
│  │  │ (Persistence)        │  │ (External Payment)    │  │  │
│  │  │ - TransactionRepo    │  │ - PaymentProviderPort │  │  │
│  │  └──────────────────────┘  └───────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ (depends on)
┌──────────────────────▼──────────────────────────────────────┐
│                        DOMAIN LAYER                         │
│          (Business Rules, Entities, Domain Errors)          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Transaction (Entity)       PaymentMethod (Value Obj) │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  TransactionNotFoundError   DuplicateReferenceError   │  │
│  │  InvalidAmountError         InvalidPaymentMethodError │  │
│  │  TokenizationFailedError    TransactionCreationFailed │  │
│  │  WebhookValidationFailedError                         │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ (NO DEPENDENCIES - PURE LOGIC)
       ┌───────────────┴───────────────┐
       │                               │
┌──────▼────────────┐ ┌────────────────▼───┐
│ INFRASTRUCTURE    │ │ SHARED UTILITIES   │
│ (Driven Adapters) │ │                    │
├───────────────────┤ ├────────────────────┤
│ HTTP Persistence: │ │ - BaseEntity       │
│ - DbDomainService │ │ - Result<T,E>      │
│   Adapter         │ │ - LoggingIntercept │
│                   │ │ - HttpErrorFilter  │
│ Payment Provider: │ │ - ApiKeyGuard      │
│ - PaymentProvider │ │ - DI tokens        │
│   Adapter         │ │ - Crypto utils     │
│                   │ │   (integrity sig,  │
│ Config:           │ │    webhook chksum) │
│ - env.validation  │ │                    │
│ - provider config │ └────────────────────┘
│ - db service cfg  │
│                   │
│ Mappers:          │
│ - ProviderTxn     │
│   Mapper          │
└───────────────────┘

                      ▲
                      │
               Dependency Flow
            (Points Inward Only)
```

---

## Layer Breakdown

### 1. Domain Layer (`src/domain/`)

**Responsibility**: Pure business logic independent of frameworks

#### Structure

```
src/domain/
├── transaction/
│   ├── transaction.entity.ts          # Entity + Zod schemas + inferred DTOs
│   ├── transaction.repository.ts      # Repository port interface
│   └── errors/
│       ├── transaction-not-found.error.ts
│       ├── duplicate-reference.error.ts
│       ├── invalid-amount.error.ts
│       ├── invalid-payment-method.error.ts
│       ├── tokenization-failed.error.ts
│       ├── transaction-creation-failed.error.ts
│       ├── webhook-validation-failed.error.ts
│       └── index.ts                   # Discriminated union of all errors
│
└── payment-method/
    └── payment-method.value-object.ts # Zod discriminated union (5 payment types)
```

#### Key Characteristics

- Zero external dependencies: No NestJS, no HTTP, no I/O libraries
- Business rules only: Validation, entity creation, status transitions
- Immutability: `Transaction` uses private constructor + static factories (`create`, `fromPersistence`, `applyStatusUpdate`)
- Zod schemas co-located: Each entity file contains `transactionSchema`, `createTransactionSchema`, `updateTransactionSchema` with inferred DTO types
- Result type: `create()` returns `Result<Transaction, InvalidAmountError | InvalidPaymentMethodError>`
- Value Objects: `PaymentMethod` as Zod discriminated union (CARD, NEQUI, PSE, BANCOLOMBIA_TRANSFER, BANCOLOMBIA_QR)
- UUID-based: BaseEntity uses `z.string().uuid()`, not auto-increment

#### Anti-Patterns

- Importing from Application, Infrastructure, or Presentation
- Using NestJS decorators or features
- HTTP requests or external service calls
- Framework-specific error handling
- Throwing exceptions for business logic

---

### 2. Application Layer (`src/application/`)

**Responsibility**: Orchestrate domain logic and define contracts

#### Structure

```
src/application/
└── transaction/
    ├── ports/
    │   └── payment-provider.port.ts   # PaymentProviderPort interface + DTOs
    │
    └── use-cases/
        ├── create-transaction.use-case.ts
        ├── get-transaction-status.use-case.ts
        ├── handle-webhook-event.use-case.ts
        ├── tokenize-card.use-case.ts
        ├── get-merchant-config.use-case.ts
        └── list-pse-institutions.use-case.ts
```

#### Key Characteristics

- Use Case Per Feature: One use case = one user action
- Depends on Ports: `TransactionRepository` and `PaymentProviderPort`, not concrete implementations
- Two Driven Ports: Persistence (`TransactionRepository`) + External API (`PaymentProviderPort`)
- Result pattern: Returns `Result<T, DomainError>` instead of throwing
- No framework code: Plain TypeScript classes with NestJS `@Injectable()` only

#### Port Types

**Driven Ports** (How the app uses external systems):
- `TransactionRepository`: Data persistence via HTTP to DB Domain Service
- `PaymentProviderPort`: Card tokenization, transaction creation, status queries, merchant config, PSE institutions

---

### 3. Infrastructure Layer (`src/infrastructure/`)

**Responsibility**: Implement technical details and external integrations

#### Structure

```
src/infrastructure/
├── db-domain-service/
│   ├── db-domain-service.config.ts    # URL + API key configuration
│   └── db-domain-service.adapter.ts   # HTTP adapter implementing TransactionRepository
│
├── payment-provider/
│   ├── payment-provider.config.ts     # Environment-based URL + keys configuration
│   ├── payment-provider.adapter.ts    # HTTP adapter implementing PaymentProviderPort
│   └── mappers/
│       └── provider-transaction.mapper.ts
│
└── config/
    └── env-validation.ts              # Joi environment schema validation
```

#### Key Characteristics

- Two HTTP Adapters: `DbDomainServiceAdapter` (persistence) + `PaymentProviderAdapter` (payment API)
- No direct database: Persistence is delegated over HTTP to `assessment-db-domain-service`
- Native fetch: Uses Node.js built-in `fetch` instead of Axios
- Mapper pattern: `ProviderTransactionMapper` converts between application DTOs and provider API shapes
- Swappable: Can replace either adapter without touching domain or application layers

#### Adapter Pattern

```typescript
// Driven Port (Domain Layer)
export interface TransactionRepository {
  save(tx: Transaction): Promise<Result<Transaction, InfrastructureError>>;
  findById(id: string): Promise<Result<Transaction | null, InfrastructureError>>;
  findByReference(ref: string): Promise<Result<Transaction | null, InfrastructureError>>;
  findByProviderId(id: string): Promise<Result<Transaction | null, InfrastructureError>>;
  updateStatus(...): Promise<Result<Transaction, InfrastructureError>>;
}

// Adapter (Infrastructure Layer)
@Injectable()
export class DbDomainServiceAdapter implements TransactionRepository {
  constructor(private readonly config: DbDomainServiceConfig) {}

  async save(tx: Transaction): Promise<Result<Transaction, InfrastructureError>> {
    // HTTP POST to DB Domain Service
  }
}

// Module wiring
@Module({
  providers: [
    { provide: DI_TOKENS.TRANSACTION_REPOSITORY, useClass: DbDomainServiceAdapter },
  ],
})
export class DbDomainServiceModule {}
```

---

### 4. Presentation Layer (`src/presentation/`)

**Responsibility**: Handle HTTP requests, validation, and responses

#### Structure

```
src/presentation/
├── health/
│   └── health.controller.ts           # GET /health (public)
│
├── transaction/
│   └── transaction.controller.ts      # POST /transactions, GET /transactions/:id
│
├── tokenization/
│   └── tokenization.controller.ts     # POST /tokenization/cards
│
├── merchant/
│   └── merchant.controller.ts         # GET /merchant/config
│
├── pse/
│   └── pse.controller.ts             # GET /pse/financial-institutions (public)
│
├── webhook/
│   └── webhook.controller.ts          # POST /webhooks/payment-provider (public)
│
├── helpers/
│   └── result-to-response.helper.ts   # unwrapResult: Result<T,E> -> HTTP response/exception
│
└── pipes/
    └── zod-validation.pipe.ts         # Zod-based request body validation
```

#### Key Characteristics

- Thin layer: Controllers only map HTTP <-> use case calls
- Zod validation: Request bodies validated with `ZodValidationPipe` (not class-validator)
- Result unwrapping: `unwrapResult()` converts `Result<T, DomainError>` to HTTP responses/exceptions
- Swagger annotations: Full `@ApiTags`, `@ApiOperation`, `@ApiResponse` coverage
- Security: `ApiKeyGuard` (global, with `@Public()` decorator to bypass per-route)

#### API URL Format

```
http://{host}:{port}{API_PREFIX}/{NODE_ENV}/{API_VERSION}/{resource}

# Examples:
http://localhost:3002/api/development/v1/transactions
http://localhost:3002/api/development/v1/tokenization/cards
http://localhost:3002/api/development/v1/merchant/config
```

Configured via environment variables: `API_PREFIX` (default `/api`), `NODE_ENV`, `API_VERSION` (default `v1`).

---

### 5. Shared Layer (`src/shared/`)

**Responsibility**: Cross-cutting concerns used across all layers

#### Structure

```
src/shared/
├── base.entity.ts                     # BaseEntity (UUID) + Zod baseSchema
├── result.ts                          # Result<T,E> + ok/err/map/flatMap/asyncFlatMap helpers
├── di-tokens.ts                       # TRANSACTION_REPOSITORY + PAYMENT_PROVIDER tokens
│
├── constants/
│   └── transaction.constants.ts       # VALID_STATUSES, VALID_PAYMENT_METHODS, DEFAULT_CURRENCY
│
├── crypto/
│   ├── integrity-signature.ts         # SHA-256 integrity signature generation
│   └── webhook-checksum.ts            # SHA-256 webhook checksum validation
│
├── errors/
│   └── infrastructure.error.ts        # InfrastructureError wrapper
│
├── filters/
│   └── http-exception.filter.ts       # Global HTTP exception -> JSON error response
│
├── guards/
│   ├── api-key.guard.ts               # x-api-key header guard
│   └── public.decorator.ts            # @Public() decorator to skip guard
│
└── interceptors/
    └── logging.interceptor.ts         # HTTP request/response logging
```

#### Key Characteristics

- Result<T,E>: Functional error handling via Railway Oriented Programming
- BaseEntity: UUID-based (`z.string().uuid()`), shared Zod `baseSchema` (id, createdAt, updatedAt)
- DI tokens: String-based tokens centralised in `di-tokens.ts` (TRANSACTION_REPOSITORY, PAYMENT_PROVIDER)
- Crypto utilities: SHA-256 integrity signature + webhook checksum validation (unique to this service)
- Framework agnostic: `result.ts`, `base.entity.ts`, crypto utils have zero NestJS dependency

---

## Boilerplate Templates

### Domain Entity Boilerplate

```typescript
// src/domain/transaction/transaction.entity.ts
import { z } from 'zod';
import { ok, err, type Result } from '@shared/result';
import { BaseEntity, baseSchema } from '@shared/base.entity';
import { InvalidAmountError } from './errors/invalid-amount.error';

export class Transaction extends BaseEntity {
  private constructor(
    id: string,
    readonly reference: string,
    readonly amountInCents: number,
    // ...
  ) {
    super(id);
  }

  static create(input: TransactionFactoryInput): Result<Transaction, InvalidAmountError> {
    if (input.amountInCents <= 0) {
      return err(new InvalidAmountError(input.amountInCents));
    }
    return ok(new Transaction(/* ... */));
  }

  static fromPersistence(raw: TransactionDto): Transaction {
    return new Transaction(/* ... */);
  }

  applyStatusUpdate(status: string, ...): Transaction {
    return new Transaction(/* ...this with updated fields */);
  }
}

export const transactionSchema = baseSchema.extend({ /* fields */ });
export const createTransactionSchema = transactionSchema.omit({ id: true, createdAt: true, /* ... */ });
export const updateTransactionSchema = transactionSchema.pick({ status: true, /* ... */ }).partial();

export type TransactionDto = z.infer<typeof transactionSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
```

### Domain Error Boilerplate

```typescript
// src/domain/transaction/errors/transaction-not-found.error.ts
export class TransactionNotFoundError {
  readonly code = 'TRANSACTION_NOT_FOUND' as const;
  readonly message: string;

  constructor(readonly id: string) {
    this.message = `Transaction with id "${id}" not found.`;
  }
}
```

### Port/Interface Boilerplate

```typescript
// src/domain/transaction/transaction.repository.ts
import type { Result } from '@shared/result';
import type { InfrastructureError } from '@shared/errors/infrastructure.error';
import type { Transaction } from './transaction.entity';

export interface TransactionRepository {
  save(tx: Transaction): Promise<Result<Transaction, InfrastructureError>>;
  findById(id: string): Promise<Result<Transaction | null, InfrastructureError>>;
  findByReference(reference: string): Promise<Result<Transaction | null, InfrastructureError>>;
  updateStatus(id: string, ...): Promise<Result<Transaction, InfrastructureError>>;
}
```

### Use Case Boilerplate

```typescript
// src/application/transaction/use-cases/create-transaction.use-case.ts
import { Injectable, Inject } from '@nestjs/common';
import { DI_TOKENS } from '@shared/di-tokens';
import { ok, err, type Result } from '@shared/result';
import type { TransactionRepository } from '@domain/transaction/transaction.repository';
import type { PaymentProviderPort } from '../ports/payment-provider.port';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(DI_TOKENS.TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
    @Inject(DI_TOKENS.PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  async execute(dto: CreateTransactionRequestDto): Promise<Result<TransactionDto, TransactionError>> {
    // 1. Compute integrity signature
    // 2. Create domain entity (validated)
    // 3. Save to DB Domain Service via HTTP
    // 4. Get merchant acceptance token
    // 5. Submit to payment provider
    // 6. Update status from provider response
    // 7. Return result
  }
}
```

### Controller Boilerplate

```typescript
// src/presentation/transaction/transaction.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe';
import { unwrapResult } from '@presentation/helpers/result-to-response.helper';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionController {
  constructor(private readonly createTransactionUseCase: CreateTransactionUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payment transaction' })
  async create(
    @Body(new ZodValidationPipe(createTransactionRequestSchema)) dto: CreateTransactionRequestDto,
  ) {
    return unwrapResult(await this.createTransactionUseCase.execute(dto));
  }
}
```

### Module Boilerplate (Dependency Injection)

```typescript
// src/modules/transaction.module.ts
import { Module } from '@nestjs/common';
import { DI_TOKENS } from '@shared/di-tokens';

@Module({
  imports: [DbDomainServiceModule, PaymentProviderModule],
  controllers: [
    TransactionController,
    TokenizationController,
    MerchantController,
    PseController,
    WebhookController,
  ],
  providers: [
    CreateTransactionUseCase,
    GetTransactionStatusUseCase,
    HandleWebhookEventUseCase,
    TokenizeCardUseCase,
    GetMerchantConfigUseCase,
    ListPseInstitutionsUseCase,
  ],
})
export class TransactionModule {}
```

---

## Real-World Examples

### Example 1: Create Transaction Flow

```
1. HTTP Request: POST /api/development/v1/transactions
   {
     "reference": "order-001",
     "amountInCents": 50000,
     "currency": "COP",
     "paymentMethod": "CARD",
     "paymentMethodDetails": { "type": "CARD", "token": "tok_...", "installments": 1 },
     "customerEmail": "customer@example.com",
     "customerIp": "192.168.1.1"
   }
   |
2. ApiKeyGuard validates x-api-key header
   |
3. TransactionController.create(dto)
   - ZodValidationPipe validates body against createTransactionRequestSchema
   |
4. CreateTransactionUseCase.execute(dto)
   - Computes SHA-256 integrity signature
   - Calls Transaction.create() -> validates amount + payment method
   - Calls TransactionRepository.save() -> HTTP POST to DB Domain Service
   - Calls PaymentProviderPort.getMerchantConfig() -> gets acceptance token
   - Calls PaymentProviderPort.createTransaction() -> submits to provider
   - Calls TransactionRepository.updateStatus() -> persists provider response
   |
5. All operations return Result<T, E> — no exceptions in the chain
   |
6. unwrapResult(result) -> returns transaction DTO or throws HttpException
   |
7. HTTP Response: 201 Created
   {
     "id": "550e8400-...",
     "providerId": "12345-prov",
     "reference": "order-001",
     "amountInCents": 50000,
     "currency": "COP",
     "status": "PENDING",
     "paymentMethod": "CARD",
     "customerEmail": "customer@example.com",
     "signature": "abc123...",
     "createdAt": "2026-03-06T00:00:00.000Z",
     "updatedAt": "2026-03-06T00:00:00.000Z"
   }
```

### Example 2: Webhook Event Flow

```
1. HTTP Request: POST /api/development/v1/webhooks/payment-provider
   Headers: x-event-checksum: <sha256-hash>
   Body: {
     "data": { "transaction": { "id": "12345", "status": "APPROVED" } },
     "signature": { "properties": ["data.transaction.id", "data.transaction.status"] },
     "timestamp": 1709683200
   }
   |
2. @Public() decorator bypasses ApiKeyGuard
   |
3. WebhookController.handle(checksum, body)
   - ZodValidationPipe validates body structure
   - Extracts property values from data using dot-notation paths
   - Builds WebhookEventInput
   |
4. HandleWebhookEventUseCase.execute(input)
   - Recomputes SHA-256(propertyValues + timestamp + eventsKey)
   - Compares with x-event-checksum header
   - If mismatch -> returns err(WebhookValidationFailedError) -> HTTP 401
   - Finds transaction by providerId via repository
   - Updates transaction status
   |
5. HTTP Response: 200 OK (updated transaction)
```

### Example 3: Get Transaction Status Flow

```
1. HTTP Request: GET /api/development/v1/transactions/550e8400-...
   |
2. GetTransactionStatusUseCase.execute(id)
   - Finds transaction via TransactionRepository.findById()
   - If not found -> returns err(TransactionNotFoundError) -> HTTP 404
   - Queries PaymentProviderPort.getTransactionStatus(providerId)
   - If provider status differs -> updates in DB Domain Service
   |
3. unwrapResult -> HTTP 200 with refreshed Transaction
```

---

## Testing Strategy

### Domain Layer Testing (Unit Tests)

```typescript
// test/unit/domain/transaction/transaction.entity.spec.ts
describe('Transaction Entity', () => {
  it('should create a valid transaction', () => {
    const result = Transaction.create({
      id: '550e8400-...', reference: 'ref-001',
      amountInCents: 50000, currency: 'COP',
      paymentMethod: 'CARD', customerEmail: 'test@example.com',
      customerIp: null, signature: 'sig-hash',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('PENDING');
  });

  it('should return InvalidAmountError for zero amount', () => {
    const result = Transaction.create({ ...validInput, amountInCents: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidAmountError);
  });
});
```

### Application Layer Testing (Use Case Tests)

```typescript
// test/unit/application/transaction/use-cases/create-transaction.use-case.spec.ts
describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let mockRepository: jest.Mocked<TransactionRepository>;
  let mockPaymentProvider: jest.Mocked<PaymentProviderPort>;

  beforeEach(() => {
    mockRepository = { save: jest.fn(), findById: jest.fn(), /* ... */ };
    mockPaymentProvider = {
      createTransaction: jest.fn(),
      getMerchantConfig: jest.fn(),
      /* ... */
    };
    useCase = new CreateTransactionUseCase(mockRepository, mockPaymentProvider);
  });

  it('should return ok with transaction when creation succeeds', async () => {
    mockRepository.save.mockResolvedValue(ok(transaction));
    mockPaymentProvider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));
    mockPaymentProvider.createTransaction.mockResolvedValue(ok(providerResponse));
    mockRepository.updateStatus.mockResolvedValue(ok(updatedTransaction));

    const result = await useCase.execute(validDto);
    expect(result.ok).toBe(true);
  });

  it('should return err(DuplicateReferenceError) when reference exists', async () => {
    mockRepository.findByReference.mockResolvedValue(ok(existingTransaction));

    const result = await useCase.execute(validDto);
    expect(result.ok).toBe(false);
  });
});
```

---

## Best Practices

### 1. Dependency Injection

Use DI tokens from `di-tokens.ts`:
```typescript
@Module({
  providers: [
    { provide: DI_TOKENS.TRANSACTION_REPOSITORY, useClass: DbDomainServiceAdapter },
    { provide: DI_TOKENS.PAYMENT_PROVIDER, useClass: PaymentProviderAdapter },
  ],
})
```

Do not use magic strings or create instances manually.

### 2. Error Handling with Result Type

Return `Result<T, DomainError>` from use cases:
```typescript
async execute(id: string): Promise<Result<Transaction, TransactionNotFoundError>> {
  const found = await this.repo.findById(id);
  if (!found.ok) return found;
  if (!found.value) return err(new TransactionNotFoundError(id));
  return ok(found.value);
}
```

Never throw domain errors from use cases.

### 3. HTTP Persistence Delegation

All data storage goes through the DB Domain Service HTTP API:
```typescript
// In DbDomainServiceAdapter:
async save(tx: Transaction): Promise<Result<Transaction, InfrastructureError>> {
  return fromPromise(
    fetch(`${this.baseUrl}/payment-transactions`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
    (e) => new InfrastructureError('Failed to save transaction', e),
  );
}
```

Never access a database directly from this service.

### 4. Validation

Validate at the HTTP boundary with Zod:
```typescript
@Body(new ZodValidationPipe(createTransactionRequestSchema)) dto: CreateTransactionRequestDto
```

Do not validate inside use cases for HTTP-level concerns.

### 5. Crypto Utilities

Integrity signature (prevents transaction parameter tampering):
```typescript
// SHA-256(reference + amountInCents + currency + integrityKey)
const signature = generateIntegritySignature(reference, amountInCents, currency, integrityKey);
```

Webhook checksum (validates provider events):
```typescript
// SHA-256(propertyValues + timestamp + eventsKey)
const isValid = verifyWebhookChecksum(propertyValues, timestamp, eventsKey, receivedChecksum);
```

### 6. Configuration Management

Externalise all configuration via environment variables:
```bash
# environment/development/.env
NODE_ENV=development
PORT=3002
DB_DOMAIN_SERVICE_URL=http://localhost:3000/api/development/v1
PAYMENT_PROVIDER_PUBLIC_KEY=pub_stagtest_...
```

Never hardcode values in source files.

### 7. Logging

Log at HTTP boundaries via the interceptor:
```typescript
// LoggingInterceptor logs: METHOD URL STATUS - Xms for every request
// Controllers and use cases do not need manual per-request logging
```

---

## File Organization Checklist

When adding a new feature, follow this checklist:

### Domain Layer
- [ ] Create entity: `src/domain/<feature>/<feature>.entity.ts` (with Zod schema + types co-located)
- [ ] Create domain errors if needed: `src/domain/<feature>/errors/<error-name>.error.ts`
- [ ] Create repository port: `src/domain/<feature>/<feature>.repository.ts`
- [ ] Update exports: `src/domain/<feature>/errors/index.ts`

### Application Layer
- [ ] Create driven port (if external API): `src/application/<feature>/ports/<port-name>.port.ts`
- [ ] Create use cases: `src/application/<feature>/use-cases/<action>.use-case.ts`

### Infrastructure Layer
- [ ] Create HTTP adapter for persistence: `src/infrastructure/db-domain-service/<feature>.adapter.ts`
- [ ] Create HTTP adapter for external API (if needed): `src/infrastructure/<provider>/<provider>.adapter.ts`
- [ ] Create mappers if needed: `src/infrastructure/<provider>/mappers/<entity>.mapper.ts`

### Presentation Layer
- [ ] Create controller: `src/presentation/<feature>/<feature>.controller.ts`
- [ ] Define Zod request schemas in controller file or separate file

### Module Setup
- [ ] Create module: `src/modules/<feature>.module.ts`
- [ ] Wire DI: use cases + adapters (via `DI_TOKENS`)
- [ ] Import module in `AppModule`

### Add DI Token
- [ ] Add new token to `src/shared/di-tokens.ts`
