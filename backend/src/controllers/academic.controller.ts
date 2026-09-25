import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { departmentSchema, courseSchema, sectionSchema, subjectSchema, classroomSchema } from '../schemas/academic.schema.js';

// --- Department ---
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany();
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getDepartmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = await prisma.department.findUnique({ where: { id: (req.params.id as string) } });
    if (!department) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = departmentSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const existing = await prisma.department.findUnique({ where: { code: parse.data.code } });
    if (existing) { res.status(400).json({ success: false, message: 'Code already exists' }); return; }

    const dept = await prisma.department.create({ data: parse.data });
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = departmentSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const dept = await prisma.department.update({ where: { id: (req.params.id as string) }, data: parse.data }).catch(() => null);
    if (!dept) { res.status(404).json({ success: false, message: 'Not found' }); return; }

    res.json({ success: true, data: dept });
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ success: false, message: 'Code already exists' }); return; }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- Course ---
export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({ include: { department: true } });
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await prisma.course.findUnique({ where: { id: (req.params.id as string) }, include: { department: true } });
    if (!course) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = courseSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const existing = await prisma.course.findUnique({ where: { code: parse.data.code } });
    if (existing) { res.status(400).json({ success: false, message: 'Code already exists' }); return; }

    const dept = await prisma.department.findUnique({ where: { id: parse.data.departmentId } });
    if (!dept) { res.status(400).json({ success: false, message: 'Department not found' }); return; }

    const course = await prisma.course.create({ data: parse.data });
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = courseSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const course = await prisma.course.update({ where: { id: (req.params.id as string) }, data: parse.data }).catch(() => null);
    if (!course) { res.status(404).json({ success: false, message: 'Not found' }); return; }

    res.json({ success: true, data: course });
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ success: false, message: 'Code already exists' }); return; }
    if (error.code === 'P2003') { res.status(400).json({ success: false, message: 'Department not found' }); return; }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- Section ---
export const getSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const sections = await prisma.section.findMany({ include: { course: true } });
    res.json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getSectionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const section = await prisma.section.findUnique({ where: { id: (req.params.id as string) }, include: { course: true } });
    if (!section) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: section });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = sectionSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const course = await prisma.course.findUnique({ where: { id: parse.data.courseId } });
    if (!course) { res.status(400).json({ success: false, message: 'Course not found' }); return; }

    const existing = await prisma.section.findUnique({ 
      where: { 
        name_courseId_year: { name: parse.data.name, courseId: parse.data.courseId, year: parse.data.year } 
      } 
    });
    if (existing) { res.status(400).json({ success: false, message: 'Section already exists for this course and year' }); return; }

    const section = await prisma.section.create({ data: parse.data });
    res.status(201).json({ success: true, data: section });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = sectionSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const section = await prisma.section.update({ where: { id: (req.params.id as string) }, data: parse.data }).catch(() => null);
    if (!section) { res.status(404).json({ success: false, message: 'Not found' }); return; }

    res.json({ success: true, data: section });
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ success: false, message: 'Section already exists' }); return; }
    if (error.code === 'P2003') { res.status(400).json({ success: false, message: 'Course not found' }); return; }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- Subject ---
export const getSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const subjects = await prisma.subject.findMany();
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getSubjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const subject = await prisma.subject.findUnique({ where: { id: (req.params.id as string) } });
    if (!subject) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = subjectSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const existing = await prisma.subject.findUnique({ where: { code: parse.data.code } });
    if (existing) { res.status(400).json({ success: false, message: 'Code already exists' }); return; }

    const subject = await prisma.subject.create({ data: parse.data });
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = subjectSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const subject = await prisma.subject.update({ where: { id: (req.params.id as string) }, data: parse.data }).catch(() => null);
    if (!subject) { res.status(404).json({ success: false, message: 'Not found' }); return; }

    res.json({ success: true, data: subject });
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ success: false, message: 'Code already exists' }); return; }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// --- Classroom ---
export const getClassrooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const classrooms = await prisma.classroom.findMany();
    res.json({ success: true, data: classrooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getClassroomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const classroom = await prisma.classroom.findUnique({ where: { id: (req.params.id as string) } });
    if (!classroom) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createClassroom = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = classroomSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const existing = await prisma.classroom.findUnique({ 
      where: { building_roomNumber: { building: parse.data.building, roomNumber: parse.data.roomNumber } } 
    });
    if (existing) { res.status(400).json({ success: false, message: 'Classroom already exists in this building' }); return; }

    const classroom = await prisma.classroom.create({ data: parse.data });
    res.status(201).json({ success: true, data: classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateClassroom = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = classroomSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ success: false, message: 'Invalid data', errors: parse.error.format() }); return; }
    
    const classroom = await prisma.classroom.update({ where: { id: (req.params.id as string) }, data: parse.data }).catch(() => null);
    if (!classroom) { res.status(404).json({ success: false, message: 'Not found' }); return; }

    res.json({ success: true, data: classroom });
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ success: false, message: 'Classroom already exists in this building' }); return; }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
