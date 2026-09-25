import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { studentCreateSchema, studentUpdateSchema, studentStatusSchema, studentProfileUpdateSchema } from '../schemas/student.schema.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { hashPassword } from '../utils/password.js';

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const { search, departmentId, courseId, sectionId, year, status } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { studentId: { contains: search as string, mode: 'insensitive' } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } }
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (sectionId) where.sectionId = sectionId;
    if (year) where.year = parseInt(year as string);
    if (status) where.user = { status };

    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, status: true, role: true } },
          department: true,
          course: true,
          section: true
        }
      }),
      prisma.student.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('getStudents error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, status: true, role: true } },
        department: true,
        course: true,
        section: true,
        enrollments: { select: { classId: true, status: true } },
        devices: { select: { id: true, deviceName: true, platform: true, status: true, registeredAt: true, lastSeenAt: true } }
      }
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('getStudentById error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = studentCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parseResult.error.format() });
      return;
    }

    const { email, password, studentId, name, departmentId, courseId, sectionId, year } = parseResult.data;

    // Check unique constraints
    const [existingUser, existingStudent] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.student.findUnique({ where: { studentId } })
    ]);

    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }
    if (existingStudent) {
      res.status(400).json({ success: false, message: 'Student ID already exists' });
      return;
    }

    // Verify foreign keys exist
    const [dept, course, section] = await Promise.all([
      prisma.department.findUnique({ where: { id: departmentId } }),
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.section.findUnique({ where: { id: sectionId } })
    ]);

    if (!dept) { res.status(400).json({ success: false, message: 'Invalid department' }); return; }
    if (!course) { res.status(400).json({ success: false, message: 'Invalid course' }); return; }
    if (!section) { res.status(400).json({ success: false, message: 'Invalid section' }); return; }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'STUDENT'
        }
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId,
          name,
          departmentId,
          courseId,
          sectionId,
          year
        },
        include: {
          user: { select: { id: true, email: true, status: true, role: true } }
        }
      });

      return student;
    });

    res.status(201).json({ success: true, message: 'Student created successfully', data: result });
  } catch (error) {
    console.error('createStudent error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = studentUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parseResult.error.format() });
      return;
    }

    const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!studentExists) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.id },
      data: parseResult.data,
      include: { user: { select: { id: true, email: true, status: true, role: true } } }
    });

    res.json({ success: true, message: 'Student updated successfully', data: updatedStudent });
  } catch (error) {
    console.error('updateStudent error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateStudentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = studentStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid status', errors: parseResult.error.format() });
      return;
    }

    const student = await prisma.student.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    await prisma.user.update({
      where: { id: student.userId },
      data: { status: parseResult.data.status }
    });

    res.json({ success: true, message: 'Student status updated successfully' });
  } catch (error) {
    console.error('updateStudentStatus error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getOwnProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: { select: { id: true, email: true, status: true, role: true } },
        department: true,
        course: true,
        section: true
      }
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Profile not found' });
      return;
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('getOwnProfile error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateOwnProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = studentProfileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parseResult.error.format() });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(404).json({ success: false, message: 'Profile not found' });
      return;
    }

    const updatedProfile = await prisma.student.update({
      where: { id: student.id },
      data: parseResult.data,
      include: {
        user: { select: { id: true, email: true, status: true, role: true } }
      }
    });

    res.json({ success: true, message: 'Profile updated successfully', data: updatedProfile });
  } catch (error) {
    console.error('updateOwnProfile error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
