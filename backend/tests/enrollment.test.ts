import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Enrollment Management Module Tests', () => {
  let adminToken: string;
  let studentToken: string;
  
  let targetClassId: string;
  let studentId: string;
  let anotherStudentId: string;

  beforeAll(async () => {
    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@presenza.edu', password: 'password123' });
    adminToken = resAdmin.body.data.accessToken;

    const resStudent = await request(app).post('/api/auth/login').send({ email: 'student1@presenza.edu', password: 'password123' });
    studentToken = resStudent.body.data.accessToken;

    const student = await prisma.student.findFirst({ where: { user: { email: 'student1@presenza.edu' } } });
    studentId = student!.id;

    const anotherStudent = await prisma.student.findFirst({ where: { user: { email: 'student2@presenza.edu' } } });
    anotherStudentId = anotherStudent!.id;

    // Remove existing enrollments for student1 to start fresh for our tests
    await prisma.enrollment.deleteMany({ where: { studentId } });
    await prisma.enrollment.deleteMany({ where: { studentId: anotherStudentId } });

    const subject = await prisma.subject.findFirst();
    const section = await prisma.section.findFirst();
    const faculty = await prisma.faculty.findFirst();
    const classroom = await prisma.classroom.findFirst();

    const cls = await prisma.class.create({
      data: {
        subjectId: subject!.id,
        sectionId: section!.id,
        facultyId: faculty!.id,
        classroomId: classroom!.id
      }
    });
    targetClassId = cls.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin Enrollment', () => {
    it('Admin enrolls student', async () => {
      const res = await request(app).post(`/api/admin/classes/${targetClassId}/enrollments`).set('Authorization', `Bearer ${adminToken}`).send({
        studentId
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Duplicate enrollment rejected', async () => {
      const res = await request(app).post(`/api/admin/classes/${targetClassId}/enrollments`).set('Authorization', `Bearer ${adminToken}`).send({
        studentId
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Student Enrollment View', () => {
    it('Student can see own enrolled class', async () => {
      const res = await request(app).get(`/api/student/classes/${targetClassId}`).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(targetClassId);
    });

    it('Student cannot see un-enrolled class', async () => {
      const newCls = await prisma.class.create({
        data: {
          subjectId: (await prisma.subject.findFirst())!.id,
          sectionId: (await prisma.section.findFirst())!.id,
          facultyId: (await prisma.faculty.findFirst())!.id,
          classroomId: (await prisma.classroom.findFirst())!.id
        }
      });
      const res = await request(app).get(`/api/student/classes/${newCls.id}`).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Bulk Enrollment', () => {
    it('Valid bulk enrollment', async () => {
      const res = await request(app).post(`/api/admin/classes/${targetClassId}/enrollments/bulk`).set('Authorization', `Bearer ${adminToken}`).send({
        studentIds: [anotherStudentId, studentId] // studentId already enrolled
      });
      expect(res.status).toBe(200);
      expect(res.body.data.enrolled).toBe(1);
      expect(res.body.data.alreadyEnrolled).toBe(1);
    });
  });
});
