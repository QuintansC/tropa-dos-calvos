---
name: backend-express-prisma
description: Build clean Node.js backends with Express and Prisma using repository boundaries, Zod validation, use-case classes, dependency injection, and database-agnostic data access. Use when creating or modifying Express APIs, Prisma repositories, backend modules, controllers, routes, use cases, entities, validation schemas, or tests for Node.js services.
---

# Backend Express Prisma

Use this skill for backend modules that need maintainable Express and Prisma architecture.

## Spec Gate

Before generating code for a backend module:

1. Check for `docs/specs/{module}.spec.md`.
2. If the spec exists, read it completely and follow its business rules and API contracts.
3. If it does not exist, tell the user and proceed only when the requested scope is clearly exploratory or the user asked for implementation anyway.
4. Check `docs/architecture/target-structure.md` when present.
5. Check project root conventions such as `CLAUDE.md`, `AGENTS.md`, or existing backend files when present.

When implementing a business rule from a spec, reference it close to the use-case logic:

```javascript
// Implements BR-003: Installment value is auto-calculated when omitted.
const installmentValue = data.installmentValue > 0
  ? data.installmentValue
  : data.totalValue / data.installments;
```

## Architecture Rules

- Keep Prisma access inside repository implementations.
- Inject repositories into use cases through constructors.
- Keep use cases free of Express request/response objects.
- Use Zod schemas for entity and request validation.
- Avoid raw SQL unless the user explicitly accepts a database-specific implementation.
- Prefer database-agnostic Prisma Client APIs for easier PostgreSQL/MySQL migration.
- Put cross-cutting error handling in middleware instead of local controller `try/catch` blocks.

## Target Structure

```text
apps/backend/src/
+-- config/         # Express setup, Prisma client, env, DI container
+-- entities/       # Zod schemas and domain rules
+-- use-cases/      # Pure business logic grouped by module
+-- repositories/
|   +-- contracts/  # Abstract interfaces
|   +-- prisma/     # Prisma implementations
|   +-- in-memory/  # Test implementations
+-- controllers/    # HTTP layer
+-- middleware/     # Auth, validation, error handling
+-- routes/         # Express routing definitions
```

Mirror the local project structure if it already has a different established layout.

## Implementation Pattern

Entity:

```javascript
const { z } = require("zod");

const DebtSchema = z.object({
  creditor: z.string().min(1),
  totalValue: z.number().nonnegative(),
  installments: z.number().int().positive(),
  type: z.enum(["loan", "credit_card", "recurring"]).default("loan"),
});

function calculateInstallmentValue(debt) {
  if (debt.installmentValue > 0) return debt.installmentValue;
  return debt.totalValue / Math.max(1, debt.installments);
}

module.exports = { DebtSchema, calculateInstallmentValue };
```

Use case:

```javascript
class UpsertDebt {
  constructor(debtRepository) {
    this.debtRepository = debtRepository;
  }

  async execute(debtData, userId) {
    if (debtData.id) {
      return this.debtRepository.update(debtData.id, debtData);
    }

    return this.debtRepository.create({ ...debtData, userId });
  }
}

module.exports = { UpsertDebt };
```

Controller:

```javascript
class DebtController {
  constructor(useCases) {
    this.useCases = useCases;
  }

  async upsert(req, res) {
    const data = DebtSchema.parse(req.body);
    const result = await this.useCases.upsertDebt.execute(data, req.userId);
    res.status(200).json(result);
  }
}

module.exports = { DebtController };
```

## Quality Bar

- Keep functions focused and names intention-revealing.
- Validate `body`, `params`, and `query` before calling use cases.
- Add in-memory repositories when they materially improve tests.
- Cover business rules in use-case tests, not only route tests.
- Avoid mixing persistence, validation, and HTTP concerns in one module.
