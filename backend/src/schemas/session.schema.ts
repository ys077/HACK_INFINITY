import { z } from 'zod';

export const createSessionSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  expectedEndAt: z.string().datetime('Must be a valid ISO datetime').refine((val) => {
    const d = new Date(val);
    return d.getTime() > Date.now();
  }, { message: 'Expected end time must be in the future' }),

  classroomId: z.string().uuid('Invalid classroom ID').optional(),
  departmentId: z.string().uuid('Invalid department ID').optional()
});
