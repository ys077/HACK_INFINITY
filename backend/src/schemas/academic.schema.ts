import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
});

export const courseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  departmentId: z.string().uuid('Invalid department ID')
});

export const sectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  year: z.number().int().min(1).max(10),
  courseId: z.string().uuid('Invalid course ID')
});

export const classroomSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  building: z.string().min(1, 'Building is required'),
  floor: z.string().min(1, 'Floor is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(),
  bleBeaconId: z.string().min(1).max(128).optional().or(z.literal(''))
});
