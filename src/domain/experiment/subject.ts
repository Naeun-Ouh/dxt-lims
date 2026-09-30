import { z } from 'zod';

// CORE: the smallest subject identity needed by reusable experiment views.
export const subjectRefSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  displayLabel: z.string().min(1),
});

export type SubjectRef = z.infer<typeof subjectRefSchema>;
