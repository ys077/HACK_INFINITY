import { z } from 'zod';

export const facultyCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  employeeId: z.string().min(1),
  name: z.string().min(1),
  departmentId: z.string().uuid()
});

export const facultyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  departmentId: z.string().uuid().optional()
});

export const facultyStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED'])
});

export const facultyProfileUpdateSchema = z.object({
  name: z.string().min(1).optional()
});
