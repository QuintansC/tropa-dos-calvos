---
name: backend-express-prisma
description: Guidelines for generating Node.js backend code using Express and Prisma, adhering to Clean Code, SOLID principles, and preparing the architecture for a seamless database migration.
---

# Backend Development Guidelines

You are an expert Node.js software architect. Your goal is to generate clean, testable, and decoupled code using Express and Prisma.

## 0. Spec-Driven Gate (OBRIGATORIO)

**ANTES de gerar qualquer codigo para um modulo:**

1. Verificar se existe spec em `docs/specs/{modulo}.spec.md`
2. Se existir: LER a spec inteira antes de escrever codigo. Seguir as regras BR-* e os contratos de API definidos.
3. Se nao existir: AVISAR o usuario e sugerir rodar `/spec {modulo}` primeiro
4. Consultar `docs/architecture/target-structure.md` para saber a estrutura de pastas correta
5. Consultar `CLAUDE.md` na raiz para convencoes e tech debt conhecido

**Ao gerar use-cases**, referenciar as regras da spec:
```javascript
// Implements BR-003: Installment value is auto-calculated when not provided
const installmentValue = data.installmentValue > 0
  ? data.installmentValue
  : data.totalValue / data.installments;
```

## 1. Architecture & Database Independence

- **Repository Pattern:** All data access and Prisma mutations must be strictly isolated inside repository classes.
- **Dependency Inversion:** Use Cases must receive their repositories via constructor injection (depending on abstractions/interfaces), never by instantiating Prisma directly inside the business logic.
- **Database Agnosticism:** Avoid database-specific raw SQL queries. Stick strictly to the standard Prisma Client API to guarantee a seamless future migration to PostgreSQL or MySQL.
- **Entity Validation:** All domain validation uses Zod schemas defined in `entities/`. Never validate inside repositories.

## 2. Directory Structure (Target)

```text
apps/backend/src/
├── config/         # Express setup, Prisma client, env, DI container
├── entities/       # Zod schemas + domain rules (one file per entity)
├── use-cases/      # Pure business logic grouped by module
│   └── {module}/   # One file per operation
├── repositories/
│   ├── contracts/  # Abstract interfaces
│   ├── prisma/     # Prisma implementations
│   └── in-memory/  # In-memory implementations for testing
├── controllers/    # HTTP Layer (parse request, invoke use-case, send response)
├── middleware/      # Auth, validation, error handling
└── routes/         # Express routing definitions
```

## 3. Code & Express Quality Standards

- **Single Responsibility (SRP):** Functions must do one thing only and should ideally stay under 20 lines.
- **Centralized Error Handling:** Never use unhandled `try/catch` blocks inside controllers. Use a global error middleware (e.g., via `express-async-errors`) and throw custom operational errors (e.g., `AppError`).
- **Input Validation:** Always validate `req.body`, `req.params`, and `req.query` using Zod schemas from `entities/` or `schemas/` before passing data to use cases.
- **Clean Naming:** Use clear, intention-revealing names (e.g., `debtRepository` instead of `dr`).

## 4. Standard Implementation Pattern

### Entity (Zod Schema + Domain Rules)
```javascript
// entities/debt.js
const { z } = require('zod');

const DebtSchema = z.object({
  creditor: z.string().min(1),
  totalValue: z.number().nonnegative(),
  installments: z.number().int().positive(),
  type: z.enum(['loan', 'credit_card', 'recurring']).default('loan'),
  // ...
});

function calculateInstallmentValue(debt) {
  if (debt.installmentValue > 0) return debt.installmentValue;
  return debt.totalValue / Math.max(1, debt.installments);
}

module.exports = { DebtSchema, calculateInstallmentValue };
```

### Repository Contract
```javascript
// repositories/contracts/debt-repository.js
class IDebtRepository {
  async create(data) { throw new Error("Not implemented"); }
  async findById(id, userId) { throw new Error("Not implemented"); }
  async findAllByUser(userId) { throw new Error("Not implemented"); }
  async update(id, data) { throw new Error("Not implemented"); }
  async delete(id, userId) { throw new Error("Not implemented"); }
}

module.exports = { IDebtRepository };
```

### Prisma Implementation
```javascript
// repositories/prisma/prisma-debt-repository.js
const prisma = require('../../config/prisma');

class PrismaDebtRepository {
  async create(data) {
    return prisma.debt.create({ data });
  }
  async findById(id, userId) {
    return prisma.debt.findFirst({ where: { id, userId } });
  }
  // ...
}

module.exports = { PrismaDebtRepository };
```

### Use Case (Pure Business Logic)
```javascript
// use-cases/debts/upsert-debt.js
const { AppError } = require('../../middleware/app-error');

class UpsertDebt {
  constructor(debtRepository) {
    this.debtRepository = debtRepository;
  }

  async execute(debtData, userId) {
    // BR-001: Creditor name is required
    // BR-002: Total value must be non-negative
    // (validation already done by Zod in controller)

    if (debtData.id) {
      return this.debtRepository.update(debtData.id, debtData);
    }
    return this.debtRepository.create({ ...debtData, userId });
  }
}

module.exports = { UpsertDebt };
```

### Controller
```javascript
// controllers/debt-controller.js
const { DebtSchema } = require('../entities/debt');

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
