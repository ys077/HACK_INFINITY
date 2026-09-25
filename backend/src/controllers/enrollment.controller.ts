import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { enrollmentCreateSchema, bulkEnrollmentSchema } from '../schemas/class.schema.js';

export const getEnrollments = async (req: Request, res: Response): Promise<void> => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: (req.params.classId as string) },
      include: {
        student: { select: { id: true, studentId: true, name: true } }
      }
    });
    res.json({ success: true, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = (req.params.classId as string);
    const parse = enrollmentCreateSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const { studentId } = parse.data;

    const [cls, student, existing] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.student.findUnique({ where: { id: studentId }, include: { user: true } }),
      prisma.enrollment.findUnique({ where: { studentId_classId: { studentId, classId } } })
    ]);

    if (!cls) { res.status(400).json({ success: false, message: 'Invalid class' }); return; }
    if (!student) { res.status(400).json({ success: false, message: 'Invalid student' }); return; }
    if (student.user.status !== 'ACTIVE') { res.status(400).json({ success: false, message: 'Student is not active' }); return; }
    if (existing) { res.status(400).json({ success: false, message: 'Student is already enrolled' }); return; }

    const enrollment = await prisma.enrollment.create({
      data: { classId, studentId, status: 'ACTIVE' }
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const deleteEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = req.params.classId as string;
    const studentId = req.params.studentId as string;

    const existing = await prisma.enrollment.findUnique({ where: { studentId_classId: { studentId, classId } } });
    if (!existing) { res.status(404).json({ success: false, message: 'Enrollment not found' }); return; }

    await prisma.enrollment.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Enrollment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const bulkEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = (req.params.classId as string);
    const parse = bulkEnrollmentSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const { studentIds } = parse.data;

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) { res.status(400).json({ success: false, message: 'Invalid class' }); return; }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { user: true }
    });

    const validStudentIds = students.filter(s => s.user.status === 'ACTIVE').map(s => s.id);
    const existingEnrollments = await prisma.enrollment.findMany({
      where: { classId, studentId: { in: validStudentIds } }
    });
    const existingIds = existingEnrollments.map(e => e.studentId);
    
    const newStudentIds = validStudentIds.filter(id => !existingIds.includes(id));

    if (newStudentIds.length > 0) {
      await prisma.enrollment.createMany({
        data: newStudentIds.map(id => ({ classId, studentId: id, status: 'ACTIVE' }))
      });
    }

    res.json({
      success: true,
      data: {
        enrolled: newStudentIds.length,
        alreadyEnrolled: existingIds.length,
        failed: studentIds.length - validStudentIds.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
