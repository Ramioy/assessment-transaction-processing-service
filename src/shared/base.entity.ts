import { z } from 'zod';

// ─────────────────────────────────────────────
//  Base Entity
// ─────────────────────────────────────────────
export abstract class BaseEntity {
  protected constructor(readonly id: string) {}
}

// ─────────────────────────────────────────────
//  Base Zod Schema  (reusable fragment)
// ─────────────────────────────────────────────
export const baseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
