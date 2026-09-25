import { z } from 'zod';

export const classCreateSchema = z.object({
  sectionId: z.string().uuid('Invalid section ID'),
  facultyId: z.string().uuid('Invalid faculty ID'),
  classroomId: z.string().uuid('Invalid classroom ID')
});

export const classUpdateSchema = classCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

export const enrollmentCreateSchema = z.object({
  studentId: z.string().uuid('Invalid student ID')
});

export const bulkEnrollmentSchema = z.object({
  studentIds: z.array(z.string().uuid('Invalid student ID')).min(1, 'At least one student is required')
});
