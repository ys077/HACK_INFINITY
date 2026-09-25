import { z } from 'zod';

export const studentCreateSchema = z.object({
  email: z.string().email().endsWith('@gmail.com', { message: 'Only @gmail.com addresses are allowed' }),
  password: z.string().min(8),
  studentId: z.string().min(1),
  name: z.string().min(1),
  departmentId: z.string().uuid(),
  courseId: z.string().uuid(),
  sectionId: z.string().uuid(),
  year: z.number().int().min(1).max(5)
});

export const studentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  departmentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  year: z.number().int().min(1).max(5).optional()
});

export const studentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED'])
});

export const studentProfileUpdateSchema = z.object({
  name: z.string().min(1).optional()
});
