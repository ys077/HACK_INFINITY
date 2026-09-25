import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { classCreateSchema, classUpdateSchema } from '../schemas/class.schema.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AuditService } from '../services/audit.service.js';

// --- Admin Class Management ---
export const getClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        subject: true,
        section: { include: { course: { include: { department: true } } } },
        faculty: true,
        classroom: true,
        _count: { select: { enrollments: true } }
      }
    });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getClassById = async (req: Request, res: Response): Promise<void> => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        subject: true,
        faculty: { select: { id: true, employeeId: true, name: true, userId: true, departmentId: true } },
        classroom: true,
        section: { include: { course: { include: { department: true } } } },
        _count: { select: { enrollments: true } }
      }
    });
    if (!cls) { res.status(404).json({ success: false, message: 'Class not found' }); return; }
    res.json({ success: true, data: cls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = classCreateSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }

    const { subjectId, sectionId, facultyId, classroomId } = parse.data;

    const [subject, section, faculty, classroom] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.section.findUnique({ where: { id: sectionId } }),
      prisma.faculty.findUnique({ where: { id: facultyId }, include: { user: true } }),
      prisma.classroom.findUnique({ where: { id: classroomId } })
    ]);

    if (!subject) { res.status(400).json({ success: false, message: 'Invalid subject' }); return; }
    if (!section) { res.status(400).json({ success: false, message: 'Invalid section' }); return; }
    if (!faculty) { res.status(400).json({ success: false, message: 'Invalid faculty' }); return; }
    if (faculty.user.status !== 'ACTIVE') { res.status(400).json({ success: false, message: 'Faculty is not active' }); return; }
    if (!classroom) { res.status(400).json({ success: false, message: 'Invalid classroom' }); return; }
    if (classroom.status !== 'AVAILABLE') { res.status(400).json({ success: false, message: 'Classroom is not available' }); return; }

    const cls = await prisma.class.create({ data: parse.data });

    await AuditService.createAuditLog({
      actorId: (req as AuthenticatedRequest).user?.id,
      action: 'CLASS_CREATED',
      entityType: 'Class',
      entityId: cls.id,
      metadata: { subjectId, sectionId, facultyId, classroomId }
    });

    res.status(201).json({ success: true, data: cls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = classUpdateSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }

    const existing = await prisma.class.findUnique({ where: { id: (req.params.id as string) } });
    if (!existing) { res.status(404).json({ success: false, message: 'Class not found' }); return; }

    const next = {
      subjectId: parse.data.subjectId ?? existing.subjectId,
      sectionId: parse.data.sectionId ?? existing.sectionId,
      facultyId: parse.data.facultyId ?? existing.facultyId,
      classroomId: parse.data.classroomId ?? existing.classroomId
    };

    const [subject, section, faculty, classroom] = await Promise.all([
      prisma.subject.findUnique({ where: { id: next.subjectId } }),
      prisma.section.findUnique({ where: { id: next.sectionId } }),
      prisma.faculty.findUnique({ where: { id: next.facultyId }, include: { user: true } }),
      prisma.classroom.findUnique({ where: { id: next.classroomId } })
    ]);

    if (!subject) { res.status(400).json({ success: false, message: 'Invalid subject' }); return; }
    if (!section) { res.status(400).json({ success: false, message: 'Invalid section' }); return; }
    if (!faculty) { res.status(400).json({ success: false, message: 'Invalid faculty' }); return; }
    if (faculty.user.status !== 'ACTIVE') { res.status(400).json({ success: false, message: 'Faculty is not active' }); return; }
    if (!classroom) { res.status(400).json({ success: false, message: 'Invalid classroom' }); return; }
    if (classroom.status !== 'AVAILABLE') { res.status(400).json({ success: false, message: 'Classroom is not available' }); return; }

    const cls = await prisma.class.update({
      where: { id: existing.id },
      data: next,
      include: {
        subject: true,
        section: { include: { course: { include: { department: true } } } },
        faculty: true,
        classroom: true
      }
    });

    if (parse.data.facultyId && parse.data.facultyId !== existing.facultyId) {
      await AuditService.createAuditLog({
        actorId: (req as AuthenticatedRequest).user?.id,
        action: 'FACULTY_ASSIGNED',
        entityType: 'Class',
        entityId: cls.id,
        metadata: {
          previousFacultyId: existing.facultyId,
          facultyId: parse.data.facultyId,
          subjectId: next.subjectId,
          classroomId: next.classroomId
        }
      });
    }

    res.json({ success: true, data: cls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- Faculty Class View ---
export const getFacultyClasses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(404).json({ success: false, message: 'Faculty profile not found' }); return; }

    const classes = await prisma.class.findMany({
      where: { facultyId: faculty.id },
      include: {
        subject: true,
        section: {
          include: {
            course: {
              include: {
                department: true
              }
            }
          }
        },
        classroom: true,
        _count: { select: { enrollments: true } }
      }
    });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getFacultyClassById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) { res.status(404).json({ success: false, message: 'Faculty profile not found' }); return; }

    const cls = await prisma.class.findUnique({
      where: { id: (req.params.classId as string) },
      include: {
        subject: true,
        section: true,
        classroom: true,
        _count: { select: { enrollments: true } },
        enrollments: {
          include: {
            student: { select: { id: true, studentId: true, name: true } }
          }
        }
      }
    });

    if (!cls) { res.status(404).json({ success: false, message: 'Class not found' }); return; }
    if (cls.facultyId !== faculty.id) { res.status(403).json({ success: false, message: 'Forbidden: Not your class' }); return; }

    res.json({ success: true, data: cls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- Student Class View ---
export const getStudentClasses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(404).json({ success: false, message: 'Student profile not found' }); return; }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      include: {
        class: {
          include: {
            subject: true,
            section: true,
            faculty: { select: { name: true } },
            classroom: true
          }
        }
      }
    });

    res.json({ success: true, data: enrollments.map(e => e.class) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getStudentClassById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(404).json({ success: false, message: 'Student profile not found' }); return; }

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: student.id, classId: (req.params.classId as string) },
      include: {
        class: {
          include: {
            subject: true,
            section: true,
            faculty: { select: { name: true } },
            classroom: true
          }
        }
      }
    });

    if (!enrollment) { res.status(404).json({ success: false, message: 'Class not found or not enrolled' }); return; }

    res.json({ success: true, data: enrollment.class, enrollmentStatus: enrollment.status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
