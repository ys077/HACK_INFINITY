import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { facultyCreateSchema, facultyUpdateSchema, facultyStatusSchema, facultyProfileUpdateSchema } from '../schemas/faculty.schema.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { hashPassword } from '../utils/password.js';
import { AuditService } from '../services/audit.service.js';

export const getFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const { search, departmentId, status } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { employeeId: { contains: search as string, mode: 'insensitive' } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } }
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (status) where.user = { status };

    const [items, total] = await Promise.all([
      prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, status: true, role: true } },
          department: true,
          _count: {
            select: { classes: true }
          }
        }
      }),
      prisma.faculty.count({ where })
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
    console.error('getFaculty error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getFacultyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        user: { select: { id: true, email: true, status: true, role: true } },
        department: true,
        _count: {
          select: { classes: true }
        }
      }
    });

    if (!faculty) {
      res.status(404).json({ success: false, message: 'Faculty not found' });
      return;
    }

    res.json({ success: true, data: faculty });
  } catch (error) {
    console.error('getFacultyById error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createFaculty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = facultyCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parseResult.error.format() });
      return;
    }

    const { email, password, employeeId, name, departmentId, phone, status } = parseResult.data;

    const [existingUser, existingFaculty] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.faculty.findUnique({ where: { employeeId } })
    ]);

    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }
    if (existingFaculty) {
      res.status(400).json({ success: false, message: 'Employee ID already exists' });
      return;
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      res.status(400).json({ success: false, message: 'Invalid department' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const normalizedPhone = phone && phone.trim().length > 0 ? phone.trim() : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'FACULTY',
          status: status ?? 'ACTIVE'
        }
      });

      const faculty = await tx.faculty.create({
        data: {
          userId: user.id,
          employeeId,
          name,
          departmentId,
          phone: normalizedPhone
        },
        include: {
          user: { select: { id: true, email: true, status: true, role: true } },
          department: true
        }
      });

      return faculty;
    });

    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'FACULTY_CREATED',
      entityType: 'Faculty',
      entityId: result.id,
      metadata: { email, employeeId, departmentId, name }
    });

    res.status(201).json({ success: true, message: 'Faculty created successfully', data: result });
  } catch (error) {
    console.error('createFaculty error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = facultyUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parseResult.error.format() });
      return;
    }

    const facultyExists = await prisma.faculty.findUnique({ where: { id: (req.params.id as string) } });
    if (!facultyExists) {
      res.status(404).json({ success: false, message: 'Faculty not found' });
      return;
    }

    const { phone, ...rest } = parseResult.data;
    const updatedFaculty = await prisma.faculty.update({
      where: { id: (req.params.id as string) },
      data: {
        ...rest,
        ...(phone !== undefined ? { phone: phone && phone.trim().length > 0 ? phone.trim() : null } : {})
      },
      include: { user: { select: { id: true, email: true, status: true, role: true } } }
    });

    res.json({ success: true, message: 'Faculty updated successfully', data: updatedFaculty });
  } catch (error) {
    console.error('updateFaculty error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateFacultyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = facultyStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid status', errors: parseResult.error.format() });
      return;
    }

    const faculty = await prisma.faculty.findUnique({ where: { id: (req.params.id as string) }, include: { user: true } });
    if (!faculty) {
      res.status(404).json({ success: false, message: 'Faculty not found' });
      return;
    }

    await prisma.user.update({
      where: { id: faculty.userId },
      data: { status: parseResult.data.status as any }
    });

    res.json({ success: true, message: 'Faculty status updated successfully' });
  } catch (error) {
    console.error('updateFacultyStatus error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getOwnFacultyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: { select: { id: true, email: true, status: true, role: true } },
        department: true
      }
    });

    if (!faculty) {
      res.status(404).json({ success: false, message: 'Profile not found' });
      return;
    }

    res.json({ success: true, data: faculty });
  } catch (error) {
    console.error('getOwnFacultyProfile error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateOwnFacultyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = facultyProfileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid data', errors: parseResult.error.format() });
      return;
    }

    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) {
      res.status(404).json({ success: false, message: 'Profile not found' });
      return;
    }

    const updatedProfile = await prisma.faculty.update({
      where: { id: faculty.id },
      data: parseResult.data,
      include: {
        user: { select: { id: true, email: true, status: true, role: true } }
      }
    });

    res.json({ success: true, message: 'Profile updated successfully', data: updatedProfile });
  } catch (error) {
    console.error('updateOwnFacultyProfile error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
