import { z } from 'zod';

export const facultyCreateSchema = z.object({
  email: z.string().email().endsWith('@gmail.com', { message: 'Only @gmail.com addresses are allowed' }),
  password: z.string().min(8),
  employeeId: z.string().min(1),
  name: z.string().min(1),
  departmentId: z.string().uuid(),
  courseId: z.string().uuid(),
  phone: z.string().min(7).max(32).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional()
});

export const facultyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  departmentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional().or(z.literal('')),
  phone: z.string().min(7).max(32).optional().or(z.literal(''))
});

export const facultyStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED'])
});

export const facultyProfileUpdateSchema = z.object({
  name: z.string().min(1).optional()
});
